export type UserRole = "STUDENT" | "STAFF";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
}

export type QueueStatus = "OPEN" | "PAUSED" | "CLOSED" | "active" | "paused" | "closed";

export type TokenStatus = 
  | "WAITING"
  | "HOLD"
  | "SERVING"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW"
  | "waiting"
  | "called"
  | "serving"
  | "on_hold"
  | "completed"
  | "cancelled"
  | "no_show";

export type HoldStatus = "none" | "active" | "extended" | "expired" | "ACTIVE" | "EXPIRED" | "CANCELLED";

export interface SmartHoldDetails {
  id: string;
  tokenId: string;
  startTime: string;
  endTime: string;
  reason: string;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  isCurrentlyActive?: boolean;
}

export interface StudentActiveToken {
  tokenId: string;
  queueId: string;
  serviceName: string;
  tokenNumber: number;
  status: TokenStatus;
  position: number | null;
  peopleAhead: number;
  skipCount: number;
  maxSkips: number;
  joinedAt: string;
  servingAt?: string;
  smartHold?: SmartHoldDetails | null;
}

export interface StudentServiceItem {
  id: string;
  name: string;
  description: string;
  active: boolean;
  queues: Array<{
    id: string;
    status: QueueStatus;
    maxSkips: number;
    minLeadTime: number;
    maxHoldDuration: number;
  }>;
}

export interface StudentQueueStatus {
  queueId: string;
  serviceName: string;
  serviceDescription: string;
  status: QueueStatus;
  totalWaiting: number;
  totalOnHold: number;
  currentServing: {
    tokenId: string;
    tokenNumber: number;
    studentName: string;
    servingAt: string;
  } | null;
  myToken: {
    tokenId: string;
    tokenNumber: number;
    status: TokenStatus;
    position: number | null;
    peopleAhead: number;
    skipCount: number;
    joinedAt: string;
    smartHold: SmartHoldDetails | null;
  } | null;
  config: {
    maxSkips: number;
    minLeadTime: number;
    maxHoldDuration: number;
  };
}

export interface StudentNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface QueueItem {
  id: string;
  tokenNumber: string;
  studentName: string;
  studentId: string;
  serviceType: string;
  status: TokenStatus;
  joinedAt: string;
  estimatedWaitMinutes: number;
  position: number;
  skipCount: number;
  holdStatus: HoldStatus;
  holdExpiresAt?: string;
  counterAssigned?: string;
}

export interface StaffQueueStats {
  waiting: number;
  onHold: number;
  serving: number;
  completed: number;
  cancelled: number;
  noShow: number;
}

export interface StaffCurrentServing {
  tokenId: string;
  tokenNumber: number;
  status: TokenStatus;
  servingAt: string;
  studentName?: string;
  serviceName?: string;
}

export interface StaffWaitingToken {
  tokenId: string;
  tokenNumber: number;
  studentName?: string;
  studentEmail?: string;
  status: TokenStatus;
  position: number;
  peopleAhead: number;
  skipCount: number;
  maxSkips: number;
  joinedAt: string;
  smartHold?: SmartHoldDetails | null;
}

export interface StaffEventItem {
  id: string;
  queueId: string;
  serviceName?: string;
  tokenId?: string | null;
  eventType: string;
  metadata?: any;
  createdAt: string;
  token?: {
    tokenId?: string;
    tokenNumber: number;
    status: TokenStatus;
    skipCount?: number;
    studentName?: string;
    user?: {
      name: string;
    };
  } | null;
}


export interface StaffQueue {
  queueId: string;
  serviceId: string;
  serviceName: string;
  serviceDescription?: string;
  status: QueueStatus;
  maxSkips: number;
  minLeadTime: number;
  maxHoldDuration: number;
  stats: StaffQueueStats;
  currentServing: StaffCurrentServing | null;
}

export interface StaffQueueDetails {
  queueId: string;
  serviceName: string;
  status: QueueStatus;
  config: {
    maxSkips: number;
    minLeadTime: number;
    maxHoldDuration: number;
  };
  stats: StaffQueueStats;
  currentServing: StaffCurrentServing | null;
  waitingTokens: StaffWaitingToken[];
  recentEvents: StaffEventItem[];
}

export interface StaffAnalyticsData {
  period: {
    startDate: string | null;
    endDate: string;
    range: string;
  };
  summary: {
    totalServed: number;
    totalTokens: number;
    averageWaitTimeSeconds: number;
    averageServiceTimeSeconds: number;
    noShowRate: number | null;
    smartHoldCount: number;
    skipCount: number;
    movedToTailCount: number;
    avgSkipsPerHeldToken: number;
    completed: number;
    cancelled: number;
    noShow: number;
    waiting: number;
    serving: number;
    onHold: number;
    holdsDeclared: number;
    holdsExpired: number;
    holdsCancelled: number;
  };
  outcomeBreakdown: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  statusBreakdown: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  fairnessActivity: Array<{
    name: string;
    count: number;
    fill: string;
  }>;
  activityTimeline: Array<{
    label: string;
    joined: number;
    completed: number;
    skipped: number;
    noShow: number;
    cancelled?: number;
    averageWaitMinutes?: number;
  }>;
  queueBreakdown: Array<{
    queueId: string;
    serviceName: string;
    total: number;
    completed: number;
    noShow: number;
    avgWaitMinutes: number;
    skips: number;
  }>;
}

export type SimulationSpeed = 'slow' | 'normal' | 'fast';
export type SimulationTokenStatus = 'WAITING' | 'HOLD' | 'SERVING' | 'COMPLETED' | 'MOVED_TO_TAIL';

export interface SimulationConfig {
  studentCount: number;
  maxSkips: number;
  heldStudentCount: number;
  speed: SimulationSpeed;
}

export interface SimulationToken {
  id: string;
  tokenNumber: number;
  label: string;
  position: number;
  skipCount: number;
  maxSkips: number;
  holdActive: boolean;
  status: SimulationTokenStatus;
}

export interface SimulationEvent {
  id: string;
  time: string;
  tokenNumber: number;
  type: 'EVALUATE' | 'SKIPPED' | 'SERVING' | 'COMPLETED' | 'MOVED_TO_TAIL' | 'HOLD_ACTIVE';
  message: string;
  skipCount?: number;
  maxSkips?: number;
}

export interface SimulationStats {
  tokensProcessed: number;
  smartHoldTokens: number;
  totalTemporarySkips: number;
  movedToTail: number;
  completed: number;
  maxSkips: number;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  events?: T[];
  notifications?: T[];
  unreadCount?: number;
  pagination: PaginationInfo;
}

export interface EventDetails {
  id: string;
  queueId: string;
  serviceName: string;
  queueStatus: QueueStatus;
  maxSkips: number;
  eventType: string;
  metadata?: any;
  createdAt: string;
  token?: {
    tokenId: string;
    tokenNumber: number;
    status: TokenStatus;
    skipCount: number;
    joinedAt: string;
    servingAt?: string | null;
    completedAt?: string | null;
    studentName?: string;
    smartHolds?: any[];
  } | null;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string | { message?: string };
}

export interface HealthCheckResponse {
  success: boolean;
  message: string;
}


