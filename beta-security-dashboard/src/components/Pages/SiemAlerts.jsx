import React, { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { Activity, AlertTriangle, Bell, RefreshCw, ShieldAlert } from 'lucide-react';
import { createCaseFromAlert, createSiemAlertStream, fetchLiveAlerts } from '../../api/siemAlerts';
import { Button } from '@/components/ui/button';

function upsertAlert(list, incoming, limit) {
    const withoutDuplicate = list.filter((item) => item.id !== incoming.id);
    return [incoming, ...withoutDuplicate].slice(0, limit);
}

function sortNewestFirst(list) {
    return [...list].sort(
        (a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
    );
}

function parseTimeRangeMs(timeRange = '24h') {
    const match = /^(\d+)([mhd])$/i.exec(String(timeRange).trim());

    if (!match) {
        return 24 * 60 * 60 * 1000;
    }

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
        case 'm':
            return amount * 60 * 1000;
        case 'h':
            return amount * 60 * 60 * 1000;
        case 'd':
            return amount * 24 * 60 * 60 * 1000;
        default:
            return 24 * 60 * 60 * 1000;
    }
}

function isWithinTimeRange(timestamp, timeRange = '24h') {
    const value = new Date(timestamp).getTime();

    if (Number.isNaN(value)) {
        return false;
    }

    return value >= Date.now() - parseTimeRangeMs(timeRange);
}

function severityTone(severity = '') {
    switch (String(severity).toLowerCase()) {
        case 'critical':
            return 'border-destructive bg-destructive text-destructive-foreground';
        case 'high':
            return 'border-destructive/30 bg-destructive/10 text-destructive';
        case 'medium':
            return 'border-neutral-300 bg-neutral-100 text-neutral-950 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white';
        case 'low':
            return 'border-success/30 bg-success/10 text-success';
        default:
            return 'border-border-subtle bg-bg-body text-text-muted';
    }
}

function streamTone(status) {
    switch (status) {
        case 'open':
            return 'border-success bg-success text-success-foreground';
        case 'connecting':
            return 'border-neutral-300 bg-neutral-100 text-neutral-950 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white';
        case 'error':
            return 'border-destructive bg-destructive text-destructive-foreground';
        case 'closed':
            return 'border-border-subtle bg-bg-body text-text-muted';
        default:
            return 'border-border-subtle bg-bg-card text-text-muted';
    }
}

function formatStreamLabel(status) {
    switch (status) {
        case 'open':
            return 'Connected';
        case 'connecting':
            return 'Connecting';
        case 'error':
            return 'Error';
        case 'closed':
            return 'Closed';
        default:
            return 'Idle';
    }
}

function formatReceivedAt(value) {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        return 'Unknown time';
    }

    return parsed.toLocaleString();
}

function buildSearchIndex(alert) {
    const textParts = [
        alert.title,
        alert.severity,
        alert.agent_name,
        alert.rule_id,
        alert.event_name,
        alert.parser,
        alert.source_alert_id
    ];

    try {
        textParts.push(JSON.stringify(alert.payload ?? ''));
    } catch (_error) {
        textParts.push('');
    }

    return textParts.filter(Boolean).join(' ').toLowerCase();
}

function summarizePayload(payload) {
    if (payload == null) {
        return 'No payload attached.';
    }

    if (typeof payload === 'string') {
        return payload;
    }

    try {
        return JSON.stringify(payload, null, 2);
    } catch (_error) {
        return 'Payload could not be serialized.';
    }
}

function StatCard({ label, value, subtext }) {
    return (
        <div className="rounded-2xl border border-border-subtle bg-bg-card/90 p-5 shadow-[0_14px_40px_rgba(2,6,23,0.18)]">
            <div className="text-[11px] uppercase tracking-[0.18em] text-text-muted">{label}</div>
            <div className="mt-3 text-3xl font-bold text-text-main">{value}</div>
            <div className="mt-2 text-sm text-text-muted">{subtext}</div>
        </div>
    );
}

function EmptyState({ title, description }) {
    return (
        <div className="rounded-3xl border border-dashed border-border-subtle bg-bg-card/70 p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-neutral-950/20 bg-neutral-950/5 text-neutral-950 dark:border-white/20 dark:bg-white/10 dark:text-white">
                <ShieldAlert size={24} />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-text-main">{title}</h3>
            <p className="mt-2 text-sm text-text-muted">{description}</p>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[0, 1, 2, 3].map((item) => (
                    <div key={item} className="h-32 animate-pulse rounded-2xl border border-border-subtle bg-bg-card/70" />
                ))}
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
                {[0, 1, 2, 3].map((item) => (
                    <div key={item} className="h-72 animate-pulse rounded-3xl border border-border-subtle bg-bg-card/70" />
                ))}
            </div>
        </div>
    );
}

