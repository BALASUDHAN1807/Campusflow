import api from "./api";

export const notificationService = {
  /**
   * Fetch notifications with optional pagination and unread filtering.
   */
  async getNotifications(params) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.pageSize) searchParams.append("pageSize", params.pageSize.toString());
    if (params?.unreadOnly) searchParams.append("unreadOnly", "true");

    const queryString = searchParams.toString();
    return api.get(`/notifications${queryString ? `?${queryString}` : ""}`);
  },

  /**
   * Fast unread count for badge polling.
   */
  async getUnreadCount() {
    return api.get("/notifications/unread-count");
  },

  /**
   * Mark a single notification as read.
   */
  async markAsRead(notificationId) {
    return api.patch(`/notifications/${notificationId}/read`);
  },

  /**
   * Mark all notifications for the authenticated user as read.
   */
  async markAllAsRead() {
    return api.patch("/notifications/read-all");
  },
};

export default notificationService;
