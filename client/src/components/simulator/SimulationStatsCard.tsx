import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, SkipForward, ShieldAlert, Users, Clock, Flame } from 'lucide-react';
import { SimulationStats } from '@/types';

interface SimulationStatsCardProps {
  stats: SimulationStats;
  isComplete: boolean;
}

export const SimulationStatsCard: React.FC<SimulationStatsCardProps> = ({ stats, isComplete }) => {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="p-4 sm:p-5 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            Simulation Telemetry & Results
          </CardTitle>
          {isComplete ? (
            <Badge className="bg-emerald-600 text-[11px] font-semibold">
              SIMULATION COMPLETE
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[11px] font-mono">
              Live Counters
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">
          Real-time metrics computed purely from simulation state transitions.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard
            title="TOKENS"
            value={stats.tokensProcessed}
            subtitle="Total in batch"
            icon={<Users className="w-4 h-4 text-indigo-600" />}
            variant="default"
          />

          <StatCard
            title="SMART HOLDS"
            value={stats.smartHoldTokens}
            subtitle="Held students"
            icon={<Clock className="w-4 h-4 text-purple-600" />}
            variant="purple"
          />

          <StatCard
            title="TOTAL SKIPS"
            value={stats.totalTemporarySkips}
            subtitle="Non-blocking passes"
            icon={<SkipForward className="w-4 h-4 text-purple-600" />}
            variant="purple"
          />

          <StatCard
            title="MOVED TO TAIL"
            value={stats.movedToTail}
            subtitle="Max limit reached"
            icon={<ShieldAlert className="w-4 h-4 text-rose-600" />}
            variant="primary"
          />

          <StatCard
            title="COMPLETED"
            value={stats.completed}
            subtitle="Finished consultations"
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            variant="success"
          />

          <StatCard
            title="MAX SKIPS"
            value={stats.maxSkips}
            subtitle="Configured bound"
            icon={<Flame className="w-4 h-4 text-amber-600" />}
            variant="default"
          />
        </div>
      </CardContent>
    </Card>
  );
};
