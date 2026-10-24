import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import api from "@/services/api";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";

export function ApiHealthBanner() {
  const { isBackendOnline, backendMessage, setBackendStatus } = useAppStore();

  const checkStatus = async () => {
    try {
      const res = await api.checkHealth();
      setBackendStatus(res.success, res.message);
    } catch {
      setBackendStatus(false, "API service offline");
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`px-4 py-1.5 text-xs font-medium border-b flex items-center justify-between transition-colors duration-200 ${
        isBackendOnline === true
          ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
          : isBackendOnline === false
            ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
            : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isBackendOnline ? "bg-emerald-400" : "bg-amber-400"}`}
          />
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${isBackendOnline ? "bg-emerald-500" : "bg-amber-500"}`}
          />
        </span>
        <span className="font-semibold">CampusFlow API Status:</span>
        <span className="font-mono text-[11px]">{backendMessage}</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden sm:inline-block text-[11px] opacity-80">Target: {api.getBaseUrl()}</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={checkStatus}
          className="h-6 px-2 text-[11px] hover:bg-black/5 dark:hover:bg-white/5"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Ping API
        </Button>
      </div>
    </div>
  );
}
