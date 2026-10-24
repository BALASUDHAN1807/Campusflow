import api from "./api";

export const queueService = {
  // Public / Service Discovery
  async getAvailableServices() {
    return api.get("/services");
  },

  // Student Endpoints
  async joinQueue(queueId) {
    return api.post(`/queue/${queueId}/join`);
  },

  async getMyActiveTokens() {
    return api.get("/queue/my-active");
  },

  async getQueueStatus(queueId) {
    return api.get(`/queue/${queueId}/status`);
  },

  async declareSmartHold(queueId, data) {
    return api.post(`/queue/${queueId}/hold`, data);
  },

  async cancelSmartHold(queueId) {
    return api.post(`/queue/${queueId}/hold/cancel`);
  },

  async getTokenDetails(tokenId) {
    return api.get(`/token/${tokenId}`);
  },

  async cancelToken(tokenId) {
    return api.post(`/token/${tokenId}/cancel`);
  },

  async getCurrentServing(queueId) {
    return api.get(`/queue/${queueId}/current-serving`);
  },

  // Staff Endpoints
  async callNext(queueId) {
    return api.post(`/queue/${queueId}/call-next`);
  },

  async completeToken(tokenId) {
    return api.post(`/token/${tokenId}/complete`);
  },

  async markNoShow(tokenId) {
    return api.post(`/token/${tokenId}/no-show`);
  },

  async pauseQueue(queueId) {
    return api.post(`/queue/${queueId}/pause`);
  },

  async resumeQueue(queueId) {
    return api.post(`/queue/${queueId}/resume`);
  },

  async closeQueue(queueId) {
    return api.post(`/queue/${queueId}/close`);
  },

  async getQueueStats(queueId) {
    return api.get(`/queue/${queueId}/stats`);
  },

  async getQueueEvents(queueId) {
    return api.get(`/queue/${queueId}/events`);
  },

  async getStaffQueues() {
    return api.get("/staff/queues");
  },

  async getStaffQueueDetails(queueId) {
    return api.get(`/staff/queue/${queueId}`);
  },

  async updateQueueConfig(queueId, config) {
    return api.patch(`/queue/${queueId}/config`, config);
  },

  async getStaffAnalytics(params) {
    const searchParams = new URLSearchParams();
    if (params?.queueId) searchParams.append("queueId", params.queueId);
    if (params?.timeRange) searchParams.append("timeRange", params.timeRange);
    if (params?.startDate) searchParams.append("startDate", params.startDate);
    if (params?.endDate) searchParams.append("endDate", params.endDate);
    const queryString = searchParams.toString();
    return api.get(`/staff/analytics${queryString ? `?${queryString}` : ""}`);
  },
};

export default queueService;
