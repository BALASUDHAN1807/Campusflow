import React, { useState } from "react";
import { EventIcon } from "./EventIcon";
import { EventDetailsDrawer } from "./EventDetailsDrawer";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

export const EventTimeline = ({ events, isLoading = false }) => {
  const [selectedEventId, setSelectedEventId] = useState(null);

  const formatTokenNumber = (num) => {
    if (!num) return "—";
    return `CF-${num.toString().padStart(3, "0")}`;
  };

  const getEventDescription = (evt) => {
    switch (evt.eventType) {
      case "SKIPPED":
        return `Smart Hold active — Skip ${evt.metadata?.skipCount || "?"}/${evt.metadata?.maxSkips || 3}`;
      case "MOVED_TO_TAIL":
        return "Maximum Smart Hold skips reached (relocated to tail)";
      case "HOLD_DECLARED":
        return evt.metadata?.reason ? `Smart Hold: "${evt.metadata.reason}"` : "Smart Hold requested";
      case "HOLD_EXPIRED":
        return "Smart Hold window ended";
      case "HOLD_CANCELLED":
        return "Smart Hold cancelled by student";
      case "SERVING":
        return "Token called to desk";
      case "COMPLETED":
        return "Consultation completed";
      case "NO_SHOW":
        return "Student marked as no-show";
      case "CANCELLED":
        return "Queue token cancelled";
      case "JOINED":
        return "Student checked in";
      case "QUEUE_PAUSED":
        return "Queue intake paused";
      case "QUEUE_RESUMED":
        return "Queue intake resumed";
      default:
        return evt.metadata ? JSON.stringify(evt.metadata) : "—";
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <div className="w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
        <span>Loading events...</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground">
        No recent events recorded in this period.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        {events.map((evt) => (
          <div
            key={evt.id}
            onClick={() => setSelectedEventId(evt.id)}
            className="p-2.5 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/50 cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                {new Date(evt.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
              <EventIcon eventType={evt.eventType} size="sm" />
              <span className="font-mono font-bold text-foreground shrink-0">
                {evt.token ? formatTokenNumber(evt.token.tokenNumber) : "—"}
              </span>
              <span className="text-muted-foreground truncate">{getEventDescription(evt)}</span>
            </div>

            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedEventId(evt.id);
              }}
            >
              <Eye className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <EventDetailsDrawer eventId={selectedEventId} onClose={() => setSelectedEventId(null)} />
    </div>
  );
};

export default EventTimeline;
