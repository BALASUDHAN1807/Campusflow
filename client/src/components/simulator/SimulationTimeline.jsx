import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { History, SkipForward, ShieldAlert, Sparkles, CheckCircle2, Clock } from "lucide-react";

export const SimulationTimeline = ({ events }) => {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="p-4 sm:p-5 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" />
            Simulation Event Timeline ({events.length} Events)
          </CardTitle>
          <Badge variant="outline" className="text-[11px] font-mono">
            Sequential Stream
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Real-time trace of Bounded Fair-Skip evaluations and state transitions.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-1">
        {events.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No events yet. Click <strong>RUN SIMULATION</strong> to start the engine.
          </div>
        ) : (
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            <AnimatePresence>
              {events.map((evt) => {
                const isSkip = evt.type === "SKIPPED";
                const isTail = evt.type === "MOVED_TO_TAIL";
                const isServing = evt.type === "SERVING";
                const isCompleted = evt.type === "COMPLETED";
                return (
                  <motion.div
                    key={evt.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`p-2.5 rounded-lg border text-xs flex items-start justify-between gap-3 ${
                      isTail
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-100"
                        : isSkip
                          ? "bg-purple-500/10 border-purple-500/30 text-purple-900 dark:text-purple-100"
                          : isServing
                            ? "bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-100"
                            : isCompleted
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100"
                              : "bg-muted/40 border-border text-foreground"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 shrink-0">
                        {isTail ? (
                          <ShieldAlert className="w-4 h-4 text-rose-600" />
                        ) : isSkip ? (
                          <SkipForward className="w-4 h-4 text-purple-600" />
                        ) : isServing ? (
                          <Sparkles className="w-4 h-4 text-blue-600" />
                        ) : isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold">{evt.message}</div>
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{evt.time}</div>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[9px] shrink-0 font-mono ${
                        isTail
                          ? "border-rose-500 text-rose-600"
                          : isSkip
                            ? "border-purple-500 text-purple-600"
                            : isServing
                              ? "border-blue-500 text-blue-600"
                              : isCompleted
                                ? "border-emerald-500 text-emerald-600"
                                : ""
                      }`}
                    >
                      {evt.type}
                    </Badge>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
