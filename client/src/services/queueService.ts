import api from "./api";
import { ApiResponse, StaffAnalyticsData } from "../types";

export interface JoinQueueResponse {
  tokenId: string;
  tokenNumber: number;
  status: string;
  position: number;
  peopleAhead: number;
  serviceName: string;
  joinedAt: string;
}

export interface ActiveTokenInfo {
  tokenId: string;
  queueId: string;
  serviceName: string;
  tokenNumber: number;
  status: string;
  position: number | null;
  peopleAhead: number;
  skipCount: number;
  maxSkips?: number;
  joinedAt: string;
  servingAt?: string;
  smartHold?: any;
}

export const queueService = {
  // Public / Service Discovery
  async getAvailableServices() {
    return api.get<any[]>("/services");
  },

  // Student Endpoints
  async joinQueue(queueId: string): Promise<ApiResponse<JoinQueueResponse>> {
    return api.post<JoinQueueResponse>(`/queue/${queueId}/join`);
  },

  async getMyActiveTokens(): Promise<ApiResponse<ActiveTokenInfo[]>> {
    return api.get<ActiveTokenInfo[]>("/queue/my-active");
  },

  async getQueueStatus(queueId: string): Promise<ApiResponse<any>> {
    return api.get<any>(`/queue/${queueId}/status`);
  },

  async declareSmartHold(
    queueId: string,
    data: { startTime: string; endTime: string; reason: string }
  ): Promise<ApiResponse<any>> {
    return api.post<any>(`/queue/${queueId}/hold`, data);
  },

  async cancelSmartHold(queueId: string): Promise<ApiResponse<any>> {
    return api.post<any>(`/queue/${queueId}/hold/cancel`);
  },

  async getTokenDetails(tokenId: string): Promise<ApiResponse<any>> {
    return api.get<any>(`/token/${tokenId}`);
  },

  async cancelToken(tokenId: string): Promise<ApiResponse<any>> {
    return api.post<any>(`/token/${tokenId}/cancel`);
  },

  async getCurrentServing(queueId: string): Promise<ApiResponse<any>> {
    return api.get<any>(`/queue/${queueId}/current-serving`);
  },

  // Staff Endpoints
  async callNext(queueId: string): Promise<ApiResponse<any>> {
    return api.post<any>(`/queue/${queueId}/call-next`);
  },

  async completeToken(tokenId: string): Promise<ApiResponse<any>> {
    return api.post<any>(`/token/${tokenId}/complete`);
  },

  async markNoShow(tokenId: string): Promise<ApiResponse<any>> {
    return api.post<any>(`/token/${tokenId}/no-show`);
  },

  async pauseQueue(queueId: string): Promise<ApiResponse<any>> {
    return api.post<any>(`/queue/${queueId}/pause`);
  },

  async resumeQueue(queueId: string): Promise<ApiResponse<any>> {
    return api.post<any>(`/queue/${queueId}/resume`);
  },

  async closeQueue(queueId: string): Promise<ApiResponse<any>> {
    return api.post<any>(`/queue/${queueId}/close`);
  },

  async getQueueStats(queueId: string): Promise<ApiResponse<any>> {
    return api.get<any>(`/queue/${queueId}/stats`);
  },

  async getQueueEvents(queueId: string): Promise<ApiResponse<any>> {
    return api.get<any>(`/queue/${queueId}/events`);
  },

  async getStaffQueues(): Promise<ApiResponse<any[]>> {
    return api.get<any[]>("/staff/queues");
  },

  async getStaffQueueDetails(queueId: string): Promise<ApiResponse<any>> {
    return api.get<any>(`/staff/queue/${queueId}`);
  },

  async updateQueueConfig(
    queueId: string,
    config: { maxSkips: number; minLeadTime: number; maxHoldDuration: number }
  ): Promise<ApiResponse<any>> {
    return api.patch<any>(`/queue/${queueId}/config`, config);
  },

  async getStaffAnalytics(params?: {
    queueId?: string;
    timeRange?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<StaffAnalyticsData>> {
    const searchParams = new URLSearchParams();
    if (params?.queueId) searchParams.append("queueId", params.queueId);
    if (params?.timeRange) searchParams.append("timeRange", params.timeRange);
    if (params?.startDate) searchParams.append("startDate", params.startDate);
    if (params?.endDate) searchParams.append("endDate", params.endDate);
    const queryString = searchParams.toString();
    return api.get<StaffAnalyticsData>(`/staff/analytics${queryString ? `?${queryString}` : ""}`);
  },
};

export default queueService;