function useAlertStream(limit = 100) {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');
    const eventSourceRef = useRef(null);

    const closeStream = useCallback((nextStatus) => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        if (nextStatus) {
            setStatus(nextStatus);
        }
    }, []);

    const loadInitialAlerts = useCallback(async () => {
        const data = await fetchLiveAlerts(limit);
        setError('');
        startTransition(() => {
            setAlerts(sortNewestFirst(data));
        });
        return data;
    }, [limit]);

    const connect = useCallback(() => {
        closeStream();
        setStatus('connecting');

        const eventSource = createSiemAlertStream();
        eventSourceRef.current = eventSource;

        eventSource.addEventListener('open', () => {
            setStatus('open');
            setError('');
        });

        eventSource.addEventListener('alert', (event) => {
            try {
                const incoming = JSON.parse(event.data);
                startTransition(() => {
                    setAlerts((current) => upsertAlert(current, incoming, limit));
                });
            } catch (parseError) {
                console.error('Failed to parse incoming alert', parseError);
                setError('Received an invalid alert payload from the stream.');
            }
        });

        eventSource.addEventListener('lag', async () => {
            try {
                await loadInitialAlerts();
            } catch (reloadError) {
                console.error('Failed to resync alert stream after lag', reloadError);
                setError(reloadError.message || 'Failed to resync the alert stream.');
            }
        });

        eventSource.onerror = () => {
            setStatus(eventSource.readyState === EventSource.CLOSED ? 'closed' : 'error');
        };
    }, [closeStream, limit, loadInitialAlerts]);

    useEffect(() => {
        let active = true;

        async function start() {
            try {
                await loadInitialAlerts();
                if (active) {
                    connect();
                }
            } catch (loadError) {
                console.error('Failed to start alert stream', loadError);
                if (active) {
                    setStatus('error');
                    setError(loadError.message || 'Failed to load live alerts.');
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        start();

        return () => {
            active = false;
            closeStream();
        };
    }, [closeStream, connect, loadInitialAlerts]);

    return {
        alerts,
        loading,
        status,
        error,
        reload: loadInitialAlerts,
        reconnect: connect
    };
}

export function SiemAlerts({ timeRange = '24h', searchQuery = '' }) {
    const { alerts, error, loading, reconnect, reload, status } = useAlertStream(100);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [caseStateById, setCaseStateById] = useState({});
    const normalizedSearch = String(searchQuery || '').trim().toLowerCase();

    const filteredAlerts = useMemo(() => {
        return alerts.filter((alert) => {
            if (!isWithinTimeRange(alert.received_at, timeRange)) {
                return false;
            }

            if (!normalizedSearch) {
                return true;
            }

            return buildSearchIndex(alert).includes(normalizedSearch);
        });
    }, [alerts, normalizedSearch, timeRange]);

    const stats = useMemo(() => {
        const criticalCount = filteredAlerts.filter((alert) => String(alert.severity).toLowerCase() === 'critical').length;
        const highCount = filteredAlerts.filter((alert) => String(alert.severity).toLowerCase() === 'high').length;
        const uniqueAgents = new Set(
            filteredAlerts.map((alert) => alert.agent_name).filter(Boolean)
        ).size;

        return {
            total: filteredAlerts.length,
            critical: criticalCount,
            high: highCount,
            agents: uniqueAgents
        };
    }, [filteredAlerts]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);

        try {
            await reload();
        } finally {
            setIsRefreshing(false);
        }
    }, [reload]);

    const handleCreateCase = useCallback(async (alert) => {
        setCaseStateById((current) => ({
            ...current,
            [alert.id]: {
                status: 'loading',
                message: ''
            }
        }));

        try {
            const created = await createCaseFromAlert(alert);
            const caseId = created?.id || created?.caseId || created?.case_id;

            setCaseStateById((current) => ({
                ...current,
                [alert.id]: {
                    status: 'success',
                    message: caseId ? `Case ${caseId} created.` : 'Case created successfully.'
                }
            }));
        } catch (createError) {
            setCaseStateById((current) => ({
                ...current,
                [alert.id]: {
                    status: 'error',
                    message: createError.message || 'Failed to create case.'
                }
            }));
        }
    }, []);

    if (loading) {
        return <LoadingState />;
    }

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <section className="rounded-3xl border border-border-subtle bg-bg-card/95 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-neutral-950/20 bg-neutral-950/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-950 dark:border-white/20 dark:bg-white/10 dark:text-white">
                            <Bell size={14} />
                            SIEM Live Alerts
                        </div>
                        <h1 className="mt-4 text-3xl font-bold text-text-main">Real-time alert triage and case intake</h1>
                        <p className="mt-3 max-w-2xl text-sm text-text-muted">
                            Monitor the live SIEM alert stream, recover automatically after lag events, and escalate directly into cases without leaving the dashboard.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className={clsx('inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold', streamTone(status))}>
                            {status === 'open' ? <Activity size={14} /> : <AlertTriangle size={14} />}
                            Stream {formatStreamLabel(status)}
                        </div>

                        <div className="rounded-full border border-border-subtle bg-bg-body/70 px-3 py-2 text-xs text-text-muted">
                            Range: <span className="font-semibold text-text-main">{timeRange}</span>
                        </div>

                        {normalizedSearch && (
                            <div className="rounded-full border border-border-subtle bg-bg-body/70 px-3 py-2 text-xs text-text-muted">
                                Search: <span className="font-semibold text-text-main">{searchQuery}</span>
                            </div>
                        )}

                        <Button
                            type="button"
                            onClick={handleRefresh}
                            variant="infoOutline"
                        >
                            <RefreshCw size={16} className={clsx(isRefreshing && 'animate-spin')} />
                            Refresh
                        </Button>

                        <Button
                            type="button"
                            onClick={reconnect}
                            variant="accent"
                        >
                            Reconnect stream
                        </Button>
                    </div>
                </div>

                {error && (
                    <div className="mt-5 rounded-2xl border border-neutral-950/25 bg-neutral-950/5 px-4 py-3 text-sm text-text-main dark:border-white/25 dark:bg-white/10">
                        {error}
                    </div>
                )}
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Visible alerts" value={stats.total} subtext={`Matching ${timeRange} and current search scope`} />
                <StatCard label="Critical" value={stats.critical} subtext="Immediate-response alerts in the current view" />
                <StatCard label="High" value={stats.high} subtext="High-priority events needing analyst review" />
                <StatCard label="Affected agents" value={stats.agents} subtext="Unique endpoints represented in the feed" />
            </section>

            {filteredAlerts.length === 0 ? (
                <EmptyState
                    title="No alerts matched the current SIEM scope"
                    description={normalizedSearch
                        ? 'Try clearing the global search term or widen the shared time range.'
                        : 'The stream is connected, but no alerts are available for the selected time range yet.'}
                />
            ) : (
                <section className="grid gap-4 xl:grid-cols-2">
                    {filteredAlerts.map((alert) => {
                        const caseState = caseStateById[alert.id];

                        return (
                            <article
                                key={alert.id}
                                className="rounded-3xl border border-border-subtle bg-bg-card/95 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.10)]"
                                style={{ contentVisibility: 'auto' }}
                            >
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={clsx('rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]', severityTone(alert.severity))}>
                                                {alert.severity || 'unknown'}
                                            </span>
                                            <span className="rounded-full border border-border-subtle px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
                                                {alert.parser || 'parser unavailable'}
                                            </span>
                                        </div>

                                        <h2 className="mt-4 text-xl font-semibold text-text-main">{alert.title}</h2>

                                        <div className="mt-4 grid gap-3 text-sm text-text-muted sm:grid-cols-2">
                                            <div>
                                                <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Agent</div>
                                                <div className="mt-1 font-medium text-text-main">{alert.agent_name || 'Unknown agent'}</div>
                                            </div>
                                            <div>
                                                <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Event</div>
                                                <div className="mt-1 font-medium text-text-main">{alert.event_name || 'Unclassified event'}</div>
                                            </div>
                                            <div>
                                                <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Rule</div>
                                                <div className="mt-1 font-medium text-text-main">{alert.rule_id || '-'}</div>
                                            </div>
                                            <div>
                                                <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Received</div>
                                                <div className="mt-1 font-medium text-text-main">{formatReceivedAt(alert.received_at)}</div>
                                            </div>
                                        </div>

                                        <div className="mt-4 rounded-2xl border border-border-subtle bg-bg-body/60 px-4 py-3">
                                            <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Source Alert ID</div>
                                            <div className="mt-1 break-all font-mono text-xs text-text-main">{alert.source_alert_id}</div>
                                        </div>

                                        <details className="mt-4 rounded-2xl border border-border-subtle bg-bg-body/40 px-4 py-3">
                                            <summary className="cursor-pointer text-sm font-medium text-text-main">Inspect payload</summary>
                                            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-black p-3 text-xs text-white dark:bg-white dark:text-black">
                                                {summarizePayload(alert.payload)}
                                            </pre>
                                        </details>
                                    </div>

                                    <div className="w-full shrink-0 lg:w-48">
                                        <Button
                                            type="button"
                                            onClick={() => handleCreateCase(alert)}
                                            disabled={caseState?.status === 'loading'}
                                            variant="warning"
                                            className="w-full rounded-2xl"
                                        >
                                            {caseState?.status === 'loading' ? 'Creating case...' : 'Create Case'}
                                        </Button>

                                        {caseState?.message && (
                                            <div className={clsx(
                                                'mt-3 rounded-2xl border px-3 py-2 text-xs',
                                                caseState.status === 'success'
                                                    ? 'border-neutral-300 bg-neutral-100 text-neutral-950 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white'
                                                    : caseState.status === 'error'
                                                        ? 'border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-black'
                                                        : 'border-border-subtle bg-bg-body text-text-muted'
                                            )}>
                                                {caseState.message}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </section>
            )}
        </div>
    );
}
