import { EventService } from "../services/eventService.js";
import { sendSuccess } from "../utils/response.js";

export async function getEventsController(req, res, next) {
  try {
    const queueId = req.params.queueId || req.query.queueId || undefined;
    const eventType = req.query.eventType || undefined;
    const tokenNumber = req.query.tokenNumber ? parseInt(req.query.tokenNumber, 10) : undefined;
    const search = req.query.search || undefined;
    const dateRange = req.query.dateRange || undefined;
    const sortOrder = req.query.sortOrder || "desc";
    const page = req.query.page ? parseInt(req.query.page, 10) : 1;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize, 10) : 20;

    const userId = req.user.id;
    const userRole = req.user.role;

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

export async function getEventDetailsController(req, res, next) {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const result = await EventService.getEventDetails(eventId, userId, userRole);
    sendSuccess(res, result, undefined, 200);
  } catch (error) {
    next(error);
  }
}
