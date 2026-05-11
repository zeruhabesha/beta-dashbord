import React, { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
    AlertTriangle, Bell, Clock3, FileText, Flag,
    Radio, RefreshCw, ShieldAlert, TicketCheck, UserCog, X
} from 'lucide-react';
import {
    CMT_API_BASE,
    CMT_AUTO_CONNECT,
    CMT_ENABLE_SSE,
    createAlertEventSource,
    createManualCase,
    ensureCmtSession,
    getCmtHealth,
    listCases,
    listFilteredAlerts,
    listRecentAlerts,
    listReportTemplates,
    listSlaBreachedCases,
    promoteAlertToCase,
    setAlertAnomaly,
    updateCaseStatus
} from '../../api/cmt';
import { Button } from '@/components/ui/button';

const severityStyles = {
    critical: 'border-[#ef4444]/60 bg-[#ef4444]/15 text-[#fecaca]',
    high: 'border-[#f97316]/60 bg-[#f97316]/15 text-[#fed7aa]',
    medium: 'border-[#eab308]/60 bg-[#eab308]/15 text-[#fef08a]',
    low: 'border-[#22c55e]/60 bg-[#22c55e]/15 text-[#bbf7d0]'
};

const severityBorders = {
    critical: 'border-l-[#ef4444]',
    high: 'border-l-[#f97316]',
    medium: 'border-l-[#eab308]',
    low: 'border-l-[#22c55e]'
};

const statusStyles = {
    open: 'border-[#3b82f6]/70 text-[#93c5fd]',
    'in-progress': 'border-[#a855f7]/70 text-[#d8b4fe]',
    resolved: 'border-[#22c55e]/70 text-[#bbf7d0]',
    closed: 'border-[#6b7280]/70 text-[#d1d5db]'
};

const nextStatusesByStatus = {
    open: ['in-progress', 'closed'],
    'in-progress': ['resolved'],
    resolved: ['closed'],
    closed: []
};

const demoCases = [
    {
        id: 'demo-critical-001',
        summary: 'Multiple failed privileged logins from suspicious host',
        severity: 'critical',
        status: 'open',
        owner_id: 'unassigned',
        customer_code: 'acme',
        alert_id: 'wazuh-alert-92831',
        created_at: new Date(Date.now() - 26 * 60 * 1000).toISOString(),
        sla_deadline: new Date(Date.now() + 54 * 60 * 1000).toISOString(),
        sla_breached: false,
        escalated: true
    },
    {
        id: 'demo-high-002',
        summary: 'Endpoint malware signature match requires analyst review',
        severity: 'high',
        status: 'in-progress',
        owner_id: 'analyst-12',
        customer_code: 'beta-bank',
        alert_id: 'wazuh-alert-92844',
        created_at: new Date(Date.now() - 84 * 60 * 1000).toISOString(),
        sla_deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        sla_breached: false,
        escalated: false
    }
];

const demoSlaCases = [
    {
        id: 'demo-sla-003',
        summary: 'Uncontained lateral movement investigation exceeded SLA',
        severity: 'critical',
        status: 'in-progress',
        owner_id: 'tier2-07',
        customer_code: 'acme',
        alert_id: 'wazuh-alert-91990',
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        sla_deadline: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
        sla_breached: true,
        escalated: true
    }
];

const demoAlerts = [
    {
        id: 'demo-alert-001',
        source_alert_id: 'wazuh-alert-92831',
        title: 'Privileged brute force detected',
        source: 'wazuh',
        parser: 'syslog-auth',
        severity: 'critical',
        status: 'open',
        agent_name: 'vpn-gateway-01',
        customer_code: 'acme',
        received_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
        is_anomaly: true,
        payload: { rule_id: '5712', mitre: ['T1110'], source_ip: '203.0.113.10' }
    },
    {
        id: 'demo-alert-002',
        source_alert_id: 'wazuh-alert-92844',
        title: 'Malware signature match on workstation',
        source: 'wazuh',
        parser: 'fim-yara',
        severity: 'high',
        status: 'open',
        agent_name: 'workstation-04',
        customer_code: 'beta-bank',
        received_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
        is_anomaly: false,
        payload: { rule_id: '100101', file_hash: 'sha256:demo' }
    }
];

