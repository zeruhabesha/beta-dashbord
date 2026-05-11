import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Activity,
    AlertTriangle,
    BarChart2,
    CheckCircle2,
    Clock,
    Cloud,
    Database,
    GitBranch,
    Layers,
    RefreshCw,
    Server,
    XCircle
} from 'lucide-react';
import {
    fetchClusterHealth,
    fetchClusterInfo,
    fetchOtelLogStats,
    fetchOtelLogVolume,
    fetchOtelRecentLogs,
    fetchOtelTraceStats,
    fetchOtelRecentTraces,
    fetchOtelMetricStats,
    fetchUniqueServiceCount
} from '../../api/otelApi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';

const SEVERITY_ORDER = ['FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'];

function formatNum(value) {
    if (value === undefined || value === null || value === '') return '-';
    const number = Number(value);
    if (Number.isNaN(number)) return String(value);
    if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
    if (number >= 1_000) return `${(number / 1_000).toFixed(1)}K`;
    return String(number);
}

function timeAgo(value) {
    if (!value) return '-';
    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return String(value);
    const diff = Math.max(0, Date.now() - timestamp);
    if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
    return `${Math.round(diff / 86_400_000)}d ago`;
}

function getLogInterval(timeRange) {
    if (timeRange === '15m') return '1m';
    if (timeRange === '1h') return '5m';
    if (timeRange === '7d') return '6h';
    if (timeRange === '30d') return '1d';
    return '1h';
}

function statusVariant(status) {
    if (status === 'green') return 'success';
    if (status === 'red') return 'destructive';
    return 'outline';
}

function statusLabel(status) {
    if (status === 'green') return 'Healthy';
    if (status === 'red') return 'Critical';
    return 'Degraded';
}

function severityVariant(severity) {
    const value = String(severity || '').toUpperCase();
    if (value === 'FATAL' || value === 'ERROR') return 'destructive';
    return 'outline';
}

function SectionHeading({ icon: Icon, title, description }) {
    return (
        <div className="flex items-center gap-3">
            <div className="rounded-lg border bg-muted p-2 text-foreground">
                <Icon size={18} />
            </div>
            <div>
                <div className="text-sm font-semibold text-foreground">{title}</div>
                {description && <div className="text-xs text-muted-foreground">{description}</div>}
            </div>
        </div>
    );
}

function MetricCard({ icon: Icon, title, value, description, loading, danger, success }) {
    return (
        <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                    <CardDescription>{title}</CardDescription>
                    {loading ? (
                        <Skeleton className="mt-3 h-9 w-24" />
                    ) : (
                        <CardTitle className={danger ? 'mt-3 text-3xl text-destructive' : success ? 'mt-3 text-3xl text-success' : 'mt-3 text-3xl'}>
                            {value}
                        </CardTitle>
                    )}
                </div>
                <div className="rounded-xl border bg-muted p-3 text-foreground">
                    <Icon size={22} />
                </div>
            </CardHeader>
            {description && (
                <CardContent>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </CardContent>
            )}
        </Card>
    );
}

function BarList({ data = [], loading, maxItems = 10 }) {
    if (loading) {
        return (
            <div className="flex flex-col gap-3">
                {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-5 w-full" />
                ))}
            </div>
        );
    }

    const items = data.slice(0, maxItems);
    const max = Math.max(...items.map((item) => item.count), 1);

    if (!items.length) {
        return <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No data in selected range.</div>;
    }

    return (
        <div className="flex flex-col gap-3">
            {items.map((item) => {
                const width = `${Math.max(4, Math.round((item.count / max) * 100))}%`;
                return (
                    <div key={item.key} className="grid grid-cols-[120px_1fr_56px] items-center gap-3">
                        <div className="truncate text-xs font-medium text-muted-foreground" title={item.key}>{item.key}</div>
                        <div className="h-3 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width }} />
                        </div>
                        <div className="text-right text-xs font-mono text-muted-foreground">{formatNum(item.count)}</div>
                    </div>
                );
            })}
        </div>
    );
}

