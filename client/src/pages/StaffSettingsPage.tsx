import { useState, useEffect } from "react";
import {
  Settings,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  Info,
  Clock,
  SkipForward,
  Scale,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StaffHeader } from "@/components/common/StaffHeader";
import { useStaffPolling } from "@/hooks/useStaffPolling";
import { queueService } from "@/services/queueService";

export function StaffSettingsPage() {
  const {
    queues,
    selectedQueueId,
    selectedQueue,
    queueDetails,
    isRefreshing,
    setSelectedQueueId,
    refresh,
  } = useStaffPolling();

  const [maxSkips, setMaxSkips] = useState<number>(3);
  const [minLeadTime, setMinLeadTime] = useState<number>(10);
  const [maxHoldDuration, setMaxHoldDuration] = useState<number>(60);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync state from active queue config
  useEffect(() => {
    const config = queueDetails?.config || selectedQueue;
    if (config) {
      if (typeof config.maxSkips === "number") setMaxSkips(config.maxSkips);
      if (typeof config.minLeadTime === "number") setMinLeadTime(config.minLeadTime);
      if (typeof config.maxHoldDuration === "number") setMaxHoldDuration(config.maxHoldDuration);
    }
  }, [queueDetails, selectedQueue]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQueueId || isSaving) return;

    // Client-side validations
    if (maxSkips <= 0) {
      setSaveError("Maximum skips must be at least 1.");
      return;
    }
    if (minLeadTime < 0) {
      setSaveError("Minimum lead time cannot be negative.");
      return;
    }
    if (maxHoldDuration <= 0) {
      setSaveError("Maximum hold duration must be at least 1 minute.");
      return;
    }
    if (maxHoldDuration < minLeadTime) {
      setSaveError("Maximum hold duration must be greater than or equal to minimum lead time.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const res = await queueService.updateQueueConfig(selectedQueueId, {
        maxSkips: Number(maxSkips),
        minLeadTime: Number(minLeadTime),
        maxHoldDuration: Number(maxHoldDuration),
      });

      if (res.success) {
        setSaveSuccess("Queue configuration updated successfully.");
        setTimeout(() => setSaveSuccess(null), 5000);
        await refresh();
      } else {
        const errMsg =
          typeof res.error === "string"
            ? res.error
            : (res.error as any)?.message || "Failed to update configuration.";
        setSaveError(errMsg);
      }
    } catch (err: any) {
      setSaveError(err.response?.data?.message || err.message || "Failed to update queue settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <StaffHeader
        title="Queue Settings & Fairness Policy"
        subtitle="Configure fairness bounds, skip limits, and lead time constraints for campus service queues"
        selectedServiceName={selectedQueue?.serviceName}
        isRefreshing={isRefreshing}
        onRefresh={refresh}
      />

      {/* Queue Switcher */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {queues.map((q) => (
          <Button
            key={q.queueId}
            size="sm"
            variant={selectedQueueId === q.queueId ? "default" : "outline"}
            onClick={() => setSelectedQueueId(q.queueId)}
            className="text-xs shrink-0 flex items-center gap-2 h-9"
          >
            <span className="font-semibold">{q.serviceName}</span>
          </Button>
        ))}
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-sm flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{saveSuccess}</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form */}
        <Card className="lg:col-span-2">
          <CardHeader className="p-4 sm:p-6 pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-600" />
              Queue Engine Configuration
            </CardTitle>
            <CardDescription>
              Adjust transactional rules for {selectedQueue?.serviceName || "this queue"}. Changes take effect immediately on next token evaluation.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-4">
            <form onSubmit={handleSaveConfig} className="space-y-6">
              {/* MAX SKIPS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-foreground flex items-center gap-2">
                    <SkipForward className="w-4 h-4 text-purple-600" />
                    Maximum Smart Hold Skips (maxSkips)
                  </label>
                  <Badge variant="outline" className="font-mono text-xs font-bold text-purple-700 dark:text-purple-300">
                    Current: {maxSkips} skips
                  </Badge>
                </div>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={maxSkips}
                  onChange={(e) => setMaxSkips(parseInt(e.target.value) || 1)}
                  className="text-sm font-mono"
                  required
                />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Controls how many times an unavailable student on Smart Hold can temporarily be stepped back 1 position before being moved to the end of the queue.
                </p>
              </div>

              {/* MIN LEAD TIME */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    Minimum Lead Time (minLeadTime in minutes)
                  </label>
                  <Badge variant="outline" className="font-mono text-xs font-bold text-blue-700 dark:text-blue-300">
                    Current: {minLeadTime} mins
                  </Badge>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={120}
                  value={minLeadTime}
                  onChange={(e) => setMinLeadTime(parseInt(e.target.value) || 0)}
                  className="text-sm font-mono"
                  required
                />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Minimum advance notice required before a Smart Hold window can start (e.g. 10 minutes prevents hold requests 1 minute before desk call).
                </p>
              </div>

              {/* MAX HOLD DURATION */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Scale className="w-4 h-4 text-emerald-600" />
                    Maximum Hold Duration (maxHoldDuration in minutes)
                  </label>
                  <Badge variant="outline" className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    Current: {maxHoldDuration} mins
                  </Badge>
                </div>
                <Input
                  type="number"
                  min={1}
                  max={480}
                  value={maxHoldDuration}
                  onChange={(e) => setMaxHoldDuration(parseInt(e.target.value) || 1)}
                  className="text-sm font-mono"
                  required
                />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Maximum permitted length for a single Smart Hold declaration (e.g. 60 minutes).
                </p>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-end">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 h-10 shadow-sm"
                >
                  <Save className={`w-4 h-4 mr-2 ${isSaving ? "animate-spin" : ""}`} />
                  {isSaving ? "Saving..." : "Save Configuration"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Right Col: Fairness Rules Explainer */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20 border-indigo-200/60 dark:border-indigo-900/60">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
                <Shield className="w-4 h-4 text-indigo-600" />
                Fairness Architecture
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-3 text-xs leading-relaxed text-muted-foreground">
              <div className="p-3 rounded-lg bg-card/80 border border-border space-y-1">
                <strong className="text-foreground block">1. Bounded Fair-Skip</strong>
                <p>
                  When staff calls next, if the front token has an active Smart Hold, it is stepped back exactly 1 position and its skip count increments ($X / \text{maxSkips}$).
                </p>
              </div>

              <div className="p-3 rounded-lg bg-card/80 border border-border space-y-1">
                <strong className="text-foreground block">2. Tail Relocation</strong>
                <p>
                  After reaching the maximum number of skips, the token is moved to the end of the queue and its skip count resets to 0. This prevents a token on extended hold from perpetually starving other students.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-card/80 border border-border space-y-1">
                <strong className="text-foreground block">3. NO-SHOW Independence</strong>
                <p>
                  A no-show is an independent termination when a called student fails to report to the desk. It is never treated as a Smart Hold skip.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="p-4 bg-muted/30 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Audit Logging</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Every configuration change is validated server-side and recorded in the immutable audit event log.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
