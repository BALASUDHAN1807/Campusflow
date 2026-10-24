import { NotificationService } from "../services/notificationService.js";
import { sendSuccess } from "../utils/response.js";

export async function getNotificationsController(req, res, next) {
  try {
    const userId = req.user.id;
    const page = req.query.page ? parseInt(req.query.page, 10) : 1;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize, 10) : 20;
    const unreadOnly = req.query.unreadOnly === "true" || req.query.unreadOnly === "1";

    const result = await NotificationService.getUserNotifications(userId, {
      page,
      pageSize,
      unreadOnly,
    });

    sendSuccess(res, result, undefined, 200);
  } catch (error) {
    next(error);
  }
}

export async function getUnreadCountController(req, res, next) {
  try {
    const userId = req.user.id;
    const result = await NotificationService.getUnreadCount(userId);
    sendSuccess(res, result, undefined, 200);
  } catch (error) {
    next(error);
  }
}

export async function markNotificationReadController(req, res, next) {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;
    const result = await NotificationService.markNotificationRead(notificationId, userId);
    sendSuccess(res, result, "Notification marked as read", 200);
  } catch (error) {
    next(error);
  }
}

export async function markAllNotificationsReadController(req, res, next) {
  try {
    const userId = req.user.id;
    const result = await NotificationService.markAllRead(userId);
    sendSuccess(res, result, "All notifications marked as read", 200);
  } catch (error) {
    next(error);
  }
}
