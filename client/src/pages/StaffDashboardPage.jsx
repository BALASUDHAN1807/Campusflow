import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Clock,
  PhoneCall,
  UserCheck,
  UserX,
  CheckCircle2,
  ChevronRight,
  Activity,
  AlertCircle,
  SkipForward,
  Flame,
} from "lucide-react";

import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StaffHeader } from "@/components/common/StaffHeader";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { useStaffPolling } from "@/hooks/useStaffPolling";
import { queueService } from "@/services/queueService";

export function StaffDashboardPage() {
  const {
    queues,
    selectedQueueId,
    selectedQueue,
    queueDetails,
    isRefreshing,
    error: pollingError,
    setSelectedQueueId,
    refresh,
  } = useStaffPolling();

  const [isCallingNext, setIsCallingNext] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isProcessingNoShow, setIsProcessingNoShow] = useState(false);
  const [isControllingQueue, setIsControllingQueue] = useState(false);

  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [fairnessAlert, setFairnessAlert] = useState(null);

  // Modal dialog states
  const [noShowModalOpen, setNoShowModalOpen] = useState(false);
  const [pauseModalOpen, setPauseModalOpen] = useState(false);
  const [resumeModalOpen, setResumeModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);

  const currentServing = queueDetails?.currentServing;
  const waitingTokens = queueDetails?.waitingTokens || [];
  const recentEvents = queueDetails?.recentEvents || [];
  const stats = queueDetails?.stats || selectedQueue?.stats;
  const maxSkips = queueDetails?.config?.maxSkips || selectedQueue?.maxSkips || 3;

  // Format token display (e.g. CF-104)
  const formatTokenNumber = (num) => {
    if (!num) return "—";
    return `CF-${num.toString().padStart(3, "0")}`;
  };

  const handleCallNext = async () => {
    if (!selectedQueueId || isCallingNext) return;
    setIsCallingNext(true);
    setActionError(null);
    setActionSuccess(null);
    setFairnessAlert(null);

    try {
      const res = await queueService.callNext(selectedQueueId);
      if (res.success && res.data) {
        const tokenFormatted = formatTokenNumber(res.data.tokenNumber);
        setActionSuccess(`✓ Token ${tokenFormatted} is now serving.`);
        setTimeout(() => setActionSuccess(null), 6000);

        // Check if Smart Hold skipped or moved tokens
        if (res.data.skippedActivity && res.data.skippedActivity.length > 0) {
          const tailActivity = res.data.skippedActivity.find((s) => s.action === "MOVED_TO_TAIL");
          const skipActivity = res.data.skippedActivity.find((s) => s.action === "SKIPPED");

          if (tailActivity) {
            const tailToken = formatTokenNumber(tailActivity.tokenNumber);
            setFairnessAlert({
              type: "tail",
              message: `FAIRNESS LIMIT REACHED: ${tailToken} moved to the end of the queue. Skip count reset.`,
              details: `Token reached maximum ${maxSkips} skips while unavailable.`,
            });
          } else if (skipActivity) {
            const skippedToken = formatTokenNumber(skipActivity.tokenNumber);
            setFairnessAlert({
              type: "skip",
              message: `${skippedToken} temporarily skipped`,
              details: `Reason: Active Smart Hold • Fairness: Skip ${skipActivity.skipCount} / ${maxSkips}`,
            });
          }
        }

        await refresh();
      } else {
        const errMsg =
          typeof res.error === "string"
            ? res.error
            : res.error?.message || "No eligible token is currently available.";
        setActionError(errMsg);
      }
    } catch (err) {
      const errMsg =
        err.response?.data?.message || err.message || "No eligible token is currently available.";
      setActionError(errMsg);
    } finally {
      setIsCallingNext(false);
    }
  };

  const handleCompleteToken = async () => {
    if (!currentServing?.tokenId || isCompleting) return;
    setIsCompleting(true);
    setActionError(null);
    try {
      const res = await queueService.completeToken(currentServing.tokenId);
      if (res.success) {
        const tokenFormatted = formatTokenNumber(currentServing.tokenNumber);
        setActionSuccess(`Token ${tokenFormatted} consultation marked as COMPLETED.`);
        setTimeout(() => setActionSuccess(null), 5000);
        await refresh();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || "Failed to complete token.");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleConfirmNoShow = async () => {
    if (!currentServing?.tokenId || isProcessingNoShow) return;
    setIsProcessingNoShow(true);
    setActionError(null);
    try {
      const res = await queueService.markNoShow(currentServing.tokenId);
      if (res.success) {
        const tokenFormatted = formatTokenNumber(currentServing.tokenNumber);
        setActionSuccess(`Token ${tokenFormatted} marked as NO-SHOW.`);
        setTimeout(() => setActionSuccess(null), 5000);
        setNoShowModalOpen(false);
        await refresh();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || "Failed to mark token as no-show.");
    } finally {
      setIsProcessingNoShow(false);
    }
  };

  const handleConfirmPause = async () => {
    if (!selectedQueueId) return;
    setIsControllingQueue(true);
    try {
      const res = await queueService.pauseQueue(selectedQueueId);
      if (res.success) {
        setActionSuccess("Queue paused. Student intake suspended.");
        setTimeout(() => setActionSuccess(null), 4000);
        setPauseModalOpen(false);
        await refresh();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || "Failed to pause queue.");
    } finally {
      setIsControllingQueue(false);
    }
  };

  const handleConfirmResume = async () => {
    if (!selectedQueueId) return;
    setIsControllingQueue(true);
    try {
      const res = await queueService.resumeQueue(selectedQueueId);
      if (res.success) {
        setActionSuccess("Queue resumed. Students can now join.");
        setTimeout(() => setActionSuccess(null), 4000);
        setResumeModalOpen(false);
        await refresh();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || "Failed to resume queue.");
    } finally {
      setIsControllingQueue(false);
    }
  };

  const handleConfirmClose = async () => {
    if (!selectedQueueId) return;
    setIsControllingQueue(true);
    try {
      const res = await queueService.closeQueue(selectedQueueId);
      if (res.success) {
        setActionSuccess("Queue closed. New joins are disabled.");
        setTimeout(() => setActionSuccess(null), 4000);
        setCloseModalOpen(false);
        await refresh();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || "Failed to close queue.");
    } finally {
      setIsControllingQueue(false);
    }
  };

  const error = actionError || pollingError;

  return (
    <div className="space-y-6">
      {/* Reusable Staff Header */}
      <StaffHeader
        title="Staff Control Center"
        selectedServiceName={selectedQueue?.serviceName || "Service Desk"}
        queueStatus={selectedQueue?.status || "OPEN"}
        isRefreshing={isRefreshing}
        onRefresh={refresh}
        onPause={() => setPauseModalOpen(true)}
        onResume={() => setResumeModalOpen(true)}
        onCloseQueue={() => setCloseModalOpen(true)}
        showQueueControls={true}
      />

      {/* Action and Fairness Alerts */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-sm flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{actionSuccess}</span>
        </div>
      )}

      {fairnessAlert && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 animate-in fade-in ${
            fairnessAlert.type === "tail"
              ? "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200"
              : "bg-purple-500/10 border-purple-500/30 text-purple-800 dark:text-purple-200"
          }`}
        >
          {fairnessAlert.type === "tail" ? (
            <Flame className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          ) : (
            <SkipForward className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5">
            <p className="font-bold text-sm">{fairnessAlert.message}</p>
            {fairnessAlert.details && <p className="text-xs opacity-90">{fairnessAlert.details}</p>}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Queue / Service Selector Bar */}
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
            <Badge
              variant={selectedQueueId === q.queueId ? "outline" : "secondary"}
              className="text-[10px] py-0 px-1.5"
            >
              {q.stats?.waiting || 0} waiting
            </Badge>
          </Button>
        ))}
      </div>

      {/* Top 4 KPI Cards (Real Backend Data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="WAITING"
          value={stats?.waiting ?? 0}
          subtitle="Students currently waiting"
          icon={<Users className="w-5 h-5 text-blue-600" />}
          variant="primary"
        />

        <StatCard
          title="ON HOLD"
          value={stats?.onHold ?? 0}
          subtitle="Students temporarily unavailable"
          icon={<Clock className="w-5 h-5 text-purple-600" />}
          variant="purple"
        />

        <StatCard
          title="SERVING"
          value={stats?.serving ?? (currentServing ? 1 : 0)}
          subtitle={currentServing ? formatTokenNumber(currentServing.tokenNumber) : "Counter ready"}
          icon={<Activity className="w-5 h-5 text-emerald-600" />}
          variant="success"
        />

        <StatCard
          title="COMPLETED"
          value={stats?.completed ?? 0}
          subtitle="Completed today"
          icon={<CheckCircle2 className="w-5 h-5 text-indigo-600" />}
          variant="default"
        />
      </div>

      {/* Main Operations Desk: NOW SERVING & CALL NEXT Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-indigo-200 dark:border-indigo-900 shadow-md overflow-hidden flex flex-col justify-between">
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                  NOW SERVING
                </span>
                <div className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
                  {currentServing ? formatTokenNumber(currentServing.tokenNumber) : "CF- —"}
                </div>
                <div className="flex items-center gap-2 pt-1 text-sm text-slate-300">
                  {currentServing ? (
                    <>
                      <Badge className="bg-emerald-500 text-white text-[11px] font-bold">● SERVING</Badge>
                      <span className="text-xs text-slate-300">
                        Student:{" "}
                        <strong className="text-white">{currentServing.studentName || "Anonymous"}</strong>
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400">No student is currently being served.</span>
                  )}
                </div>
              </div>

              {/* Prominent CALL NEXT Button */}
              <div className="flex flex-col sm:items-end gap-2">
                <Button
                  size="lg"
                  onClick={handleCallNext}
                  disabled={
                    isCallingNext ||
                    !selectedQueueId ||
                    !!currentServing ||
                    selectedQueue?.status === "CLOSED"
                  }
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base px-8 h-14 shadow-lg shadow-emerald-950/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <PhoneCall className={`w-5 h-5 mr-2.5 ${isCallingNext ? "animate-spin" : ""}`} />
                  {isCallingNext ? "Calling next..." : "CALL NEXT"}
                </Button>
                {selectedQueue?.status === "PAUSED" && (
                  <span className="text-[11px] text-amber-400">Queue is currently paused</span>
                )}
              </div>
            </div>
          </div>

          <CardContent className="p-6 bg-card border-t border-border">
            {currentServing ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <Button
                    size="sm"
                    variant="success"
                    onClick={handleCompleteToken}
                    disabled={isCompleting}
                    className="font-semibold text-xs px-4"
                  >
                    <UserCheck className="w-4 h-4 mr-1.5" />
                    {isCompleting ? "Completing..." : "COMPLETE"}
                  </Button>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setNoShowModalOpen(true)}
                    disabled={isProcessingNoShow}
                    className="font-semibold text-xs px-4"
                  >
                    <UserX className="w-4 h-4 mr-1.5" />
                    NO SHOW
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground font-mono">
                  Serving since:{" "}
                  <strong className="text-foreground">
                    {new Date(currentServing.servingAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </strong>
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground leading-relaxed flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Counter ready. Clicking <strong>CALL NEXT</strong> evaluates the front of the queue, skips
                  active Smart Holds, and assigns the next eligible student.
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Recent Events Stream */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                Live Event Stream
              </h3>
              <Link to="/staff/events">
                <Button variant="ghost" size="sm" className="text-xs text-blue-600 h-7 px-2">
                  VIEW ALL EVENTS
                </Button>
              </Link>
            </div>

            <div className="space-y-2.5">
              {recentEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No queue activity yet.</p>
              ) : (
                recentEvents.slice(0, 5).map((evt) => (
                  <div
                    key={evt.id}
                    className="p-2.5 rounded-lg bg-muted/40 border border-border/50 text-xs flex items-start justify-between gap-2"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-[9px] py-0 px-1 font-bold ${
                            evt.eventType === "SKIPPED"
                              ? "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300"
                              : evt.eventType === "MOVED_TO_TAIL"
                                ? "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300"
                                : evt.eventType === "SERVING"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {evt.eventType}
                        </Badge>
                        <span className="font-mono font-bold text-foreground truncate">
                          {evt.token ? formatTokenNumber(evt.token.tokenNumber) : "Queue"}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {evt.eventType === "SKIPPED"
                          ? `Smart Hold active — Skip ${evt.metadata?.skipCount || "?"}/${maxSkips}`
                          : evt.eventType === "MOVED_TO_TAIL"
                            ? "Maximum Smart Hold skips reached"
                            : evt.eventType === "NO_SHOW"
                              ? "Student did not respond"
                              : evt.eventType === "SERVING"
                                ? "Token called to desk"
                                : evt.eventType === "HOLD_DECLARED"
                                  ? "Smart Hold protected slot"
                                  : evt.eventType}
                      </p>
                    </div>

                    <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                      {new Date(evt.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-border">
            <Link to="/staff/events" className="w-full">
              <Button variant="outline" size="sm" className="w-full text-xs">
                View Full Audit Timeline
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Waiting Queue Roster Table */}
      <Card className="overflow-hidden">
        <CardHeader className="p-4 sm:p-6 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-bold">Waiting Queue Roster</CardTitle>
              <CardDescription>Live authoritative queue order from PostgreSQL engine</CardDescription>
            </div>
            <Link to="/staff/queue">
              <Button variant="outline" size="sm" className="text-xs">
                Queue Control Hub
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Position</TableHead>
                <TableHead>Token</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Smart Hold</TableHead>
                <TableHead>Skip Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {waitingTokens.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                    No students are currently waiting.
                  </TableCell>
                </TableRow>
              ) : (
                waitingTokens.map((item) => (
                  <TableRow key={item.tokenId}>
                    <TableCell className="font-bold text-xs text-muted-foreground">
                      #{item.position}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-foreground">
                      {formatTokenNumber(item.tokenNumber)}
                    </TableCell>
                    <TableCell>
                      {item.smartHold?.isCurrentlyActive ? (
                        <Badge className="bg-purple-600 text-white text-[11px]">⏸ ON HOLD</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[11px]">
                          WAITING
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {new Date(item.joinedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      {item.smartHold?.isCurrentlyActive ? (
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                            ACTIVE
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {new Date(item.smartHold.startTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            –{" "}
                            {new Date(item.smartHold.endTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      ) : item.smartHold ? (
                        <span className="text-xs text-amber-600 font-medium">
                          Scheduled (
                          {new Date(item.smartHold.startTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          )
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold">
                      <span
                        className={
                          item.skipCount >= maxSkips - 1
                            ? "text-rose-600 font-bold"
                            : item.skipCount > 0
                              ? "text-purple-600 font-medium"
                              : "text-muted-foreground"
                        }
                      >
                        {item.skipCount} / {maxSkips}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={noShowModalOpen}
        onClose={() => setNoShowModalOpen(false)}
        onConfirm={handleConfirmNoShow}
        title={`Mark ${currentServing ? formatTokenNumber(currentServing.tokenNumber) : "token"} as No-Show?`}
        description="The student did not respond when called. IMPORTANT: NO-SHOW is an independent termination and is NOT treated as a Smart Hold skip."
        confirmText="Mark No-Show"
        variant="destructive"
        isLoading={isProcessingNoShow}
      />

      <ConfirmModal
        isOpen={pauseModalOpen}
        onClose={() => setPauseModalOpen(false)}
        onConfirm={handleConfirmPause}
        title="Pause Queue Intake?"
        description="Pausing prevents new students from joining this queue. Existing waiting tokens and active Smart Holds remain intact."
        confirmText="Pause Queue"
        variant="warning"
        isLoading={isControllingQueue}
      />

      <ConfirmModal
        isOpen={resumeModalOpen}
        onClose={() => setResumeModalOpen(false)}
        onConfirm={handleConfirmResume}
        title="Resume Queue Intake?"
        description="Resuming opens the queue and permits new students to join immediately."
        confirmText="Resume Queue"
        variant="default"
        isLoading={isControllingQueue}
      />

      <ConfirmModal
        isOpen={closeModalOpen}
        onClose={() => setCloseModalOpen(false)}
        onConfirm={handleConfirmClose}
        title="Close this queue?"
        description="Students will no longer be able to join this queue. Historical events and completed token records will be preserved."
        confirmText="Close Queue"
        variant="destructive"
        isLoading={isControllingQueue}
      />
    </div>
  );
}
