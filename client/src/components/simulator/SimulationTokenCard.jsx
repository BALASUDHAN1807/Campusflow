import React from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Clock, ShieldAlert, Sparkles, User, CheckCircle2 } from "lucide-react";

export const SimulationTokenCard = ({ token, isFront = false }) => {
  const isHold = token.holdActive;
  const isServing = token.status === "SERVING";
  const isCompleted = token.status === "COMPLETED";
  const isMovedToTail = token.status === "MOVED_TO_TAIL";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: -10 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className={`relative p-3 rounded-xl border transition-all ${
        isServing
          ? "bg-blue-500/10 border-blue-500 shadow-md ring-2 ring-blue-500/30"
          : isCompleted
            ? "bg-emerald-500/10 border-emerald-500/30"
            : isMovedToTail
              ? "bg-rose-500/10 border-rose-500/40"
              : isHold
                ? "bg-purple-500/10 border-purple-500/40"
                : isFront
                  ? "bg-indigo-500/10 border-indigo-500/50 shadow-sm"
                  : "bg-card border-border hover:border-border/80"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
              isServing
                ? "bg-blue-600 text-white"
                : isCompleted
                  ? "bg-emerald-600 text-white"
                  : isHold
                    ? "bg-purple-600 text-white"
                    : "bg-muted text-foreground"
            }`}
          >
            #{token.tokenNumber}
          </div>
          <div>
            <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span>{token.label}</span>
              {isFront && !isServing && (
                <Badge variant="default" className="text-[9px] h-4 px-1.5 bg-indigo-600">
                  NEXT
                </Badge>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-2">
              <span>Pos: #{token.position}</span>
              {token.skipCount > 0 && (
                <span className="font-mono text-purple-600 dark:text-purple-400 font-semibold">
                  Skips: {token.skipCount}/{token.maxSkips}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex flex-col items-end gap-1">
          {isServing && (
            <Badge className="bg-blue-600 text-[10px] gap-1 animate-pulse">
              <Sparkles className="w-3 h-3" /> SERVING
            </Badge>
          )}
          {isCompleted && (
            <Badge className="bg-emerald-600 text-[10px] gap-1">
              <CheckCircle2 className="w-3 h-3" /> DONE
            </Badge>
          )}
          {isMovedToTail && (
            <Badge variant="destructive" className="text-[10px] gap-1">
              <ShieldAlert className="w-3 h-3" /> TAIL EJECT
            </Badge>
          )}
          {!isServing &&
            !isCompleted &&
            !isMovedToTail &&
            (isHold ? (
              <Badge
                variant="outline"
                className="border-purple-500 text-purple-600 bg-purple-500/10 text-[10px] gap-1"
              >
                <Clock className="w-3 h-3 text-purple-500" /> SMART HOLD
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">
                <User className="w-3 h-3" /> READY
              </Badge>
            ))}
        </div>
      </div>
    </motion.div>
  );
};
