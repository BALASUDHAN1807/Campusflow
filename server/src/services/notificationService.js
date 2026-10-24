import { prisma as defaultPrisma } from "../lib/prisma.js";
import { AppError } from "../middleware/error.middleware.js";

export class NotificationService {
  /**
   * Transactional notification creation.
   */
  static async createNotification(userId, type, title, message, tx) {
    if (!userId) {
      throw new AppError("userId is required to create a Notification.", 400);
    }

    const client = tx || defaultPrisma;

    return client.notification.create({
      data: {
        userId,
        type,
        title,
        message,
      },
    });
  }

  /**
   * Get user-scoped notifications with pagination, unread filtering, and unread count.
   */
  static async getUserNotifications(userId, options = {}) {
    const { page = 1, pageSize = 20, unreadOnly = false } = options;

    const where = {
      userId,
      ...(unreadOnly ? { read: false } : {}),
    };

    const take = Math.min(Math.max(pageSize, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;

    const [notifications, total, unreadCount] = await Promise.all([
      defaultPrisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      defaultPrisma.notification.count({ where }),
      defaultPrisma.notification.count({
        where: { userId, read: false },
      }),
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        page,
        pageSize: take,
        total,
        totalPages: Math.ceil(total / take) || 1,
      },
    };
  }

  /**
   * Mark a single notification as read by the owner.
   */
  static async markNotificationRead(notificationId, userId) {
    const notification = await defaultPrisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new AppError("Notification not found.", 404);
    }

    if (notification.userId !== userId) {
      throw new AppError("You do not have permission to modify this notification.", 403);
    }

    return defaultPrisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  /**
   * Mark all notifications belonging to the authenticated user as read.
   */
  static async markAllRead(userId) {
    const result = await defaultPrisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return {
      updatedCount: result.count,
    };
  }

  /**
   * Fast unread count for navbar badge polling.
   */
  static async getUnreadCount(userId) {
    const unreadCount = await defaultPrisma.notification.count({
      where: { userId, read: false },
    });

    return { unreadCount };
  }
}
