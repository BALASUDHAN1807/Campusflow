import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Play, Pause, XCircle } from "lucide-react";

export const StaffHeader = ({
  title,
  subtitle,
  selectedServiceName,
  queueStatus,
  isRefreshing,
  onRefresh,
  onPause,
  onResume,
  onCloseQueue,
  showQueueControls = false,
}) => {
  const normalizedStatus = (queueStatus || "OPEN").toUpperCase();

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{title}</h1>

          {queueStatus && (
            <div className="flex items-center">
              {normalizedStatus === "OPEN" && (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />● OPEN
                </Badge>
              )}
              {normalizedStatus === "PAUSED" && (
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold">
                  <span>Ⅱ</span> PAUSED
                </Badge>
              )}
              {normalizedStatus === "CLOSED" && (
                <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold">
                  <span>■</span> CLOSED
                </Badge>
              )}
            </div>
          )}
        </div>

        {subtitle ? (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        ) : selectedServiceName ? (
          <p className="text-sm text-muted-foreground mt-1">
            Managing Service: <strong className="text-foreground">{selectedServiceName}</strong> • Staff Desk
            #01
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {showQueueControls && queueStatus && (
          <>
            {normalizedStatus === "OPEN" && onPause && (
              <Button
                variant="outline"
                size="sm"
                onClick={onPause}
                className="text-xs text-amber-700 dark:text-amber-300 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
              >
                <Pause className="w-3.5 h-3.5 mr-1" />
                PAUSE QUEUE
              </Button>
            )}
            {normalizedStatus === "PAUSED" && onResume && (
              <Button
                variant="outline"
                size="sm"
                onClick={onResume}
                className="text-xs text-emerald-700 dark:text-emerald-300 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              >
                <Play className="w-3.5 h-3.5 mr-1" />
                RESUME QUEUE
              </Button>
            )}
            {normalizedStatus !== "CLOSED" && onCloseQueue && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCloseQueue}
                className="text-xs text-rose-700 dark:text-rose-300 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                CLOSE QUEUE
              </Button>
            )}
          </>
        )}

        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        )}
      </div>
    </div>
  );
};
