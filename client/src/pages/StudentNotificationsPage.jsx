import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, CheckCheck, RotateCcw, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationCard } from "@/components/notifications/NotificationCard";
import { notificationService } from "@/services/notificationService";

export function StudentNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState("ALL");
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState(null);

  const isMountedRef = useRef(true);

  const fetchNotifications = useCallback(
    async (manual = false) => {
      if (manual) setIsRefreshing(true);
      setError(null);

      try {
        const res = await notificationService.getNotifications({
          page: pagination.page,
          pageSize: pagination.pageSize,
          unreadOnly: filter === "UNREAD",
        });

        if (res.success && res.data && isMountedRef.current) {
          setNotifications(res.data.notifications || []);
          setUnreadCount(res.data.unreadCount || 0);
          if (res.data.pagination) {
            setPagination(res.data.pagination);
          }
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err.response?.data?.message || err.message || "Failed to load notifications.");
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [filter, pagination.page, pagination.pageSize]
  );

  useEffect(() => {
    isMountedRef.current = true;
    fetchNotifications();

    const timer = setInterval(() => {
      fetchNotifications();
    }, 4000);

    return () => {
      isMountedRef.current = false;
      clearInterval(timer);
    };
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    if (isMarkingAll || unreadCount === 0) return;
    setIsMarkingAll(true);
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Notifications</h1>
            {unreadCount > 0 && (
              <Badge className="bg-rose-600 text-white text-xs font-bold px-2 py-0.5 animate-pulse">
                {unreadCount} Unread
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Stay updated about your queue activity and Smart Hold transitions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={isMarkingAll}
              className="text-xs h-9 gap-1.5"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
              {isMarkingAll ? "Updating..." : "Mark all as read"}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchNotifications(true)}
            disabled={isRefreshing}
            className="text-xs h-9 text-muted-foreground"
          >
            <RotateCcw className={`w-3.5 h-3.5 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => fetchNotifications(true)} className="text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg w-fit">
          <Button
            size="sm"
            variant={filter === "ALL" ? "default" : "ghost"}
            onClick={() => {
              setFilter("ALL");
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="text-xs h-7 px-3 rounded-md"
          >
            All Messages
          </Button>
          <Button
            size="sm"
            variant={filter === "UNREAD" ? "default" : "ghost"}
            onClick={() => {
              setFilter("UNREAD");
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="text-xs h-7 px-3 rounded-md gap-1.5"
          >
            Unread
            {unreadCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
          </Button>
        </div>

        <span className="text-xs text-muted-foreground">
          Showing <strong>{notifications.length}</strong> of <strong>{pagination.total}</strong>
        </span>
      </div>

      {/* Notification List Cards */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-1/3 bg-muted rounded" />
                    <div className="h-3 w-2/3 bg-muted rounded" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <CardContent className="space-y-3 pt-0">
              <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6 opacity-60" />
              </div>
              <CardTitle className="text-base font-bold">
                {filter === "UNREAD" ? "No unread notifications" : "You're all caught up."}
              </CardTitle>
              <CardDescription className="text-xs max-w-sm mx-auto">
                {filter === "UNREAD"
                  ? "You have read all your notifications. Switch to All Messages to view history."
                  : "Important updates regarding your queue turn, Smart Holds, and fairness skips will appear here."}
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          notifications.map((item) => (
            <NotificationCard key={item.id} notification={item} onMarkRead={handleMarkAsRead} />
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page <= 1}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              className="text-xs h-8 px-3"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              Previous
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              className="text-xs h-8 px-3"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
