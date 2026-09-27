import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { SimulationToken } from '@/types';

interface BeforeAfterComparisonProps {
  initialTokens: SimulationToken[];
  finalTokens: SimulationToken[];
  completedTokens: SimulationToken[];
  isComplete: boolean;
}

export const BeforeAfterComparison: React.FC<BeforeAfterComparisonProps> = ({
  initialTokens,
  finalTokens,
  completedTokens,
  isComplete,
}) => {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="p-4 sm:p-5 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            Before & After Flow Comparison
          </CardTitle>
          <Badge variant="outline" className="text-[11px] font-mono">
            Algorithm Impact
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Observe how students were re-ordered safely without blocking queue throughput.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-0 space-y-4">
        {/* BEFORE: Initial Queue */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground uppercase tracking-wider text-[11px]">
              Initial Queue (Arrival Order)
            </span>
            <span className="font-mono text-xs">{initialTokens.length} Tokens</span>
          </div>
          <div className="p-3 rounded-lg bg-muted/40 border border-border/60 flex items-center gap-1.5 overflow-x-auto">
            {initialTokens.map((t, idx) => (
              <React.Fragment key={t.id}>
                <div
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold shrink-0 flex items-center gap-1 ${
                    t.holdActive
                      ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/40'
                      : 'bg-card text-foreground border border-border'
                  }`}
                >
                  #{t.tokenNumber}
                  {t.holdActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                  )}
                </div>
                {idx < initialTokens.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* AFTER: Service & Final Progression */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground uppercase tracking-wider text-[11px]">
              {isComplete ? 'Final Service Order (Actual Execution)' : 'Current Progression Order'}
            </span>
            <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
              {completedTokens.length} Served
            </span>
          </div>
          <div className="p-3 rounded-lg bg-muted/40 border border-border/60 flex items-center gap-1.5 overflow-x-auto">
            {completedTokens.length === 0 ? (
              <span className="text-xs text-muted-foreground italic">
                Simulation in progress... Completed tokens will appear here.
              </span>
            ) : (
              completedTokens.map((t, idx) => (
                <React.Fragment key={t.id}>
                  <div className="px-2.5 py-1 rounded text-xs font-mono font-bold shrink-0 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />#{t.tokenNumber}
                  </div>
                  {idx < completedTokens.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                  )}
                </React.Fragment>
              ))
            )}
            {finalTokens.length > 0 && completedTokens.length > 0 && (
              <ArrowRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
            )}
            {finalTokens.map((t, idx) => (
              <React.Fragment key={t.id}>
                <div
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold shrink-0 ${
                    t.status === 'MOVED_TO_TAIL'
                      ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40'
                      : t.holdActive
                      ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/40'
                      : 'bg-card text-foreground border border-border'
                  }`}
                >
                  #{t.tokenNumber}
                </div>
                {idx < finalTokens.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
