import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ticket,
  Clock,
  PauseCircle,
  Bell,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  ArrowRight,
  Building2,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { queueService } from "@/services/queueService";
import { notificationService } from "@/services/notificationService";

export function StudentDashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [activeTokens, setActiveTokens] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [services, setServices] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [currentServingToken, setCurrentServingToken] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(null);
  const [actionSuccess] = useState(null);
  const [error, setError] = useState(null);

  // Join Confirmation Modal
  const [joinResult, setJoinResult] = useState(null);

  const isMountedRef = useRef(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [tokensRes, servicesRes, notifsRes] = await Promise.all([
        queueService.getMyActiveTokens(),
        queueService.getAvailableServices(),
        notificationService.getNotifications(),
      ]);

      if (!isMountedRef.current) return;

      if (tokensRes.success && tokensRes.data) {
        const tokens = tokensRes.data;
        setActiveTokens(tokens);

        if (tokens.length > 0) {
          const current = selectedToken
            ? tokens.find((t) => t.tokenId === selectedToken.tokenId) || tokens[0]
            : tokens[0];
          setSelectedToken(current);

          // Get current serving for active token's queue
          const statusRes = await queueService.getQueueStatus(current.queueId);
          if (statusRes.success && statusRes.data && isMountedRef.current) {
            const serving = statusRes.data.currentServing;
            setCurrentServingToken(serving ? `CF-${serving.tokenNumber}` : null);
          }
        } else {
          setSelectedToken(null);
          setCurrentServingToken(null);
        }
      }

      if (servicesRes.success && servicesRes.data) {
        setServices(servicesRes.data);
      }

      if (notifsRes.success && notifsRes.data) {
        setRecentNotifications((notifsRes.data.notifications || []).slice(0, 3));
      }

      setError(null);
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message || "Failed to load dashboard data.");
      }
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [selectedToken]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchDashboardData();

    const timer = setInterval(() => {
      fetchDashboardData();
    }, 3500);

    return () => {
      isMountedRef.current = false;
      clearInterval(timer);
    };
  }, [fetchDashboardData]);

  // Handle Join Queue
  const handleJoinQueue = async (queueId, serviceName) => {
    setIsJoining(queueId);
    setError(null);

    try {
      const res = await queueService.joinQueue(queueId);
      if (res.success && res.data) {
        setJoinResult({
          tokenNumber: res.data.tokenNumber,
          position: res.data.position,
          peopleAhead: res.data.peopleAhead,
          serviceName,
        });
        await fetchDashboardData();
      } else {
        const errMsg =
          typeof res.error === "string" ? res.error : res.error?.message || "Could not join queue.";
        setError(errMsg);
      }
    } catch (err) {
      setError(err.message || "Could not join queue.");
    } finally {
      setIsJoining(null);
    }
  };

  const getStatusBadge = (status, hasActiveHold) => {
    if (status === "SERVING") {
      return <Badge className="bg-emerald-500 text-white font-bold animate-pulse text-xs">Your Turn</Badge>;
    }
    if (hasActiveHold) {
      return (
        <Badge className="bg-purple-600 text-white font-semibold text-xs flex items-center gap-1">
          <PauseCircle className="w-3.5 h-3.5" /> Smart Hold Active
        </Badge>
      );
    }
    switch (status) {
      case "WAITING":
        return (
          <Badge variant="secondary" className="text-xs">
            Waiting
          </Badge>
        );
      case "HOLD":
        return <Badge className="bg-purple-600 text-white text-xs">Smart Hold Active</Badge>;
      case "COMPLETED":
        return (
          <Badge variant="success" className="text-xs">
            Completed
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="outline" className="text-xs">
            Cancelled
          </Badge>
        );
      case "NO_SHOW":
        return (
          <Badge variant="destructive" className="text-xs">
            No Show
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-xs">
            {status}
          </Badge>
        );
    }
  };

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const activeHold = selectedToken?.smartHold;
  const isHoldActiveNow = activeHold ? activeHold.isCurrentlyActive : false;

  return (
    <div className="space-y-6">
      {/* 1. Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Good day, {user?.name || "Student"} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            "Never lose your place. Never hold up the queue." Manage campus services without waiting blindly.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono py-1 px-2.5">
            {todayFormatted}
          </Badge>
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
            <Layers className="w-3.5 h-3.5" /> Your Active Queues:
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

      {/* 2. Active Queue Highlight or Empty State */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-xs">Loading queue telemetry...</p>
        </div>
      ) : selectedToken ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Queue Card */}
          <Card className="lg:col-span-2 border-blue-200 dark:border-blue-900 shadow-md overflow-hidden">
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
                <div>{getStatusBadge(selectedToken.status, isHoldActiveNow)}</div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 bg-muted/40 rounded-xl border border-border">
                  <p className="text-xs text-muted-foreground font-medium">Your Position</p>
                  <div className="text-2xl font-bold text-foreground mt-0.5">
                    {selectedToken.status === "SERVING" ? (
                      "Counter #1"
                    ) : selectedToken.position ? (
                      <motion.span
                        key={selectedToken.position}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-blue-600"
                      >
                        #{selectedToken.position}
                      </motion.span>
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
                    {selectedToken.skipCount} / {selectedToken.maxSkips || 5}
                  </p>
                </div>

                <div className="p-3 bg-muted/40 rounded-xl border border-border">
                  <p className="text-xs text-muted-foreground font-medium">Now Serving</p>
                  <p className="text-xl font-bold text-emerald-600 mt-0.5 font-mono">
                    {currentServingToken || "Idle / Open"}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
                <Link to="/student/queue">
                  <Button variant="default" size="sm" className="gap-2 text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    Open Live Queue & Hold Controls
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>

                <div className="text-xs text-muted-foreground">
                  Joined:{" "}
                  {new Date(selectedToken.joinedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Smart Hold & Fairness Status Card */}
          <Card className="p-5 shadow-sm border-purple-200 dark:border-purple-900/50 bg-gradient-to-br from-purple-50/40 to-indigo-50/20 dark:from-purple-950/20 dark:to-indigo-950/10 space-y-4">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
              <PauseCircle className="w-5 h-5" />
              <h3 className="text-sm font-bold">Smart Hold + Fairness</h3>
            </div>

            {activeHold ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-card border border-purple-200 dark:border-purple-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">Hold Status:</span>
                    <Badge className="bg-purple-600 text-white text-[10px]">
                      {isHoldActiveNow ? "ACTIVE NOW" : "SCHEDULED"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground font-mono">
                    {new Date(activeHold.startTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" — "}
                    {new Date(activeHold.endTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-foreground font-medium">Reason: {activeHold.reason}</p>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-muted-foreground">Skip Protection:</span>
                    <span className="font-bold text-purple-600 font-mono">
                      {selectedToken.skipCount} / {selectedToken.maxSkips || 5} skips
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full"
                      style={{
                        width: `${(selectedToken.skipCount / (selectedToken.maxSkips || 5)) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <Link to="/student/queue" className="block pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs text-purple-700 border-purple-300"
                  >
                    Manage Smart Hold
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-muted-foreground">
                <p>
                  Need to attend a lecture or exam? Declare a Smart Hold to temporarily step back 1 position
                  if called, without being dropped to the tail.
                </p>
                <Link to="/student/queue" className="block">
                  <Button
                    size="sm"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
                  >
                    <PauseCircle className="w-3.5 h-3.5 mr-1.5" />
                    Declare Smart Hold
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        </div>
      ) : (
        /* Empty State */
        <Card className="p-8 text-center border-dashed border-border bg-card">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <Ticket className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">You're not waiting anywhere</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-4">
            Choose an available campus service below to join a live fair queue and receive your dynamic token.
          </p>
        </Card>
      )}

      {/* 3. Available Services List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Available Campus Services
            </h2>
            <p className="text-xs text-muted-foreground">
              Select a desk to join the queue and receive real-time updates.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {services.map((s) => {
            const queue = s.queues[0];
            const isQueueOpen = queue?.status === "OPEN";
            const isCurrentInQueue = activeTokens.some((t) => t.queueId === queue?.id);
            return (
              <Card
                key={s.id}
                className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow border-border bg-card"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-sm text-foreground">{s.name}</h3>
                    <Badge
                      variant={isQueueOpen ? "success" : "secondary"}
                      className="text-[10px] uppercase font-semibold"
                    >
                      {queue?.status || "CLOSED"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {s.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-border mt-4 flex items-center justify-between">
                  <div className="text-[11px] text-muted-foreground">
                    Max Skips: <strong>{queue?.maxSkips || 5}</strong>
                  </div>

                  {isCurrentInQueue ? (
                    <Link to="/student/queue">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 text-blue-600 border-blue-200"
                      >
                        In Queue (View)
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleJoinQueue(queue.id, s.name)}
                      disabled={!isQueueOpen || isJoining === queue?.id}
                      className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                    >
                      {isJoining === queue?.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        "Join Queue"
                      )}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 4. Recent Notifications snippet */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-600" />
            Recent Queue Alerts
          </h2>
          <Link to="/student/notifications" className="text-xs text-blue-600 hover:underline">
            View all alerts
          </Link>
        </div>

        {recentNotifications.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No recent notifications.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recentNotifications.map((n) => (
              <Card key={n.id} className="p-3.5 bg-muted/30 border-border text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-foreground truncate">{n.title}</span>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />}
                </div>
                <p className="text-muted-foreground text-[11px] line-clamp-2 leading-relaxed">{n.message}</p>
                <span className="text-[10px] text-muted-foreground/75 mt-1 block font-mono">
                  {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* JOIN CONFIRMATION MODAL */}
      <AnimatePresence>
        {joinResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl overflow-hidden p-6 text-center space-y-5"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-foreground">You're in the Queue!</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Assigned token for <strong>{joinResult.serviceName}</strong>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3 font-mono">
                <div className="text-3xl font-black text-blue-600">CF-{joinResult.tokenNumber}</div>
                <div className="grid grid-cols-2 gap-2 text-xs border-t border-border pt-3">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Position</span>
                    <span className="font-bold text-foreground">#{joinResult.position}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">People Ahead</span>
                    <span className="font-bold text-foreground">{joinResult.peopleAhead}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setJoinResult(null)}
                  className="flex-1 text-xs"
                >
                  Done
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setJoinResult(null);
                    navigate("/student/queue");
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  View Live Queue
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
