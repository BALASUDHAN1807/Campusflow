import React, { useEffect, useState } from "react";
import {
  X,
  Clock,
  Calendar,
  Layers,
  FileJson,
  CheckCircle2,
  AlertCircle,
  Hash,
  Scale,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EventIcon } from "./EventIcon";
import { eventService } from "@/services/eventService";
import { EventDetails } from "@/types";

interface EventDetailsDrawerProps {
  eventId: string | null;
  onClose: () => void;
}

export const EventDetailsDrawer: React.FC<EventDetailsDrawerProps> = ({
  eventId,
  onClose,
}) => {
  const [details, setDetails] = useState<EventDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && eventId) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [eventId, onClose]);

  useEffect(() => {
    if (!eventId) {
      setDetails(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    eventService
      .getEventDetails(eventId)
      .then((res) => {
        if (isMounted) {
          if (res.success && res.data) {
            setDetails(res.data);
          } else {
            setError("Failed to load event details.");
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.response?.data?.message || err.message || "Failed to load event.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [eventId]);

  if (!eventId) return null;

  const formatTokenNumber = (num?: number | null) => {
    if (!num) return "—";
    return `CF-${num.toString().padStart(3, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg h-full bg-card border-l border-border p-6 shadow-2xl overflow-y-auto space-y-6 animate-in slide-in-from-right duration-200 flex flex-col justify-between"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-drawer-title"
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-border">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Audit Event Record
              </span>
              <h2 id="event-drawer-title" className="text-xl font-bold text-foreground flex items-center gap-2">
                {details ? (
                  <EventIcon eventType={details.eventType} size="md" />
                ) : (
                  "Event Inspection"
                )}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-4 py-8">
              <div className="h-6 w-3/4 bg-muted animate-pulse rounded" />
              <div className="h-24 bg-muted animate-pulse rounded-lg" />
              <div className="h-32 bg-muted animate-pulse rounded-lg" />
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          ) : details ? (
            <div className="space-y-6">
              {/* Event Overview Card */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Timestamp
                  </span>
                  <span className="text-xs font-mono font-semibold text-foreground">
                    {new Date(details.createdAt).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "medium",
                    })}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Service Queue
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    {details.serviceName}
                  </span>
                </div>

                {details.token && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5" />
                      Token
                    </span>
                    <Badge variant="secondary" className="font-mono font-bold text-xs">
                      {formatTokenNumber(details.token.tokenNumber)}
                    </Badge>
                  </div>
                )}

                {details.token?.studentName && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Student
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {details.token.studentName}
                    </span>
                  </div>
                )}
              </div>

              {/* Fairness Telemetry Section */}
              {details.token && (
                <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-purple-600" />
                    Fairness & Bounded Skips
                  </h4>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-muted-foreground">Skip Count:</span>
                    <span className="font-mono font-bold text-foreground">
                      {details.token.skipCount} / {details.maxSkips}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Token State:</span>
                    <Badge variant="outline" className="text-[10px]">
                      {details.token.status}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Metadata Details */}
              {details.metadata && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FileJson className="w-4 h-4 text-indigo-600" />
                    Event Metadata Payload
                  </h4>
                  <div className="p-3 rounded-lg bg-slate-950 text-slate-100 text-xs font-mono overflow-x-auto border border-slate-800">
                    <pre>{JSON.stringify(details.metadata, null, 2)}</pre>
                  </div>
                </div>
              )}

              {/* Smart Hold details if attached */}
              {details.token?.smartHolds && details.token.smartHolds.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-purple-600" />
                    Associated Smart Holds
                  </h4>
                  <div className="space-y-2">
                    {details.token.smartHolds.map((h: any) => (
                      <div key={h.id} className="p-3 rounded-lg bg-muted/40 border border-border text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">
                            Reason: "{h.reason}"
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {h.status}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground font-mono text-[11px]">
                          {new Date(h.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                          {new Date(h.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Bottom Close Action */}
        <div className="pt-4 border-t border-border flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            Close Inspector
          </Button>
        </div>
      </div>
    </div>
  );
};
