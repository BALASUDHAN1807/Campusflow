import { QueueStatus, TokenStatus } from "@prisma/client";

export class QueueTransitions {
  static canJoinQueue(status) {
    return status === QueueStatus.OPEN;
  }

  static canCallNext(currentServingTokenCount) {
    return currentServingTokenCount === 0;
  }

  static canStudentCancel(status) {
    return status === TokenStatus.WAITING || status === TokenStatus.HOLD;
  }

  static canCompleteToken(status) {
    return status === TokenStatus.SERVING;
  }

  static canMarkNoShow(status) {
    return status === TokenStatus.SERVING;
  }

  static canPauseQueue(status) {
    return status === QueueStatus.OPEN;
  }

  static canResumeQueue(status) {
    return status === QueueStatus.PAUSED;
  }

  static canCloseQueue(status) {
    return status === QueueStatus.OPEN || status === QueueStatus.PAUSED;
  }
}
