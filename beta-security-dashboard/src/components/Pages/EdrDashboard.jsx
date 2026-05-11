import React, { useEffect, useState } from 'react';
import {
    Activity,
    AlertCircle,
    Bug,
    Crosshair,
    FileText,
    Lock,
    Monitor,
    RefreshCw,
    Search,
    ShieldAlert
} from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import { DataTable } from '../Common/DataTable';
import { fetchEdrActivity, fetchEdrEndpointInventory, fetchEdrOverview } from '../../api/edr';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const RANGE_LABELS = {
    '15m': 'Last 15 minutes',
    '1h': 'Last 1 hour',
    '24h': 'Last 24 hours',
    '7d': 'Last 7 days'
};

const VIEW_COPY = {
    home: {
        title: 'Endpoint Detection Overview',
        description: 'Analyst landing page for malware detections, contained files, hot endpoints, and fresh endpoint alerts.'
    },
    endpoints: {
        title: 'Endpoint Inventory',
        description: 'Unique hosts seen in EDR telemetry with the latest threat posture, actor, and action.'
    },
    'active-threats': {
        title: 'Active Threats',
        description: 'Critical and high-severity EDR detections that need triage first.'
    },
    isolation: {
        title: 'Host Isolation',
        description: 'Blocked, quarantined, or actively investigated endpoint activity that indicates containment.'
    },
    malware: {
        title: 'Malware Analysis',
        description: 'Malware-centric detections with hashes, file paths, and endpoint attribution.'
    },
    'process-tree': {
        title: 'Process Tree',
        description: 'Process creation and termination activity for fast lineage review.'
    },
    'file-integrity': {
        title: 'File Integrity',
        description: 'File-level creation, modification, and deletion activity seen by EDR.'
    },
    hunting: {
        title: 'Threat Hunting',
        description: 'Full EDR event feed with global search applied across endpoints, users, hashes, and command lines.'
    }
};

const STATUS_STYLES = {
    Quarantined: 'bg-destructive text-destructive-foreground border-destructive',
    Blocked: 'bg-destructive/10 text-destructive border-destructive/30',
    Investigating: 'bg-neutral-100 text-neutral-950 border-neutral-300 dark:bg-neutral-800 dark:text-white dark:border-neutral-500',
    Allowed: 'bg-success/10 text-success border-success/30',
    Observed: 'bg-neutral-50 text-neutral-700 border-neutral-300 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-700',
    Unknown: 'bg-neutral-50 text-neutral-700 border-neutral-300 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-700'
};

const SEVERITY_STYLES = {
    Critical: 'bg-destructive text-destructive-foreground',
    High: 'bg-destructive/10 text-destructive border border-destructive/30',
    Medium: 'border border-neutral-400 bg-neutral-100 text-neutral-950 dark:bg-neutral-800 dark:text-white dark:border-neutral-500',
    Low: 'border border-success/30 bg-success/10 text-success',
    Unknown: 'border border-neutral-300 bg-neutral-50 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-700'
};

const THREAT_COLORS = ['#0a0a0a', '#262626', '#525252', '#737373', '#a3a3a3', '#d4d4d4'];
const MONO_ACCENT = 'border-neutral-950/20 bg-neutral-950/5 text-neutral-950 dark:border-white/25 dark:bg-white/10 dark:text-white';

function formatNumber(value) {
    return new Intl.NumberFormat().format(value || 0);
}

function formatDateTime(value) {
    if (!value) {
        return 'Unknown';
    }

    const timestamp = new Date(value);
    return Number.isNaN(timestamp.getTime()) ? value : timestamp.toLocaleString();
}

function trimMiddle(value, size = 18) {
    if (!value || value.length <= size) {
        return value || 'n/a';
    }

    const side = Math.max(4, Math.floor((size - 3) / 2));
    return `${value.slice(0, side)}...${value.slice(-side)}`;
}

function topCount(rows, predicate) {
    return rows.filter(predicate).length;
}

