import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, Sliders, Zap } from 'lucide-react';
import { SimulationConfig, SimulationSpeed } from '@/types';

interface SimulatorConfigProps {
  config: SimulationConfig;
  onUpdateConfig: (updates: Partial<SimulationConfig>) => void;
  isRunning: boolean;
  isPaused: boolean;
  isComplete: boolean;
  onRun: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
}

export const SimulatorConfigCard: React.FC<SimulatorConfigProps> = ({
  config,
  onUpdateConfig,
  isRunning,
  isPaused,
  isComplete: _isComplete,
  onRun,
  onPause,
  onResume,
  onReset,
}) => {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="p-4 sm:p-5 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            Simulation Parameters
          </CardTitle>
          <Badge variant="outline" className="text-[11px] font-mono">
            Pure Client Sandbox
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Adjust parameters to see how the Bounded Fair-Skip algorithm responds.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-0 space-y-4">
        {/* Student Count */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <label htmlFor="student-count" className="font-medium text-foreground">Number of Students:</label>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
              {config.studentCount}
            </span>
          </div>
          <input
            id="student-count"
            type="range"
            min={5}
            max={20}
            value={config.studentCount}
            disabled={isRunning}
            onChange={(e) => onUpdateConfig({ studentCount: Number(e.target.value) })}
            className="w-full accent-indigo-600 cursor-pointer disabled:opacity-50"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>5 min</span>
            <span>20 max</span>
          </div>
        </div>

        {/* Max Skips */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <label htmlFor="max-skips" className="font-medium text-foreground">Maximum Skips (Fairness Bound):</label>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
              {config.maxSkips}
            </span>
          </div>
          <input
            id="max-skips"
            type="range"
            min={1}
            max={10}
            value={config.maxSkips}
            disabled={isRunning}
            onChange={(e) => onUpdateConfig({ maxSkips: Number(e.target.value) })}
            className="w-full accent-indigo-600 cursor-pointer disabled:opacity-50"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>1 skip</span>
            <span>10 skips</span>
          </div>
        </div>

        {/* Held Students Count */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <label htmlFor="held-count" className="font-medium text-foreground">Students with Smart Hold:</label>
            <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
              {config.heldStudentCount}
            </span>
          </div>
          <input
            id="held-count"
            type="range"
            min={0}
            max={Math.min(5, config.studentCount)}
            value={config.heldStudentCount}
            disabled={isRunning}
            onChange={(e) => onUpdateConfig({ heldStudentCount: Number(e.target.value) })}
            className="w-full accent-purple-600 cursor-pointer disabled:opacity-50"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0 none</span>
            <span>{Math.min(5, config.studentCount)} max</span>
          </div>
        </div>

        {/* Speed Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Simulation Speed:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['slow', 'normal', 'fast'] as SimulationSpeed[]).map((spd) => (
              <Button
                key={spd}
                size="sm"
                type="button"
                variant={config.speed === spd ? 'default' : 'outline'}
                onClick={() => onUpdateConfig({ speed: spd })}
                className="text-xs h-8 capitalize"
              >
                {spd}
              </Button>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-2 flex flex-col gap-2">
          {!isRunning && !isPaused ? (
            <Button
              onClick={onRun}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              RUN SIMULATION
            </Button>
          ) : isRunning ? (
            <Button
              onClick={onPause}
              variant="outline"
              className="w-full border-amber-500 text-amber-600 hover:bg-amber-500/10 font-semibold gap-2"
            >
              <Pause className="w-4 h-4" />
              PAUSE
            </Button>
          ) : (
            <Button
              onClick={onResume}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              RESUME
            </Button>
          )}

          <Button
            onClick={onReset}
            variant="outline"
            className="w-full text-xs text-muted-foreground hover:text-foreground gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            RESET SIMULATION
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
