import { TokenStatus, SmartHoldStatus, QueueEventType, NotificationType } from "@prisma/client";
import { EventService } from "../services/eventService.js";
import { NotificationService } from "../services/notificationService.js";

export class SmartHoldEngine {
  /**
   * Checks if a token is currently within an active Smart Hold window.
   * Window is active if:
   * 1. SmartHold.status === 'ACTIVE'
   * 2. currentTime >= startTime AND currentTime < endTime
   */
  static isHoldWindowActive(hold, currentTime = new Date()) {
    if (!hold || hold.status !== SmartHoldStatus.ACTIVE) {
      return false;
    }
    const now = currentTime.getTime();
    const start = new Date(hold.startTime).getTime();
    const end = new Date(hold.endTime).getTime();

    return now >= start && now < end;
  }

  /**
   * Expires all Smart Holds whose endTime has passed (currentTime >= endTime).
   * Restores any HOLD token to WAITING without resetting skipCount.
   */
  static async expireSmartHolds(tx, queueId, currentTime = new Date()) {
    const expiredHolds = await tx.smartHold.findMany({
      where: {
        status: SmartHoldStatus.ACTIVE,
        endTime: { lte: currentTime },
        ...(queueId ? { token: { queueId } } : {}),
      },
      include: {
        token: {
          include: {
            user: { select: { id: true, name: true } },
            queue: { include: { service: true } },
          },
        },
      },
    });

    for (const hold of expiredHolds) {
      // Mark hold as EXPIRED
      await tx.smartHold.update({
        where: { id: hold.id },
        data: { status: SmartHoldStatus.EXPIRED },
      });

      // If token status is HOLD, restore to WAITING
      if (hold.token.status === TokenStatus.HOLD) {
        await tx.queueToken.update({
          where: { id: hold.tokenId },
          data: { status: TokenStatus.WAITING },
        });
      }

      // Record QueueEvent: HOLD_EXPIRED
      await EventService.createQueueEvent(
        hold.token.queueId,
        hold.tokenId,
        QueueEventType.HOLD_EXPIRED,
        {
          tokenNumber: hold.token.tokenNumber,
          expiredAt: currentTime.toISOString(),
          skipCount: hold.token.skipCount,
        },
        tx
      );

      // Create Notification: HOLD_EXPIRED
      await NotificationService.createNotification(
        hold.token.userId,
        NotificationType.HOLD_EXPIRED,
        "Smart Hold Expired",
        `Your Smart Hold for token #${hold.token.tokenNumber} in ${hold.token.queue.service.name} has expired. Your token is now active.`,
        tx
      );
    }

    return expiredHolds.length;
  }

  /**
   * Evaluates the front token for Smart Hold and applies Bounded Fair-Skip if active.
   * When skipCount < maxSkips:
   *   Moves frontToken back EXACTLY ONE position (swapping with the immediate next token).
   *   Re-spaces active token queueOrder to maintain clean, deterministic order.
   * When skipCount >= maxSkips:
   *   Moves frontToken to TAIL of the active queue.
   *   Clears/expires the active SmartHold.
   *   Resets skipCount = 0.
   */
  static async processBoundedSkip(tx, queueId, frontToken, activeHold, maxSkips, activeTokensInQueue) {
    const newSkipCount = frontToken.skipCount + 1;
    const currentPosition = 1;
    const otherTokens = activeTokensInQueue.filter((t) => t.id !== frontToken.id);

    if (newSkipCount < maxSkips) {
      if (otherTokens.length > 0) {
        const nextToken = otherTokens[0];
        const remainingTokens = otherTokens.slice(1);

        // New active queue ordering: [nextToken, frontToken, ...remainingTokens]
        const newOrderedList = [nextToken, frontToken, ...remainingTokens];

        for (let i = 0; i < newOrderedList.length; i++) {
          const t = newOrderedList[i];
          const orderValue = (i + 1) * 10;
          await tx.queueToken.update({
            where: { id: t.id },
            data: {
              queueOrder: orderValue,
              ...(t.id === frontToken.id ? { skipCount: newSkipCount } : {}),
            },
          });
        }
      } else {
        // Only 1 token in queue, increment skip count
        await tx.queueToken.update({
          where: { id: frontToken.id },
          data: { skipCount: newSkipCount },
        });
      }

      // Record QueueEvent: SKIPPED
      await EventService.createQueueEvent(
        queueId,
        frontToken.id,
        QueueEventType.SKIPPED,
        {
          tokenNumber: frontToken.tokenNumber,
          previousPosition: currentPosition,
          newPosition: otherTokens.length > 0 ? 2 : 1,
          skipCount: newSkipCount,
          maxSkips,
          reason: `Smart Hold active (${activeHold.reason})`,
        },
        tx
      );

      // Notification: SKIPPED
      await NotificationService.createNotification(
        frontToken.userId,
        NotificationType.SKIPPED,
        "Token Temporarily Skipped",
        `Your token #${frontToken.tokenNumber} was temporarily skipped because your Smart Hold is active. Skip ${newSkipCount} of ${maxSkips}.`,
        tx
      );

      return { action: "SKIPPED", newSkipCount };
    } else {
      // MAX_SKIPS reached: Move to tail, reset skipCount to 0, expire active hold
      const newOrderedList = [...otherTokens, frontToken];

      for (let i = 0; i < newOrderedList.length; i++) {
        const t = newOrderedList[i];
        const orderValue = (i + 1) * 10;
        await tx.queueToken.update({
          where: { id: t.id },
          data: {
            queueOrder: orderValue,
            ...(t.id === frontToken.id
              ? {
                  skipCount: 0,
                  status: TokenStatus.WAITING,
                }
              : {}),
          },
        });
      }

      // Clear / expire the active hold
      await tx.smartHold.update({
        where: { id: activeHold.id },
        data: { status: SmartHoldStatus.EXPIRED },
      });

      // Record QueueEvent: MOVED_TO_TAIL
      await EventService.createQueueEvent(
        queueId,
        frontToken.id,
        QueueEventType.MOVED_TO_TAIL,
        {
          tokenNumber: frontToken.tokenNumber,
          previousPosition: currentPosition,
          newPosition: newOrderedList.length,
          skipCount: maxSkips,
          maxSkips,
          reason: "Maximum Smart Hold skips reached",
        },
        tx
      );

      // Notification: MOVED_TO_TAIL
      await NotificationService.createNotification(
        frontToken.userId,
        NotificationType.MOVED_TO_TAIL,
        "Moved to Queue End",
        `Your Smart Hold skip limit (${maxSkips}/${maxSkips}) was reached. Token #${frontToken.tokenNumber} has moved to the end of the queue.`,
        tx
      );

      return { action: "MOVED_TO_TAIL", newSkipCount: 0 };
    }
  }
}