function severityBadge(severity) {
    return (
        <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${SEVERITY_STYLES[severity] || SEVERITY_STYLES.Unknown}`}>
            {severity || 'Unknown'}
        </span>
    );
}

function statusBadge(status) {
    return (
        <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${STATUS_STYLES[status] || STATUS_STYLES.Unknown}`}>
            {status || 'Observed'}
        </span>
    );
}

function EmptyPanel({ title }) {
    return (
        <div className="flex h-full min-h-48 items-center justify-center rounded-2xl border border-dashed border-border-subtle bg-bg-body/40 p-6 text-center text-sm text-text-muted">
            No {title.toLowerCase()} for the selected scope.
        </div>
    );
}

function Panel({ title, badge, children, className = '' }) {
    return (
        <section className={`rounded-3xl border border-border-subtle bg-bg-card/95 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.12)] ${className}`}>
            <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-sm font-semibold text-text-main">{title}</h3>
                </div>
                {badge && (
                    <span className="rounded-full border border-border-subtle px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
                        {badge}
                    </span>
                )}
            </div>
            {children}
        </section>
    );
}

function MetricCard({ icon: Icon, label, value, subtext, accent }) {
    return (
        <div className="rounded-3xl border border-border-subtle bg-bg-card/95 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.10)]">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-text-muted">{label}</div>
                    <div className="mt-3 text-4xl font-bold text-text-main">{value}</div>
                    <div className="mt-2 text-sm text-text-muted">{subtext}</div>
                </div>
                <div className={`rounded-2xl border p-3 ${accent}`}>
                    <Icon size={22} />
                </div>
            </div>
        </div>
    );
}

function ChartTooltip({ active, payload, label }) {
    if (!active || !payload?.length) {
        return null;
    }

    return (
        <div className="rounded-xl border border-border-subtle bg-black px-3 py-2 text-xs text-white shadow-xl">
            <div className="font-semibold text-text-main">{label}</div>
            <div className="mt-1 text-text-muted">{payload[0].value} alerts</div>
        </div>
    );
}

function OverviewList({ rows, emptyLabel, renderRow }) {
    if (!rows.length) {
        return <EmptyPanel title={emptyLabel} />;
    }

    return (
        <div className="space-y-3">
            {rows.map((row) => (
                <div
                    key={row.id}
                    className="rounded-2xl border border-border-subtle bg-bg-body/60 p-4 transition-colors hover:border-neutral-950/30 hover:bg-bg-body/80 dark:hover:border-white/30"
                >
                    {renderRow(row)}
                </div>
            ))}
        </div>
    );
}

