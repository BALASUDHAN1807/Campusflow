import { QueueService } from "../services/queueService.js";
import { EventService } from "../services/eventService.js";
import { sendSuccess } from "../utils/response.js";

export async function joinQueueController(req, res, next) {
  try {
    const { queueId } = req.params;
    const userId = req.user.id;

    const result = await QueueService.joinQueue(queueId, userId);
    sendSuccess(res, result, "Successfully joined queue", 201);
  } catch (error) {
    next(error);
  }
}

export async function getQueueStatusController(req, res, next) {
  try {
    const { queueId } = req.params;
    const currentUserId = req.user?.id;

    const result = await QueueService.getQueueStatus(queueId, currentUserId);
    sendSuccess(res, result, undefined, 200);
  } catch (error) {
    next(error);
  }
}

export async function getMyActiveTokensController(req, res, next) {
  try {
    const userId = req.user.id;
    const result = await QueueService.getMyActiveTokens(userId);
    sendSuccess(res, result, undefined, 200);
  } catch (error) {
    next(error);
  }
}

export async function getTokenDetailsController(req, res, next) {
  try {
    const { tokenId } = req.params;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    const result = await QueueService.getTokenDetails(tokenId, currentUserId, currentUserRole);
    sendSuccess(res, result, undefined, 200);
  } catch (error) {
    next(error);
  }
}

export async function cancelTokenController(req, res, next) {
  try {
    const { tokenId } = req.params;
    const userId = req.user.id;

    const result = await QueueService.cancelToken(tokenId, userId);
    sendSuccess(res, result, "Token cancelled successfully", 200);
  } catch (error) {
    next(error);
  }
}

export async function declareSmartHoldController(req, res, next) {
  try {
    const { queueId } = req.params;
    const userId = req.user.id;
    const { startTime, endTime, reason } = req.body;

    const result = await QueueService.declareSmartHold(queueId, userId, { startTime, endTime, reason });
    sendSuccess(res, result, "Smart Hold declared successfully", 201);
  } catch (error) {
    next(error);
  }
}

export async function cancelSmartHoldController(req, res, next) {
  try {
    const { queueId } = req.params;
    const userId = req.user.id;

    const result = await QueueService.cancelSmartHold(queueId, userId);
    sendSuccess(res, result, "Smart Hold cancelled successfully", 200);
  } catch (error) {
    next(error);
  }
}

export async function callNextController(req, res, next) {
  try {
    const { queueId } = req.params;
    const result = await QueueService.callNext(queueId);
    sendSuccess(res, result, "Next token called to desk", 200);
  } catch (error) {
    next(error);
  }
}

export async function completeTokenController(req, res, next) {
  try {
    const { tokenId } = req.params;
    const result = await QueueService.completeToken(tokenId);
    sendSuccess(res, result, "Consultation marked as completed", 200);
  } catch (error) {
    next(error);
  }
}

export async function markNoShowController(req, res, next) {
  try {
    const { tokenId } = req.params;
    const result = await QueueService.markNoShow(tokenId);
    sendSuccess(res, result, "Token marked as no-show", 200);
  } catch (error) {
    next(error);
  }
}

export async function pauseQueueController(req, res, next) {
  try {
    const { queueId } = req.params;
    const result = await QueueService.pauseQueue(queueId);
    sendSuccess(res, result, "Queue intake paused", 200);
  } catch (error) {
    next(error);
  }
}

export async function resumeQueueController(req, res, next) {
  try {
    const { queueId } = req.params;
    const result = await QueueService.resumeQueue(queueId);
    sendSuccess(res, result, "Queue intake resumed", 200);
  } catch (error) {
    next(error);
  }
}

export async function closeQueueController(req, res, next) {
  try {
    const { queueId } = req.params;
    const result = await QueueService.closeQueue(queueId);
    sendSuccess(res, result, "Queue closed successfully", 200);
  } catch (error) {
    next(error);
  }
}

export async function getCurrentServingController(req, res, next) {
  try {
    const { queueId } = req.params;
    const result = await QueueService.getCurrentServing(queueId);
    sendSuccess(res, result, undefined, 200);
  } catch (error) {
    next(error);
  }
}

export async function getQueueStatsController(req, res, next) {
  try {
    const { queueId } = req.params;
    const result = await QueueService.getQueueStats(queueId);
    sendSuccess(res, result, undefined, 200);
  } catch (error) {
    next(error);
  }
}

export async function getQueueEventsController(req, res, next) {
  try {
    const { queueId } = req.params;
    const result = await EventService.getEventsByQueueId(queueId);
    sendSuccess(res, result, undefined, 200);
  } catch (error) {
    next(error);
  }
}

export async function getStaffQueuesController(_req, res, next) {
  try {
    const result = await QueueService.getStaffQueues();
    sendSuccess(res, result, undefined, 200);
  } catch (error) {
    next(error);
  }
}

export async function getStaffQueueDetailsController(req, res, next) {
  try {
    const { queueId } = req.params;
    const result = await QueueService.getStaffQueueDetails(queueId);
    sendSuccess(res, result, undefined, 200);
  } catch (error) {
    next(error);
  }
}

export async function getAvailableServicesController(_req, res, next) {
  try {
    const result = await QueueService.getAvailableServices();
    sendSuccess(res, result, undefined, 200);
  } catch (error) {
    next(error);
  }
}

export async function updateQueueConfigController(req, res, next) {
  try {
    const { queueId } = req.params;
    const { maxSkips, minLeadTime, maxHoldDuration } = req.body;

    const result = await QueueService.updateQueueConfig(queueId, {
      maxSkips,
      minLeadTime,
      maxHoldDuration,
    });
    sendSuccess(res, result, "Queue configuration updated successfully", 200);
  } catch (error) {
    next(error);
  }
}

export async function getStaffAnalyticsController(req, res, next) {
  try {
    const queueId = req.params.queueId || req.query.queueId || undefined;
    const timeRange = req.query.timeRange || "today";
    const startDate = req.query.startDate || undefined;
    const endDate = req.query.endDate || undefined;

    const result = await QueueService.getStaffAnalytics({
      queueId,
      timeRange,
      startDate,
      endDate,
    });
    sendSuccess(res, result, undefined, 200);
  } catch (error) {
    next(error);
  }
}
