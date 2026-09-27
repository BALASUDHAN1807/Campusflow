import api from "./api";
import { ApiResponse, NotificationItem, PaginatedResponse } from "../types";

export interface NotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}

export const notificationService = {
  /**
   * Fetch notifications with optional pagination and unread filtering.
   */
  async getNotifications(params?: {
    page?: number;
    pageSize?: number;
    unreadOnly?: boolean;
  }): Promise<ApiResponse<PaginatedResponse<NotificationItem>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.pageSize) searchParams.append("pageSize", params.pageSize.toString());
    if (params?.unreadOnly) searchParams.append("unreadOnly", "true");

    const queryString = searchParams.toString();
    return api.get<PaginatedResponse<NotificationItem>>(`/notifications${queryString ? `?${queryString}` : ""}`);
  },

  /**
   * Fast unread count for badge polling.
   */
  async getUnreadCount(): Promise<ApiResponse<{ unreadCount: number }>> {
    return api.get<{ unreadCount: number }>("/notifications/unread-count");
  },

  /**
   * Mark a single notification as read.
   */
  async markAsRead(notificationId: string): Promise<ApiResponse<NotificationItem>> {
    return api.patch<NotificationItem>(`/notifications/${notificationId}/read`);
  },

  /**
   * Mark all notifications for the authenticated user as read.
   */
  async markAllAsRead(): Promise<ApiResponse<{ updatedCount: number }>> {
    return api.patch<{ updatedCount: number }>("/notifications/read-all");
  },
};

export default notificationService;
