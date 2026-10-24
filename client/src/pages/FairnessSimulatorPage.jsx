import React from "react";
import { StaffHeader } from "@/components/common/StaffHeader";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Info } from "lucide-react";
import { useFairnessSimulation } from "@/features/simulator/useFairnessSimulation";
import { SimulatorConfigCard } from "@/components/simulator/SimulatorConfig";
import { SimulationQueue } from "@/components/simulator/SimulationQueue";
import { SimulationTimeline } from "@/components/simulator/SimulationTimeline";
import { SimulationStatsCard } from "@/components/simulator/SimulationStatsCard";
import { BeforeAfterComparison } from "@/components/simulator/BeforeAfterComparison";
import { FairnessExplainer } from "@/components/simulator/FairnessExplainer";

export const FairnessSimulatorPage = () => {
  const {
    config,
    updateConfig,
    tokens,
    servingToken,
    completedTokens,
    initialQueueSnapshot,
    events,
    stats,
    isRunning,
    isPaused,
    isComplete,
    run,
    pause,
    resume,
    reset,
  } = useFairnessSimulation({
    studentCount: 10,
    maxSkips: 3,
    heldStudentCount: 3,
    speed: "normal",
  });

  return (
    <div className="space-y-6">
      <StaffHeader
        title="Fairness Simulator"
        subtitle="See how Smart Hold and Bounded Fair-Skip handle temporarily unavailable students."
      />

      {/* Demo Mode Notice */}
      <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-600 text-white shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">DEMO MODE ACTIVE</span>
              <Badge className="bg-indigo-600 text-white text-[10px] font-mono">SAFE SANDBOX</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              This simulation executes client-side in a pure sandbox and does not modify production queue data
              in PostgreSQL.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-indigo-700 dark:text-indigo-300 font-medium">
          <Info className="w-4 h-4 shrink-0" />
          <span>Zero DB Mutations</span>
        </div>
      </div>

      {/* Main Two-Column Simulator Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Live Queue Visualization */}
        <div className="lg:col-span-7 space-y-6">
          <SimulationQueue tokens={tokens} servingToken={servingToken} completedTokens={completedTokens} />
        </div>

        {/* RIGHT COLUMN: Configuration & Telemetry */}
        <div className="lg:col-span-5 space-y-6">
          <SimulatorConfigCard
            config={config}
            onUpdateConfig={updateConfig}
            isRunning={isRunning}
            isPaused={isPaused}
            isComplete={isComplete}
            onRun={run}
            onPause={pause}
            onResume={resume}
            onReset={() => reset()}
          />

          <SimulationStatsCard stats={stats} isComplete={isComplete} />
        </div>
      </div>

      {/* Event Timeline */}
      <SimulationTimeline events={events} />

      {/* Before vs After Impact Visualization */}
      <BeforeAfterComparison
        initialTokens={initialQueueSnapshot}
        finalTokens={tokens}
        completedTokens={completedTokens}
        isComplete={isComplete}
      />

      {/* How Bounded Fair-Skip Works Card */}
      <FairnessExplainer />
    </div>
  );
};

export default FairnessSimulatorPage;
