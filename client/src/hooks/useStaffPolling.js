import { useState, useEffect, useCallback, useRef } from "react";
import { queueService } from "../services/queueService";

export function useStaffPolling(defaultQueueId, intervalMs = 3500) {
  const [queues, setQueues] = useState([]);
  const [selectedQueueId, setSelectedQueueIdState] = useState(defaultQueueId || null);
  const [queueDetails, setQueueDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const isMountedRef = useRef(true);
  const selectedQueueIdRef = useRef(selectedQueueId);

  useEffect(() => {
    selectedQueueIdRef.current = selectedQueueId;
  }, [selectedQueueId]);

  const setSelectedQueueId = useCallback((id) => {
    setSelectedQueueIdState(id);
  }, []);

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const staffQueuesRes = await queueService.getStaffQueues();
      if (!isMountedRef.current) return;

      if (staffQueuesRes.success && staffQueuesRes.data) {
        const qList = staffQueuesRes.data;
        setQueues(qList);

        let activeId = selectedQueueIdRef.current;
        if (!activeId && qList.length > 0) {
          activeId = qList[0].queueId;
          setSelectedQueueIdState(activeId);
        }

        if (activeId) {
          const detailsRes = await queueService.getStaffQueueDetails(activeId);
          if (detailsRes.success && detailsRes.data && isMountedRef.current) {
            setQueueDetails(detailsRes.data);
          }
        }
      }
      setError(null);
    } catch (err) {
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

  const selectedQueue =
    queues.find((q) => q.queueId === selectedQueueId) || (queues.length > 0 ? queues[0] : null);

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
