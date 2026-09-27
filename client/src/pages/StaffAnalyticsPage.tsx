import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  SkipForward,
  Flame,
  Calendar,
  AlertCircle,
  Download,
  HelpCircle,
  RefreshCw,
  Layers,
  History,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { StaffHeader } from '@/components/common/StaffHeader';
import { queueService } from '@/services/queueService';
import { eventService } from '@/services/eventService';
import { StaffAnalyticsData, StaffQueue, StaffEventItem } from '@/types';
import { EventTimeline } from '@/components/events/EventTimeline';

const TIME_RANGES = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 Days', value: '7days' },
  { label: 'Last 30 Days', value: '30days' },
  { label: 'Custom Range', value: 'custom' },
];

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

export const StaffAnalyticsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState('today');
  const [selectedQueueId, setSelectedQueueId] = useState<string>('');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const [queues, setQueues] = useState<StaffQueue[]>([]);
  const [analyticsData, setAnalyticsData] = useState<StaffAnalyticsData | null>(null);
  const [recentEvents, setRecentEvents] = useState<StaffEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load available queues for filter dropdown
  useEffect(() => {
    async function loadQueues() {
      try {
        const res = await queueService.getStaffQueues();
        if (res.success && res.data) {
          setQueues(res.data);
        }
      } catch (err) {
        console.error('Failed to load queue list for filter:', err);
      }
    }
    loadQueues();
  }, []);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: {
        queueId?: string;
        timeRange?: string;
        startDate?: string;
        endDate?: string;
      } = {
        timeRange: timeRange === 'custom' ? undefined : timeRange,
      };

      if (selectedQueueId) {
        params.queueId = selectedQueueId;
      }

      if (timeRange === 'custom') {
        if (customStartDate && customEndDate) {
          params.startDate = new Date(customStartDate).toISOString();
          params.endDate = new Date(customEndDate).toISOString();
        } else {
          setError('Please specify both Start Date and End Date for custom range.');
          setIsLoading(false);
          return;
        }
      }

      const [analyticsRes, eventsRes] = await Promise.all([
        queueService.getStaffAnalytics(params),
        eventService.getEvents({
          queueId: selectedQueueId || undefined,
          pageSize: 10,
        }),
      ]);

      if (analyticsRes.success && analyticsRes.data) {
        setAnalyticsData(analyticsRes.data);
      } else {
        setError('Failed to fetch analytics data.');
      }

      if (eventsRes.success && eventsRes.data?.events) {
        setRecentEvents(eventsRes.data.events);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Unable to load analytics.');
    } finally {
      setIsLoading(false);
    }
  }, [timeRange, selectedQueueId, customStartDate, customEndDate]);

  useEffect(() => {
    if (timeRange !== 'custom') {
      fetchAnalytics();
    }
  }, [timeRange, selectedQueueId, fetchAnalytics]);

  const handleApplyCustom = () => {
    fetchAnalytics();
  };

  const handleExportCSV = () => {
    if (!analyticsData) return;
    const summary = analyticsData.summary;
    const rows = [
      ['Metric', 'Value', 'Description'],
      ['Total Served', summary.totalServed, 'Completed consultations'],
      ['Average Wait Time (seconds)', summary.averageWaitTimeSeconds, 'joinedAt to servingAt'],
      ['Average Service Time (seconds)', summary.averageServiceTimeSeconds, 'servingAt to completedAt'],
      ['No-Show Rate', summary.noShowRate !== null ? `${(summary.noShowRate * 100).toFixed(1)}%` : 'N/A', 'NO_SHOW / (COMPLETED + NO_SHOW)'],
      ['Smart Hold Tokens', summary.smartHoldCount, 'Tokens that declared Smart Hold'],
      ['Temporary Skips', summary.skipCount, 'Non-blocking fair passes'],
      ['Moved to Tail', summary.movedToTailCount, 'Fairness bound reached'],
      ['Cancelled Tokens', summary.cancelled, 'Student cancelled'],
      ['Total Tokens Processed', summary.totalTokens, 'All tokens in window'],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `campusflow_analytics_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = analyticsData?.summary;
  const outcomeBreakdown = analyticsData?.outcomeBreakdown || [];
  const fairnessActivity = analyticsData?.fairnessActivity || [];
  const activityTimeline = analyticsData?.activityTimeline || [];
  const queueBreakdown = analyticsData?.queueBreakdown || [];

  const hasData = (summary?.totalTokens ?? 0) > 0 || (summary?.totalServed ?? 0) > 0 || (summary?.skipCount ?? 0) > 0;

  return (
    <div className="space-y-6">
      <StaffHeader
        title="Queue Analytics"
        subtitle="Understand queue performance, service activity, and fairness behavior."
        isRefreshing={isLoading}
        onRefresh={fetchAnalytics}
      />

      {/* Filter Toolbar */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Queue Filter */}
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-muted-foreground shrink-0" />
              <select
                aria-label="Filter by Queue"
                value={selectedQueueId}
                onChange={(e) => setSelectedQueueId(e.target.value)}
                className="bg-card border border-border rounded-lg text-xs h-9 px-3 text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">All Queues (Aggregated)</option>
                {queues.map((q) => (
                  <option key={q.queueId} value={q.queueId}>
                    {q.serviceName}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Range Filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0 ml-1" />
              {TIME_RANGES.map((r) => (
                <Button
                  key={r.value}
                  size="sm"
                  variant={timeRange === r.value ? 'default' : 'outline'}
                  onClick={() => setTimeRange(r.value)}
                  className="text-xs h-9 px-3"
                >
                  {r.label}
                </Button>
              ))}
            </div>

            {/* Custom Date Inputs */}
            {timeRange === 'custom' && (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="date"
                  aria-label="Start Date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-card border border-border rounded-lg text-xs h-9 px-2.5 text-foreground"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <input
                  type="date"
                  aria-label="End Date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-card border border-border rounded-lg text-xs h-9 px-2.5 text-foreground"
                />
                <Button
                  size="sm"
                  onClick={handleApplyCustom}
                  className="text-xs h-9 px-3 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Apply
                </Button>
              </div>
            )}
          </div>

          {/* Export Action */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              disabled={!hasData || isLoading}
              className="text-xs h-9 gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={fetchAnalytics} className="text-xs h-8">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry
          </Button>
        </div>
      )}

      {/* 7 KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {/* 1. TOTAL SERVED */}
        <div className="relative group">
          <StatCard
            title="TOTAL SERVED"
            value={isLoading ? '...' : summary?.totalServed ?? 0}
            subtitle="Completed tokens"
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            variant="success"
          />
          <div className="absolute right-2 top-2 text-muted-foreground/50 hover:text-foreground cursor-help" title="Number of COMPLETED tokens within the selected period.">
            <HelpCircle className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* 2. AVERAGE WAIT TIME */}
        <div className="relative group">
          <StatCard
            title="AVG WAIT TIME"
            value={isLoading ? '...' : summary ? formatDuration(summary.averageWaitTimeSeconds) : '0s'}
            subtitle="joinedAt → servingAt"
            icon={<Clock className="w-4 h-4 text-indigo-600" />}
            variant="primary"
          />
          <div className="absolute right-2 top-2 text-muted-foreground/50 hover:text-foreground cursor-help" title="Average time between joining the queue and being called for service.">
            <HelpCircle className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* 3. AVERAGE SERVICE TIME */}
        <div className="relative group">
          <StatCard
            title="AVG SERVICE TIME"
            value={isLoading ? '...' : summary ? formatDuration(summary.averageServiceTimeSeconds) : '0s'}
            subtitle="servingAt → completedAt"
            icon={<TrendingUp className="w-4 h-4 text-blue-600" />}
            variant="default"
          />
          <div className="absolute right-2 top-2 text-muted-foreground/50 hover:text-foreground cursor-help" title="Average time between being called and completing consultation.">
            <HelpCircle className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* 4. NO-SHOW RATE */}
        <div className="relative group">
          <StatCard
            title="NO-SHOW RATE"
            value={
              isLoading
                ? '...'
                : summary?.noShowRate !== null && summary?.noShowRate !== undefined
                ? `${(summary.noShowRate * 100).toFixed(1)}%`
                : 'N/A'
            }
            subtitle="NO_SHOW / Concluded"
            icon={<XCircle className="w-4 h-4 text-rose-600" />}
            variant="default"
          />
          <div className="absolute right-2 top-2 text-muted-foreground/50 hover:text-foreground cursor-help" title="No-Show Rate: NO_SHOW / (COMPLETED + NO_SHOW). Shows N/A if 0 total concluded.">
            <HelpCircle className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* 5. SMART HOLD USE */}
        <div className="relative group">
          <StatCard
            title="SMART HOLD USE"
            value={isLoading ? '...' : summary?.smartHoldCount ?? 0}
            subtitle="Tokens with hold"
            icon={<Clock className="w-4 h-4 text-purple-600" />}
            variant="purple"
          />
          <div className="absolute right-2 top-2 text-muted-foreground/50 hover:text-foreground cursor-help" title="Number of unique tokens that declared at least one Smart Hold.">
            <HelpCircle className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* 6. SKIPS */}
        <div className="relative group">
          <StatCard
            title="TOTAL SKIPS"
            value={isLoading ? '...' : summary?.skipCount ?? 0}
            subtitle="SKIPPED events"
            icon={<SkipForward className="w-4 h-4 text-purple-600" />}
            variant="purple"
          />
          <div className="absolute right-2 top-2 text-muted-foreground/50 hover:text-foreground cursor-help" title="Total times tokens were temporarily skipped because of active Smart Holds.">
            <HelpCircle className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* 7. MOVED TO TAIL */}
        <div className="relative group">
          <StatCard
            title="MOVED TO TAIL"
            value={isLoading ? '...' : summary?.movedToTailCount ?? 0}
            subtitle="Limit reached"
            icon={<Flame className="w-4 h-4 text-rose-600" />}
            variant="primary"
          />
          <div className="absolute right-2 top-2 text-muted-foreground/50 hover:text-foreground cursor-help" title="Total times tokens reached maximum fairness skips and were moved to tail.">
            <HelpCircle className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Loading / Empty / Data State */}
      {isLoading ? (
        <Card className="p-12 text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <h3 className="text-sm font-bold text-foreground">Loading Analytics...</h3>
          <p className="text-xs text-muted-foreground mt-1">Aggregating PostgreSQL queue records and event telemetry.</p>
        </Card>
      ) : !hasData ? (
        <Card className="p-12 text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-bold text-foreground">Not enough data yet</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            No analytics data available for this period. Analytics will appear after queue activity is recorded.
          </p>
        </Card>
      ) : (
        <>
          {/* Charts Row 1: Wait Time Trend & Daily Throughput */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 1. AVERAGE WAIT TIME TREND */}
            <Card className="lg:col-span-7">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  Average Wait Time Trend
                </CardTitle>
                <CardDescription className="text-xs">
                  Average time students waited before being served (in minutes).
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-2">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activityTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorWait" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                      <XAxis dataKey="label" stroke="#888888" fontSize={11} tickLine={false} />
                      <YAxis stroke="#888888" fontSize={11} tickLine={false} unit="m" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          borderColor: '#334155',
                          color: '#ffffff',
                          borderRadius: '0.5rem',
                          fontSize: '12px',
                        }}
                        formatter={(val: any) => [`${val} min`, 'Avg Wait']}
                      />
                      <Area
                        type="monotone"
                        dataKey="averageWaitMinutes"
                        name="Avg Wait (min)"
                        stroke="#6366f1"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorWait)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 2. DAILY THROUGHPUT (COMPLETED vs NO-SHOW vs CANCELLED) */}
            <Card className="lg:col-span-5">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  Queue Throughput
                </CardTitle>
                <CardDescription className="text-xs">
                  Completed consultations vs no-show outcomes.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-2">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                      <XAxis dataKey="label" stroke="#888888" fontSize={11} tickLine={false} />
                      <YAxis stroke="#888888" fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          borderColor: '#334155',
                          color: '#ffffff',
                          borderRadius: '0.5rem',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="noShow" name="No-Show" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2: Queue Outcomes & Bounded Fair-Skip Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 3. QUEUE OUTCOME BREAKDOWN (Donut) */}
            <Card className="lg:col-span-4">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-indigo-600" />
                  Queue Outcomes
                </CardTitle>
                <CardDescription className="text-xs">
                  COMPLETED vs NO_SHOW vs CANCELLED
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-2">
                {outcomeBreakdown.length === 0 ? (
                  <div className="h-60 flex items-center justify-center text-xs text-muted-foreground">
                    No outcome records in this period.
                  </div>
                ) : (
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={outcomeBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {outcomeBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            borderColor: '#334155',
                            color: '#ffffff',
                            borderRadius: '0.5rem',
                            fontSize: '12px',
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={32}
                          iconType="circle"
                          wrapperStyle={{ fontSize: '11px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 4. BOUNDED FAIR-SKIP ACTIVITY */}
            <Card className="lg:col-span-8">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <SkipForward className="w-4 h-4 text-purple-600" />
                    Bounded Fair-Skip Activity
                  </CardTitle>
                  <Badge variant="outline" className="text-[11px] font-mono">
                    Fairness Innovation
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Evidence-based telemetry of Smart Holds declared, non-blocking skips, and tail moves.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-2">
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fairnessActivity} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                      <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} />
                      <YAxis stroke="#888888" fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          borderColor: '#334155',
                          color: '#ffffff',
                          borderRadius: '0.5rem',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
                        {fairnessActivity.map((entry, index) => (
                          <Cell key={`bar-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Service Comparison Breakdown */}
          {queueBreakdown.length > 0 && (
            <Card>
              <CardHeader className="p-4 sm:p-5 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Service Breakdown & Queue Performance
                </CardTitle>
                <CardDescription className="text-xs">
                  Token volume, completion rates, and average wait times across campus queues.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {queueBreakdown.map((q) => {
                    const total = q.total || 0;
                    const completed = q.completed || 0;
                    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
                    return (
                      <div key={q.queueId} className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-foreground">{q.serviceName}</span>
                          <span className="font-mono text-muted-foreground">
                            {completed} / {total} ({rate}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                          <span>Avg Wait: <strong>{q.avgWaitMinutes}m</strong></span>
                          <span>No-Shows: <strong>{q.noShow}</strong></span>
                          <span>Skips: <strong>{q.skips}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* RECENT QUEUE ACTIVITY (AUDIT LOGS) */}
          <Card>
            <CardHeader className="p-4 sm:p-5 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-600" />
                  Recent Queue Activity
                </CardTitle>
                <Badge variant="outline" className="text-[11px] font-mono">
                  Live Audit Log
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Latest operational events: SKIPPED, MOVED_TO_TAIL, SERVING, COMPLETED, NO_SHOW.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-2">
              <EventTimeline events={recentEvents} isLoading={false} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default StaffAnalyticsPage;
