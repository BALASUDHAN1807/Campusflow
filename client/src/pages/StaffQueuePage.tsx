import { useState } from "react";
import {
  Users,
  Clock,
  PhoneCall,
  UserCheck,
  UserX,
  CheckCircle2,
  AlertCircle,
  SkipForward,
  Flame,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StaffHeader } from "@/components/common/StaffHeader";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { useStaffPolling } from "@/hooks/useStaffPolling";
import { queueService } from "@/services/queueService";

export function StaffQueuePage() {
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

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [fairnessAlert, setFairnessAlert] = useState<{
    type: "skip" | "tail";
    message: string;
    details?: string;
  } | null>(null);

  // Modal dialog states
  const [noShowModalOpen, setNoShowModalOpen] = useState(false);
  const [pauseModalOpen, setPauseModalOpen] = useState(false);
  const [resumeModalOpen, setResumeModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);

  const currentServing = queueDetails?.currentServing;
  const waitingTokens = queueDetails?.waitingTokens || [];
  const maxSkips = queueDetails?.config?.maxSkips || selectedQueue?.maxSkips || 3;

  // Filter tokens with smart holds
  const holdTokens = waitingTokens.filter((t) => !!t.smartHold);

  const formatTokenNumber = (num?: number) => {
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

        if (res.data.skippedActivity && res.data.skippedActivity.length > 0) {
          const tailActivity = res.data.skippedActivity.find((s: any) => s.action === "MOVED_TO_TAIL");
          const skipActivity = res.data.skippedActivity.find((s: any) => s.action === "SKIPPED");

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
            : (res.error as any)?.message || "No eligible token is currently available.";
        setActionError(errMsg);
      }
    } catch (err: any) {
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        "No eligible token is currently available.";
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
    } catch (err: any) {
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
    } catch (err: any) {
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
        setActionSuccess("Queue paused.");
        setTimeout(() => setActionSuccess(null), 4000);
        setPauseModalOpen(false);
        await refresh();
      }
    } catch (err: any) {
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
        setActionSuccess("Queue resumed.");
        setTimeout(() => setActionSuccess(null), 4000);
        setResumeModalOpen(false);
        await refresh();
      }
    } catch (err: any) {
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
        setActionSuccess("Queue closed.");
        setTimeout(() => setActionSuccess(null), 4000);
        setCloseModalOpen(false);
        await refresh();
      }
    } catch (err: any) {
      setActionError(err.response?.data?.message || err.message || "Failed to close queue.");
    } finally {
      setIsControllingQueue(false);
    }
  };

  const error = actionError || pollingError;

  return (
    <div className="space-y-6">
      {/* Header */}
      <StaffHeader
        title="Queue Control Hub"
        selectedServiceName={selectedQueue?.serviceName || "Service"}
        queueStatus={selectedQueue?.status || "OPEN"}
        isRefreshing={isRefreshing}
        onRefresh={refresh}
        onPause={() => setPauseModalOpen(true)}
        onResume={() => setResumeModalOpen(true)}
        onCloseQueue={() => setCloseModalOpen(true)}
        showQueueControls={true}
      />

      {/* Notifications */}
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
          <div>
            <p className="font-bold text-sm">{fairnessAlert.message}</p>
            {fairnessAlert.details && (
              <p className="text-xs opacity-90">{fairnessAlert.details}</p>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Queue Switcher Bar */}
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

      {/* Primary Counter Desk Bar */}
      <Card className="border-indigo-200 dark:border-indigo-900 shadow-sm overflow-hidden bg-card">
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              OPERATIONAL DESK #01
            </span>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-black font-mono text-foreground">
                {currentServing ? formatTokenNumber(currentServing.tokenNumber) : "CF- —"}
              </span>
              {currentServing ? (
                <Badge className="bg-emerald-600 text-white text-xs font-semibold">
                  ● SERVING
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  IDLE / READY
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentServing ? (
                <>
                  Serving: <strong className="text-foreground">{currentServing.studentName || "Anonymous"}</strong> • Started at{" "}
                  {new Date(currentServing.servingAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </>
              ) : (
                "No student currently at counter."
              )}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {currentServing ? (
              <>
                <Button
                  size="default"
                  variant="success"
                  onClick={handleCompleteToken}
                  disabled={isCompleting}
                  className="font-bold text-xs"
                >
                  <UserCheck className="w-4 h-4 mr-1.5" />
                  {isCompleting ? "Completing..." : "COMPLETE"}
                </Button>
                <Button
                  size="default"
                  variant="destructive"
                  onClick={() => setNoShowModalOpen(true)}
                  disabled={isProcessingNoShow}
                  className="font-bold text-xs"
                >
                  <UserX className="w-4 h-4 mr-1.5" />
                  NO SHOW
                </Button>
              </>
            ) : (
              <Button
                size="lg"
                onClick={handleCallNext}
                disabled={isCallingNext || !selectedQueueId || selectedQueue?.status === "CLOSED"}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-6 h-12 shadow-md"
              >
                <PhoneCall className={`w-4 h-4 mr-2 ${isCallingNext ? "animate-spin" : ""}`} />
                {isCallingNext ? "Calling next..." : "CALL NEXT TOKEN"}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Main Grid: Waiting Queue Roster & Dedicated Smart Hold Section */}
      <div className="space-y-6">
        {/* Waiting Queue Table */}
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Waiting Queue Roster
                </CardTitle>
                <CardDescription>
                  Ordered by queue position from PostgreSQL backend engine
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs w-fit">
                {waitingTokens.length} Students Total
              </Badge>
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
                  <TableHead className="text-right">Fairness State</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waitingTokens.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs">
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
                          <Badge className="bg-purple-600 text-white text-[11px]">
                            ⏸ ON HOLD
                          </Badge>
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
                            Scheduled
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
                      <TableCell className="text-right">
                        {item.skipCount >= maxSkips ? (
                          <Badge variant="destructive" className="text-[10px]">
                            Tail Reached
                          </Badge>
                        ) : item.smartHold?.isCurrentlyActive ? (
                          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[10px] border border-purple-300">
                            Bounded Hold
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Normal FIFO
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dedicated SMART HOLD Section */}
        <Card className="border-purple-200 dark:border-purple-900">
          <CardHeader className="p-4 sm:p-6 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-purple-900 dark:text-purple-200">
                  <Clock className="w-5 h-5 text-purple-600" />
                  SMART HOLD Tokens
                </CardTitle>
                <CardDescription>
                  Students currently protected by active or scheduled Smart Hold time windows
                </CardDescription>
              </div>
              <Badge className="bg-purple-600 text-white text-xs w-fit">
                {holdTokens.length} Active Holds
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token</TableHead>
                  <TableHead>Hold Start</TableHead>
                  <TableHead>Hold End</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Skip Count</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdTokens.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                      No active Smart Holds.
                    </TableCell>
                  </TableRow>
                ) : (
                  holdTokens.map((item) => (
                    <TableRow key={item.tokenId} className="bg-purple-50/30 dark:bg-purple-950/20">
                      <TableCell className="font-mono font-bold text-foreground">
                        {formatTokenNumber(item.tokenNumber)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {item.smartHold
                          ? new Date(item.smartHold.startTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {item.smartHold
                          ? new Date(item.smartHold.endTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-foreground font-medium">
                        {item.smartHold?.reason || "Unavailable"}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-purple-700 dark:text-purple-300">
                        {item.skipCount} / {maxSkips}
                      </TableCell>
                      <TableCell>
                        {item.smartHold?.isCurrentlyActive ? (
                          <Badge className="bg-purple-600 text-white text-[11px]">
                            ACTIVE HOLD
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500 text-white text-[11px]">
                            SCHEDULED
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

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
        description="Students will not be able to join while the queue is paused."
        confirmText="Pause Queue"
        variant="warning"
        isLoading={isControllingQueue}
      />

      <ConfirmModal
        isOpen={resumeModalOpen}
        onClose={() => setResumeModalOpen(false)}
        onConfirm={handleConfirmResume}
        title="Resume Queue Intake?"
        description="The queue will reopen immediately for student check-ins."
        confirmText="Resume Queue"
        variant="default"
        isLoading={isControllingQueue}
      />

      <ConfirmModal
        isOpen={closeModalOpen}
        onClose={() => setCloseModalOpen(false)}
        onConfirm={handleConfirmClose}
        title="Close this queue?"
        description="Students will no longer be able to join this queue."
        confirmText="Close Queue"
        variant="destructive"
        isLoading={isControllingQueue}
      />
    </div>
  );
}