function BarPanel({ data, valueFormatter = formatNumber }) {
    if (!data.length) {
        return <EmptyPanel title="Chart Data" />;
    }

    return (
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 16 }}>
                    <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.12)" />
                    <XAxis
                        dataKey="label"
                        tick={{ fill: '#737373', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        angle={data.length > 5 ? -20 : 0}
                        textAnchor={data.length > 5 ? 'end' : 'middle'}
                        height={data.length > 5 ? 56 : 30}
                    />
                    <YAxis
                        tick={{ fill: '#737373', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        width={44}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={40}>
                        {data.map((entry, index) => (
                            <Cell key={`${entry.label}-${index}`} fill={THREAT_COLORS[index % THREAT_COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
            <div className="mt-2 text-right text-xs text-text-muted">
                Total: {valueFormatter(data.reduce((sum, item) => sum + item.count, 0))}
            </div>
        </div>
    );
}

function LoadingOverview() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[...Array(4)].map((_, index) => (
                    <div key={index} className="h-36 animate-pulse rounded-3xl border border-border-subtle bg-bg-card/60" />
                ))}
            </div>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:auto-rows-[minmax(240px,auto)]">
                {[...Array(5)].map((_, index) => (
                    <div key={index} className="h-72 animate-pulse rounded-3xl border border-border-subtle bg-bg-card/60 xl:col-span-4" />
                ))}
            </div>
        </div>
    );
}

export function EdrDashboard({ activeView = 'home', timeRange = '24h', searchQuery = '' }) {
    const [overview, setOverview] = useState(null);
    const [rows, setRows] = useState([]);
    const [endpointRows, setEndpointRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [lastUpdatedAt, setLastUpdatedAt] = useState('');

    const copy = VIEW_COPY[activeView] || VIEW_COPY.home;
    const rangeLabel = RANGE_LABELS[timeRange] || `Last ${timeRange}`;

    const loadData = async () => {
        setLoading(true);
        setError('');

        try {
            if (activeView === 'home') {
                const nextOverview = await fetchEdrOverview({ timeRange, searchQuery });
                setOverview(nextOverview);
                setRows([]);
                setEndpointRows([]);
            } else if (activeView === 'endpoints') {
                const inventory = await fetchEdrEndpointInventory({ timeRange, searchQuery });
                setEndpointRows(inventory);
                setOverview(null);
                setRows([]);
            } else {
                const activityRows = await fetchEdrActivity({ viewId: activeView, timeRange, searchQuery });
                setRows(activityRows);
                setOverview(null);
                setEndpointRows([]);
            }

            setLastUpdatedAt(new Date().toISOString());
        } catch (nextError) {
            setError(nextError.message || 'Failed to load EDR telemetry.');
            setOverview(null);
            setRows([]);
            setEndpointRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [activeView, timeRange, searchQuery]);

    const renderOverview = () => {
        if (loading && !overview) {
            return <LoadingOverview />;
        }

        const severityMap = Object.fromEntries((overview?.severityBreakdown || []).map((item) => [item.label, item.count]));

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        icon={ShieldAlert}
                        label="Total Alerts"
                        value={formatNumber(overview?.totalAlerts || 0)}
                        subtext={`${rangeLabel} across EDR telemetry`}
                        accent={MONO_ACCENT}
                    />
                    <MetricCard
                        icon={Bug}
                        label="Malware Detections"
                        value={formatNumber(overview?.malwareDetections || 0)}
                        subtext="Threat types mapped to malware or ransomware"
                        accent={MONO_ACCENT}
                    />
                    <MetricCard
                        icon={Monitor}
                        label="Total Devices"
                        value={formatNumber(overview?.totalDevices || 0)}
                        subtext="Unique endpoints seen in the selected range"
                        accent={MONO_ACCENT}
                    />
                    <MetricCard
                        icon={Lock}
                        label="Contained Files"
                        value={formatNumber(overview?.containedFiles || 0)}
                        subtext="Blocked or quarantined file operations"
                        accent={MONO_ACCENT}
                    />
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:auto-rows-[minmax(240px,auto)]">
                    <Panel title="Malware Detections by Hash" badge={rangeLabel} className="xl:col-span-4">
                        <BarPanel
                            data={(overview?.detectionsByHash || []).map((item) => ({
                                ...item,
                                label: trimMiddle(item.label, 14)
                            }))}
                        />
                    </Panel>

                    <Panel title="Alerts by Type" badge={rangeLabel} className="xl:col-span-4 xl:row-span-2">
                        {(overview?.alertsByType || []).length ? (
                            <>
                                <div className="mb-4 flex flex-wrap gap-2">
                                    {['Critical', 'High', 'Medium', 'Low'].map((severity) => (
                                        <div key={severity} className="rounded-full border border-border-subtle bg-bg-body/50 px-3 py-1 text-xs text-text-muted">
                                            <span className="font-semibold text-text-main">{severity}</span>
                                            <span className="ml-2">{formatNumber(severityMap[severity] || 0)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="h-[420px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={overview.alertsByType} layout="vertical" margin={{ top: 8, right: 12, left: 6, bottom: 8 }}>
                                            <CartesianGrid horizontal={false} stroke="rgba(148,163,184,0.12)" />
                                            <XAxis type="number" tick={{ fill: '#737373', fontSize: 11 }} tickLine={false} axisLine={false} />
                                            <YAxis
                                                type="category"
                                                dataKey="label"
                                                tick={{ fill: '#e5e5e5', fontSize: 12 }}
                                                tickLine={false}
                                                axisLine={false}
                                                width={110}
                                            />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Bar dataKey="count" radius={[0, 10, 10, 0]} maxBarSize={34}>
                                                {overview.alertsByType.map((entry, index) => (
                                                    <Cell key={`${entry.label}-${index}`} fill={THREAT_COLORS[index % THREAT_COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </>
                        ) : (
                            <EmptyPanel title="Threat Type Activity" />
                        )}
                    </Panel>

                    <Panel title="Most Recent Alerts" badge="Live Feed" className="xl:col-span-4">
                        <OverviewList
                            rows={overview?.recentAlerts || []}
                            emptyLabel="Recent Alerts"
                            renderRow={(row) => (
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="font-semibold text-text-main">{row.threatType}</div>
                                            <div className="mt-1 text-xs text-text-muted">{row.endpoint}</div>
                                        </div>
                                        {severityBadge(row.severity)}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                                        {statusBadge(row.status)}
                                        <span>{row.processName}</span>
                                    </div>
                                    <div className="text-xs text-text-muted">{formatDateTime(row.timestamp)}</div>
                                </div>
                            )}
                        />
                    </Panel>

                    <Panel title="Contained Files" badge={rangeLabel} className="xl:col-span-4">
                        <OverviewList
                            rows={overview?.containedFileRows || []}
                            emptyLabel="Contained Files"
                            renderRow={(row) => (
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="truncate font-semibold text-text-main" title={row.filePath}>
                                                {row.filePath}
                                            </div>
                                            <div className="mt-1 text-xs text-text-muted">{row.endpoint}</div>
                                        </div>
                                        {statusBadge(row.status)}
                                    </div>
                                    <div className="text-xs text-text-muted">
                                        {trimMiddle(row.fileHash, 24)} • {row.processName}
                                    </div>
                                    <div className="text-xs text-text-muted">{formatDateTime(row.timestamp)}</div>
                                </div>
                            )}
                        />
                    </Panel>

                    <Panel title="Alerts by Endpoint" badge={rangeLabel} className="xl:col-span-4">
                        <BarPanel data={overview?.alertsByEndpoint || []} />
                    </Panel>
                </div>
            </div>
        );
    };

    const renderEndpointInventory = () => {
        const blocked = topCount(endpointRows, (row) => row.status === 'Blocked');
        const quarantined = topCount(endpointRows, (row) => row.status === 'Quarantined');
        const investigating = topCount(endpointRows, (row) => row.status === 'Investigating');

        const columns = [
            {
                key: 'endpoint',
                label: 'Endpoint',
                render: (value, row) => (
                    <div>
                        <div className="font-semibold text-text-main">{value}</div>
                        <div className="mt-1 text-xs text-text-muted">{row.topThreat}</div>
                    </div>
                )
            },
            {
                key: 'alerts',
                label: 'Alerts',
                render: (value) => <span className="font-semibold text-text-main">{formatNumber(value)}</span>
            },
            {
                key: 'severity',
                label: 'Severity',
                render: (value) => severityBadge(value)
            },
            {
                key: 'status',
                label: 'Status',
                render: (value) => statusBadge(value)
            },
            {
                key: 'lastUser',
                label: 'Last User'
            },
            {
                key: 'lastProcess',
                label: 'Last Process',
                render: (value) => <span className="font-mono text-xs text-text-muted">{value || 'n/a'}</span>
            },
            {
                key: 'lastSeen',
                label: 'Last Seen',
                render: (value) => formatDateTime(value)
            }
        ];

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        icon={Monitor}
                        label="Endpoints"
                        value={formatNumber(endpointRows.length)}
                        subtext={`Seen in ${rangeLabel.toLowerCase()}`}
                        accent={MONO_ACCENT}
                    />
                    <MetricCard
                        icon={ShieldAlert}
                        label="Investigating"
                        value={formatNumber(investigating)}
                        subtext="Hosts with active analyst focus"
                        accent={MONO_ACCENT}
                    />
                    <MetricCard
                        icon={Lock}
                        label="Blocked"
                        value={formatNumber(blocked)}
                        subtext="Endpoints with blocked activity"
                        accent={MONO_ACCENT}
                    />
                    <MetricCard
                        icon={AlertCircle}
                        label="Quarantined"
                        value={formatNumber(quarantined)}
                        subtext="Endpoints with quarantined activity"
                        accent={MONO_ACCENT}
                    />
                </div>

                <DataTable
                    columns={columns}
                    data={endpointRows}
                    loading={loading}
                    searchable={false}
                    pageSize={12}
                />
            </div>
        );
    };

    const renderEventRows = () => {
        const viewColumns = {
            'active-threats': [
                {
                    key: 'timestamp',
                    label: 'Time',
                    render: (value) => formatDateTime(value)
                },
                {
                    key: 'severity',
                    label: 'Severity',
                    render: (value) => severityBadge(value)
                },
                {
                    key: 'threatType',
                    label: 'Threat'
                },
                {
                    key: 'endpoint',
                    label: 'Endpoint'
                },
                {
                    key: 'status',
                    label: 'Status',
                    render: (value) => statusBadge(value)
                },
                {
                    key: 'mitreTechnique',
                    label: 'MITRE'
                },
                {
                    key: 'processName',
                    label: 'Process',
                    render: (value) => <span className="font-mono text-xs text-text-muted">{value}</span>
                }
            ],
            isolation: [
                {
                    key: 'timestamp',
                    label: 'Time',
                    render: (value) => formatDateTime(value)
                },
                {
                    key: 'endpoint',
                    label: 'Endpoint'
                },
                {
                    key: 'status',
                    label: 'Containment State',
                    render: (value) => statusBadge(value)
                },
                {
                    key: 'filePath',
                    label: 'File Path',
                    render: (value) => <span title={value}>{trimMiddle(value, 30)}</span>
                },
                {
                    key: 'processName',
                    label: 'Process'
                },
                {
                    key: 'user',
                    label: 'User'
                }
            ],
            malware: [
                {
                    key: 'timestamp',
                    label: 'Detection Time',
                    render: (value) => formatDateTime(value)
                },
                {
                    key: 'severity',
                    label: 'Severity',
                    render: (value) => severityBadge(value)
                },
                {
                    key: 'threatType',
                    label: 'Threat'
                },
                {
                    key: 'fileHash',
                    label: 'Hash',
                    render: (value) => <span className="font-mono text-xs text-text-muted">{trimMiddle(value, 20)}</span>
                },
                {
                    key: 'filePath',
                    label: 'Path',
                    render: (value) => <span title={value}>{trimMiddle(value, 28)}</span>
                },
                {
                    key: 'endpoint',
                    label: 'Endpoint'
                },
                {
                    key: 'status',
                    label: 'Status',
                    render: (value) => statusBadge(value)
                }
            ],
            'process-tree': [
                {
                    key: 'timestamp',
                    label: 'Time',
                    render: (value) => formatDateTime(value)
                },
                {
                    key: 'endpoint',
                    label: 'Endpoint'
                },
                {
                    key: 'parentProcess',
                    label: 'Parent'
                },
                {
                    key: 'processName',
                    label: 'Process'
                },
                {
                    key: 'processId',
                    label: 'PID'
                },
                {
                    key: 'action',
                    label: 'Action'
                },
                {
                    key: 'commandLine',
                    label: 'Command Line',
                    render: (value) => <span title={value}>{trimMiddle(value, 34)}</span>
                }
            ],
            'file-integrity': [
                {
                    key: 'timestamp',
                    label: 'Time',
                    render: (value) => formatDateTime(value)
                },
                {
                    key: 'endpoint',
                    label: 'Endpoint'
                },
                {
                    key: 'action',
                    label: 'Action'
                },
                {
                    key: 'filePath',
                    label: 'Path',
                    render: (value) => <span title={value}>{trimMiddle(value, 34)}</span>
                },
                {
                    key: 'fileHash',
                    label: 'Hash',
                    render: (value) => <span className="font-mono text-xs text-text-muted">{trimMiddle(value, 20)}</span>
                },
                {
                    key: 'status',
                    label: 'Status',
                    render: (value) => statusBadge(value)
                }
            ],
            hunting: [
                {
                    key: 'timestamp',
                    label: 'Time',
                    render: (value) => formatDateTime(value)
                },
                {
                    key: 'endpoint',
                    label: 'Endpoint'
                },
                {
                    key: 'threatType',
                    label: 'Threat'
                },
                {
                    key: 'severity',
                    label: 'Severity',
                    render: (value) => severityBadge(value)
                },
                {
                    key: 'status',
                    label: 'Status',
                    render: (value) => statusBadge(value)
                },
                {
                    key: 'processName',
                    label: 'Process'
                },
                {
                    key: 'commandLine',
                    label: 'Command Line',
                    render: (value) => <span title={value}>{trimMiddle(value, 36)}</span>
                }
            ]
        };

        const columns = viewColumns[activeView] || viewColumns.hunting;
        const criticalCount = topCount(rows, (row) => row.severity === 'Critical');
        const containedCount = topCount(rows, (row) => ['Blocked', 'Quarantined'].includes(row.status));
        const uniqueEndpoints = new Set(rows.map((row) => row.endpoint)).size;

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <MetricCard
                        icon={ShieldAlert}
                        label="Visible Events"
                        value={formatNumber(rows.length)}
                        subtext={`Rows matching ${rangeLabel.toLowerCase()}`}
                        accent={MONO_ACCENT}
                    />
                    <MetricCard
                        icon={AlertCircle}
                        label="Critical"
                        value={formatNumber(criticalCount)}
                        subtext="Critical severity detections in this view"
                        accent={MONO_ACCENT}
                    />
                    <MetricCard
                        icon={activeView === 'file-integrity' ? FileText : activeView === 'process-tree' ? Activity : Crosshair}
                        label={activeView === 'isolation' ? 'Contained Rows' : 'Unique Endpoints'}
                        value={formatNumber(activeView === 'isolation' ? containedCount : uniqueEndpoints)}
                        subtext={activeView === 'isolation' ? 'Blocked or quarantined rows' : 'Distinct endpoints represented'}
                        accent={MONO_ACCENT}
                    />
                </div>

                <DataTable
                    columns={columns}
                    data={rows}
                    loading={loading}
                    searchable={false}
                    pageSize={12}
                />
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <Badge variant="info" className="gap-2 rounded-full px-3 py-1 uppercase tracking-[0.18em]">
                        <ShieldAlert size={14} />
                        EDR Team
                    </Badge>
                    <h1 className="mt-4 text-3xl font-bold text-text-main">{copy.title}</h1>
                    <p className="mt-2 max-w-3xl text-sm text-text-muted">{copy.description}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {searchQuery && (
                        <div className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-card/70 px-3 py-2 text-xs text-text-muted">
                            <Search size={14} />
                            Search: <span className="font-semibold text-text-main">{searchQuery}</span>
                        </div>
                    )}
                    <div className="rounded-full border border-border-subtle bg-bg-card/70 px-3 py-2 text-xs text-text-muted">
                        Scope: <span className="font-semibold text-text-main">{rangeLabel}</span>
                    </div>
                    <div className="rounded-full border border-border-subtle bg-bg-card/70 px-3 py-2 text-xs text-text-muted">
                        Refreshed: <span className="font-semibold text-text-main">{lastUpdatedAt ? formatDateTime(lastUpdatedAt) : 'Waiting'}</span>
                    </div>
                    <Button
                        type="button"
                        onClick={loadData}
                        variant="infoOutline"
                        className="rounded-full"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </Button>
                </div>
            </div>

            {error && (
                <div className="flex items-start gap-3 rounded-2xl border border-warning/25 bg-warning/10 p-4 text-sm text-warning">
                    <AlertCircle size={18} className="mt-0.5" />
                    <div>
                        <div className="font-semibold">EDR telemetry unavailable</div>
                        <div className="mt-1 text-text-muted">{error}</div>
                    </div>
                </div>
            )}

            {activeView === 'home' && renderOverview()}
            {activeView === 'endpoints' && renderEndpointInventory()}
            {!['home', 'endpoints'].includes(activeView) && renderEventRows()}
        </div>
    );
}
