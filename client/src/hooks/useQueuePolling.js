import { useState, useEffect, useCallback, useRef } from "react";
import { queueService } from "../services/queueService";

export function useQueuePolling(intervalMs = 3500) {
  const [activeTokens, setActiveTokens] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [queueStatus, setQueueStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const isMountedRef = useRef(true);
  const selectedTokenRef = useRef(selectedToken);

  useEffect(() => {
    selectedTokenRef.current = selectedToken;
  }, [selectedToken]);

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const tokenRes = await queueService.getMyActiveTokens();
      if (!isMountedRef.current) return;

      if (tokenRes.success && tokenRes.data) {
        const tokens = tokenRes.data;
        setActiveTokens(tokens);

        if (tokens.length > 0) {
          const current = selectedTokenRef.current
            ? tokens.find((t) => t.tokenId === selectedTokenRef.current?.tokenId) || tokens[0]
            : tokens[0];
          setSelectedToken(current);

          // Fetch queue details
          const qRes = await queueService.getQueueStatus(current.queueId);
          if (qRes.success && qRes.data && isMountedRef.current) {
            setQueueStatus(qRes.data);
          }
        } else {
          setSelectedToken(null);
          setQueueStatus(null);
        }
      }
      setError(null);
    } catch (err) {
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
