import React, { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import {
    Activity, AlertTriangle, Bell, RefreshCw, ShieldAlert,
    Target, Search, Filter, ArrowUpRight, Zap, ChevronRight,
    Terminal, ShieldCheck, Globe, Cpu, Clock, X
} from 'lucide-react';
import { createCaseFromAlert, createSiemAlertStream, fetchLiveAlerts, isSiemAlertsEnabled } from '../../api/siemAlerts';
import { Button } from '@/components/ui/button';

const severityStyles = {
    critical: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400',
    high: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/30 dark:bg-orange-900/10 dark:text-orange-400',
    medium: 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-900/30 dark:bg-yellow-900/10 dark:text-yellow-400',
    low: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/10 dark:text-emerald-400'
};

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

function SeverityBadge({ severity }) {
    const s = String(severity || 'low').toLowerCase();
    return (
        <span className={clsx(
            'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight',
            severityStyles[s] || severityStyles.low
        )}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {s}
        </span>
    );
}

function AlertCard({ alert, onPromote }) {
    const s = String(alert.severity || 'low').toLowerCase();
    return (
        <ProfessionalCard className="group p-5">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className={clsx('flex h-9 w-9 items-center justify-center rounded-lg border', severityStyles[s])}>
                        <Zap size={18} fill="currentColor" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase">Event: {String(alert.id || '').slice(-8)}</span>
                            <span className="h-1 w-1 rounded-full bg-gray-200 dark:bg-neutral-800" />
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tight">{alert.source || 'Wazuh'}</span>
                        </div>
                        <h3 className="mt-1 text-sm font-bold text-gray-900 dark:text-white line-clamp-1">{alert.title || alert.rule_description}</h3>
                    </div>
                </div>
                <SeverityBadge severity={alert.severity} />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1 rounded-lg bg-gray-50 p-2.5 dark:bg-neutral-800/30">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-neutral-500">Host/Agent</span>
                    <span className="truncate text-xs font-semibold text-gray-700 dark:text-neutral-200">{alert.agent_name || 'unknown'}</span>
                </div>
                <div className="flex flex-col gap-1 rounded-lg bg-gray-50 p-2.5 dark:bg-neutral-800/30">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-neutral-500">Detected At</span>
                    <span className="truncate text-xs font-semibold text-gray-700 dark:text-neutral-200">{new Date(alert.received_at || alert.timestamp).toLocaleTimeString()}</span>
                </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-neutral-800">
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">
                    <Terminal size={12} />
                    {alert.parser || 'rule-engine'}
                </div>
                <Button
                    onClick={() => onPromote(alert)}
                    variant="outline"
                    className="h-8 rounded-md px-4 text-[10px] font-bold uppercase tracking-tight transition-all hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-900/20 dark:hover:text-orange-400"
                >
                    Promote to Case
                </Button>
            </div>
        </ProfessionalCard>
    );
}

export function SiemAlerts({ timeRange = '24h' }) {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [streamStatus, setStreamStatus] = useState(() => isSiemAlertsEnabled() ? 'idle' : 'disabled');
    const [message, setMessage] = useState('');
    const [search, setSearch] = useState('');
    const [filterSeverity, setFilterSeverity] = useState('ALL');

    const load = useCallback(async (signal) => {
        setLoading(true);
        try {
            const data = await fetchLiveAlerts(100, signal);
            setAlerts(data?.alerts || []);
        } catch (error) {
            if (error.name !== 'AbortError') {
                setMessage(error.message || 'Failed to sync live alerts.');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        load(controller.signal);
        return () => controller.abort();
    }, [load]);

    useEffect(() => {
        const stream = createSiemAlertStream();

        if (!stream) {
            setStreamStatus('disabled');
            return undefined;
        }

        setStreamStatus('connecting');
        stream.onopen = () => setStreamStatus('open');
        stream.onerror = () => setStreamStatus('error');
        stream.addEventListener('alert', (event) => {
            try {
                const incoming = JSON.parse(event.data);
                setAlerts((prev) => [incoming, ...prev.filter(a => a.id !== incoming.id)].slice(0, 100));
            } catch (err) {
                console.error('Failed to parse live alert event:', err);
            }
        });
        return () => stream.close();
    }, []);

    const filteredAlerts = useMemo(() => {
        return alerts.filter(a => {
            const matchesSearch = !search || (a.title || a.rule_description || '').toLowerCase().includes(search.toLowerCase());
            const matchesSeverity = filterSeverity === 'ALL' || String(a.severity).toUpperCase() === filterSeverity;
            return matchesSearch && matchesSeverity;
        });
    }, [alerts, search, filterSeverity]);

    const handlePromote = async (alert) => {
        try {
            await createCaseFromAlert(alert);
            setMessage('Alert promoted to case.');
            setTimeout(() => setMessage(''), 5000);
        } catch (err) {
            setMessage(err.message || 'Failed to promote alert.');
        }
    };

    return (
        <div className="flex flex-col gap-8 p-6 lg:p-10 max-w-[1440px] mx-auto min-h-full">
            {/* Page Header */}
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                        <Activity size={18} />
                        <span className="text-[11px] font-bold uppercase tracking-widest">Real-time Detection</span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">SIEM Threat Monitor</h1>
                    <p className="mt-2 text-sm text-gray-500 dark:text-neutral-400">Monitor live security telemetry and escalate high-fidelity alerts to investigations.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className={clsx(
                        'flex items-center gap-2 rounded-full px-3 py-1.5 border text-[10px] font-bold uppercase tracking-widest',
                        streamStatus === 'open' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-400' : 'border-gray-200 bg-gray-50 text-gray-600 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-400'
                    )}>
                        <span className={clsx('h-1.5 w-1.5 rounded-full', streamStatus === 'open' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400')} />
                        Pipeline: {streamStatus}
                    </div>
                    <Button onClick={() => load()} disabled={loading} variant="outline" className="h-10 w-10 p-0 border-gray-200 dark:border-neutral-800">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </Button>
                </div>
            </div>

            {/* Notification */}
            {message && (
                <div className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 dark:border-blue-900/30 dark:bg-blue-900/20 dark:text-blue-400">
                    <Bell size={16} />
                    {message}
                    <button onClick={() => setMessage('')} className="ml-auto opacity-50 hover:opacity-100"><X size={16} /></button>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-600" size={16} />
                    <input
                        type="text"
                        placeholder="Filter alerts by title or description..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-11 bg-white border border-gray-200 rounded-xl pl-10 pr-4 text-sm dark:bg-neutral-900/50 dark:border-neutral-800 dark:text-white outline-none focus:border-blue-500"
                    />
                </div>
                <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900/50">
                    {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map(s => (
                        <button
                            key={s}
                            onClick={() => setFilterSeverity(s)}
                            className={clsx(
                                'rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-tight transition-all',
                                filterSeverity === s ? 'bg-primary text-primary-foreground' : 'text-gray-500 hover:text-gray-900 dark:text-neutral-500 dark:hover:text-neutral-200'
                            )}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Alert Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {loading && alerts.length === 0 ? (
                    [1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-100 dark:bg-neutral-800/50" />
                    ))
                ) : filteredAlerts.length > 0 ? (
                    filteredAlerts.map(alert => (
                        <AlertCard key={alert.id || alert.source_alert_id} alert={alert} onPromote={handlePromote} />
                    ))
                ) : (
                    <div className="col-span-full flex flex-col items-center justify-center py-24 border-2 border-dashed border-gray-200 dark:border-neutral-800 rounded-xl bg-gray-50/50 dark:bg-neutral-900/20">
                        <ShieldCheck size={48} className="text-gray-300 dark:text-neutral-700 mb-4" strokeWidth={1.5} />
                        <p className="text-sm font-medium text-gray-500 dark:text-neutral-500">No security threats detected matching filters.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
