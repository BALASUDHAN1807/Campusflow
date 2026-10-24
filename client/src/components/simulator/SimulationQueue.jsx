import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatePresence } from "framer-motion";
import { Users, Sparkles, CheckCircle2 } from "lucide-react";
import { SimulationTokenCard } from "./SimulationTokenCard";

export const SimulationQueue = ({ tokens, servingToken, completedTokens }) => {
  return (
    <div className="space-y-4">
      {/* Active Serving Desk */}
      <Card className="border-border bg-gradient-to-br from-card to-blue-500/5">
        <CardHeader className="p-4 sm:p-5 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Desk #01 — Consultation Area
            </CardTitle>
            <Badge variant="outline" className="font-mono text-xs">
              {servingToken ? "ENGAGED" : "AWAITING NEXT"}
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Currently called student undergoing consultation.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-0">
          <AnimatePresence mode="wait">
            {servingToken ? (
              <SimulationTokenCard key={servingToken.id} token={servingToken} isFront={true} />
            ) : (
              <div className="p-6 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-1.5">
                <Sparkles className="w-6 h-6 text-muted-foreground/40" />
                <span>Desk is ready. Waiting for next eligible student.</span>
              </div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Waiting Queue List */}
      <Card className="border-border">
        <CardHeader className="p-4 sm:p-5 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Live Simulation Queue ({tokens.length} in line)
            </CardTitle>
            <span className="text-xs text-muted-foreground font-mono">Front → Tail</span>
          </div>
          <CardDescription className="text-xs">
            Students arranged in queue order. Watch tokens swap backward when skipped by Smart Hold.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-0">
          {tokens.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              <span className="font-semibold text-foreground">Queue is empty!</span>
              <span>All students in the simulation have completed their turn.</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              <AnimatePresence>
                {tokens.map((token, index) => (
                  <SimulationTokenCard key={token.id} token={token} isFront={index === 0} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Students Summary Drawer / List */}
      {completedTokens.length > 0 && (
        <Card className="border-border bg-muted/20">
          <CardHeader className="p-3 sm:p-4 pb-1">
            <CardTitle className="text-xs font-bold text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Completed Consultations ({completedTokens.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-1">
            <div className="flex flex-wrap gap-1.5">
              {completedTokens.map((ct) => (
                <Badge
                  key={ct.id}
                  variant="outline"
                  className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                >
                  #{ct.tokenNumber} {ct.label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