const demoTemplates = [
    { id: 'demo-template-pdf', name: 'Executive Incident Summary', format: 'pdf', renderer: 'react_pdf' },
    { id: 'demo-template-docx', name: 'Analyst Evidence Pack', format: 'docx', renderer: 'docx' }
];

const demoUser = { user_id: 'demo-analyst', username: 'demo.analyst', role: 'analyst', auth_provider: 'demo' };

function asArray(payload, key) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
}

function normalizeSeverity(value) {
    return String(value || 'low').toLowerCase();
}

function normalizeStatus(value) {
    return String(value || 'open').toLowerCase();
}

function formatDateTime(value) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString();
}

function formatRelativeDeadline(value, breached) {
    const parsed = new Date(value).getTime();
    if (Number.isNaN(parsed)) return breached ? 'Breached' : 'No SLA';

    const seconds = Math.round((parsed - Date.now()) / 1000);
    const abs = Math.abs(seconds);
    const hours = Math.floor(abs / 3600);
    const minutes = Math.floor((abs % 3600) / 60);
    const label = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    return seconds < 0 ? `${label} overdue` : `${label} left`;
}

function SeverityBadge({ severity }) {
    const key = normalizeSeverity(severity);
    return <span className={clsx('inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em]', severityStyles[key] || severityStyles.low)}>{key}</span>;
}

function StatusBadge({ status }) {
    const key = normalizeStatus(status);
    return <span className={clsx('inline-flex rounded-full border bg-transparent px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em]', statusStyles[key] || statusStyles.open)}>{key}</span>;
}

function MetricCard({ icon: Icon, label, value, detail, tone = 'blue' }) {
    const toneClass = tone === 'red' ? 'from-[#ef4444]/20' : tone === 'orange' ? 'from-[#f97316]/20' : 'from-[#3b82f6]/20';

    return (
        <div className={clsx('rounded-3xl border border-[#1e2d45] bg-gradient-to-br to-[#111827] p-5 shadow-2xl shadow-black/20', toneClass)}>
            <div className="flex items-center justify-between">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-[#93c5fd]">
                    <Icon size={22} />
                </div>
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#22c55e] shadow-[0_0_18px_rgba(34,197,94,0.8)]" />
            </div>
            <div className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-slate-400">{label}</div>
            <div className="mt-2 text-3xl font-black text-white">{value}</div>
            <p className="mt-2 text-sm text-slate-400">{detail}</p>
        </div>
    );
}

function SlaRing({ deadline, breached }) {
    return (
        <div className={clsx('relative grid h-16 w-16 place-items-center rounded-full border', breached ? 'animate-pulse border-[#ef4444]/60 bg-[#ef4444]/10 text-[#fecaca]' : 'border-[#3b82f6]/50 bg-[#3b82f6]/10 text-[#bfdbfe]')}>
            <div className="absolute inset-1 rounded-full border border-current opacity-30" />
            <Clock3 size={18} />
            <span className="absolute -bottom-5 w-28 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">{formatRelativeDeadline(deadline, breached)}</span>
        </div>
    );
}

function CaseCard({ item, onStatusChange, busy }) {
    const severity = normalizeSeverity(item.severity);
    const status = normalizeStatus(item.status);
    const nextStatuses = nextStatusesByStatus[status] || [];

    return (
        <article className={clsx('rounded-3xl border border-[#1e2d45] border-l-4 bg-[#111827]/95 p-5 shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:border-[#3b82f6]/50', severityBorders[severity] || severityBorders.low)}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Case #{String(item.id || '').slice(0, 8) || 'pending'}</div>
                    <h3 className="mt-2 text-lg font-black text-white">{item.summary || item.rule_description || 'Untitled security case'}</h3>
                </div>
                <div className="flex flex-wrap gap-2"><SeverityBadge severity={severity} /><StatusBadge status={status} /></div>
            </div>
            {item.escalated && <div className="mt-4 rounded-2xl border border-[#f97316]/40 bg-[#f97316]/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#fed7aa]">⚠ ESCALATED</div>}
            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto]">
                <div className="grid gap-3 text-sm text-slate-400 sm:grid-cols-2">
                    <div><span className="block text-[10px] uppercase tracking-[0.18em] text-slate-500">Owner</span><span className="font-mono text-slate-200">{item.owner_id || 'Unassigned'}</span></div>
                    <div><span className="block text-[10px] uppercase tracking-[0.18em] text-slate-500">Customer</span><span className="font-mono text-slate-200">{item.customer_code || 'global'}</span></div>
                    <div><span className="block text-[10px] uppercase tracking-[0.18em] text-slate-500">Alert</span><span className="font-mono text-slate-200">{item.alert_id || item.source_alert_id || 'manual'}</span></div>
                    <div><span className="block text-[10px] uppercase tracking-[0.18em] text-slate-500">Created</span><span className="text-slate-200">{formatDateTime(item.created_at || item.alert_timestamp)}</span></div>
                </div>
                <div className="flex justify-center"><SlaRing deadline={item.sla_deadline} breached={item.sla_breached} /></div>
            </div>
            {nextStatuses.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                    {nextStatuses.map((next) => (
                        <Button key={next} type="button" size="sm" variant="infoOutline" disabled={busy} onClick={() => onStatusChange(item.id, next)}>
                            Move to {next}
                        </Button>
                    ))}
                </div>
            )}
        </article>
    );
}

