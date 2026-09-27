import { QueueStatus, TokenStatus, SmartHoldStatus, QueueEventType, NotificationType, UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/error.middleware.js";
import { QueueTransitions } from "../queue-engine/queueTransitions.js";
import { QueuePositionEngine } from "../queue-engine/queuePosition.js";
import { QueueEligibilityEngine } from "../queue-engine/queueEligibility.js";
import { SmartHoldEngine } from "../queue-engine/smartHoldEngine.js";
import { EventService } from "./eventService.js";
import { NotificationService } from "./notificationService.js";

export interface DeclareHoldInput {
  startTime: string;
  endTime: string;
  reason: string;
}

export class QueueService {
  /**
   * Student joins an open queue. Concurrency-safe token numbering & deterministic queueOrder.
   */
  public static async joinQueue(queueId: string, userId: string) {
    const queue = await prisma.queue.findUnique({
      where: { id: queueId },
      include: { service: true },
    });

    if (!queue) {
      throw new AppError("Queue not found.", 404);
    }

    if (!QueueTransitions.canJoinQueue(queue.status)) {
      throw new AppError(
        `Cannot join queue because it is currently ${queue.status.toLowerCase()}.`,
        400
      );
    }

    // Duplicate Active Token Check
    const activeExistingToken = await prisma.queueToken.findFirst({
      where: {
        queueId,
        userId,
        status: {
          in: [TokenStatus.WAITING, TokenStatus.HOLD, TokenStatus.SERVING],
        },
      },
    });

    if (activeExistingToken) {
      throw new AppError("You already have an active token in this queue.", 409);
    }

    // Transaction-safe sequential token number & queueOrder generation
    const createdToken = await prisma.$transaction(async (tx) => {
      // Row-level lock on Queue to prevent race conditions during token numbering
      await tx.$executeRaw`SELECT id FROM "Queue" WHERE id = ${queueId}::uuid FOR UPDATE`;

      const lastToken = await tx.queueToken.findFirst({
        where: { queueId },
        orderBy: { tokenNumber: "desc" },
        select: { tokenNumber: true, queueOrder: true },
      });

      const nextTokenNumber = (lastToken?.tokenNumber || 0) + 1;

      // Find max queueOrder to place this new token at the end of the queue sequence
      const maxOrderToken = await tx.queueToken.findFirst({
        where: { queueId },
        orderBy: { queueOrder: "desc" },
        select: { queueOrder: true },
      });

      const nextQueueOrder = (maxOrderToken?.queueOrder || 0) + 10;

      const token = await tx.queueToken.create({
        data: {
          queueId,
          userId,
          tokenNumber: nextTokenNumber,
          queueOrder: nextQueueOrder,
          status: TokenStatus.WAITING,
          skipCount: 0,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          queue: { include: { service: true } },
        },
      });

      // Audit Event
      await EventService.createQueueEvent(
        queueId,
        token.id,
        QueueEventType.JOINED,
        {
          tokenNumber: nextTokenNumber,
          studentName: token.user.name,
        },
        tx
      );

      // Notification
      await NotificationService.createNotification(
        userId,
        NotificationType.SYSTEM,
        `Joined ${token.queue.service.name} Queue`,
        `Assigned Token #${nextTokenNumber}. Position will update in real-time.`,
        tx
      );

      return token;
    });

    // Derive position and people ahead dynamically
    const { position, peopleAhead } = await QueuePositionEngine.calculatePosition(
      prisma,
      queueId,
      createdToken.id,
      createdToken.status,
      createdToken.joinedAt,
      createdToken.queueOrder
    );

    return {
      tokenId: createdToken.id,
      tokenNumber: createdToken.tokenNumber,
      status: createdToken.status,
      position,
      peopleAhead,
      serviceName: createdToken.queue.service.name,
      joinedAt: createdToken.joinedAt,
    };
  }

  /**
   * Student declares a Smart Hold on their active token.
   * Enforces all 9 validation rules transactionally.
   */
  public static async declareSmartHold(queueId: string, userId: string, input: DeclareHoldInput) {
    const queue = await prisma.queue.findUnique({
      where: { id: queueId },
      include: { service: true },
    });

    // RULE 8: Queue must exist
    if (!queue) {
      throw new AppError("Queue not found.", 404);
    }

    // RULE 9: Queue must not be CLOSED
    if (queue.status === QueueStatus.CLOSED) {
      throw new AppError("Cannot declare Smart Hold because the queue is closed.", 400);
    }

    // RULE 1 & 7: Student must have active token in queue owned by authenticated user
    const token = await prisma.queueToken.findFirst({
      where: {
        queueId,
        userId,
        status: { in: [TokenStatus.WAITING, TokenStatus.HOLD, TokenStatus.SERVING] },
      },
      include: {
        smartHolds: { where: { status: SmartHoldStatus.ACTIVE } },
      },
    });

    if (!token) {
      throw new AppError("No active token found in this queue for your account.", 404);
    }

    // Reject Smart Hold while SERVING or completed/cancelled
    if (token.status === TokenStatus.SERVING) {
      throw new AppError("Cannot declare Smart Hold while your token is currently SERVING.", 400);
    }

    if (token.status !== TokenStatus.WAITING && token.status !== TokenStatus.HOLD) {
      throw new AppError(`Cannot declare Smart Hold for token with status ${token.status}.`, 400);
    }

    // RULE 6: Student can have ONLY ONE ACTIVE SmartHold for the token
    if (token.smartHolds.length > 0) {
      throw new AppError("An active Smart Hold already exists for this token.", 400);
    }

    // RULE 2 & 3: Validate timestamps
    const start = new Date(input.startTime);
    const end = new Date(input.endTime);
    const now = new Date();

    if (isNaN(start.getTime())) {
      throw new AppError("Invalid start time.", 400);
    }

    if (isNaN(end.getTime())) {
      throw new AppError("Invalid end time.", 400);
    }

    if (end.getTime() <= start.getTime()) {
      throw new AppError("End time must be strictly after start time.", 400);
    }

    // RULE 4: Hold duration must not exceed queue.maxHoldDuration (minutes)
    const durationMinutes = (end.getTime() - start.getTime()) / (60 * 1000);
    if (durationMinutes > queue.maxHoldDuration) {
      throw new AppError(
        `Hold duration (${Math.round(durationMinutes)} mins) exceeds the maximum allowed limit of ${queue.maxHoldDuration} minutes.`,
        400
      );
    }

    // RULE 5: Hold must satisfy startTime >= currentTime + queue.minLeadTime (minutes)
    // Note: Allow a small 5-second buffer for network transit latency if startTime is exactly lead time ahead
    const minAllowedStart = new Date(now.getTime() + (queue.minLeadTime * 60 * 1000) - 5000);
    if (start.getTime() < minAllowedStart.getTime()) {
      throw new AppError(
        `Smart Hold must be declared at least ${queue.minLeadTime} minutes before the hold starts.`,
        400
      );
    }

    // Transaction-safe SmartHold creation
    return prisma.$transaction(async (tx) => {
      // Row lock on queue
      await tx.$executeRaw`SELECT id FROM "Queue" WHERE id = ${queueId}::uuid FOR UPDATE`;

      const smartHold = await tx.smartHold.create({
        data: {
          tokenId: token.id,
          startTime: start,
          endTime: end,
          reason: input.reason.trim(),
          status: SmartHoldStatus.ACTIVE,
        },
      });

      // Audit Event: HOLD_DECLARED
      await EventService.createQueueEvent(
        queueId,
        token.id,
        QueueEventType.HOLD_DECLARED,
        {
          tokenNumber: token.tokenNumber,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          durationMinutes,
          reason: input.reason.trim(),
        },
        tx
      );

      // Notification: SMART_HOLD_ACTIVATED
      await NotificationService.createNotification(
        userId,
        NotificationType.SMART_HOLD_ACTIVATED,
        "Smart Hold Activated",
        `Smart Hold declared for Token #${token.tokenNumber} from ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        tx
      );

      return {
        holdId: smartHold.id,
        tokenId: token.id,
        tokenNumber: token.tokenNumber,
        startTime: smartHold.startTime,
        endTime: smartHold.endTime,
        reason: smartHold.reason,
        status: smartHold.status,
        skipCount: token.skipCount,
      };
    });
  }

  /**
   * Student cancels their own active Smart Hold.
   * CRITICAL: Early cancellation does NOT reset skipCount.
   */
  public static async cancelSmartHold(queueId: string, userId: string) {
    const token = await prisma.queueToken.findFirst({
      where: {
        queueId,
        userId,
        status: { in: [TokenStatus.WAITING, TokenStatus.HOLD] },
      },
      include: {
        smartHolds: { where: { status: SmartHoldStatus.ACTIVE } },
      },
    });

    if (!token) {
      throw new AppError("No active token found in this queue for your account.", 404);
    }

    const activeHold = token.smartHolds[0];
    if (!activeHold) {
      throw new AppError("No active Smart Hold found for this token.", 404);
    }

    return prisma.$transaction(async (tx) => {
      // Mark hold as CANCELLED
      const cancelledHold = await tx.smartHold.update({
        where: { id: activeHold.id },
        data: { status: SmartHoldStatus.CANCELLED },
      });

      // If token was in HOLD status, restore to WAITING (skipCount stays untouched)
      if (token.status === TokenStatus.HOLD) {
        await tx.queueToken.update({
          where: { id: token.id },
          data: { status: TokenStatus.WAITING },
        });
      }

      // Audit Event: HOLD_CANCELLED
      await EventService.createQueueEvent(
        queueId,
        token.id,
        QueueEventType.HOLD_CANCELLED,
        {
          tokenNumber: token.tokenNumber,
          cancelledAt: new Date().toISOString(),
          skipCount: token.skipCount,
        },
        tx
      );

      // Notification: SYSTEM
      await NotificationService.createNotification(
        userId,
        NotificationType.SYSTEM,
        "Smart Hold Cancelled",
        `Your Smart Hold for Token #${token.tokenNumber} has been cancelled. Your token remains active in the queue.`,
        tx
      );

      return {
        holdId: cancelledHold.id,
        status: cancelledHold.status,
        skipCount: token.skipCount,
        message: "Smart Hold cancelled successfully.",
      };
    });
  }

  /**
   * Reusable method to expire holds whose endTime has passed.
   */
  public static async expireSmartHolds(queueId?: string) {
    return prisma.$transaction(async (tx) => {
      return SmartHoldEngine.expireSmartHolds(tx, queueId);
    });
  }

  /**
   * Get queue status with live counts, on-hold metrics, and user token details.
   */
  public static async getQueueStatus(queueId: string, currentUserId?: string) {
    // Expire any outdated holds
    await this.expireSmartHolds(queueId);

    const queue = await prisma.queue.findUnique({
      where: { id: queueId },
      include: { service: true },
    });

    if (!queue) {
      throw new AppError("Queue not found.", 404);
    }

    const waitingCount = await prisma.queueToken.count({
      where: { queueId, status: TokenStatus.WAITING },
    });

    const onHoldCount = await prisma.queueToken.count({
      where: {
        queueId,
        status: { in: [TokenStatus.WAITING, TokenStatus.HOLD] },
        smartHolds: {
          some: {
            status: SmartHoldStatus.ACTIVE,
            startTime: { lte: new Date() },
            endTime: { gt: new Date() },
          },
        },
      },
    });

    const servingToken = await prisma.queueToken.findFirst({
      where: { queueId, status: TokenStatus.SERVING },
      include: { user: { select: { name: true } } },
    });

    let studentTokenInfo = null;
    if (currentUserId) {
      const myToken = await prisma.queueToken.findFirst({
        where: {
          queueId,
          userId: currentUserId,
          status: { in: [TokenStatus.WAITING, TokenStatus.HOLD, TokenStatus.SERVING] },
        },
        include: { smartHolds: { where: { status: SmartHoldStatus.ACTIVE } } },
      });

      if (myToken) {
        const { position, peopleAhead } = await QueuePositionEngine.calculatePosition(
          prisma,
          queueId,
          myToken.id,
          myToken.status,
          myToken.joinedAt,
          myToken.queueOrder
        );

        const activeHold = myToken.smartHolds[0] || null;
        const isHoldActiveNow = activeHold
          ? SmartHoldEngine.isHoldWindowActive(activeHold, new Date())
          : false;

        studentTokenInfo = {
          tokenId: myToken.id,
          tokenNumber: myToken.tokenNumber,
          status: myToken.status,
          position,
          peopleAhead,
          skipCount: myToken.skipCount,
          joinedAt: myToken.joinedAt,
          smartHold: activeHold
            ? {
                ...activeHold,
                isCurrentlyActive: isHoldActiveNow,
              }
            : null,
        };
      }
    }

    return {
      queueId: queue.id,
      serviceName: queue.service.name,
      serviceDescription: queue.service.description,
      status: queue.status,
      totalWaiting: waitingCount,
      totalOnHold: onHoldCount,
      currentServing: servingToken
        ? {
            tokenId: servingToken.id,
            tokenNumber: servingToken.tokenNumber,
            studentName: servingToken.user.name,
            servingAt: servingToken.servingAt,
          }
        : null,
      myToken: studentTokenInfo,
      config: {
        maxSkips: queue.maxSkips,
        minLeadTime: queue.minLeadTime,
        maxHoldDuration: queue.maxHoldDuration,
      },
    };
  }

  /**
   * Get all active tokens for the authenticated student across all queues.
   */
  public static async getMyActiveTokens(userId: string) {
    await this.expireSmartHolds();

    const tokens = await prisma.queueToken.findMany({
      where: {
        userId,
        status: { in: [TokenStatus.WAITING, TokenStatus.HOLD, TokenStatus.SERVING] },
      },
      include: {
        queue: { include: { service: true } },
        smartHolds: { where: { status: SmartHoldStatus.ACTIVE } },
      },
      orderBy: { joinedAt: "desc" },
    });

    const results = [];
    for (const t of tokens) {
      const { position, peopleAhead } = await QueuePositionEngine.calculatePosition(
        prisma,
        t.queueId,
        t.id,
        t.status,
        t.joinedAt,
        t.queueOrder
      );

      const activeHold = t.smartHolds[0] || null;
      const isHoldActiveNow = activeHold
        ? SmartHoldEngine.isHoldWindowActive(activeHold, new Date())
        : false;

      results.push({
        tokenId: t.id,
        queueId: t.queueId,
        serviceName: t.queue.service.name,
        tokenNumber: t.tokenNumber,
        status: t.status,
        position,
        peopleAhead,
        skipCount: t.skipCount,
        maxSkips: t.queue.maxSkips,
        joinedAt: t.joinedAt,
        servingAt: t.servingAt,
        smartHold: activeHold
          ? {
              ...activeHold,
              isCurrentlyActive: isHoldActiveNow,
            }
          : null,
      });
    }

    return results;
  }

  /**
   * View details of a specific token.
   */
  public static async getTokenDetails(tokenId: string, currentUserId: string, currentUserRole: UserRole) {
    const token = await prisma.queueToken.findUnique({
      where: { id: tokenId },
      include: {
        queue: { include: { service: true } },
        user: { select: { id: true, name: true, email: true } },
        smartHolds: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!token) {
      throw new AppError("Token not found.", 404);
    }

    if (currentUserRole === UserRole.STUDENT && token.userId !== currentUserId) {
      throw new AppError("You do not have permission to view this token.", 403);
    }

    const { position, peopleAhead } = await QueuePositionEngine.calculatePosition(
      prisma,
      token.queueId,
      token.id,
      token.status,
      token.joinedAt,
      token.queueOrder
    );

    return {
      tokenId: token.id,
      tokenNumber: token.tokenNumber,
      status: token.status,
      queueId: token.queueId,
      serviceName: token.queue.service.name,
      studentName: token.user.name,
      studentEmail: token.user.email,
      position,
      peopleAhead,
      skipCount: token.skipCount,
      maxSkips: token.queue.maxSkips,
      joinedAt: token.joinedAt,
      servingAt: token.servingAt,
      completedAt: token.completedAt,
      smartHolds: token.smartHolds,
    };
  }

  /**
   * Student cancels their own active token.
   */
  public static async cancelToken(tokenId: string, userId: string) {
    const token = await prisma.queueToken.findUnique({
      where: { id: tokenId },
      include: { queue: { include: { service: true } } },
    });

    if (!token) {
      throw new AppError("Token not found.", 404);
    }

    if (token.userId !== userId) {
      throw new AppError("You do not have permission to cancel this token.", 403);
    }

    if (!QueueTransitions.canStudentCancel(token.status)) {
      throw new AppError(
        `Cannot cancel token with status ${token.status}. Only WAITING or HOLD tokens can be cancelled.`,
        400
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const cancelled = await tx.queueToken.update({
        where: { id: tokenId },
        data: {
          status: TokenStatus.CANCELLED,
          completedAt: new Date(),
        },
      });

      // Cancel any active hold
      await tx.smartHold.updateMany({
        where: { tokenId, status: SmartHoldStatus.ACTIVE },
        data: { status: SmartHoldStatus.CANCELLED },
      });

      // Audit Event
      await EventService.createQueueEvent(
        token.queueId,
        tokenId,
        QueueEventType.CANCELLED,
        {
          tokenNumber: token.tokenNumber,
          cancelledBy: "STUDENT",
        },
        tx
      );

      // Notification
      await NotificationService.createNotification(
        userId,
        NotificationType.SYSTEM,
        `Token #${token.tokenNumber} Cancelled`,
        `Your place in the ${token.queue.service.name} queue has been cancelled.`,
        tx
      );

      return cancelled;
    });

    return {
      tokenId: updated.id,
      tokenNumber: updated.tokenNumber,
      status: updated.status,
      message: "Token cancelled successfully.",
    };
  }

  /**
   * Staff calls the next eligible waiting token with full Bounded Fair-Skip execution.
   * Transaction-safe with row locks to guarantee single SERVING token and concurrency safety.
   */
  public static async callNext(queueId: string) {
    const queue = await prisma.queue.findUnique({
      where: { id: queueId },
      include: { service: true },
    });

    if (!queue) {
      throw new AppError("Queue not found.", 404);
    }

    if (queue.status !== QueueStatus.OPEN) {
      throw new AppError(`Cannot call next while queue is ${queue.status.toLowerCase()}.`, 400);
    }

    return prisma.$transaction(async (tx) => {
      // Row lock on queue
      await tx.$executeRaw`SELECT id FROM "Queue" WHERE id = ${queueId}::uuid FOR UPDATE`;

      // Check if a token is currently SERVING in this queue
      const currentlyServing = await tx.queueToken.findFirst({
        where: { queueId, status: TokenStatus.SERVING },
      });

      if (currentlyServing) {
        throw new AppError(
          `Token #${currentlyServing.tokenNumber} is currently SERVING. Complete or mark it NO-SHOW before calling next.`,
          400
        );
      }

      // Execute Bounded Fair-Skip evaluation loop
      const result = await QueueEligibilityEngine.processCallNext(tx, queueId, queue.maxSkips);

      if (result.allHeld) {
        throw new AppError("All active tokens are currently unavailable due to Smart Holds.", 400);
      }

      if (!result.servedToken) {
        throw new AppError("No waiting students in queue.", 404);
      }

      return {
        tokenId: result.servedToken.id,
        tokenNumber: result.servedToken.tokenNumber,
        status: result.servedToken.status,
        studentName: result.servedToken.user.name,
        servingAt: result.servedToken.servingAt,
        skippedActivity: result.skippedTokens,
      };
    });
  }

  /**
   * Staff completes the currently serving consultation.
   */
  public static async completeToken(tokenId: string) {
    const token = await prisma.queueToken.findUnique({
      where: { id: tokenId },
      include: { queue: { include: { service: true } }, user: true },
    });

    if (!token) {
      throw new AppError("Token not found.", 404);
    }

    if (!QueueTransitions.canCompleteToken(token.status)) {
      throw new AppError(`Cannot complete token with status ${token.status}. Token must be SERVING.`, 400);
    }

    return prisma.$transaction(async (tx) => {
      const now = new Date();
      const completed = await tx.queueToken.update({
        where: { id: tokenId },
        data: {
          status: TokenStatus.COMPLETED,
          completedAt: now,
        },
      });

      // Audit Event
      await EventService.createQueueEvent(
        token.queueId,
        tokenId,
        QueueEventType.COMPLETED,
        {
          tokenNumber: token.tokenNumber,
          serviceDurationSeconds: token.servingAt
            ? Math.round((now.getTime() - token.servingAt.getTime()) / 1000)
            : 0,
        },
        tx
      );

      // Notification
      await NotificationService.createNotification(
        token.userId,
        NotificationType.SYSTEM,
        "Consultation Completed",
        `Your service for ${token.queue.service.name} has been completed. Thank you!`,
        tx
      );

      return completed;
    });
  }

  /**
   * Staff marks a serving student as NO_SHOW.
   * CRITICAL RULE: NO_SHOW is COMPLETELY INDEPENDENT from Smart Hold.
   * - Must NOT increment skipCount
   * - Must NOT create SKIPPED
   * - Must NOT create MOVED_TO_TAIL
   * - Must NOT trigger Smart Hold logic
   */
  public static async markNoShow(tokenId: string) {
    const token = await prisma.queueToken.findUnique({
      where: { id: tokenId },
      include: { queue: { include: { service: true } }, user: true },
    });

    if (!token) {
      throw new AppError("Token not found.", 404);
    }

    if (!QueueTransitions.canMarkNoShow(token.status)) {
      throw new AppError(`Cannot mark token as NO_SHOW with status ${token.status}. Token must be SERVING.`, 400);
    }

    return prisma.$transaction(async (tx) => {
      const now = new Date();
      const noShowToken = await tx.queueToken.update({
        where: { id: tokenId },
        data: {
          status: TokenStatus.NO_SHOW,
          completedAt: now,
          // CRITICAL: skipCount remains untouched!
        },
      });

      // Audit Event: NO_SHOW
      await EventService.createQueueEvent(
        token.queueId,
        tokenId,
        QueueEventType.NO_SHOW,
        {
          tokenNumber: token.tokenNumber,
          studentName: token.user.name,
        },
        tx
      );

      // Notification: SYSTEM
      await NotificationService.createNotification(
        token.userId,
        NotificationType.SYSTEM,
        "Marked as No-Show",
        `Token #${token.tokenNumber} was marked as No-Show after failing to appear at the desk.`,
        tx
      );

      return noShowToken;
    });
  }

  /**
   * Staff pauses queue intake.
   */
  public static async pauseQueue(queueId: string) {
    const queue = await prisma.queue.findUnique({
      where: { id: queueId },
    });

    if (!queue) {
      throw new AppError("Queue not found.", 404);
    }

    if (!QueueTransitions.canPauseQueue(queue.status)) {
      throw new AppError(`Cannot pause queue with status ${queue.status}.`, 400);
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.queue.update({
        where: { id: queueId },
        data: { status: QueueStatus.PAUSED },
      });

      await EventService.createQueueEvent(queueId, null, QueueEventType.QUEUE_PAUSED, {}, tx);

      return updated;
    });
  }

  /**
   * Staff resumes queue intake.
   */
  public static async resumeQueue(queueId: string) {
    const queue = await prisma.queue.findUnique({
      where: { id: queueId },
    });

    if (!queue) {
      throw new AppError("Queue not found.", 404);
    }

    if (!QueueTransitions.canResumeQueue(queue.status)) {
      throw new AppError(`Cannot resume queue with status ${queue.status}.`, 400);
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.queue.update({
        where: { id: queueId },
        data: { status: QueueStatus.OPEN },
      });

      await EventService.createQueueEvent(queueId, null, QueueEventType.QUEUE_RESUMED, {}, tx);

      return updated;
    });
  }

  /**
   * Staff closes queue. Prevents new joins while preserving existing history and tokens.
   */
  public static async closeQueue(queueId: string) {
    const queue = await prisma.queue.findUnique({
      where: { id: queueId },
    });

    if (!queue) {
      throw new AppError("Queue not found.", 404);
    }

    if (!QueueTransitions.canCloseQueue(queue.status)) {
      throw new AppError(`Queue is already closed.`, 400);
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.queue.update({
        where: { id: queueId },
        data: { status: QueueStatus.CLOSED },
      });

      await EventService.createQueueEvent(
        queueId,
        null,
        QueueEventType.QUEUE_PAUSED,
        { action: "QUEUE_CLOSED" },
        tx
      );

      return updated;
    });
  }

  /**
   * Get current serving token.
   */
  public static async getCurrentServing(queueId: string) {
    const serving = await prisma.queueToken.findFirst({
      where: { queueId, status: TokenStatus.SERVING },
      include: {
        user: { select: { name: true, email: true } },
        queue: { include: { service: true } },
      },
    });

    if (!serving) {
      return null;
    }

    return {
      tokenId: serving.id,
      tokenNumber: serving.tokenNumber,
      status: serving.status,
      servingAt: serving.servingAt,
      studentName: serving.user.name,
      serviceName: serving.queue.service.name,
    };
  }

  /**
   * Calculate live queue statistics including on-hold counts.
   */
  public static async getQueueStats(queueId: string) {
    const now = new Date();
    const [waiting, serving, completed, cancelled, noShow, activeHolds] = await Promise.all([
      prisma.queueToken.count({ where: { queueId, status: TokenStatus.WAITING } }),
      prisma.queueToken.count({ where: { queueId, status: TokenStatus.SERVING } }),
      prisma.queueToken.count({ where: { queueId, status: TokenStatus.COMPLETED } }),
      prisma.queueToken.count({ where: { queueId, status: TokenStatus.CANCELLED } }),
      prisma.queueToken.count({ where: { queueId, status: TokenStatus.NO_SHOW } }),
      prisma.smartHold.count({
        where: {
          token: { queueId, status: { in: [TokenStatus.WAITING, TokenStatus.HOLD] } },
          status: SmartHoldStatus.ACTIVE,
          startTime: { lte: now },
          endTime: { gt: now },
        },
      }),
    ]);

    return {
      waiting,
      onHold: activeHolds,
      serving,
      completed,
      cancelled,
      noShow,
    };
  }

  /**
   * Staff: Get all queues with live metrics.
   */
  public static async getStaffQueues() {
    await this.expireSmartHolds();

    const queues = await prisma.queue.findMany({
      include: {
        service: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const results = [];
    for (const q of queues) {
      const stats = await this.getQueueStats(q.id);
      const currentServing = await this.getCurrentServing(q.id);

      results.push({
        queueId: q.id,
        serviceId: q.serviceId,
        serviceName: q.service.name,
        serviceDescription: q.service.description,
        status: q.status,
        maxSkips: q.maxSkips,
        minLeadTime: q.minLeadTime,
        maxHoldDuration: q.maxHoldDuration,
        stats,
        currentServing,
      });
    }

    return results;
  }

  /**
   * Staff: Get full queue details with rosters, hold indicators, and recent events.
   */
  public static async getStaffQueueDetails(queueId: string) {
    await this.expireSmartHolds(queueId);

    const queue = await prisma.queue.findUnique({
      where: { id: queueId },
      include: { service: true },
    });

    if (!queue) {
      throw new AppError("Queue not found.", 404);
    }

    const now = new Date();
    const [activeTokens, currentServing, stats, recentEvents] = await Promise.all([
      prisma.queueToken.findMany({
        where: { queueId, status: { in: [TokenStatus.WAITING, TokenStatus.HOLD] } },
        include: {
          user: { select: { id: true, name: true, email: true } },
          smartHolds: { where: { status: SmartHoldStatus.ACTIVE } },
        },
        orderBy: [
          { queueOrder: "asc" },
          { joinedAt: "asc" },
          { tokenNumber: "asc" },
        ],
      }),
      this.getCurrentServing(queueId),
      this.getQueueStats(queueId),
      EventService.getEventsByQueueId(queueId, 30),
    ]);

    const waitingTokens = activeTokens.map((t, idx) => {
      const activeHold = t.smartHolds[0] || null;
      const isHoldActiveNow = activeHold
        ? SmartHoldEngine.isHoldWindowActive(activeHold, now)
        : false;

      return {
        tokenId: t.id,
        tokenNumber: t.tokenNumber,
        studentName: t.user.name,
        studentEmail: t.user.email,
        status: t.status,
        position: idx + 1,
        peopleAhead: idx,
        skipCount: t.skipCount,
        maxSkips: queue.maxSkips,
        joinedAt: t.joinedAt,
        smartHold: activeHold
          ? {
              ...activeHold,
              isCurrentlyActive: isHoldActiveNow,
            }
          : null,
      };
    });

    return {
      queueId: queue.id,
      serviceName: queue.service.name,
      status: queue.status,
      config: {
        maxSkips: queue.maxSkips,
        minLeadTime: queue.minLeadTime,
        maxHoldDuration: queue.maxHoldDuration,
      },
      stats,
      currentServing,
      waitingTokens,
      recentEvents,
    };
  }

  /**
   * Available services list for student discovery.
   */
  public static async getAvailableServices() {
    return prisma.service.findMany({
      where: { active: true },
      include: {
        queues: {
          select: {
            id: true,
            status: true,
            maxSkips: true,
            minLeadTime: true,
            maxHoldDuration: true,
          },
        },
      },
    });
  }

  /**
   * Update queue configuration parameters (Staff only).
   */
  public static async updateQueueConfig(
    queueId: string,
    data: { maxSkips: number; minLeadTime: number; maxHoldDuration: number }
  ) {
    const queue = await prisma.queue.findUnique({
      where: { id: queueId },
      include: { service: true },
    });

    if (!queue) {
      throw new AppError("Queue not found.", 404);
    }

    const updated = await prisma.queue.update({
      where: { id: queueId },
      data: {
        maxSkips: data.maxSkips,
        minLeadTime: data.minLeadTime,
        maxHoldDuration: data.maxHoldDuration,
      },
      include: { service: true },
    });

    return {
      queueId: updated.id,
      serviceName: updated.service.name,
      status: updated.status,
      maxSkips: updated.maxSkips,
      minLeadTime: updated.minLeadTime,
      maxHoldDuration: updated.maxHoldDuration,
    };
  }

  /**
   * Get operational analytics and metrics aggregated from real PostgreSQL data.
   */
  public static async getStaffAnalytics(params: {
    queueId?: string;
    timeRange?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { queueId, timeRange = "today", startDate: customStart, endDate: customEnd } = params;

    const now = new Date();
    let start: Date | null = null;
    let end: Date = now;

    if (customStart && customEnd) {
      start = new Date(customStart);
      end = new Date(customEnd);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new AppError("Invalid custom date range.", 400);
      }
      if (start > end) {
        throw new AppError("startDate must be less than or equal to endDate.", 400);
      }
    } else if (timeRange === "today") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    } else if (timeRange === "7days") {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === "30days") {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const tokenWhere: any = {};
    const eventWhere: any = {};
    const holdWhere: any = {};

    if (queueId) {
      tokenWhere.queueId = queueId;
      eventWhere.queueId = queueId;
      holdWhere.token = { queueId };
    }

    if (start) {
      tokenWhere.joinedAt = { gte: start, lte: end };
      eventWhere.createdAt = { gte: start, lte: end };
      holdWhere.createdAt = { gte: start, lte: end };
    }

    // Fetch tokens, events, and queues
    const [tokens, events, allQueues] = await Promise.all([
      prisma.queueToken.findMany({
        where: tokenWhere,
        include: {
          queue: { include: { service: true } },
          smartHolds: true,
        },
        orderBy: { joinedAt: "asc" },
      }),
      prisma.queueEvent.findMany({
        where: eventWhere,
        include: { queue: { include: { service: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.queue.findMany({
        include: { service: true },
      }),
    ]);

    // Summary Calculations
    const completedTokens = tokens.filter((t) => t.status === TokenStatus.COMPLETED);
    const noShowTokens = tokens.filter((t) => t.status === TokenStatus.NO_SHOW);
    const cancelledTokens = tokens.filter((t) => t.status === TokenStatus.CANCELLED);
    const waitingTokens = tokens.filter((t) => t.status === TokenStatus.WAITING);
    const servingTokens = tokens.filter((t) => t.status === TokenStatus.SERVING);
    const onHoldTokens = tokens.filter((t) => t.status === TokenStatus.HOLD);

    const totalServed = completedTokens.length;
    const noShowCount = noShowTokens.length;
    const cancelledCount = cancelledTokens.length;
    const totalTokens = tokens.length;

    // Average Wait Time (joinedAt -> servingAt) in seconds
    const servedOrCompleted = tokens.filter((t) => t.servingAt !== null && t.joinedAt !== null);
    const totalWaitSeconds = servedOrCompleted.reduce((acc, t) => {
      const waitMs = new Date(t.servingAt!).getTime() - new Date(t.joinedAt).getTime();
      return acc + Math.max(0, waitMs / 1000);
    }, 0);
    const averageWaitTimeSeconds =
      servedOrCompleted.length > 0 ? Math.round(totalWaitSeconds / servedOrCompleted.length) : 0;

    // Average Service Time (servingAt -> completedAt) in seconds
    const completedWithDuration = completedTokens.filter((t) => t.servingAt !== null && t.completedAt !== null);
    const totalServiceSeconds = completedWithDuration.reduce((acc, t) => {
      const servMs = new Date(t.completedAt!).getTime() - new Date(t.servingAt!).getTime();
      return acc + Math.max(0, servMs / 1000);
    }, 0);
    const averageServiceTimeSeconds =
      completedWithDuration.length > 0 ? Math.round(totalServiceSeconds / completedWithDuration.length) : 0;

    // No-Show Rate: NO_SHOW / (COMPLETED + NO_SHOW)
    const totalConcluded = totalServed + noShowCount;
    const noShowRate = totalConcluded > 0 ? Number((noShowCount / totalConcluded).toFixed(3)) : null;

    // Smart Hold & Fairness metrics
    const smartHoldTokens = tokens.filter((t) => t.smartHolds.length > 0);
    const smartHoldCount = smartHoldTokens.length;

    const skipEvents = events.filter((e) => e.eventType === QueueEventType.SKIPPED);
    const tailEvents = events.filter((e) => e.eventType === QueueEventType.MOVED_TO_TAIL);
    const holdDeclaredEvents = events.filter((e) => e.eventType === QueueEventType.HOLD_DECLARED);
    const holdExpiredEvents = events.filter((e) => e.eventType === QueueEventType.HOLD_EXPIRED);
    const holdCancelledEvents = events.filter((e) => e.eventType === QueueEventType.HOLD_CANCELLED);

    const skipCount = skipEvents.length;
    const movedToTailCount = tailEvents.length;

    // Average skips per held token
    const avgSkipsPerHeldToken =
      smartHoldCount > 0 ? Number((skipCount / smartHoldCount).toFixed(2)) : 0;

    // Outcome Breakdown Donut Chart
    const outcomeBreakdown = [
      { name: "COMPLETED", value: totalServed, color: "#10b981" },
      { name: "NO_SHOW", value: noShowCount, color: "#ef4444" },
      { name: "CANCELLED", value: cancelledCount, color: "#94a3b8" },
    ].filter((item) => item.value > 0);

    // Status Breakdown (for detailed donut if needed)
    const statusBreakdown = [
      { name: "Completed", value: totalServed, color: "#10b981" },
      { name: "Waiting", value: waitingTokens.length, color: "#6366f1" },
      { name: "On Hold", value: onHoldTokens.length, color: "#f59e0b" },
      { name: "Serving", value: servingTokens.length, color: "#3b82f6" },
      { name: "No-Show", value: noShowCount, color: "#ef4444" },
      { name: "Cancelled", value: cancelledCount, color: "#94a3b8" },
    ].filter((item) => item.value > 0);

    // Bounded Fair-Skip Activity
    const fairnessActivity = [
      { name: "Holds Declared", count: holdDeclaredEvents.length, fill: "#f59e0b" },
      { name: "Temporary Skips", count: skipCount, fill: "#6366f1" },
      { name: "Moved to Tail", count: movedToTailCount, fill: "#ec4899" },
    ];

    // Wait Time Trend & Daily Throughput
    const timelineMap = new Map<
      string,
      {
        label: string;
        joined: number;
        completed: number;
        noShow: number;
        cancelled: number;
        skipped: number;
        totalWaitMinutes: number;
        waitCount: number;
        averageWaitMinutes: number;
      }
    >();

    if (timeRange === "today") {
      for (let h = 8; h <= 18; h++) {
        const hourStr = `${h.toString().padStart(2, "0")}:00`;
        timelineMap.set(hourStr, {
          label: hourStr,
          joined: 0,
          completed: 0,
          noShow: 0,
          cancelled: 0,
          skipped: 0,
          totalWaitMinutes: 0,
          waitCount: 0,
          averageWaitMinutes: 0,
        });
      }

      tokens.forEach((t) => {
        const hour = `${new Date(t.joinedAt).getHours().toString().padStart(2, "0")}:00`;
        const entry = timelineMap.get(hour) || {
          label: hour,
          joined: 0,
          completed: 0,
          noShow: 0,
          cancelled: 0,
          skipped: 0,
          totalWaitMinutes: 0,
          waitCount: 0,
          averageWaitMinutes: 0,
        };

        entry.joined += 1;
        if (t.status === TokenStatus.COMPLETED) entry.completed += 1;
        if (t.status === TokenStatus.NO_SHOW) entry.noShow += 1;
        if (t.status === TokenStatus.CANCELLED) entry.cancelled += 1;

        if (t.servingAt) {
          const waitMins = (new Date(t.servingAt).getTime() - new Date(t.joinedAt).getTime()) / 60000;
          entry.totalWaitMinutes += Math.max(0, waitMins);
          entry.waitCount += 1;
          entry.averageWaitMinutes = Number((entry.totalWaitMinutes / entry.waitCount).toFixed(1));
        }

        timelineMap.set(hour, entry);
      });

      events.forEach((e) => {
        if (e.eventType === QueueEventType.SKIPPED) {
          const hour = `${new Date(e.createdAt).getHours().toString().padStart(2, "0")}:00`;
          const entry = timelineMap.get(hour) || {
            label: hour,
            joined: 0,
            completed: 0,
            noShow: 0,
            cancelled: 0,
            skipped: 0,
            totalWaitMinutes: 0,
            waitCount: 0,
            averageWaitMinutes: 0,
          };
          entry.skipped += 1;
          timelineMap.set(hour, entry);
        }
      });
    } else {
      tokens.forEach((t) => {
        const d = new Date(t.joinedAt);
        const dayKey = `${d.getMonth() + 1}/${d.getDate()}`;
        const entry = timelineMap.get(dayKey) || {
          label: dayKey,
          joined: 0,
          completed: 0,
          noShow: 0,
          cancelled: 0,
          skipped: 0,
          totalWaitMinutes: 0,
          waitCount: 0,
          averageWaitMinutes: 0,
        };

        entry.joined += 1;
        if (t.status === TokenStatus.COMPLETED) entry.completed += 1;
        if (t.status === TokenStatus.NO_SHOW) entry.noShow += 1;
        if (t.status === TokenStatus.CANCELLED) entry.cancelled += 1;

        if (t.servingAt) {
          const waitMins = (new Date(t.servingAt).getTime() - new Date(t.joinedAt).getTime()) / 60000;
          entry.totalWaitMinutes += Math.max(0, waitMins);
          entry.waitCount += 1;
          entry.averageWaitMinutes = Number((entry.totalWaitMinutes / entry.waitCount).toFixed(1));
        }

        timelineMap.set(dayKey, entry);
      });

      events.forEach((e) => {
        if (e.eventType === QueueEventType.SKIPPED) {
          const d = new Date(e.createdAt);
          const dayKey = `${d.getMonth() + 1}/${d.getDate()}`;
          const entry = timelineMap.get(dayKey) || {
            label: dayKey,
            joined: 0,
            completed: 0,
            noShow: 0,
            cancelled: 0,
            skipped: 0,
            totalWaitMinutes: 0,
            waitCount: 0,
            averageWaitMinutes: 0,
          };
          entry.skipped += 1;
          timelineMap.set(dayKey, entry);
        }
      });
    }

    const activityTimeline = Array.from(timelineMap.values());

    // Per-queue comparison metrics
    const queueBreakdown = allQueues.map((q) => {
      const qTokens = tokens.filter((t) => t.queueId === q.id);
      const qCompleted = qTokens.filter((t) => t.status === TokenStatus.COMPLETED);
      const qNoShow = qTokens.filter((t) => t.status === TokenStatus.NO_SHOW);
      const qEvents = events.filter((e) => e.queueId === q.id);

      const qWaitSum = qCompleted.reduce((acc, t) => {
        if (t.servingAt) {
          return acc + (new Date(t.servingAt).getTime() - new Date(t.joinedAt).getTime()) / 60000;
        }
        return acc;
      }, 0);
      const avgWaitMinutes = qCompleted.length > 0 ? Number((qWaitSum / qCompleted.length).toFixed(1)) : 0;

      return {
        queueId: q.id,
        serviceName: q.service.name,
        total: qTokens.length,
        completed: qCompleted.length,
        noShow: qNoShow.length,
        avgWaitMinutes,
        skips: qEvents.filter((e) => e.eventType === QueueEventType.SKIPPED).length,
      };
    });

    return {
      period: {
        startDate: start ? start.toISOString() : null,
        endDate: end.toISOString(),
        range: timeRange,
      },
      summary: {
        totalServed,
        totalTokens,
        averageWaitTimeSeconds,
        averageServiceTimeSeconds,
        noShowRate,
        smartHoldCount,
        skipCount,
        smartHoldSkips: skipCount,
        movedToTailCount,
        movedToTail: movedToTailCount,
        avgSkipsPerHeldToken,
        completed: totalServed,
        cancelled: cancelledCount,
        noShow: noShowCount,
        waiting: waitingTokens.length,
        serving: servingTokens.length,
        onHold: onHoldTokens.length,
        holdsDeclared: holdDeclaredEvents.length,
        holdsExpired: holdExpiredEvents.length,
        holdsCancelled: holdCancelledEvents.length,
      },
      outcomeBreakdown,
      statusBreakdown,
      fairnessActivity,
      activityTimeline,
      queueBreakdown,
    };
  }
}


