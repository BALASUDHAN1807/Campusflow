import { Request, Response, NextFunction } from "express";
import { QueueService } from "../services/queueService.js";
import { EventService } from "../services/eventService.js";
import { sendSuccess } from "../utils/response.js";

export async function joinQueueController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { queueId } = req.params;
    const userId = req.user!.id;

    const result = await QueueService.joinQueue(queueId, userId);
    sendSuccess(res, result, "Successfully joined queue", 201);
  } catch (error) {
    next(error);
  }
}

export async function getQueueStatusController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { queueId } = req.params;
    const currentUserId = req.user?.id;

    const result = await QueueService.getQueueStatus(queueId, currentUserId);
    sendSuccess(res, result, undefined, 200);
  } catch (error) {
    next(error);
  }
}

export async function getMyActiveTokensController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const result = await QueueService.getMyActiveTokens(userId);
    sendSuccess(res, result, undefined, 200);
  } catch (error) {
    next(error);
  }
}

export async function getTokenDetailsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tokenId } = req.params;
    const currentUserId = req.user!.id;
    const currentUserRole = req.user!.role;

    const result = await QueueService.getTokenDetails(tokenId, currentUserId, currentUserRole);
    sendSuccess(res, result, undefined, 200);
  } catch (error) {
    next(error);
  }
}

export async function cancelTokenController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tokenId } = req.params;
    const userId = req.user!.id;

    const result = await QueueService.cancelToken(tokenId, userId);
    sendSuccess(res, result, "Token cancelled successfully", 200);
  } catch (error) {
    next(error);
  }
}

export async function declareSmartHoldController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { queueId } = req.params;
    const userId = req.user!.id;
    const { startTime, endTime, reason } = req.body;

    const result = await QueueService.declareSmartHold(queueId, userId, { startTime, endTime, reason });
    sendSuccess(res, result, "Smart Hold declared successfully", 201);
  } catch (error) {
    next(error);
  }
}

export async function cancelSmartHoldController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { queueId } = req.params;
    const userId = req.user!.id;

    const result = await QueueService.cancelSmartHold(queueId, userId);
    sendSuccess(res, result, "Smart Hold cancelled successfully", 200);
  } catch (error) {
    next(error);
  }
}

export async function callNextController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { queueId } = req.params;
    const result = await QueueService.callNext(queueId);
    sendSuccess(res, result, "Next token called to desk", 200);
  } catch (error) {
    next(error);
  }
}

export async function completeTokenController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tokenId } = req.params;
    const result = await QueueService.completeToken(tokenId);
    sendSuccess(res, result, "Consultation marked as completed", 200);
  } catch (error) {
    next(error);
  }
}

export async function markNoShowController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tokenId } = req.params;
    const result = await QueueService.markNoShow(tokenId);
    sendSuccess(res, result, "Token marked as no-show", 200);
  } catch (error) {
    next(error);
  }
}

export async function pauseQueueController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { queueId } = req.params;
    const result = await QueueService.pauseQueue(queueId);
    sendSuccess(res, result, "Queue intake paused", 200);
  } catch (error) {
    next(error);
  }
}

export async function resumeQueueController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { queueId } = req.params;
    const result = await QueueService.resumeQueue(queueId);
    sendSuccess(res, result, "Queue intake resumed", 200);
  } catch (error) {
    next(error);
  }
}

export async function closeQueueController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { queueId } = req.params;
    const result = await QueueService.closeQueue(queueId);
    sendSuccess(res, result, "Queue closed successfully", 200);
  } catch (error) {
    next(error);
  }
}

export async function getCurrentServingController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { queueId } = req.params;
    const result = await QueueService.getCurrentServing(queueId);
    sendSuccess(res, result, undefined, 200);
  } catch (error) {
    next(error);
  }
}

export async function getQueueStatsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { queueId } = req.params;
    const result = await QueueService.getQueueStats(queueId);
    sendSuccess(res, result, undefined, 200);
  } catch (error) {
    next(error);
  }
}

export async function getQueueEventsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { queueId } = req.params;
    const result = await EventService.getEventsByQueueId(queueId);
    sendSuccess(res, result, undefined, 200);
  } catch (error) {
    next(error);
  }
}

export async function getStaffQueuesController(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await QueueService.getStaffQueues();
    sendSuccess(res, result, undefined, 200);
  } catch (error) {
    next(error);
  }
}

export async function getStaffQueueDetailsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { queueId } = req.params;
    const result = await QueueService.getStaffQueueDetails(queueId);
    sendSuccess(res, result, undefined, 200);
  } catch (error) {
    next(error);
  }
}

export async function getAvailableServicesController(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await QueueService.getAvailableServices();
    sendSuccess(res, result, undefined, 200);
  } catch (error) {
    next(error);
  }
}

export async function updateQueueConfigController(req: Request, res: Response, next: NextFunction): Promise<void> {
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

export async function getStaffAnalyticsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const queueId = (req.params.queueId as string) || (req.query.queueId as string) || undefined;
    const timeRange = (req.query.timeRange as string) || "today";
    const startDate = (req.query.startDate as string) || undefined;
    const endDate = (req.query.endDate as string) || undefined;

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


