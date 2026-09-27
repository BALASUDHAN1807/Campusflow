import { useState, useEffect, useCallback, useRef } from "react";
import { queueService } from "../services/queueService";
import { StudentActiveToken, StudentQueueStatus } from "../types";

export interface QueuePollingState {
  activeTokens: StudentActiveToken[];
  selectedToken: StudentActiveToken | null;
  queueStatus: StudentQueueStatus | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setSelectedToken: (token: StudentActiveToken | null) => void;
}

export function useQueuePolling(intervalMs: number = 3500): QueuePollingState {
  const [activeTokens, setActiveTokens] = useState<StudentActiveToken[]>([]);
  const [selectedToken, setSelectedToken] = useState<StudentActiveToken | null>(null);
  const [queueStatus, setQueueStatus] = useState<StudentQueueStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef<boolean>(true);
  const selectedTokenRef = useRef<StudentActiveToken | null>(selectedToken);

  useEffect(() => {
    selectedTokenRef.current = selectedToken;
  }, [selectedToken]);

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const tokenRes = await queueService.getMyActiveTokens();
      if (!isMountedRef.current) return;

      if (tokenRes.success && tokenRes.data) {
        const tokens = tokenRes.data as unknown as StudentActiveToken[];
        setActiveTokens(tokens);

        if (tokens.length > 0) {
          const current = selectedTokenRef.current
            ? tokens.find((t) => t.tokenId === selectedTokenRef.current?.tokenId) || tokens[0]
            : tokens[0];
          setSelectedToken(current);

          // Fetch queue details
          const qRes = await queueService.getQueueStatus(current.queueId);
          if (qRes.success && qRes.data && isMountedRef.current) {
            setQueueStatus(qRes.data as unknown as StudentQueueStatus);
          }
        } else {
          setSelectedToken(null);
          setQueueStatus(null);
        }
      }
      setError(null);
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || "Failed to refresh queue status.");
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

  return {
    activeTokens,
    selectedToken,
    queueStatus,
    isLoading,
    isRefreshing,
    error,
    refresh,
    setSelectedToken,
  };
}
