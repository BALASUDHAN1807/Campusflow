import React from "react";
import {
  UserPlus,
  Clock,
  ClockAlert,
  SkipForward,
  RotateCcw,
  PhoneCall,
  CheckCircle2,
  UserX,
  XCircle,
  PauseCircle,
  PlayCircle,
  Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface EventIconProps {
  eventType: string;
  showBadge?: boolean;
  size?: "sm" | "md" | "lg";
}

export const EventIcon: React.FC<EventIconProps> = ({
  eventType,
  showBadge = true,
  size = "md",
}) => {
  const iconSizeClass = size === "sm" ? "w-3 h-3" : size === "lg" ? "w-5 h-5" : "w-3.5 h-3.5";

  const getEventMeta = () => {
    switch (eventType) {
      case "JOINED":
        return {
          icon: <UserPlus className={iconSizeClass} />,
          label: "JOINED",
          badgeClass: "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300",
          iconColor: "text-blue-600",
        };
      case "HOLD_DECLARED":
        return {
          icon: <Clock className={iconSizeClass} />,
          label: "HOLD_DECLARED",
          badgeClass: "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300",
          iconColor: "text-purple-600",
        };
      case "HOLD_EXPIRED":
        return {
          icon: <ClockAlert className={iconSizeClass} />,
          label: "HOLD_EXPIRED",
          badgeClass: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300",
          iconColor: "text-amber-600",
        };
      case "HOLD_CANCELLED":
        return {
          icon: <XCircle className={iconSizeClass} />,
          label: "HOLD_CANCELLED",
          badgeClass: "bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-900 dark:text-slate-300",
          iconColor: "text-slate-500",
        };
      case "SKIPPED":
        return {
          icon: <SkipForward className={iconSizeClass} />,
          label: "SKIPPED",
          badgeClass: "bg-purple-100 text-purple-800 border-purple-400 dark:bg-purple-950 dark:text-purple-200 font-bold",
          iconColor: "text-purple-600",
        };
      case "MOVED_TO_TAIL":
        return {
          icon: <RotateCcw className={iconSizeClass} />,
          label: "MOVED_TO_TAIL",
          badgeClass: "bg-rose-100 text-rose-800 border-rose-400 dark:bg-rose-950 dark:text-rose-200 font-bold",
          iconColor: "text-rose-600",
        };
      case "SERVING":
        return {
          icon: <PhoneCall className={iconSizeClass} />,
          label: "SERVING",
          badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 font-semibold",
          iconColor: "text-emerald-600",
        };
      case "COMPLETED":
        return {
          icon: <CheckCircle2 className={iconSizeClass} />,
          label: "COMPLETED",
          badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-400 dark:bg-emerald-950 dark:text-emerald-200 font-semibold",
          iconColor: "text-emerald-600",
        };
      case "NO_SHOW":
        return {
          icon: <UserX className={iconSizeClass} />,
          label: "NO_SHOW",
          badgeClass: "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300 font-semibold",
          iconColor: "text-rose-600",
        };
      case "CANCELLED":
        return {
          icon: <XCircle className={iconSizeClass} />,
          label: "CANCELLED",
          badgeClass: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
          iconColor: "text-slate-500",
        };
      case "QUEUE_PAUSED":
        return {
          icon: <PauseCircle className={iconSizeClass} />,
          label: "QUEUE_PAUSED",
          badgeClass: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300",
          iconColor: "text-amber-600",
        };
      case "QUEUE_RESUMED":
        return {
          icon: <PlayCircle className={iconSizeClass} />,
          label: "QUEUE_RESUMED",
          badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300",
          iconColor: "text-emerald-600",
        };
      default:
        return {
          icon: <Activity className={iconSizeClass} />,
          label: eventType,
          badgeClass: "bg-muted text-muted-foreground",
          iconColor: "text-muted-foreground",
        };
    }
  };

  const meta = getEventMeta();

  if (!showBadge) {
    return <span className={meta.iconColor}>{meta.icon}</span>;
  }

  return (
    <Badge variant="outline" className={`gap-1.5 py-0.5 text-xs inline-flex items-center ${meta.badgeClass}`}>
      {meta.icon}
      <span>{meta.label}</span>
    </Badge>
  );
};