function AlertRow({ alert, onSelect, onPromote }) {
    return (
        <tr className="border-b border-[#1e2d45]/70 transition hover:bg-[#1a2236]">
            <td className="px-4 py-3"><button type="button" onClick={() => onSelect(alert)} className="text-left font-semibold text-white hover:text-[#93c5fd]">{alert.title || alert.rule_description || 'Untitled alert'}</button></td>
            <td className="px-4 py-3 text-slate-300">{alert.source || alert.parser || 'wazuh'}</td>
            <td className="px-4 py-3"><SeverityBadge severity={alert.severity} /></td>
            <td className="px-4 py-3 text-slate-300">{alert.agent_name || alert.asset_name || '—'}</td>
            <td className="px-4 py-3"><StatusBadge status={alert.status} /></td>
            <td className="px-4 py-3 text-slate-400">{formatDateTime(alert.received_at || alert.timestamp)}</td>
            <td className="px-4 py-3 text-right"><Button type="button" size="sm" variant="warning" onClick={() => onPromote(alert)}>Promote</Button></td>
        </tr>
    );
}

export function CmtDashboard({ view = 'overview', moduleId = 'siem' }) {
    const [liveMode, setLiveMode] = useState(CMT_AUTO_CONNECT);
    const [user, setUser] = useState(CMT_AUTO_CONNECT ? null : demoUser);
    const [cases, setCases] = useState(CMT_AUTO_CONNECT ? [] : demoCases);
    const [slaCases, setSlaCases] = useState(CMT_AUTO_CONNECT ? [] : demoSlaCases);
    const [alerts, setAlerts] = useState(CMT_AUTO_CONNECT ? [] : demoAlerts);
    const [templates, setTemplates] = useState(CMT_AUTO_CONNECT ? [] : demoTemplates);
    const [streamStatus, setStreamStatus] = useState(CMT_AUTO_CONNECT ? 'checking' : 'standby');
    const [backendReady, setBackendReady] = useState(false);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [loading, setLoading] = useState(CMT_AUTO_CONNECT);
    const [busyCaseId, setBusyCaseId] = useState('');
    const [message, setMessage] = useState('');
    const [manualCase, setManualCase] = useState({ summary: '', severity: 'high', customer_code: '' });

    const load = useCallback(async () => {
        if (!liveMode) {
            setMessage('Using demo CMT data. Click Connect live CMT to call the backend.');
            return;
        }

        setLoading(true);
        setMessage('');
        setBackendReady(false);
        try {
            await getCmtHealth();
            const currentUser = await ensureCmtSession();
            setUser(currentUser);
            setBackendReady(true);

            const [caseResult, slaResult, alertResult, templateResult] = await Promise.allSettled([
                listCases({ archived: false, page: 1, page_size: 12 }),
                listSlaBreachedCases(),
                view === 'alerts' ? listFilteredAlerts({ page: 1, page_size: 20, order: 'desc' }) : listRecentAlerts(10),
                listReportTemplates()
            ]);

            if (caseResult.status === 'fulfilled') setCases(asArray(caseResult.value, 'cases'));
            if (slaResult.status === 'fulfilled') setSlaCases(asArray(slaResult.value, 'cases'));
            if (alertResult.status === 'fulfilled') setAlerts(asArray(alertResult.value, 'alerts'));
            if (templateResult.status === 'fulfilled') setTemplates(asArray(templateResult.value, 'templates'));

            const rejected = [caseResult, slaResult, alertResult, templateResult].find((item) => item.status === 'rejected');
            if (rejected) setMessage(rejected.reason?.message || 'Some CMT data could not be loaded.');
        } catch (error) {
            setBackendReady(false);
            setLiveMode(false);
            setUser(demoUser);
            setCases(demoCases);
            setSlaCases(demoSlaCases);
            setAlerts(demoAlerts);
            setTemplates(demoTemplates);
            setStreamStatus('standby');
            setMessage(`${error.message || 'CMT backend is not reachable.'} Showing demo data without retrying.`);
        } finally {
            setLoading(false);
        }
    }, [liveMode, view]);

    useEffect(() => {
        if (liveMode) {
            load();
        }
    }, [liveMode, load]);

    useEffect(() => {
        if (!liveMode || !backendReady || !CMT_ENABLE_SSE) {
            setStreamStatus(liveMode && backendReady && !CMT_ENABLE_SSE ? 'disabled' : liveMode ? 'checking' : 'standby');
            return undefined;
        }

        const eventSource = createAlertEventSource();
        setStreamStatus('connecting');
        eventSource.addEventListener('open', () => setStreamStatus('connected'));
        eventSource.addEventListener('alert', (event) => {
            try {
                const incoming = JSON.parse(event.data);
                setAlerts((current) => [incoming, ...current.filter((item) => item.source_alert_id !== incoming.source_alert_id)].slice(0, 20));
            } catch (_error) {
                setMessage('Received an unreadable live alert event.');
            }
        });
        eventSource.addEventListener('lag', () => load());
        eventSource.onerror = () => {
            eventSource.close();
            setStreamStatus('disconnected');
            setMessage('CMT alert stream disconnected; it will stay closed until you refresh live CMT.');
        };
        return () => eventSource.close();
    }, [backendReady, liveMode, load]);

    const stats = useMemo(() => {
        const openCases = cases.filter((item) => normalizeStatus(item.status) !== 'closed' && !item.archived);
        return {
            open: openCases.length,
            breached: slaCases.length,
            escalated: cases.filter((item) => item.escalated).length,
            alerts: alerts.length
        };
    }, [alerts.length, cases, slaCases.length]);

    const canWrite = user?.role !== 'viewer';
    const pageTitle = moduleId === 'unified' ? 'Unified CMT Command Center' : 'SIEM Case Management & Ticketing';

    const handleConnectLive = () => {
        setBackendReady(false);
        setLiveMode(true);
        setMessage('Checking the live CMT backend before loading dashboard data...');
    };

    const handleStatusChange = async (caseId, nextStatus) => {
        setBusyCaseId(caseId);
        const previous = cases;
        setCases((current) => current.map((item) => item.id === caseId ? { ...item, status: nextStatus } : item));
        try {
            if (!liveMode) {
                setMessage(`Demo case moved to ${nextStatus}. Connect live CMT to persist changes.`);
                return;
            }

            await updateCaseStatus(caseId, nextStatus);
            setMessage(`Case moved to ${nextStatus}.`);
        } catch (error) {
            setCases(previous);
            setMessage(error.message || 'Status update failed.');
        } finally {
            setBusyCaseId('');
        }
    };

    const handlePromote = async (alert) => {
        try {
            const alertId = alert.source_alert_id || alert.alert_id || alert.id;
            if (!liveMode) {
                setMessage('Demo alert promoted locally. Connect live CMT to call POST /alerts/:id/promote.');
                return;
            }

            await promoteAlertToCase(alertId);
            setMessage('Alert promoted to a CMT case.');
            await load();
        } catch (error) {
            setMessage(error.message || 'Alert promotion failed.');
        }
    };

    const handleCreateManualCase = async (event) => {
        event.preventDefault();
        try {
            if (!liveMode) {
                const created = {
                    id: `demo-manual-${Date.now()}`,
                    ...manualCase,
                    status: 'open',
                    owner_id: user?.user_id || 'demo-analyst',
                    alert_id: 'manual',
                    created_at: new Date().toISOString(),
                    alert_timestamp: new Date().toISOString(),
                    sla_deadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
                    sla_breached: false,
                    escalated: false
                };
                setCases((current) => [created, ...current]);
                setManualCase({ summary: '', severity: 'high', customer_code: '' });
                setMessage('Demo manual case created locally. Connect live CMT to persist cases.');
                return;
            }

            await createManualCase({ ...manualCase, alert_timestamp: new Date().toISOString() });
            setManualCase({ summary: '', severity: 'high', customer_code: '' });
            setMessage('Manual case created.');
            await load();
        } catch (error) {
            setMessage(error.message || 'Manual case creation failed.');
        }
    };

    const visibleCases = view === 'sla' ? slaCases : cases;

    return (
        <div className="min-h-full space-y-6 rounded-[2rem] bg-[#0a0d14] p-6 text-slate-100 shadow-2xl shadow-black/40">
            <section className="overflow-hidden rounded-[2rem] border border-[#1e2d45] bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_34rem),linear-gradient(135deg,#111827,#0a0d14)] p-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-3 text-xs font-black uppercase tracking-[0.22em] text-[#93c5fd]"><ShieldAlert size={18} /> Native Wazuh CMT API integration</div>
                        <h1 className="mt-4 text-4xl font-black tracking-tight text-white">{pageTitle}</h1>
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Cases, live Wazuh alerts, SLA breach response, evidence/report workflows, and RBAC-aware analyst actions backed by <span className="font-mono text-slate-200">{CMT_API_BASE}</span>.</p>
                        {!liveMode && <p className="mt-2 text-sm text-[#fed7aa]">Live CMT calls are paused to avoid unauthorized or repeated backend requests. Demo data keeps the SOC layout usable until you connect.</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <span className={clsx('inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.16em]', streamStatus === 'connected' ? 'border-[#22c55e]/50 bg-[#22c55e]/10 text-[#bbf7d0]' : ['standby', 'disabled'].includes(streamStatus) ? 'border-[#3b82f6]/50 bg-[#3b82f6]/10 text-[#bfdbfe]' : streamStatus === 'disconnected' ? 'border-[#ef4444]/50 bg-[#ef4444]/10 text-[#fecaca]' : 'border-[#f97316]/50 bg-[#f97316]/10 text-[#fed7aa]')}><span className="h-2 w-2 animate-pulse rounded-full bg-current" /> SSE {streamStatus}</span>
                        {!liveMode ? (
                            <Button type="button" variant="accent" onClick={handleConnectLive}>Connect live CMT</Button>
                        ) : (
                            <Button type="button" variant="infoOutline" onClick={load}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh</Button>
                        )}
                    </div>
                </div>
                {message && <div className="mt-5 rounded-2xl border border-[#3b82f6]/30 bg-[#3b82f6]/10 px-4 py-3 text-sm text-[#bfdbfe]">{message}</div>}
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard icon={TicketCheck} label="Open cases" value={loading ? '…' : stats.open} detail="GET /cases?archived=false" />
                <MetricCard icon={Clock3} label="SLA breached" value={loading ? '…' : stats.breached} detail="GET /cases/sla-breached" tone="red" />
                <MetricCard icon={Flag} label="Escalated" value={loading ? '…' : stats.escalated} detail="GET /cases?escalated=true" tone="orange" />
                <MetricCard icon={Bell} label="Recent alerts" value={loading ? '…' : stats.alerts} detail="SSE + GET /alerts/filter" />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
                <div className="space-y-4">
                    <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-xl font-black text-white"><TicketCheck className="text-[#3b82f6]" /> {view === 'sla' ? 'SLA Breach Queue' : 'Case Queue'}</h2><span className="text-xs text-slate-500">Status transitions are UI-guarded</span></div>
                    {visibleCases.length === 0 ? <div className="rounded-3xl border border-dashed border-[#1e2d45] bg-[#111827]/70 p-10 text-center text-slate-400">No cases returned for this CMT scope.</div> : visibleCases.map((item) => <CaseCard key={item.id} item={item} busy={busyCaseId === item.id || !canWrite} onStatusChange={handleStatusChange} />)}
                </div>

                <aside className="space-y-6">
                    <div className="rounded-3xl border border-[#1e2d45] bg-[#111827] p-5">
                        <h3 className="flex items-center gap-2 text-lg font-black text-white"><Radio className="text-[#22c55e]" /> Live alert ticker</h3>
                        <div className="mt-4 max-h-[28rem] space-y-3 overflow-auto pr-1 custom-scrollbar">
                            {alerts.slice(0, 8).map((alert) => (
                                <button key={alert.source_alert_id || alert.id} type="button" onClick={() => setSelectedAlert(alert)} className="w-full rounded-2xl border border-[#1e2d45] bg-[#1a2236]/60 p-3 text-left transition hover:border-[#3b82f6]/60">
                                    <div className="flex items-center justify-between gap-2"><SeverityBadge severity={alert.severity} /><span className="text-[11px] text-slate-500">{formatDateTime(alert.received_at || alert.timestamp)}</span></div>
                                    <div className="mt-2 line-clamp-2 font-semibold text-white">{alert.title || alert.rule_description || 'Incoming Wazuh alert'}</div>
                                    <div className="mt-1 font-mono text-xs text-slate-500">{alert.source_alert_id || alert.id}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <form onSubmit={handleCreateManualCase} className="rounded-3xl border border-[#1e2d45] bg-[#111827] p-5">
                        <h3 className="flex items-center gap-2 text-lg font-black text-white"><UserCog className="text-[#a855f7]" /> Manual case</h3>
                        <input value={manualCase.summary} onChange={(event) => setManualCase((current) => ({ ...current, summary: event.target.value }))} required placeholder="Suspicious login attempt" className="mt-4 w-full rounded-2xl border border-[#1e2d45] bg-[#0a0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#3b82f6]" />
                        <div className="mt-3 grid grid-cols-2 gap-3">
                            <select value={manualCase.severity} onChange={(event) => setManualCase((current) => ({ ...current, severity: event.target.value }))} className="rounded-2xl border border-[#1e2d45] bg-[#0a0d14] px-4 py-3 text-sm text-white outline-none"><option>critical</option><option>high</option><option>medium</option><option>low</option></select>
                            <input value={manualCase.customer_code} onChange={(event) => setManualCase((current) => ({ ...current, customer_code: event.target.value }))} placeholder="customer_code" className="rounded-2xl border border-[#1e2d45] bg-[#0a0d14] px-4 py-3 text-sm text-white outline-none focus:border-[#3b82f6]" />
                        </div>
                        <Button type="submit" className="mt-4 w-full" variant="accent" disabled={!canWrite}>Create Manual Case</Button>
                    </form>

                    <div className="rounded-3xl border border-[#1e2d45] bg-[#111827] p-5">
                        <h3 className="flex items-center gap-2 text-lg font-black text-white"><FileText className="text-[#93c5fd]" /> Report templates</h3>
                        <div className="mt-4 space-y-2 text-sm text-slate-400">{templates.length === 0 ? 'No templates returned.' : templates.slice(0, 5).map((template) => <div key={template.id || template.name} className="rounded-2xl border border-[#1e2d45] bg-[#0a0d14] px-3 py-2"><span className="font-semibold text-white">{template.name}</span> · {template.format || 'pdf'} / {template.renderer || 'builtin'}</div>)}</div>
                    </div>
                </aside>
            </section>

            {view === 'alerts' && (
                <section className="rounded-3xl border border-[#1e2d45] bg-[#111827] p-5">
                    <h2 className="mb-4 flex items-center gap-2 text-xl font-black text-white"><Bell className="text-[#3b82f6]" /> Alert filter result</h2>
                    <div className="overflow-auto rounded-2xl border border-[#1e2d45]">
                        <table className="min-w-full text-left text-sm"><thead className="bg-[#1a2236] text-xs uppercase tracking-[0.18em] text-slate-500"><tr><th className="px-4 py-3">Title</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Severity</th><th className="px-4 py-3">Agent</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Received</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody>{alerts.map((alert) => <AlertRow key={alert.source_alert_id || alert.id} alert={alert} onSelect={setSelectedAlert} onPromote={handlePromote} />)}</tbody></table>
                    </div>
                </section>
            )}

            {selectedAlert && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={() => setSelectedAlert(null)}>
                    <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-[#1e2d45] bg-[#0a0d14] p-6 text-slate-100 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-start justify-between gap-4"><div><div className="flex gap-2"><SeverityBadge severity={selectedAlert.severity} />{selectedAlert.is_anomaly === true && <span className="rounded-full border border-[#a855f7]/60 bg-[#a855f7]/15 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#e9d5ff]">🤖 Anomaly</span>}</div><h2 className="mt-4 text-2xl font-black text-white">{selectedAlert.title || selectedAlert.rule_description || 'Alert detail'}</h2></div><button type="button" onClick={() => setSelectedAlert(null)} className="rounded-xl border border-[#1e2d45] p-2 text-slate-400 hover:text-white"><X size={18} /></button></div>
                        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">{[['Source alert ID', selectedAlert.source_alert_id || selectedAlert.id], ['Source', selectedAlert.source || selectedAlert.parser], ['Agent', selectedAlert.agent_name], ['Customer', selectedAlert.customer_code], ['Received', formatDateTime(selectedAlert.received_at || selectedAlert.timestamp)], ['Status', selectedAlert.status]].map(([label, value]) => <div key={label} className="rounded-2xl border border-[#1e2d45] bg-[#111827] p-4"><dt className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</dt><dd className="mt-1 break-all font-mono text-slate-200">{value || '—'}</dd></div>)}</dl>
                        <div className="mt-6 flex flex-wrap gap-3"><Button type="button" variant="warning" onClick={() => handlePromote(selectedAlert)} disabled={!canWrite}>Promote to Case</Button><Button type="button" variant="infoOutline" onClick={() => liveMode ? setAlertAnomaly(selectedAlert.source_alert_id || selectedAlert.id, !selectedAlert.is_anomaly) : setMessage('Demo anomaly toggle is local-only. Connect live CMT to persist labels.')} disabled={!canWrite}>Toggle Anomaly</Button></div>
                        <pre className="mt-6 max-h-96 overflow-auto rounded-2xl border border-[#1e2d45] bg-black p-4 text-xs text-slate-200">{JSON.stringify(selectedAlert.payload || selectedAlert, null, 2)}</pre>
                    </aside>
                </div>
            )}
        </div>
    );
}

export function isCmtView(view) {
    return ['cmt-overview', 'cmt-alerts', 'cmt-cases', 'cmt-sla', 'cmt-reports'].includes(view);
}

export function normalizeCmtView(view) {
    if (view === 'cmt-alerts') return 'alerts';
    if (view === 'cmt-sla') return 'sla';
    if (view === 'cmt-reports') return 'reports';
    return 'overview';
}
