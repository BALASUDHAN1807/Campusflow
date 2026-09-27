import { useState, useEffect, useCallback, useRef } from "react";
import { queueService } from "../services/queueService";
import { StaffQueue, StaffQueueDetails } from "../types";

export interface StaffPollingState {
  queues: StaffQueue[];
  selectedQueueId: string | null;
  selectedQueue: StaffQueue | null;
  queueDetails: StaffQueueDetails | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  setSelectedQueueId: (id: string) => void;
  refresh: () => Promise<void>;
}

export function useStaffPolling(defaultQueueId?: string, intervalMs: number = 3500): StaffPollingState {
  const [queues, setQueues] = useState<StaffQueue[]>([]);
  const [selectedQueueId, setSelectedQueueIdState] = useState<string | null>(defaultQueueId || null);
  const [queueDetails, setQueueDetails] = useState<StaffQueueDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef<boolean>(true);
  const selectedQueueIdRef = useRef<string | null>(selectedQueueId);

  useEffect(() => {
    selectedQueueIdRef.current = selectedQueueId;
  }, [selectedQueueId]);

  const setSelectedQueueId = useCallback((id: string) => {
    setSelectedQueueIdState(id);
  }, []);

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const staffQueuesRes = await queueService.getStaffQueues();
      if (!isMountedRef.current) return;

      if (staffQueuesRes.success && staffQueuesRes.data) {
        const qList = staffQueuesRes.data as StaffQueue[];
        setQueues(qList);

        let activeId = selectedQueueIdRef.current;
        if (!activeId && qList.length > 0) {
          activeId = qList[0].queueId;
          setSelectedQueueIdState(activeId);
        }

        if (activeId) {
          const detailsRes = await queueService.getStaffQueueDetails(activeId);
          if (detailsRes.success && detailsRes.data && isMountedRef.current) {
            setQueueDetails(detailsRes.data as StaffQueueDetails);
          }
        }
      }
      setError(null);
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.response?.data?.message || err.message || "Failed to update staff operations state.");
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchData();

    const timerId = setInterval(() => {
      fetchData();
    }, intervalMs);

    return () => {
      isMountedRef.current = false;
      clearInterval(timerId);
    };
  }, [fetchData, intervalMs]);

  const selectedQueue = queues.find((q) => q.queueId === selectedQueueId) || (queues.length > 0 ? queues[0] : null);

  return {
    queues,
    selectedQueueId,
    selectedQueue,
    queueDetails,
    isLoading,
    isRefreshing,
    error,
    setSelectedQueueId,
    refresh,
  };
}
