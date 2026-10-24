import { useState, useEffect, useCallback, useRef } from "react";
import {
  ScrollText,
  Search,
  Filter,
  Calendar,
  ArrowUpDown,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { StaffHeader } from "@/components/common/StaffHeader";
import { EventIcon } from "@/components/events/EventIcon";
import { EventDetailsDrawer } from "@/components/events/EventDetailsDrawer";
import { eventService } from "@/services/eventService";
import { queueService } from "@/services/queueService";

const EVENT_FILTER_OPTIONS = [
  { label: "All Events", value: "ALL" },
  { label: "Joined", value: "JOINED" },
  { label: "Smart Hold", value: "HOLD_DECLARED" },
  { label: "Skipped", value: "SKIPPED" },
  { label: "Moved to Tail", value: "MOVED_TO_TAIL" },
  { label: "Serving", value: "SERVING" },
  { label: "Completed", value: "COMPLETED" },
  { label: "No Show", value: "NO_SHOW" },
  { label: "Paused/Resumed", value: "QUEUE_PAUSED" },
];

const DATE_RANGE_OPTIONS = [
  { label: "Today", value: "today" },
  { label: "Last 7 Days", value: "7days" },
  { label: "Last 30 Days", value: "30days" },
  { label: "All Time", value: "all" },
];

export function StaffEventsPage() {
  const [queues, setQueues] = useState([]);
  const [selectedQueueId, setSelectedQueueId] = useState("");
  const [selectedEventType, setSelectedEventType] = useState("ALL");
  const [dateRange, setDateRange] = useState("today");
  const [sortOrder, setSortOrder] = useState("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Inspector Drawer
  const [selectedEventId, setSelectedEventId] = useState(null);

  // Debounce search input (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 350);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Load available queues for filter dropdown
  useEffect(() => {
    queueService.getStaffQueues().then((res) => {
      if (res.success && res.data) {
        setQueues(res.data);
      }
    });
  }, []);

  const isMountedRef = useRef(true);

  const fetchEvents = useCallback(
    async (manual = false) => {
      if (manual) setIsRefreshing(true);
      setError(null);

      try {
        const res = await eventService.getEvents({
          queueId: selectedQueueId || undefined,
          eventType: selectedEventType !== "ALL" ? selectedEventType : undefined,
          search: debouncedSearch || undefined,
          dateRange: dateRange !== "all" ? dateRange : undefined,
          sortOrder,
          page: pagination.page,
          pageSize: pagination.pageSize,
        });

        if (isMountedRef.current && res.success && res.data) {
          setEvents(res.data.events || []);
          if (res.data.pagination) {
            setPagination(res.data.pagination);
          }
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err.response?.data?.message || err.message || "Failed to load audit events.");
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [
      selectedQueueId,
      selectedEventType,
      debouncedSearch,
      dateRange,
      sortOrder,
      pagination.page,
      pagination.pageSize,
    ]
  );

  useEffect(() => {
    isMountedRef.current = true;
    fetchEvents();

    const intervalId = setInterval(() => {
      fetchEvents();
    }, 4000);

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [fetchEvents]);

  const handleClearFilters = () => {
    setSelectedQueueId("");
    setSelectedEventType("ALL");
    setDateRange("today");
    setSortOrder("desc");
    setSearchTerm("");
    setDebouncedSearch("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const formatTokenNumber = (num) => {
    if (!num) return "—";
    return `CF-${num.toString().padStart(3, "0")}`;
  };

  const getEventDescription = (evt) => {
    switch (evt.eventType) {
      case "SKIPPED":
        return `Smart Hold active — Skip ${evt.metadata?.skipCount || "?"}/${evt.metadata?.maxSkips || 3}`;
      case "MOVED_TO_TAIL":
        return "Maximum Smart Hold skips reached (relocated to tail)";
      case "HOLD_DECLARED":
        return evt.metadata?.reason
          ? `Smart Hold declared: "${evt.metadata.reason}"`
          : "Smart Hold requested";
      case "HOLD_EXPIRED":
        return "Smart Hold window ended";
      case "HOLD_CANCELLED":
        return "Smart Hold cancelled by student";
      case "SERVING":
        return "Token called to desk";
      case "COMPLETED":
        return "Consultation completed";
      case "NO_SHOW":
        return "Student did not respond";
      case "CANCELLED":
        return "Queue token cancelled";
      case "JOINED":
        return "Student checked in";
      case "QUEUE_PAUSED":
        return "Queue intake paused";
      case "QUEUE_RESUMED":
        return "Queue intake resumed";
      default:
        return evt.metadata ? JSON.stringify(evt.metadata) : "—";
    }
  };

  return (
    <div className="space-y-6">
      <StaffHeader
        title="Event Log & Audit Timeline"
        subtitle="Complete, append-only, immutable record of all student and staff queue transactions"
        isRefreshing={isRefreshing}
        onRefresh={() => fetchEvents(true)}
      />

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => fetchEvents(true)} className="text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Filter and Search Hub */}
      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search token or student..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            {/* Queue Dropdown */}
            <div>
              <select
                value={selectedQueueId}
                onChange={(e) => {
                  setSelectedQueueId(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All Service Queues</option>
                {queues.map((q) => (
                  <option key={q.queueId} value={q.queueId}>
                    {q.serviceName}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Dropdown */}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
              <select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {DATE_RANGE_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort & Reset Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                className="text-xs h-9 flex-1 gap-1.5"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                {sortOrder === "desc" ? "Newest First" : "Oldest First"}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-xs h-9 text-muted-foreground hover:text-foreground"
                title="Reset filters"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Clear
              </Button>
            </div>
          </div>

          {/* Event Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-border">
            <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Type:
            </span>
            {EVENT_FILTER_OPTIONS.map((f) => (
              <Button
                key={f.value}
                size="sm"
                variant={selectedEventType === f.value ? "default" : "outline"}
                onClick={() => {
                  setSelectedEventType(f.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="text-[11px] h-7 px-2.5 rounded-full"
              >
                {f.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Audit Event Table */}
      <Card>
        <CardHeader className="p-4 sm:p-6 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-indigo-600" />
                Audit Trail
              </CardTitle>
              <CardDescription>Authoritative event sequence from PostgreSQL database</CardDescription>
            </div>

            <div className="text-xs text-muted-foreground font-medium">
              Showing <strong>{events.length}</strong> of <strong>{pagination.total}</strong> total events
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Timestamp</TableHead>
                <TableHead className="w-40">Event Type</TableHead>
                <TableHead className="w-28">Token</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Details & Fairness State</TableHead>
                <TableHead className="text-right w-20">Inspect</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-xs">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                      Loading audit events...
                    </div>
                  </TableCell>
                </TableRow>
              ) : events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-xs">
                    {debouncedSearch || selectedEventType !== "ALL" || selectedQueueId
                      ? "No events match your current filter criteria."
                      : "No queue events recorded yet."}
                  </TableCell>
                </TableRow>
              ) : (
                events.map((evt) => (
                  <TableRow
                    key={evt.id}
                    onClick={() => setSelectedEventId(evt.id)}
                    className="cursor-pointer hover:bg-muted/50 transition-colors group"
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(evt.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <EventIcon eventType={evt.eventType} size="sm" />
                    </TableCell>
                    <TableCell className="font-mono font-bold text-foreground text-xs">
                      {evt.token ? formatTokenNumber(evt.token.tokenNumber) : "—"}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-foreground">
                      {evt.token?.studentName || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {getEventDescription(evt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground group-hover:text-foreground"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-t border-border">
              <div className="text-xs text-muted-foreground">
                Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  className="text-xs h-8 px-2.5"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Previous
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  className="text-xs h-8 px-2.5"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Side Inspector Drawer */}
      <EventDetailsDrawer eventId={selectedEventId} onClose={() => setSelectedEventId(null)} />
    </div>
  );
}
