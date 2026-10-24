import api from "./api";

export const eventService = {
  /**
   * Fetch queue events with server-side filters, search, and pagination.
   */
  async getEvents(params) {
    const searchParams = new URLSearchParams();
    if (params?.queueId) searchParams.append("queueId", params.queueId);
    if (params?.eventType && params.eventType !== "ALL") searchParams.append("eventType", params.eventType);
    if (params?.tokenNumber) searchParams.append("tokenNumber", params.tokenNumber.toString());
    if (params?.search) searchParams.append("search", params.search);
    if (params?.dateRange) searchParams.append("dateRange", params.dateRange);
    if (params?.sortOrder) searchParams.append("sortOrder", params.sortOrder);
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.pageSize) searchParams.append("pageSize", params.pageSize.toString());

    const queryString = searchParams.toString();
    return api.get(`/events${queryString ? `?${queryString}` : ""}`);
  },

  /**
   * Fetch events specifically scoped to a queue.
   */
  async getQueueEvents(queueId, params) {
    return this.getEvents({ ...params, queueId });
  },

  /**
   * Fetch detailed event record for the Event Details Drawer.
   */
  async getEventDetails(eventId) {
    return api.get(`/events/${eventId}`);
  },
};

export default eventService;
