import { PrismaClient, TokenStatus } from "@prisma/client";

export interface PositionCalculationResult {
  position: number | null;
  peopleAhead: number;
}

export class QueuePositionEngine {
  /**
   * Calculates the real-time dynamic queue position and people ahead.
   * Position is NEVER persisted in the database; it is dynamically derived
   * based on the active queue ordering (queueOrder ASC, joinedAt ASC, tokenNumber ASC).
   */
  public static async calculatePosition(
    prisma: PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0],
    queueId: string,
    tokenId: string,
    tokenStatus: TokenStatus,
    _joinedAt?: Date,
    _queueOrder: number = 0
  ): Promise<PositionCalculationResult> {
    if (tokenStatus === TokenStatus.SERVING) {
      return {
        position: 0,
        peopleAhead: 0,
      };
    }

    if (
      tokenStatus === TokenStatus.COMPLETED ||
      tokenStatus === TokenStatus.CANCELLED ||
      tokenStatus === TokenStatus.NO_SHOW
    ) {
      return {
        position: null,
        peopleAhead: 0,
      };
    }

    // Fetch all active tokens for this queue in ordering sequence
    const activeTokens = await prisma.queueToken.findMany({
      where: {
        queueId,
        status: { in: [TokenStatus.WAITING, TokenStatus.HOLD] },
      },
      select: {
        id: true,
      },
      orderBy: [
        { queueOrder: "asc" },
        { joinedAt: "asc" },
        { tokenNumber: "asc" },
      ],
    });

    const index = activeTokens.findIndex((t) => t.id === tokenId);

    if (index === -1) {
      return {
        position: null,
        peopleAhead: 0,
      };
    }

    return {
      position: index + 1,
      peopleAhead: index,
    };
  }
}
