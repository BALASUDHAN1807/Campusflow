import { QueueStatus, TokenStatus } from "@prisma/client";

export class QueueTransitions {
  public static canJoinQueue(status: QueueStatus): boolean {
    return status === QueueStatus.OPEN;
  }

  public static canCallNext(currentServingTokenCount: number): boolean {
    return currentServingTokenCount === 0;
  }

  public static canStudentCancel(status: TokenStatus): boolean {
    return status === TokenStatus.WAITING || status === TokenStatus.HOLD;
  }

  public static canCompleteToken(status: TokenStatus): boolean {
    return status === TokenStatus.SERVING;
  }

  public static canMarkNoShow(status: TokenStatus): boolean {
    return status === TokenStatus.SERVING;
  }

  public static canPauseQueue(status: QueueStatus): boolean {
    return status === QueueStatus.OPEN;
  }

  public static canResumeQueue(status: QueueStatus): boolean {
    return status === QueueStatus.PAUSED;
  }

  public static canCloseQueue(status: QueueStatus): boolean {
    return status === QueueStatus.OPEN || status === QueueStatus.PAUSED;
  }
}