function LogVolumeBars({ data = [], loading }) {
    if (loading) return <Skeleton className="h-24 w-full" />;
    if (!data.length) {
        return <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">No volume data.</div>;
    }

    const max = Math.max(...data.map((item) => item.count), 1);

    return (
        <div className="flex h-28 items-end gap-1">
            {data.slice(-36).map((item) => (
                <div
                    key={item.time}
                    className="min-w-1 flex-1 rounded-t bg-primary"
                    title={`${new Date(item.time).toLocaleString()} - ${formatNum(item.count)}`}
                    style={{ height: `${Math.max(4, (item.count / max) * 100)}%` }}
                />
            ))}
        </div>
    );
}

function ClusterHealthCard({ health, info, loading }) {
    if (loading && !health) {
        return <Skeleton className="h-28 w-full rounded-2xl" />;
    }

    const status = health?.status;

    return (
        <Card className="rounded-2xl">
            <CardContent className="flex flex-wrap items-center gap-6 p-6">
                <div className="flex items-center gap-3">
                    <Badge variant={statusVariant(status)} className="gap-2 rounded-full px-3 py-1">
                        <span className={`size-2 rounded-full ${status === 'red' ? 'bg-destructive-foreground' : status === 'green' ? 'bg-success-foreground' : 'bg-foreground'}`} />
                        {statusLabel(status)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">OpenSearch cluster status: {status || 'unknown'}</span>
                </div>
                <div className="grid flex-1 grid-cols-2 gap-4 md:grid-cols-5">
                    <div>
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">Cluster</div>
                        <div className="truncate text-sm font-semibold">{health?.clusterName || info?.clusterName || '-'}</div>
                    </div>
                    <div>
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">Version</div>
                        <div className="text-sm font-semibold">{info?.version || '-'}</div>
                    </div>
                    <div>
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">Nodes</div>
                        <div className="text-sm font-semibold">{health?.nodes ?? '-'}</div>
                    </div>
                    <div>
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">Active Shards</div>
                        <div className="text-sm font-semibold">{health?.activeShards ?? '-'}</div>
                    </div>
                    <div>
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">Unassigned</div>
                        <div className={(health?.unassignedShards ?? 0) > 0 ? 'text-sm font-semibold text-destructive' : 'text-sm font-semibold text-success'}>
                            {health?.unassignedShards ?? '-'}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function RecentTracesTable({ data = [], loading }) {
    if (loading) return <Skeleton className="h-72 w-full rounded-xl" />;

    return (
        <div className="overflow-hidden rounded-xl border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Service</TableHead>
                        <TableHead>Operation</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead className="text-right">Duration</TableHead>
                        <TableHead className="text-center">HTTP</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">When</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.slice(0, 30).map((trace, index) => {
                        const hasError = (trace.statusCode ?? 0) > 0 || (trace.httpStatus ?? 0) >= 400;
                        return (
                            <TableRow key={trace.id || index}>
                                <TableCell className="font-semibold">{trace.serviceName || '-'}</TableCell>
                                <TableCell className="max-w-[240px] truncate" title={trace.name}>{trace.name || '-'}</TableCell>
                                <TableCell>{trace.httpMethod || '-'}</TableCell>
                                <TableCell className="text-right font-mono">{trace.durationMs !== '-' ? `${trace.durationMs}ms` : '-'}</TableCell>
                                <TableCell className={hasError ? 'text-center font-mono text-destructive' : 'text-center font-mono'}>
                                    {trace.httpStatus || '-'}
                                </TableCell>
                                <TableCell className="text-center">
                                    {hasError ? <XCircle className="mx-auto text-destructive" size={16} /> : <CheckCircle2 className="mx-auto text-success" size={16} />}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">{timeAgo(trace.startTime)}</TableCell>
                            </TableRow>
                        );
                    })}
                    {!data.length && (
                        <TableRow>
                            <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No trace data.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

function RecentLogsTable({ data = [], loading, severityFilter }) {
    const filtered = useMemo(() => {
        if (!severityFilter || severityFilter === 'ALL') return data;
        return data.filter((log) => String(log.severityText || '').toUpperCase() === severityFilter);
    }, [data, severityFilter]);

    if (loading) return <Skeleton className="h-72 w-full rounded-xl" />;

    return (
        <div className="overflow-hidden rounded-xl border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-24 text-center">Level</TableHead>
                        <TableHead className="w-40">Service</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead className="w-28 text-right">Time</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filtered.slice(0, 60).map((log, index) => (
                        <TableRow key={log.id || index}>
                            <TableCell className="text-center">
                                <Badge variant={severityVariant(log.severityText)}>{log.severityText || 'UNKNOWN'}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{log.serviceName || '-'}</TableCell>
                            <TableCell className="max-w-[620px] truncate" title={log.body}>{log.body || '-'}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{timeAgo(log.time)}</TableCell>
                        </TableRow>
                    ))}
                    {!filtered.length && (
                        <TableRow>
                            <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">No log entries.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

export function ObservabilityDashboard({ timeRange = '24h' }) {
    const [health, setHealth] = useState(null);
    const [clusterInfo, setClusterInfo] = useState(null);
    const [logStats, setLogStats] = useState(null);
    const [logVolume, setLogVolume] = useState([]);
    const [recentLogs, setRecentLogs] = useState([]);
    const [traceStats, setTraceStats] = useState(null);
    const [recentTraces, setRecentTraces] = useState([]);
    const [metricStats, setMetricStats] = useState(null);
    const [serviceCount, setServiceCount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(null);
    const [severityFilter, setSeverityFilter] = useState('ALL');

    const logInterval = useMemo(() => getLogInterval(timeRange), [timeRange]);

    const loadAll = useCallback(async () => {
        setLoading(true);
        const [healthResult, infoResult, logStatsResult, logVolumeResult, recentLogsResult, traceStatsResult, tracesResult, metricStatsResult, serviceCountResult] = await Promise.allSettled([
            fetchClusterHealth(),
            fetchClusterInfo(),
            fetchOtelLogStats(timeRange),
            fetchOtelLogVolume(timeRange, logInterval),
            fetchOtelRecentLogs(60, timeRange),
            fetchOtelTraceStats(timeRange),
            fetchOtelRecentTraces(30),
            fetchOtelMetricStats(),
            fetchUniqueServiceCount()
        ]);

        if (healthResult.status === 'fulfilled') setHealth(healthResult.value);
        if (infoResult.status === 'fulfilled') setClusterInfo(infoResult.value);
        if (logStatsResult.status === 'fulfilled') setLogStats(logStatsResult.value);
        if (logVolumeResult.status === 'fulfilled') setLogVolume(logVolumeResult.value);
        if (recentLogsResult.status === 'fulfilled') setRecentLogs(recentLogsResult.value);
        if (traceStatsResult.status === 'fulfilled') setTraceStats(traceStatsResult.value);
        if (tracesResult.status === 'fulfilled') setRecentTraces(tracesResult.value);
        if (metricStatsResult.status === 'fulfilled') setMetricStats(metricStatsResult.value);
        if (serviceCountResult.status === 'fulfilled') setServiceCount(serviceCountResult.value);

        setLastRefresh(new Date());
        setLoading(false);
    }, [logInterval, timeRange]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    useEffect(() => {
        const timer = window.setInterval(loadAll, 30_000);
        return () => window.clearInterval(timer);
    }, [loadAll]);

    const severityKeys = useMemo(() => {
        const present = logStats?.severityBreakdown || [];
        return ['ALL', ...SEVERITY_ORDER.filter((severity) => present.some((item) => String(item.key).toUpperCase() === severity))];
    }, [logStats]);

    const errorRate = Number(traceStats?.errorRate || 0);

    return (
        <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <Badge variant="outline" className="mb-3 gap-2 rounded-full px-3 py-1 uppercase tracking-widest">
                        <Cloud size={12} />
                        OpenTelemetry Observability
                    </Badge>
                    <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Cluster Observability Dashboard</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Live OpenSearch telemetry, distributed traces, logs, and metrics for the {timeRange} window.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {lastRefresh && <span className="text-xs text-muted-foreground">Refreshed {timeAgo(lastRefresh.toISOString())}</span>}
                    <Button variant="outline" onClick={loadAll} disabled={loading}>
                        <RefreshCw className={loading ? 'animate-spin' : ''} size={14} />
                        Refresh
                    </Button>
                </div>
            </div>

            <ClusterHealthCard health={health} info={clusterInfo} loading={loading} />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard icon={Database} title="OTel Log Entries" value={formatNum(logStats?.total)} description={`Across ${logStats?.topServices?.length ?? 0} services`} loading={loading && !logStats} />
                <MetricCard icon={GitBranch} title="Distributed Traces" value={formatNum(traceStats?.total)} description={`${traceStats?.errorRate ?? '0.0'}% error rate`} loading={loading && !traceStats} danger={errorRate > 0} />
                <MetricCard icon={BarChart2} title="Metric Data Points" value={formatNum(metricStats?.total)} description={`${metricStats?.metricNames?.length ?? 0} unique metrics`} loading={loading && !metricStats} />
                <MetricCard icon={Server} title="Instrumented Services" value={serviceCount ?? '-'} description={`Average ${traceStats?.avgDurationMs ?? '-'}ms latency`} loading={loading && serviceCount === null} success={(serviceCount ?? 0) > 0} />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card className="rounded-2xl">
                    <CardHeader>
                        <SectionHeading icon={AlertTriangle} title="Log Severity Breakdown" description="Distribution over the selected time range." />
                    </CardHeader>
                    <CardContent>
                        <BarList data={logStats?.severityBreakdown || []} loading={loading && !logStats} />
                    </CardContent>
                </Card>

                <Card className="rounded-2xl">
                    <CardHeader>
                        <SectionHeading icon={Activity} title="Log Volume Over Time" description={`Histogram interval: ${logInterval}`} />
                    </CardHeader>
                    <CardContent>
                        <LogVolumeBars data={logVolume} loading={loading && !logVolume.length} />
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <Card className="rounded-2xl">
                    <CardHeader>
                        <SectionHeading icon={Layers} title="Top Services by Logs" />
                    </CardHeader>
                    <CardContent>
                        <BarList data={logStats?.topServices || []} loading={loading && !logStats} />
                    </CardContent>
                </Card>

                <Card className="rounded-2xl xl:col-span-2">
                    <CardHeader>
                        <SectionHeading icon={Clock} title="Trace Analytics Summary" description="Computed from distributed spans." />
                    </CardHeader>
                    <CardContent className="flex flex-col gap-6">
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                            {[
                                ['Total Spans', formatNum(traceStats?.total)],
                                ['Error Spans', formatNum(traceStats?.errorCount), Number(traceStats?.errorCount || 0) > 0],
                                ['Avg Latency', traceStats?.avgDurationMs ? `${traceStats.avgDurationMs}ms` : '-'],
                                ['P99 Latency', traceStats?.p99DurationMs ? `${traceStats.p99DurationMs}ms` : '-']
                            ].map(([label, value, danger]) => (
                                <div key={label} className="rounded-xl border bg-muted p-4">
                                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
                                    <div className={danger ? 'mt-1 text-xl font-bold text-destructive' : 'mt-1 text-xl font-bold'}>{value}</div>
                                </div>
                            ))}
                        </div>
                        <BarList data={traceStats?.topServices || []} loading={loading && !traceStats} />
                    </CardContent>
                </Card>
            </div>

            <Card className="rounded-2xl">
                <CardHeader>
                    <SectionHeading icon={Clock} title="Recent Distributed Traces" description="Latest spans from all instrumented services." />
                </CardHeader>
                <CardContent>
                    <RecentTracesTable data={recentTraces} loading={loading && !recentTraces.length} />
                </CardContent>
            </Card>

            <Card className="rounded-2xl">
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
                    <SectionHeading icon={Layers} title="Live Log Stream" description="Latest entries from all instrumented services." />
                    <div className="flex flex-wrap gap-2">
                        {severityKeys.map((severity) => (
                            <Button
                                key={severity}
                                type="button"
                                variant={severityFilter === severity ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSeverityFilter(severity)}
                            >
                                {severity}
                            </Button>
                        ))}
                    </div>
                </CardHeader>
                <CardContent>
                    <RecentLogsTable data={recentLogs} loading={loading && !recentLogs.length} severityFilter={severityFilter} />
                </CardContent>
            </Card>

            <Card className="rounded-2xl">
                <CardHeader>
                    <SectionHeading icon={BarChart2} title="Available Metrics" description={`${metricStats?.metricNames?.length ?? 0} metric series in the metrics index.`} />
                </CardHeader>
                <CardContent>
                    {loading && !metricStats ? (
                        <Skeleton className="h-20 w-full" />
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {(metricStats?.metricNames || []).map((metric) => (
                                <Badge key={metric.key} variant="outline" className="gap-2 font-mono">
                                    {metric.key}
                                    <span className="text-muted-foreground">{formatNum(metric.count)}</span>
                                </Badge>
                            ))}
                            {!metricStats?.metricNames?.length && (
                                <span className="text-sm text-muted-foreground">No metrics data.</span>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
