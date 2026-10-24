import { TokenStatus, QueueEventType, NotificationType } from "@prisma/client";
import { SmartHoldEngine } from "./smartHoldEngine.js";
import { EventService } from "../services/eventService.js";
import { NotificationService } from "../services/notificationService.js";
import { AppError } from "../middleware/error.middleware.js";

export class QueueEligibilityEngine {
  /**
   * Fetches active tokens (WAITING or HOLD) sorted by deterministic queueOrder, joinedAt, tokenNumber.
   */
  static async getActiveTokensInQueue(tx, queueId) {
    return tx.queueToken.findMany({
      where: {
        queueId,
        status: { in: [TokenStatus.WAITING, TokenStatus.HOLD] },
      },
      include: {
        smartHolds: {
          where: { status: "ACTIVE" },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ queueOrder: "asc" }, { joinedAt: "asc" }, { tokenNumber: "asc" }],
    });
  }

  /**
   * Executes the Bounded Fair-Skip algorithm on CALL NEXT:
   * 1. Evaluates front token.
   * 2. If hold is active: increments skipCount, moves back 1 position or to tail, and re-evaluates.
   * 3. Prevents re-skipping the same token multiple times in a single CALL NEXT action.
   * 4. If hold is not active / none: marks token SERVING and returns.
   * 5. Prevents infinite loops if all tokens are held.
   */
  static async processCallNext(tx, queueId, maxSkips) {
    const skippedHistory = [];
    const evaluatedInThisCall = new Set();

    // Expire any holds whose endTime has passed first
    await SmartHoldEngine.expireSmartHolds(tx, queueId);

    // Initial check of active tokens
    let activeTokens = await this.getActiveTokensInQueue(tx, queueId);

    if (activeTokens.length === 0) {
      return { servedToken: null, skippedTokens: [], allHeld: false };
    }

    const maxIterations = Math.max(20, activeTokens.length * 2 + 5);
    let iterations = 0;

    while (iterations < maxIterations) {
      iterations++;

      // Re-fetch current active tokens order
      activeTokens = await this.getActiveTokensInQueue(tx, queueId);

      if (activeTokens.length === 0) {
        return { servedToken: null, skippedTokens: skippedHistory, allHeld: false };
      }

      const now = new Date();

      // Check if EVERY active token currently has an active hold window
      const allTokensHeld = activeTokens.every((token) => {
        const activeHold = token.smartHolds[0];
        return SmartHoldEngine.isHoldWindowActive(activeHold, now);
      });

      if (allTokensHeld) {
        return { servedToken: null, skippedTokens: skippedHistory, allHeld: true };
      }

      const frontToken = activeTokens[0];
      const activeHold = frontToken.smartHolds[0];

      // If the front token is on active hold:
      if (activeHold && SmartHoldEngine.isHoldWindowActive(activeHold, now)) {
        // If this token was ALREADY evaluated in this current call-next operation,
        // we should move it behind the first unevaluated token so we don't bounce back and forth
        if (evaluatedInThisCall.has(frontToken.id)) {
          const unevaluatedIndex = activeTokens.findIndex((t) => !evaluatedInThisCall.has(t.id));
          if (unevaluatedIndex === -1) {
            // All active tokens are held or already evaluated in this call
            return { servedToken: null, skippedTokens: skippedHistory, allHeld: true };
          }

          // Re-order so the next unevaluated token is brought forward
          const unevaluatedToken = activeTokens[unevaluatedIndex];
          const remaining = activeTokens.filter((t) => t.id !== unevaluatedToken.id);
          const reordered = [unevaluatedToken, ...remaining];

          for (let i = 0; i < reordered.length; i++) {
            await tx.queueToken.update({
              where: { id: reordered[i].id },
              data: { queueOrder: (i + 1) * 10 },
            });
          }

          continue;
        }

        evaluatedInThisCall.add(frontToken.id);

        // Process bounded skip for front token
        const skipResult = await SmartHoldEngine.processBoundedSkip(
          tx,
          queueId,
          frontToken,
          activeHold,
          maxSkips,
          activeTokens
        );

        skippedHistory.push({
          tokenId: frontToken.id,
          tokenNumber: frontToken.tokenNumber,
          action: skipResult.action,
          skipCount: skipResult.newSkipCount,
        });

        // Loop continues to re-evaluate the new front token
        continue;
      }

      // Token is eligible to be served!
      const servedToken = await tx.queueToken.update({
        where: { id: frontToken.id },
        data: {
          status: TokenStatus.SERVING,
          servingAt: now,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      // Audit Event: SERVING
      await EventService.createQueueEvent(
        queueId,
        servedToken.id,
        QueueEventType.SERVING,
        {
          tokenNumber: servedToken.tokenNumber,
          studentName: servedToken.user.name,
        },
        tx
      );

      // Notification: TURN_APPROACHING
      await NotificationService.createNotification(
        servedToken.userId,
        NotificationType.TURN_APPROACHING,
        "It's Your Turn!",
        `Token #${servedToken.tokenNumber} is now being served at the desk. Please proceed immediately.`,
        tx
      );

      return {
        servedToken,
        skippedTokens: skippedHistory,
        allHeld: false,
      };
    }

    throw new AppError("Call next evaluation exceeded safe loop limit.", 500);
  }
}
