import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  PauseCircle,
  Users,
  Clock,
  Ticket,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Layers,
  ArrowDown,
  Shield,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { queueService } from "@/services/queueService";

export function StudentQueuePage() {
  const [activeTokens, setActiveTokens] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [queueStatus, setQueueStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Smart Hold Modal state
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdStartTime, setHoldStartTime] = useState("");
  const [holdEndTime, setHoldEndTime] = useState("");
  const [holdReason, setHoldReason] = useState("");
  const [holdSubmitting, setHoldSubmitting] = useState(false);
  const [holdError, setHoldError] = useState(null);

  // Cancel Token Confirmation Modal
  const [showCancelTokenModal, setShowCancelTokenModal] = useState(false);
  const [isCancellingToken, setIsCancellingToken] = useState(false);

  const isMountedRef = useRef(true);
  const selectedTokenRef = useRef(selectedToken);

  useEffect(() => {
    selectedTokenRef.current = selectedToken;
  }, [selectedToken]);

  const fetchQueueData = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const activeRes = await queueService.getMyActiveTokens();
      if (!isMountedRef.current) return;

      if (activeRes.success && activeRes.data) {
        const tokens = activeRes.data;
        setActiveTokens(tokens);

        if (tokens.length > 0) {
          const current = selectedTokenRef.current
            ? tokens.find((t) => t.tokenId === selectedTokenRef.current?.tokenId) || tokens[0]
            : tokens[0];
          setSelectedToken(current);

          // Full queue status
          const qRes = await queueService.getQueueStatus(current.queueId);
          if (qRes.success && qRes.data && isMountedRef.current) {
            setQueueStatus(qRes.data);
          }
        } else {
          setSelectedToken(null);
          setQueueStatus(null);
        }
      }
      setError(null);
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message || "Failed to load live queue status.");
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchQueueData();

    const intervalId = setInterval(() => {
      fetchQueueData();
    }, 3500);

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [fetchQueueData]);

  // Open Smart Hold Modal
  const handleOpenHoldModal = () => {
    const minLead = queueStatus?.config?.minLeadTime || 10;
    const now = new Date();
    const defaultStart = new Date(now.getTime() + (minLead + 1) * 60 * 1000);
    const defaultEnd = new Date(defaultStart.getTime() + 30 * 60 * 1000);

    const formatLocal = (d) => {
      const pad = (n) => (n < 10 ? "0" + n : n);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setHoldStartTime(formatLocal(defaultStart));
    setHoldEndTime(formatLocal(defaultEnd));
    setHoldReason("Class / Lecture session");
    setHoldError(null);
    setShowHoldModal(true);
  };

  const setPresetDuration = (durationMinutes) => {
    if (!holdStartTime) return;
    const start = new Date(holdStartTime);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    const pad = (n) => (n < 10 ? "0" + n : n);
    setHoldEndTime(
      `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`
    );
  };

  const handleDeclareHold = async (e) => {
    e.preventDefault();
    if (!selectedToken) return;

    if (!holdStartTime || !holdEndTime || !holdReason.trim()) {
      setHoldError("Please complete all required fields.");
      return;
    }

    const start = new Date(holdStartTime);
    const end = new Date(holdEndTime);

    if (end.getTime() <= start.getTime()) {
      setHoldError("End time must be strictly after start time.");
      return;
    }

    setHoldSubmitting(true);
    setHoldError(null);

    try {
      const res = await queueService.declareSmartHold(selectedToken.queueId, {
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        reason: holdReason.trim(),
      });

      if (res.success) {
        setShowHoldModal(false);
        setActionSuccess("Smart Hold confirmed! Bounded Fair-Skip is actively protecting your turn.");
        setTimeout(() => setActionSuccess(null), 5000);
        await fetchQueueData(true);
      } else {
        const errMsg =
          typeof res.error === "string" ? res.error : res.error?.message || "Failed to declare Smart Hold.";
        setHoldError(errMsg);
      }
    } catch (err) {
      setHoldError(err.message || "Failed to declare Smart Hold.");
    } finally {
      setHoldSubmitting(false);
    }
  };

  const handleCancelHold = async () => {
    if (!selectedToken) return;
    try {
      const res = await queueService.cancelSmartHold(selectedToken.queueId);
      if (res.success) {
        setActionSuccess("Smart Hold cancelled. Your token is now active in the waiting line.");
        setTimeout(() => setActionSuccess(null), 5000);
        await fetchQueueData(true);
      }
    } catch (err) {
      setError(err.message || "Failed to cancel Smart Hold.");
    }
  };

  const handleConfirmCancelToken = async () => {
    if (!selectedToken) return;
    setIsCancellingToken(true);
    try {
      const res = await queueService.cancelToken(selectedToken.tokenId);
      if (res.success) {
        setShowCancelTokenModal(false);
        setActionSuccess("Queue token cancelled successfully.");
        setTimeout(() => setActionSuccess(null), 5000);
        await fetchQueueData(true);
      } else {
        setError("Failed to cancel token.");
      }
    } catch (err) {
      setError(err.message || "Failed to cancel token.");
    } finally {
      setIsCancellingToken(false);
    }
  };

  const activeHold = selectedToken?.smartHold;
  const isHoldActiveNow = activeHold ? activeHold.isCurrentlyActive : false;
  const maxSkips = queueStatus?.config?.maxSkips || selectedToken?.maxSkips || 5;
  const minLeadTime = queueStatus?.config?.minLeadTime || 10;
  const maxHoldDuration = queueStatus?.config?.maxHoldDuration || 60;

  // Build the visual queue roster representation
  const position = selectedToken?.position || 1;
  const peopleAhead = selectedToken?.peopleAhead || 0;
  const currentServing = queueStatus?.currentServing;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Ticket className="w-7 h-7 text-blue-600" />
            Live Queue & Smart Hold
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            "Never lose your place. Never hold up the queue." Real-time dynamic queue telemetry with Bounded
            Fair-Skip.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchQueueData(true)}
            disabled={isRefreshing}
            className="text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link to="/student">
            <Button variant="default" size="sm" className="text-xs">
              Dashboard View
            </Button>
          </Link>
        </div>
      </div>

      {/* Global Alerts */}
      {actionSuccess && (
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Multi-Queue Switcher */}
      {activeTokens.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" /> Your Queues:
          </span>
          {activeTokens.map((t) => (
            <Button
              key={t.tokenId}
              size="sm"
              variant={selectedToken?.tokenId === t.tokenId ? "default" : "outline"}
              onClick={() => setSelectedToken(t)}
              className="text-xs shrink-0"
            >
              Token CF-{t.tokenNumber} ({t.serviceName})
            </Button>
          ))}
        </div>
      )}

      {/* Main View */}
      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
          <p className="text-sm">Loading live queue status...</p>
        </div>
      ) : !selectedToken ? (
        <Card className="p-8 text-center border-dashed border-border bg-card">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/50 w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Ticket className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-bold text-foreground">You are not in any active queue</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-6">
            Join an available campus service queue from your dashboard to receive your dynamic fair-token.
          </p>
          <Link to="/student">
            <Button variant="default" size="sm">
              Back to Dashboard
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Active Token & Smart Hold */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Card */}
            <Card className="border-blue-200 dark:border-blue-900 shadow-md overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-100">
                      {selectedToken.serviceName}
                    </span>
                    <div className="text-4xl font-extrabold tracking-tight mt-1 font-mono">
                      CF-{selectedToken.tokenNumber}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedToken.status === "SERVING" ? (
                      <Badge className="bg-emerald-500 text-white border-0 text-sm px-3 py-1 font-bold animate-pulse">
                        YOUR TURN — SERVING AT DESK
                      </Badge>
                    ) : isHoldActiveNow ? (
                      <Badge className="bg-purple-500 text-white border-0 text-xs px-3 py-1 font-semibold flex items-center gap-1">
                        <PauseCircle className="w-3.5 h-3.5" /> ⏸ Smart Hold Active
                      </Badge>
                    ) : activeHold ? (
                      <Badge className="bg-amber-400 text-amber-950 border-0 text-xs px-3 py-1 font-semibold">
                        Smart Hold Scheduled
                      </Badge>
                    ) : (
                      <Badge className="bg-white/20 text-white border-white/30 text-xs px-3 py-1">
                        Active in Waiting Line
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Metric Strip with Animated Position */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3 bg-muted/40 rounded-xl border border-border">
                    <p className="text-xs text-muted-foreground font-medium">Your Position</p>
                    <div className="text-2xl font-bold text-foreground mt-0.5">
                      {selectedToken.status === "SERVING" ? (
                        "Counter #1"
                      ) : selectedToken.position ? (
                        <AnimatePresence mode="popLayout">
                          <motion.span
                            key={selectedToken.position}
                            initial={{ scale: 0.8, opacity: 0, y: -5 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.8, opacity: 0, y: 5 }}
                            transition={{ duration: 0.25 }}
                            className="inline-block text-blue-600"
                          >
                            #{selectedToken.position}
                          </motion.span>
                        </AnimatePresence>
                      ) : (
                        "—"
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-muted/40 rounded-xl border border-border">
                    <p className="text-xs text-muted-foreground font-medium">People Ahead</p>
                    <p className="text-2xl font-bold text-foreground mt-0.5">
                      {selectedToken.status === "SERVING" ? 0 : selectedToken.peopleAhead}
                    </p>
                  </div>

                  <div className="p-3 bg-muted/40 rounded-xl border border-border">
                    <p className="text-xs text-muted-foreground font-medium">Fair-Skips Used</p>
                    <p className="text-2xl font-bold text-purple-600 mt-0.5 font-mono">
                      {selectedToken.skipCount} / {maxSkips}
                    </p>
                  </div>

                  <div className="p-3 bg-muted/40 rounded-xl border border-border">
                    <p className="text-xs text-muted-foreground font-medium">Now Serving</p>
                    <p className="text-xl font-bold text-emerald-600 mt-0.5 font-mono">
                      {currentServing ? `CF-${currentServing.tokenNumber}` : "Idle / Open"}
                    </p>
                  </div>
                </div>

                {/* SMART HOLD DEDICATED CARD */}
                <div className="p-5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-gradient-to-br from-purple-50/50 to-indigo-50/30 dark:from-purple-950/20 dark:to-indigo-950/10 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-purple-600 text-white mt-0.5">
                        <PauseCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          Smart Hold + Bounded Fair-Skip Protection
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Smart Hold lets you temporarily declare when you cannot respond. If your token
                          reaches the front during an active hold, CampusFlow moves it back one position
                          instead of immediately sending it to the end. Maximum skips: {maxSkips}.
                        </p>
                      </div>
                    </div>

                    {!activeHold && selectedToken.status !== "SERVING" && (
                      <Button
                        size="sm"
                        onClick={handleOpenHoldModal}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shrink-0"
                      >
                        <PauseCircle className="w-3.5 h-3.5 mr-1.5" />
                        Declare Smart Hold
                      </Button>
                    )}
                  </div>

                  {activeHold ? (
                    <div className="p-4 rounded-lg bg-card border border-purple-200 dark:border-purple-800/60 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              isHoldActiveNow
                                ? "bg-purple-600 text-white font-bold"
                                : "bg-amber-100 text-amber-900 border-amber-300"
                            }
                          >
                            {isHoldActiveNow ? "SMART HOLD ACTIVE" : "HOLD SCHEDULED"}
                          </Badge>
                          <span className="text-xs font-semibold text-foreground">{activeHold.reason}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelHold}
                          className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1.5" />
                          Cancel Hold
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-3.5 h-3.5 text-purple-600" />
                          <span>
                            <strong>Start:</strong>{" "}
                            {new Date(activeHold.startTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-3.5 h-3.5 text-purple-600" />
                          <span>
                            <strong>End:</strong>{" "}
                            {new Date(activeHold.endTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Fairness Status Progress Bar */}
                      <div className="pt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-foreground">Fairness Status:</span>
                          <span className="font-mono text-purple-600 font-bold">
                            {selectedToken.skipCount} / {maxSkips} skips
                          </span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-600 transition-all duration-500 rounded-full"
                            style={{ width: `${(selectedToken.skipCount / maxSkips) * 100}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                          Your token is protected by the fairness limit. After {maxSkips} skips, your token
                          moves to the end of the queue.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                      <div className="p-2.5 rounded-lg bg-white/60 dark:bg-black/20 border border-border">
                        <p className="text-muted-foreground font-medium">Min Lead Time</p>
                        <p className="font-bold text-foreground">{minLeadTime} minutes</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white/60 dark:bg-black/20 border border-border">
                        <p className="text-muted-foreground font-medium">Max Duration</p>
                        <p className="font-bold text-foreground">{maxHoldDuration} minutes</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white/60 dark:bg-black/20 border border-border">
                        <p className="text-muted-foreground font-medium">Max Fair-Skips</p>
                        <p className="font-bold text-foreground">{maxSkips} skips</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Cancel Queue Token Button */}
                {selectedToken.status !== "SERVING" && (
                  <div className="pt-2 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCancelTokenModal(true)}
                      className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Cancel Queue Token
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Col: Visual Queue Component */}
          <div className="space-y-6">
            <Card className="p-5 shadow-sm border-border bg-card">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Live Visual Queue
                </h3>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {queueStatus?.totalWaiting || 0} waiting
                </span>
              </div>

              {/* 1. NOW SERVING */}
              <div className="text-center space-y-2 mb-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                  NOW SERVING
                </span>

                <div className="p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 inline-block min-w-[160px] shadow-sm">
                  {currentServing ? (
                    <div className="font-mono text-xl font-black text-emerald-700 dark:text-emerald-300">
                      CF-{currentServing.tokenNumber}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic">
                      No token is currently being served
                    </div>
                  )}
                </div>

                <div className="flex justify-center text-muted-foreground">
                  <ArrowDown className="w-4 h-4 text-emerald-500" />
                </div>
              </div>

              {/* 2. WAITING LINE */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block text-center">
                  WAITING
                </span>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {/* Generate visual queue boxes */}
                  {Array.from({ length: Math.max(1, peopleAhead + 2) }).map((_, idx) => {
                    const boxPos = idx + 1;
                    const isUserToken = boxPos === position;
                    const simulatedTokenNumber = isUserToken
                      ? selectedToken.tokenNumber
                      : (currentServing?.tokenNumber || 100) + boxPos;
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border text-xs flex items-center justify-between transition-all ${
                          isUserToken
                            ? "bg-blue-600 text-white border-blue-700 shadow-md font-bold"
                            : "bg-muted/30 border-border text-foreground font-mono"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm">CF-{simulatedTokenNumber}</span>
                          {isUserToken && (
                            <Badge className="bg-white text-blue-800 text-[10px] py-0 px-1.5 font-bold">
                              YOU ARE HERE
                            </Badge>
                          )}
                          {isUserToken && activeHold && (
                            <Badge className="bg-purple-400 text-purple-950 text-[10px] py-0 px-1.5">
                              ⏸ Hold
                            </Badge>
                          )}
                        </div>

                        <span
                          className={`text-[11px] ${isUserToken ? "text-blue-100" : "text-muted-foreground"}`}
                        >
                          Pos #{boxPos}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <p className="text-[10px] text-muted-foreground text-center pt-3 italic">
                  Only anonymous token numbers are displayed for student privacy.
                </p>
              </div>
            </Card>

            {/* Fairness Guarantee Card */}
            <Card className="p-4 bg-muted/20 border-dashed border-border space-y-2">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-purple-600" />
                Fairness Guarantee
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Smart Hold ensures no queue blocking. If you cannot attend your turn, you step back 1 slot, up
                to {maxSkips} skips, keeping the line moving fairly for everyone.
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* DECLARE SMART HOLD MODAL DIALOG */}
      {showHoldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <Card className="w-full max-w-lg bg-card border-border shadow-2xl overflow-hidden animate-in zoom-in-95">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <PauseCircle className="w-6 h-6" />
                  <div>
                    <CardTitle className="text-lg font-bold">Declare Smart Hold</CardTitle>
                    <CardDescription className="text-purple-100 text-xs">
                      Token CF-{selectedToken?.tokenNumber} • {selectedToken?.serviceName}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowHoldModal(false)}
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                >
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>

            <form onSubmit={handleDeclareHold}>
              <CardContent className="p-5 space-y-4">
                {holdError && (
                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{holdError}</span>
                  </div>
                )}

                {/* Config Limits Banner */}
                <div className="p-3 rounded-lg bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs space-y-1">
                  <p className="font-semibold text-purple-900 dark:text-purple-200">
                    Queue Configuration Limits:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                    <span>
                      • Minimum lead time: <strong>{minLeadTime} minutes</strong>
                    </span>
                    <span>
                      • Maximum hold: <strong>{maxHoldDuration} minutes</strong>
                    </span>
                  </div>
                </div>

                {/* Reason Field */}
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Reason for Hold <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Physics Exam in Hall B"
                    value={holdReason}
                    onChange={(e) => setHoldReason(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>

                {/* Timestamps */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Start Time <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="datetime-local"
                      value={holdStartTime}
                      onChange={(e) => setHoldStartTime(e.target.value)}
                      required
                      className="text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      End Time <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="datetime-local"
                      value={holdEndTime}
                      onChange={(e) => setHoldEndTime(e.target.value)}
                      required
                      className="text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Duration Quick Presets */}
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                    Quick Duration Presets:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setPresetDuration(15)}
                      className="text-xs h-7"
                    >
                      15 mins
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setPresetDuration(30)}
                      className="text-xs h-7"
                    >
                      30 mins
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setPresetDuration(45)}
                      className="text-xs h-7"
                    >
                      45 mins
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setPresetDuration(60)}
                      className="text-xs h-7"
                    >
                      60 mins (Max)
                    </Button>
                  </div>
                </div>
              </CardContent>

              <div className="p-4 bg-muted/40 border-t border-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHoldModal(false)}
                  disabled={holdSubmitting}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={holdSubmitting}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
                >
                  {holdSubmitting ? "Declaring Hold..." : "Confirm Smart Hold"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* CANCEL QUEUE TOKEN CONFIRMATION MODAL */}
      <AnimatePresence>
        {showCancelTokenModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-2xl p-6 text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-foreground">Leave Queue?</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Are you sure you want to leave the queue for <strong>{selectedToken?.serviceName}</strong>?
                  You will lose Token CF-{selectedToken?.tokenNumber}.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCancelTokenModal(false)}
                  disabled={isCancellingToken}
                  className="flex-1 text-xs"
                >
                  Keep My Place
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleConfirmCancelToken}
                  disabled={isCancellingToken}
                  className="flex-1 text-xs font-semibold"
                >
                  {isCancellingToken ? "Leaving..." : "Leave Queue"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
