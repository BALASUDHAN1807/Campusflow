import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Clock,
  ClockAlert,
  SkipForward,
  RotateCcw,
  Activity,
  Info,
  Check,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const NotificationCard = ({ notification, onMarkRead }) => {
  const navigate = useNavigate();

  const getNotificationConfig = () => {
    switch (notification.type) {
      case "TURN_APPROACHING":
        return {
          icon: <Bell className="w-4 h-4 text-blue-600" />,
          badgeClass: "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300",
          borderClass: "border-blue-200 dark:border-blue-900/60",
        };
      case "SMART_HOLD_ACTIVATED":
        return {
          icon: <Clock className="w-4 h-4 text-purple-600" />,
          badgeClass:
            "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300",
          borderClass: "border-purple-200 dark:border-purple-900/60",
        };
      case "SKIPPED":
        return {
          icon: <SkipForward className="w-4 h-4 text-purple-600" />,
          badgeClass:
            "bg-purple-100 text-purple-800 border-purple-400 dark:bg-purple-950 dark:text-purple-200",
          borderClass: "border-purple-300 dark:border-purple-800",
        };
      case "MOVED_TO_TAIL":
        return {
          icon: <RotateCcw className="w-4 h-4 text-rose-600" />,
          badgeClass: "bg-rose-100 text-rose-800 border-rose-400 dark:bg-rose-950 dark:text-rose-200",
          borderClass: "border-rose-300 dark:border-rose-800",
        };
      case "HOLD_EXPIRED":
        return {
          icon: <ClockAlert className="w-4 h-4 text-amber-600" />,
          badgeClass: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300",
          borderClass: "border-amber-200 dark:border-amber-900/60",
        };
      case "QUEUE_UPDATE":
        return {
          icon: <Activity className="w-4 h-4 text-emerald-600" />,
          badgeClass:
            "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300",
          borderClass: "border-emerald-200 dark:border-emerald-900/60",
        };
      default:
        return {
          icon: <Info className="w-4 h-4 text-slate-600" />,
          badgeClass: "bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-900 dark:text-slate-300",
          borderClass: "border-border",
        };
    }
  };

  const config = getNotificationConfig();

  const formatRelativeTime = (isoString) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const handleCardClick = () => {
    if (!notification.read && onMarkRead) {
      onMarkRead(notification.id);
    }
    navigate("/student/queue");
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
        notification.read
          ? "bg-card hover:bg-muted/40 border-border"
          : `bg-card hover:bg-muted/60 ${config.borderClass} shadow-sm ring-1 ring-inset ring-indigo-500/10`
      }`}
    >
      <div className="flex items-start gap-3.5 flex-1 min-w-0">
        <div className="p-2 rounded-lg bg-muted/60 shrink-0 mt-0.5">{config.icon}</div>

        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4
              className={`text-sm font-bold text-foreground truncate ${!notification.read ? "text-indigo-950 dark:text-indigo-100" : ""}`}
            >
              {notification.title}
            </h4>
            <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${config.badgeClass}`}>
              {notification.type.replace(/_/g, " ")}
            </Badge>
            {!notification.read && <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />}
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">{notification.message}</p>

          <span className="text-[11px] text-muted-foreground/80 font-mono block pt-0.5">
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {!notification.read && onMarkRead && (
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(notification.id);
            }}
            title="Mark as read"
            className="h-8 w-8 text-muted-foreground hover:text-emerald-600"
          >
            <Check className="w-4 h-4" />
          </Button>
        )}
        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>
  );
};
