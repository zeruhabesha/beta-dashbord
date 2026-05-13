import React, { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
    Activity, AlertTriangle, BarChart2, CheckCircle2,
    Clock, Cloud, Database, GitBranch, Layers,
    RefreshCw, Server, XCircle, ShieldCheck, Zap,
    Cpu, MemoryStick, Search, ChevronRight, X, Bell
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

function ProfessionalCard({ children, className }) {
    return (
        <div className={clsx(
            'overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors dark:border-neutral-800 dark:bg-neutral-900/50',
            className
        )}>
            {children}
        </div>
    );
}

function MetricCard({ icon: Icon, title, value, description, loading, tone = 'blue' }) {
    const iconColors = {
        blue: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20',
        purple: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20',
        red: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20',
        orange: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20',
        emerald: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20'
    };

    return (
        <ProfessionalCard className="p-5">
            <div className="flex items-center justify-between">
                <div className={clsx('rounded-lg p-2.5', iconColors[tone])}>
                    <Icon size={20} />
                </div>
            </div>
            <div className="mt-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-neutral-500">{title}</p>
                {loading ? (
                    <Skeleton className="mt-2 h-8 w-24" />
                ) : (
                    <h3 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</h3>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-neutral-400">{description}</p>
            </div>
        </ProfessionalCard>
    );
}

function SectionHeader({ icon: Icon, title, description }) {
    return (
        <div className="flex items-center gap-3 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 text-gray-600 border border-gray-100 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700">
                <Icon size={18} />
            </div>
            <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900 dark:text-white">{title}</h3>
                {description && <p className="text-[11px] font-medium text-gray-500 dark:text-neutral-500">{description}</p>}
            </div>
        </div>
    );
}

function BarList({ data = [], loading, maxItems = 10 }) {
    if (loading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}</div>;

    const items = data.slice(0, maxItems);
    const max = Math.max(...items.map((item) => item.count), 1);

    if (!items.length) return <div className="py-10 text-center text-xs text-gray-400 italic">No data available.</div>;

    return (
        <div className="space-y-3">
            {items.map((item) => (
                <div key={item.key} className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-[11px] font-bold">
                        <span className="text-gray-700 dark:text-neutral-300 truncate pr-4" title={item.key}>{item.key}</span>
                        <span className="text-gray-500 dark:text-neutral-500 font-mono">{formatNum(item.count)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-500" style={{ width: `${Math.max(4, (item.count / max) * 100)}%` }} />
                    </div>
                </div>
            ))}
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
        const results = await Promise.allSettled([
            fetchClusterHealth(), fetchClusterInfo(), fetchOtelLogStats(timeRange),
            fetchOtelLogVolume(timeRange, logInterval), fetchOtelRecentLogs(60, timeRange),
            fetchOtelTraceStats(timeRange), fetchOtelRecentTraces(30),
            fetchOtelMetricStats(), fetchUniqueServiceCount()
        ]);

        const setters = [setHealth, setClusterInfo, setLogStats, setLogVolume, setRecentLogs, setTraceStats, setRecentTraces, setMetricStats, setServiceCount];
        results.forEach((res, i) => { if (res.status === 'fulfilled') setters[i](res.value); });

        setLastRefresh(new Date());
        setLoading(false);
    }, [logInterval, timeRange]);

    useEffect(() => { loadAll(); }, [loadAll]);

    const severityKeys = useMemo(() => {
        const present = logStats?.severityBreakdown || [];
        return ['ALL', ...SEVERITY_ORDER.filter((s) => present.some((item) => String(item.key).toUpperCase() === s))];
    }, [logStats]);

    return (
        <div className="flex flex-col gap-8 p-6 lg:p-10 max-w-[1440px] mx-auto min-h-full">
            {/* Page Header */}
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                        <Activity size={18} />
                        <span className="text-[11px] font-bold uppercase tracking-widest">System Health & Telemetry</span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Observability Dashboard</h1>
                    <p className="mt-2 text-sm text-gray-500 dark:text-neutral-400">Live monitoring of OpenSearch cluster health, distributed traces, and log telemetry.</p>
                </div>

                <div className="flex items-center gap-3">
                    {lastRefresh && <span className="text-[10px] font-bold uppercase text-gray-400 dark:text-neutral-500">Refreshed {timeAgo(lastRefresh.toISOString())}</span>}
                    <Button onClick={loadAll} disabled={loading} variant="outline" className="h-10 border-gray-200 dark:border-neutral-800 font-bold text-[10px] uppercase tracking-widest px-4">
                        <RefreshCw size={14} className={loading ? 'animate-spin mr-2' : 'mr-2'} />
                        Sync Data
                    </Button>
                </div>
            </div>

            {/* Cluster Status Header */}
            <ProfessionalCard className="p-4 bg-gray-50/50 dark:bg-neutral-900/30">
                <div className="flex flex-wrap items-center gap-8 px-2">
                    <div className="flex items-center gap-3">
                        <div className={clsx('h-3 w-3 rounded-full', health?.status === 'green' ? 'bg-emerald-500' : 'bg-orange-500')} />
                        <div>
                            <p className="text-[9px] font-black uppercase text-gray-400 dark:text-neutral-500">Cluster Status</p>
                            <p className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-tight">{health?.status || 'Detecting...'}</p>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-gray-200 dark:bg-neutral-800" />
                    {[
                        ['Version', clusterInfo?.version || '-'],
                        ['Active Nodes', health?.nodes || '-'],
                        ['Active Shards', health?.activeShards || '-'],
                        ['Unassigned', health?.unassignedShards || '0']
                    ].map(([label, value]) => (
                        <div key={label}>
                            <p className="text-[9px] font-black uppercase text-gray-400 dark:text-neutral-500">{label}</p>
                            <p className="text-xs font-bold text-gray-900 dark:text-white">{value}</p>
                        </div>
                    ))}
                </div>
            </ProfessionalCard>

            {/* Top Metrics */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard icon={Database} title="Total Log Entries" value={formatNum(logStats?.total)} description="Aggregated log volume" loading={loading} tone="blue" />
                <MetricCard icon={GitBranch} title="Distributed Traces" value={formatNum(traceStats?.total)} description={`${traceStats?.errorRate ?? '0.0'}% error rate`} loading={loading} tone="purple" />
                <MetricCard icon={BarChart2} title="Metric Points" value={formatNum(metricStats?.total)} description="Live TSDB data points" loading={loading} tone="orange" />
                <MetricCard icon={Server} title="Target Services" value={serviceCount || '-'} description="Active instrumented apps" loading={loading} tone="emerald" />
            </div>

            {/* Middle Grid */}
            <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
                {/* Distributed Traces */}
                <div className="flex flex-col gap-6">
                    <ProfessionalCard className="p-6">
                        <SectionHeader icon={Clock} title="Recent Distributed Traces" description="High-latency and error-prone spans from recent activity." />
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-gray-100 dark:border-neutral-800 hover:bg-transparent">
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400">Service</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400">Operation</TableHead>
                                        <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-gray-400">Latency</TableHead>
                                        <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-gray-400">Status</TableHead>
                                        <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-gray-400">Time</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentTraces.slice(0, 8).map((trace, i) => (
                                        <TableRow key={i} className="border-gray-50 dark:border-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                                            <TableCell className="text-xs font-bold text-gray-900 dark:text-neutral-200">{trace.serviceName || '-'}</TableCell>
                                            <TableCell className="text-xs font-medium text-gray-500 dark:text-neutral-400 max-w-[200px] truncate">{trace.name || '-'}</TableCell>
                                            <TableCell className="text-right font-mono text-xs text-gray-700 dark:text-neutral-300">{trace.durationMs}ms</TableCell>
                                            <TableCell className="text-center">
                                                {(trace.httpStatus || 0) >= 400 ? <XCircle size={14} className="text-red-500 mx-auto" /> : <CheckCircle2 size={14} className="text-emerald-500 mx-auto" />}
                                            </TableCell>
                                            <TableCell className="text-right text-[10px] font-medium text-gray-400">{timeAgo(trace.startTime)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </ProfessionalCard>

                    <ProfessionalCard className="p-6">
                        <SectionHeader icon={Layers} title="Live Log Explorer" description="Real-time log stream from all instrumented targets." />
                        <div className="flex flex-wrap gap-2 mb-4">
                            {severityKeys.map(s => (
                                <Button key={s} onClick={() => setSeverityFilter(s)} variant={severityFilter === s ? 'default' : 'outline'} size="sm" className="h-7 text-[9px] font-black uppercase tracking-widest">
                                    {s}
                                </Button>
                            ))}
                        </div>
                        <div className="space-y-2">
                            {recentLogs.filter(l => severityFilter === 'ALL' || l.severityText === severityFilter).slice(0, 10).map((log, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50/30 dark:border-neutral-800 dark:bg-neutral-900/30 font-mono">
                                    <span className={clsx(
                                        'shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded border',
                                        log.severityText === 'ERROR' ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-900/20' : 'border-gray-200 bg-gray-100 text-gray-600 dark:border-neutral-700 dark:bg-neutral-800'
                                    )}>{log.severityText || 'INFO'}</span>
                                    <span className="shrink-0 text-[10px] font-bold text-blue-600 dark:text-blue-400">{log.serviceName}</span>
                                    <p className="text-[11px] text-gray-600 dark:text-neutral-400 truncate flex-1">{log.body}</p>
                                    <span className="shrink-0 text-[9px] text-gray-400">{timeAgo(log.time)}</span>
                                </div>
                            ))}
                        </div>
                    </ProfessionalCard>
                </div>

                {/* Sidebar Stats */}
                <div className="flex flex-col gap-6">
                    <ProfessionalCard className="p-5">
                        <SectionHeader icon={AlertTriangle} title="Severity Distribution" />
                        <BarList data={logStats?.severityBreakdown || []} loading={loading} />
                    </ProfessionalCard>

                    <ProfessionalCard className="p-5">
                        <SectionHeader icon={Layers} title="Logs by Service" />
                        <BarList data={logStats?.topServices || []} loading={loading} />
                    </ProfessionalCard>

                    <ProfessionalCard className="p-5">
                        <SectionHeader icon={GitBranch} title="Traces by Service" />
                        <BarList data={traceStats?.topServices || []} loading={loading} />
                    </ProfessionalCard>

                    <ProfessionalCard className="p-5">
                        <SectionHeader icon={BarChart2} title="Available Metrics" />
                        <div className="flex flex-wrap gap-1.5">
                            {(metricStats?.metricNames || []).slice(0, 15).map(m => (
                                <span key={m.key} className="inline-flex items-center rounded-md border border-gray-100 bg-gray-50 px-2 py-0.5 text-[9px] font-bold text-gray-600 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-400">
                                    {m.key}
                                </span>
                            ))}
                        </div>
                    </ProfessionalCard>
                </div>
            </div>
        </div>
    );
}
