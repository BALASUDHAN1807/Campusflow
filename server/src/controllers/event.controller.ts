import { Request, Response, NextFunction } from "express";
import { EventService } from "../services/eventService.js";
import { sendSuccess } from "../utils/response.js";

export async function getEventsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const queueId = (req.params.queueId as string) || (req.query.queueId as string) || undefined;
    const eventType = (req.query.eventType as string) || undefined;
    const tokenNumber = req.query.tokenNumber ? parseInt(req.query.tokenNumber as string, 10) : undefined;
    const search = (req.query.search as string) || undefined;
    const dateRange = (req.query.dateRange as string) || undefined;
    const sortOrder = (req.query.sortOrder as "asc" | "desc") || "desc";
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20;

    const userId = req.user!.id;
    const userRole = req.user!.role;

    const result = await EventService.getEvents({
      queueId,
      eventType,
      tokenNumber,
      search,
      dateRange,
      sortOrder,
      page,
      pageSize,
      userId,
      userRole,
    });

    sendSuccess(res, result, undefined, 200);
  } catch (error) {
    next(error);
  }
}

export async function getEventDetailsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { eventId } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const result = await EventService.getEventDetails(eventId, userId, userRole);
    sendSuccess(res, result, undefined, 200);
  } catch (error) {
    next(error);
  }
}
