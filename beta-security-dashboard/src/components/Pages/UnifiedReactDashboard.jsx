import React, { useEffect, useState, useRef } from 'react';
import {
    Activity,
    AlertTriangle,
    ArrowRight,
    Bell,
    CheckCircle2,
    Cloud,
    Database,
    Eye,
    FileText,
    GitBranch,
    Globe2,
    Layers,
    Lock,
    Network,
    Radar,
    RefreshCw,
    Server,
    Shield,
    ShieldAlert,
    Siren,
    TicketCheck,
    Timer,
    Workflow,
    Zap,
    Search,
    Play,
    Filter,
    Download,
    Plus,
    Trash,
    Globe,
    ShieldCheck,
    ChevronRight,
    Check,
    X,
    Edit,
    Settings,
    Sliders,
    PlayCircle,
    SlidersHorizontal,
    MoreVertical,
    MoreHorizontal,
    FileCode,
    CheckSquare
} from 'lucide-react';

import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    LineChart,
    Line,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';

// Import actual sub-page components
import { CmtDashboard, isCmtView, normalizeCmtView } from './CmtDashboard';
import { EdrDashboard } from './EdrDashboard';
import { SocAutomationPage } from './SocAutomationPage';
import { SiemAlerts } from './SiemAlerts';
import { Tenants } from './Tenants';
import { IndexOverview } from '../Dashboard/IndexOverview';

import {
    getAgentDashboardSummary,
    listCases,
    listSlaBreachedCases,
    listFilteredAlerts,
    listReportTemplates
} from '../../api/cmt';

// Custom set of automation views matching SocAutomationPage
const AUTOMATION_VIEWS = new Set([
    'response-dashboard',
    'approvals',
    'playbook-orchestration',
    'playbook-ops',
    'execution-control',
    'automation-ops',
    'playbook-automation',
    'playbook-templates',
    'testing-validation',
    'manual-operations',
    'soc-override',
    'response-center',
    'response-governance',
    'response-metrics',
    'rollback',
    'graduated-response',
    'safety-checks',
    'rate-limits',
    'collected-artifacts',
    'forensic-storage',
    'forensic-retention',
    'enhanced-forensics',
    'hunting',
    'threat-hunting',
    'audit-trail',
    'audit-compliance',
    'integrations',
    'performance',
    'reliability',
    'config-management'
]);

function extractCount(payload) {
    if (Array.isArray(payload)) return payload.length;
    if (typeof payload?.total === 'number') return payload.total;
    if (typeof payload?.count === 'number') return payload.count;
    const arr = payload?.items ?? payload?.data ?? payload?.cases ?? payload?.results ?? [];
    return Array.isArray(arr) ? arr.length : 0;
}

function extractAgentSummary(payload) {
    if (!payload || typeof payload !== 'object') return null;
    return {
        total: payload.total ?? payload.total_agents ?? payload.agent_count ?? null,
        active: payload.active ?? payload.active_agents ?? payload.online ?? null,
        inactive: payload.inactive ?? payload.inactive_agents ?? payload.offline ?? null,
        latestVersion: payload.latest_version ?? payload.version ?? payload.latestVersion ?? null
    };
}

function ActionsDropdown({ items }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (ref.current && !ref.current.contains(event.target)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <div className="relative inline-block text-left" ref={ref}>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen(!open);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-muted/20 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all"
            >
                <MoreVertical className="size-4" />
            </button>
            {open && (
                <div className="absolute right-0 z-50 mt-1 w-48 rounded-xl border border-neutral-700 bg-neutral-950 p-1.5 shadow-2xl animate-in fade-in duration-100">
                    {items.map((item, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setOpen(false);
                                item.onClick?.();
                            }}
                            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-bold text-left transition-colors ${
                                item.danger 
                                    ? 'text-red-500 hover:bg-red-500/10' 
                                    : 'text-neutral-200 hover:text-white hover:bg-neutral-800/80 bg-transparent'
                            }`}
                        >
                            {item.icon && <item.icon className="size-3.5 text-current" />}
                            <span>{item.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function TablePagination({ currentPage, totalPages, onPageChange, itemsPerPage, onItemsPerPageChange }) {
    return (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 bg-muted/5">
            <div className="flex items-center gap-4">
                <span className="text-[11px] font-semibold text-muted-foreground">
                    Page {currentPage} of {totalPages || 1}
                </span>
                {onItemsPerPageChange && (
                    <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-muted-foreground">Show:</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                            className="bg-transparent border border-border/80 rounded-md text-[10px] font-bold py-0.5 px-1 bg-card text-foreground outline-none"
                        >
                            {[10, 20, 50, 100].map(sz => (
                                <option key={sz} value={sz}>{sz}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
            {totalPages > 1 && (
                <div className="flex gap-1.5">
                    <Button
                        type="button"
                        variant="outline"
                        className="h-7 text-[10px] uppercase font-bold rounded-lg px-2.5"
                        disabled={currentPage === 1}
                        onClick={() => onPageChange(currentPage - 1)}
                    >
                        Prev
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-7 text-[10px] uppercase font-bold rounded-lg px-2.5"
                        disabled={currentPage === totalPages}
                        onClick={() => onPageChange(currentPage + 1)}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
}

const scoreCards = [
    { label: 'Critical alerts', value: '18', delta: '+4 in 24h', tone: 'destructive', icon: Siren },
    { label: 'Open cases', value: '7', delta: '3 awaiting owner', tone: 'info', icon: TicketCheck },
    { label: 'Contained hosts', value: '4', delta: '2 isolated safely', tone: 'success', icon: Shield },
    { label: 'Pending approvals', value: '5', delta: '2 high risk', tone: 'warning', icon: Timer },
    { label: 'SLA breaches', value: '2', delta: 'CMT escalation', tone: 'destructive', icon: AlertTriangle },
    { label: 'Data sources', value: '12', delta: 'SIEM, EDR, IDS, Cloud', tone: 'muted', icon: Database }
];

const operationLanes = [
    {
        title: 'SIEM Operations',
        subtitle: 'Wazuh alerts, compliance, rules, Discover replacement',
        icon: Radar,
        tone: 'info',
        metrics: ['4,812 events', '23 high alerts', '7 MITRE tactics'],
        actions: [
            { label: 'Alert Triage', moduleId: 'unified', viewId: 'cmt-alerts' },
            { label: 'Security Events', moduleId: 'unified', viewId: 'siem-events' }
        ]
    },
    {
        title: 'Case Management',
        subtitle: 'CMT cases, SLA, evidence, reports, analyst workflow',
        icon: TicketCheck,
        tone: 'success',
        metrics: ['7 open cases', '2 SLA breached', '14 evidence items'],
        actions: [
            { label: 'Case Queue', moduleId: 'unified', viewId: 'cmt-cases' },
            { label: 'SLA Breaches', moduleId: 'unified', viewId: 'cmt-sla' }
        ]
    },
    {
        title: 'EDR Response',
        subtitle: 'Endpoint posture, playbooks, manual response, rollback',
        icon: ShieldAlert,
        tone: 'destructive',
        metrics: ['6 active threats', '5 approvals', '91% success'],
        actions: [
            { label: 'Response Dashboard', moduleId: 'unified', viewId: 'response-dashboard' },
            { label: 'Manual Operations', moduleId: 'unified', viewId: 'manual-operations' }
        ]
    },
    {
        title: 'IDS / IPS',
        subtitle: 'Blocked traffic, signatures, network detections',
        icon: Network,
        tone: 'warning',
        metrics: ['128 blocked flows', '19 signatures', '5 sources watched'],
        actions: [
            { label: 'Blocked Threats', moduleId: 'unified', viewId: 'blocked' },
            { label: 'Intrusion Alerts', moduleId: 'unified', viewId: 'ids-alerts' }
        ]
    },
    {
        title: 'Cloud And Compliance',
        subtitle: 'AWS, Azure, Docker, PCI, GDPR, HIPAA posture',
        icon: Cloud,
        tone: 'info',
        metrics: ['8 cloud findings', '3 policy gaps', '96% hygiene'],
        actions: [
            { label: 'PCI DSS', moduleId: 'unified', viewId: 'pci' },
            { label: 'GDPR', moduleId: 'unified', viewId: 'gdpr' }
        ]
    },
    {
        title: 'Observability',
        subtitle: 'OTel health, traces, logs, service map',
        icon: Activity,
        tone: 'muted',
        metrics: ['12 services', '99.93% uptime', '231 p95 ms'],
        actions: [
            { label: 'Performance', moduleId: 'unified', viewId: 'performance' },
            { label: 'Reliability', moduleId: 'unified', viewId: 'reliability' }
        ]
    },
    {
        title: 'Endpoint Agents',
        subtitle: 'Wazuh agent fleet, versions, check-in status, coverage',
        icon: Server,
        tone: 'success',
        metrics: ['— total agents', '— active', '— stale'],
        actions: [
            { label: 'Agent Dashboard', moduleId: 'unified', viewId: 'cmt-agents' },
            { label: 'Endpoint Status', moduleId: 'unified', viewId: 'endpoints' }
        ]
    }
];

const incidentRows = [
    {
        id: 'INC-2026-1182',
        title: 'Credential access behavior on finance workstation',
        severity: 'critical',
        status: 'Containment',
        owner: 'tier-2',
        source: 'EDR + SIEM',
        eta: '12m'
    },
    {
        id: 'INC-2026-1179',
        title: 'Suspicious outbound beacon to untrusted ASN',
        severity: 'high',
        status: 'Approval',
        owner: 'soc-lead',
        source: 'IDS',
        eta: '18m'
    },
    {
        id: 'INC-2026-1175',
        title: 'Linux package integrity drift on web tier',
        severity: 'medium',
        status: 'Triage',
        owner: 'analyst-1',
        source: 'Wazuh',
        eta: '42m'
    },
    {
        id: 'INC-2026-1168',
        title: 'Cloud admin console login from new geography',
        severity: 'high',
        status: 'Investigating',
        owner: 'cloud-sec',
        source: 'Cloud',
        eta: '25m'
    }
];

const coverageRows = [
    { name: 'Detection coverage', value: 87, icon: Eye, tone: 'info' },
    { name: 'Automated response readiness', value: 74, icon: Workflow, tone: 'warning' },
    { name: 'Evidence retention health', value: 92, icon: Database, tone: 'success' },
    { name: 'Compliance control posture', value: 81, icon: FileText, tone: 'info' },
    { name: 'Identity and access telemetry', value: 68, icon: Lock, tone: 'warning' }
];

const workflowSteps = [
    { label: 'Detect', description: 'Normalize alerts from SIEM, EDR, IDS, cloud, and CMT.', icon: Bell },
    { label: 'Triage', description: 'Score severity, map MITRE tactics, enrich with assets and IOCs.', icon: Layers },
    { label: 'Contain', description: 'Queue approvals, host isolation, rollback-safe manual actions.', icon: Shield },
    { label: 'Recover', description: 'Track evidence, SLA, reports, and operational ownership.', icon: CheckCircle2 },
    { label: 'Audit', description: 'Preserve analyst identity, action history, and compliance trails.', icon: FileText }
];

function nativeLabel(viewId = 'home') {
    return String(viewId)
        .split('-')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ') || 'Unified Dashboard';
}

function toneClasses(tone) {
    const tones = {
        destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
        warning: 'border-warning/35 bg-warning/15 text-warning',
        success: 'border-success/30 bg-success/10 text-success',
        info: 'border-info/30 bg-info/10 text-info',
        muted: 'border-border bg-muted text-muted-foreground'
    };

    return tones[tone] || tones.muted;
}

function severityVariant(severity) {
    const s = String(severity || 'low').toLowerCase();
    if (s === 'critical' || s === 'high') return 'destructive';
    if (s === 'medium') return 'warning';
    return 'success';
}

function ScoreCard({ item }) {
    const Icon = item.icon;

    return (
        <Card className="border-border/80 bg-card transition-all duration-300 hover:scale-[1.02] hover:border-primary/30">
            <CardContent className="flex items-start justify-between gap-4 p-5">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
                    <p className="mt-3 text-3xl font-black tracking-tight text-foreground">{item.value}</p>
                    <p className="mt-1 text-sm font-medium text-muted-foreground">{item.delta}</p>
                </div>
                <div className={`flex size-11 items-center justify-center rounded-xl border ${toneClasses(item.tone)}`}>
                    <Icon className="size-5" />
                </div>
            </CardContent>
        </Card>
    );
}

function OperationLane({ lane, onOpenModule }) {
    const Icon = lane.icon;

    return (
        <Card className="group border-border/80 bg-card transition-all duration-300 hover:border-primary/40">
            <CardHeader className="space-y-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                    <div className={`flex size-12 items-center justify-center rounded-xl border ${toneClasses(lane.tone)} transition-transform duration-300 group-hover:scale-110`}>
                        <Icon className="size-5" />
                    </div>
                    <Badge variant={lane.tone === 'muted' ? 'outline' : lane.tone}>React native</Badge>
                </div>
                <div>
                    <CardTitle className="text-lg font-black tracking-tight">{lane.title}</CardTitle>
                    <CardDescription className="mt-1 font-medium">{lane.subtitle}</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-2">
                    {lane.metrics.map((metric) => (
                        <div key={metric} className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm font-semibold text-foreground">
                            <span className="size-1.5 rounded-full bg-primary" />
                            {metric}
                        </div>
                    ))}
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                    {lane.actions.map((action) => (
                        <Button
                            key={`${action.moduleId}-${action.viewId}-${action.label}`}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenModule?.(action.moduleId, action.viewId)}
                            className="h-8 rounded-lg text-xs"
                        >
                            {action.label}
                            <ArrowRight className="ml-1 size-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

function CoverageMeter({ item }) {
    const Icon = item.icon;

    return (
        <div className="rounded-xl border bg-card p-4 transition-all hover:border-primary/20">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className={`flex size-9 items-center justify-center rounded-lg border ${toneClasses(item.tone)}`}>
                        <Icon className="size-4" />
                    </div>
                    <div>
                        <p className="font-bold text-foreground text-sm">{item.name}</p>
                        <p className="text-[11px] font-medium text-muted-foreground">Current unified control plane score</p>
                    </div>
                </div>
                <p className="text-lg font-black text-foreground">{item.value}%</p>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <div
                    className="h-full rounded-full bg-primary transition-all duration-1000"
                    style={{ width: `${item.value}%` }}
                />
            </div>
        </div>
    );
}

/* =========================================================================
   NATIVE REACT OPEN_SEARCH REPLACEMENT WIDGETS
   ========================================================================= */

// 1. Discover Component
function DiscoverView() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFields, setSelectedFields] = useState(['@timestamp', 'rule.description', 'agent.name', 'severity']);
    const [expandedRow, setExpandedRow] = useState(null);
    const [severityFilter, setSeverityFilter] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const availableFields = ['@timestamp', 'rule.id', 'rule.level', 'rule.description', 'agent.name', 'source.ip', 'destination.ip', 'mitre.tactic', 'severity'];

    const [liveLogs, setLiveLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        let active = true;
        async function fetchLogs() {
            setIsLoading(true);
            try {
                const response = await listFilteredAlerts({ page: 1, page_size: 100, order: 'desc' });
                const alertsList = response?.alerts || response?.items || response?.data || (Array.isArray(response) ? response : []);
                if (alertsList.length > 0 && active) {
                    const mappedLogs = alertsList.map((alert, idx) => ({
                        id: alert.id || alert.source_alert_id || String(idx),
                        '@timestamp': alert.timestamp || alert.created_at || new Date().toISOString(),
                        'rule.id': alert.rule || '100000',
                        'rule.level': alert.rule_level || 5,
                        'rule.description': alert.rule_description || alert.description || 'No description',
                        'agent.name': alert.agent_name || alert.agent_id || 'fleet-agent',
                        'source.ip': alert.src_ip || alert.source_ip || '—',
                        'destination.ip': alert.dest_ip || alert.destination_ip || '—',
                        'mitre.tactic': alert.mitre_tactic || 'Security Event',
                        severity: alert.severity || 'Medium',
                        ...alert
                    }));
                    setLiveLogs(mappedLogs);
                }
            } catch (err) {
                console.warn("Could not load alerts from live backend. Using fallback mock data:", err);
            } finally {
                if (active) setIsLoading(false);
            }
        }
        fetchLogs();
        return () => { active = false; };
    }, []);

    const mockLogs = [
        { id: '1', '@timestamp': '2026-05-20T14:38:12Z', 'rule.id': '100201', 'rule.level': 12, 'rule.description': 'Mimikatz memory dump pattern detected on host', 'agent.name': 'win-finance-01', 'source.ip': '192.168.1.42', 'destination.ip': '10.0.0.8', 'mitre.tactic': 'Credential Access', severity: 'Critical' },
        { id: '2', '@timestamp': '2026-05-20T14:35:05Z', 'rule.id': '100312', 'rule.level': 8, 'rule.description': 'Multiple failed SSH logins from foreign source IP', 'agent.name': 'linux-web-prod', 'source.ip': '185.220.101.4', 'destination.ip': '192.168.22.4', 'mitre.tactic': 'Credential Access', severity: 'High' },
        { id: '3', '@timestamp': '2026-05-20T14:29:44Z', 'rule.id': '100910', 'rule.level': 5, 'rule.description': 'Sudoers file modification detected by file integrity monitoring', 'agent.name': 'linux-web-prod', 'source.ip': '192.168.1.101', 'destination.ip': '192.168.1.101', 'mitre.tactic': 'Privilege Escalation', severity: 'Medium' },
        { id: '4', '@timestamp': '2026-05-20T14:22:11Z', 'rule.id': '100445', 'rule.level': 3, 'rule.description': 'Outbound port sweep activity identified', 'agent.name': 'workstation-dev-12', 'source.ip': '192.168.1.155', 'destination.ip': '8.8.8.8', 'mitre.tactic': 'Discovery', severity: 'Low' },
        { id: '5', '@timestamp': '2026-05-20T14:15:30Z', 'rule.id': '100205', 'rule.level': 10, 'rule.description': 'Active Directory accounts queried via LDAP from non-DC host', 'agent.name': 'win-finance-01', 'source.ip': '192.168.1.42', 'destination.ip': '192.168.1.10', 'mitre.tactic': 'Discovery', severity: 'High' },
        { id: '6', '@timestamp': '2026-05-20T14:02:18Z', 'rule.id': '100990', 'rule.level': 14, 'rule.description': 'Cobalt Strike malleable C2 DNS beaconing sequence', 'agent.name': 'win-hr-laptop', 'source.ip': '192.168.1.88', 'destination.ip': '91.240.118.5', 'mitre.tactic': 'Command and Control', severity: 'Critical' }
    ];

    const logsSource = liveLogs.length > 0 ? liveLogs : mockLogs;

    const filteredLogs = logsSource.filter(log => {
        const matchesQuery = !searchQuery || JSON.stringify(log).toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSeverity = severityFilter === 'ALL' || String(log.severity).toUpperCase() === severityFilter;
        return matchesQuery && matchesSeverity;
    });

    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const chartData = [
        { time: '13:00', counts: 12 },
        { time: '13:10', counts: 18 },
        { time: '13:20', counts: 15 },
        { time: '13:30', counts: 30 },
        { time: '13:40', counts: 22 },
        { time: '13:50', counts: 28 },
        { time: '14:00', counts: 40 },
        { time: '14:10', counts: filteredLogs.length * 5 }
    ];

    const toggleField = (field) => {
        setSelectedFields(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]);
    };

    return (
        <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
            {/* Sidebar Field Explorer */}
            <Card className="border-border/80 bg-card p-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground mb-4">Available Fields</h3>
                <div className="flex flex-col gap-1.5">
                    {availableFields.map(field => {
                        const isSelected = selectedFields.includes(field);
                        return (
                            <button
                                key={field}
                                onClick={() => toggleField(field)}
                                className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors text-left ${
                                    isSelected ? 'bg-primary/10 text-primary border border-primary/20' : 'text-text-muted hover:bg-muted/40 border border-transparent'
                                }`}
                            >
                                <span className="truncate">{field}</span>
                                {isSelected && <Check className="size-3.5 shrink-0" />}
                            </button>
                        );
                    })}
                </div>
            </Card>

            {/* Discover Workspace */}
            <div className="space-y-6">
                {/* Query bar */}
                <Card className="border-border/80 bg-card p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[300px]">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                <input
                                type="text"
                                placeholder="Search Wazuh alerts, CMT cases, or network logs..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full h-11 bg-muted/40 border border-border/80 rounded-xl pl-10 pr-4 text-sm outline-none focus:border-primary/50 text-foreground"
                            />
                        </div>
                        <div className="flex items-center gap-1.5 rounded-xl border border-border/80 p-1 bg-muted/20">
                            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map(sev => (
                                <button
                                    key={sev}
                                    onClick={() => {
                                        setSeverityFilter(sev);
                                        setCurrentPage(1);
                                    }}
                                    className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-tight transition-all ${
                                        severityFilter === sev ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {sev}
                                </button>
                            ))}
                        </div>
                    </div>
                </Card>

                {/* Histogram */}
                <Card className="border-border/80 bg-card p-5">
                    <CardHeader className="p-0 pb-4">
                        <CardTitle className="text-sm font-semibold">Events over time</CardTitle>
                    </CardHeader>
                    <div className="h-32">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.08)" />
                                <XAxis dataKey="time" tick={{ fill: '#737373', fontSize: 10 }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fill: '#737373', fontSize: 10 }} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #262626', borderRadius: '8px' }} />
                                <Bar dataKey="counts" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Logs Table */}
                <Card className="border-border/80 bg-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10"></TableHead>
                                    {selectedFields.map(f => (
                                        <TableHead key={f} className="text-xs uppercase tracking-wider">{f}</TableHead>
                                    ))}
                                    <TableHead className="text-right w-16">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedLogs.length > 0 ? (
                                    paginatedLogs.map(log => {
                                        const isExpanded = expandedRow === log.id;
                                        return (
                                            <React.Fragment key={log.id}>
                                                <TableRow className="cursor-pointer hover:bg-muted/10" onClick={() => setExpandedRow(isExpanded ? null : log.id)}>
                                                    <TableCell>
                                                        <ChevronRight className={`size-4 transition-transform ${isExpanded ? 'rotate-90 text-primary' : 'text-muted-foreground'}`} />
                                                    </TableCell>
                                                    {selectedFields.map(f => (
                                                        <TableCell key={f} className="text-xs font-medium max-w-[320px] truncate">
                                                            {f === 'severity' ? (
                                                                <Badge variant={severityVariant(log[f])}>{log[f]}</Badge>
                                                            ) : (
                                                                log[f] ?? 'n/a'
                                                            )}
                                                        </TableCell>
                                                    ))}
                                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                        <ActionsDropdown items={[
                                                            { label: 'Copy JSON Payload', icon: FileText, onClick: () => {
                                                                navigator.clipboard.writeText(JSON.stringify(log, null, 2));
                                                                alert("JSON Copied to clipboard!");
                                                            }},
                                                            { label: 'Promote Alert', icon: GitBranch, onClick: () => alert(`Promoted alert ${log.id} to Case!`) },
                                                            { label: 'Block Source IP', icon: Lock, onClick: () => alert(`Blocked IP ${log['source.ip'] || 'unknown'}`) }
                                                        ]} />
                                                    </TableCell>
                                                </TableRow>
                                                {isExpanded && (
                                                    <TableRow className="bg-muted/10 hover:bg-muted/10">
                                                        <TableCell colSpan={selectedFields.length + 2}>
                                                            <div className="p-4 rounded-xl border bg-black/40 space-y-3">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs font-bold text-primary">Formatted Alert Payload JSON</span>
                                                                    <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={() => {
                                                                        navigator.clipboard.writeText(JSON.stringify(log, null, 2));
                                                                        alert("JSON Copied to clipboard!");
                                                                    }}>
                                                                        Copy Payload
                                                                    </Button>
                                                                </div>
                                                                <pre className="text-[11px] font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap max-h-60 p-3 bg-black/60 rounded-lg">
                                                                    {JSON.stringify(log, null, 4)}
                                                                </pre>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={selectedFields.length + 2} className="text-center py-10 text-muted-foreground">
                                            No logs matching the current search parameters.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <TablePagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        itemsPerPage={itemsPerPage}
                        onItemsPerPageChange={(newSize) => {
                            setItemsPerPage(newSize);
                            setCurrentPage(1);
                        }}
                    />
                </Card>
            </div>
        </div>
    );
}

// 2. Dashboards Catalog
function DashboardsView({ onOpenModule }) {
    const list = [
        { id: 'discover', title: 'SIEM Discovery Workspace', tag: 'SIEM', widgets: 5, targetView: 'discover', desc: 'Raw event explorer with customizable queries, field selector, and payload inspection.' },
        { id: 'visualize', title: 'SIEM Threat Analytics', tag: 'SIEM', widgets: 8, targetView: 'visualize', desc: 'Security trend analysis featuring area trends, severity breakdowns, and tactic coverage.' },
        { id: 'live-alerts', title: 'Real-time Wazuh Alerts', tag: 'SIEM', widgets: 4, targetView: 'live-alerts', desc: 'Real-time telemetry stream from endpoints promoting high-fidelity alerts directly to CMT.' },
        { id: 'endpoints', title: 'EDR Endpoint Posture', tag: 'EDR', widgets: 6, targetView: 'endpoints', desc: 'Fleet agent status, OS versions, telemetry check-ins, and isolation indicators.' },
        { id: 'active-threats', title: 'EDR Active Detections', tag: 'EDR', widgets: 7, targetView: 'active-threats', desc: 'Malware hash alerts, YARA matches, and automated containment actions.' },
        { id: 'response-dashboard', title: 'SOC Response Command', tag: 'Automation', widgets: 12, targetView: 'response-dashboard', desc: 'Playbook execution statuses, pending analyst approvals, and cooldown metrics.' },
        { id: 'pci', title: 'PCI-DSS Compliance Posture', tag: 'Compliance', widgets: 10, targetView: 'pci', desc: 'Status checks, audit trails, and control mappings for regulatory validation.' }
    ];

    const [filterTag, setFilterTag] = useState('ALL');

    const filteredList = list.filter(item => filterTag === 'ALL' || item.tag === filterTag);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 rounded-xl border border-border/80 p-1 bg-muted/20 w-fit">
                {['ALL', 'SIEM', 'EDR', 'Automation', 'Compliance'].map(tag => (
                    <button
                        key={tag}
                        onClick={() => setFilterTag(tag)}
                        className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                            filterTag === tag ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {tag}
                    </button>
                ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredList.map(dashboard => (
                    <Card key={dashboard.id} className="border-border/80 bg-card hover:border-primary/30 transition-all group flex flex-col justify-between">
                        <CardHeader className="space-y-3 pb-3">
                            <div className="flex items-center justify-between">
                                <Badge variant="secondary">{dashboard.tag}</Badge>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">{dashboard.widgets} Widgets</span>
                            </div>
                            <CardTitle className="text-base font-bold tracking-tight">{dashboard.title}</CardTitle>
                            <CardDescription className="text-xs leading-5 font-semibold text-muted-foreground">{dashboard.desc}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0 pb-4">
                            <Button
                                onClick={() => onOpenModule?.('unified', dashboard.targetView)}
                                variant="outline"
                                className="w-full text-xs h-9 rounded-lg mt-2 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300"
                            >
                                Open Dashboard
                                <ArrowRight className="ml-1.5 size-3.5 group-hover:translate-x-0.5" />
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

// 3. Visualize Studio
function VisualizeView() {
    const [chartCurve, setChartCurve] = useState('monotone');
    const [timeWindow, setTimeWindow] = useState('24h');
    const [dataSpike, setDataSpike] = useState(0);

    const volumeData = [
        { time: '00:00', siem: 320 + dataSpike, edr: 120, ids: 80 },
        { time: '04:00', siem: 280, edr: 110, ids: 95 },
        { time: '08:00', siem: 450 + dataSpike * 2, edr: 180, ids: 120 },
        { time: '12:00', siem: 680 + dataSpike * 1.5, edr: 290, ids: 210 },
        { time: '16:00', siem: 590, edr: 220, ids: 190 },
        { time: '20:00', siem: 890 + dataSpike * 3, edr: 410, ids: 310 },
        { time: '24:00', siem: 720, edr: 340, ids: 250 }
    ];

    const pieData = [
        { name: 'Critical', value: 18, color: '#ef4444' },
        { name: 'High', value: 45, color: '#f97316' },
        { name: 'Medium', value: 124, color: '#eab308' },
        { name: 'Low', value: 480, color: '#10b981' }
    ];

    const tacticData = [
        { name: 'Initial Access', count: 5 },
        { name: 'Execution', count: 18 },
        { name: 'Persistence', count: 12 },
        { name: 'Privilege Esc', count: 9 },
        { name: 'Cred Access', count: 22 },
        { name: 'C2', count: 15 }
    ];

    const simulateSpike = () => {
        setDataSpike(Math.floor(Math.random() * 300) + 150);
        setTimeout(() => setDataSpike(0), 4000);
    };

    return (
        <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
            {/* Visualizer Settings Controls */}
            <Card className="border-border/80 bg-card p-5 space-y-6">
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground mb-3">Chart Curve Style</h3>
                    <div className="flex gap-2">
                        {['monotone', 'linear'].map(curve => (
                            <Button
                                key={curve}
                                onClick={() => setChartCurve(curve)}
                                variant={chartCurve === curve ? 'info' : 'outline'}
                                className="flex-1 h-9 text-xs rounded-lg uppercase"
                            >
                                {curve}
                            </Button>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground mb-3">Resolution Interval</h3>
                    <div className="grid grid-cols-3 gap-2">
                        {['1h', '6h', '24h'].map(win => (
                            <Button
                                key={win}
                                onClick={() => setTimeWindow(win)}
                                variant={timeWindow === win ? 'info' : 'outline'}
                                className="h-8 text-xs rounded-lg"
                            >
                                {win}
                            </Button>
                        ))}
                    </div>
                </div>

                <Separator />

                <div className="space-y-3">
                    <Button onClick={simulateSpike} variant="destructive" className="w-full h-11 rounded-xl gap-2 font-bold uppercase tracking-wider text-xs">
                        <Zap className="size-4 animate-pulse" />
                        Simulate Traffic Spike
                    </Button>
                    <p className="text-[11px] font-semibold text-muted-foreground text-center">Simulate active network threats and monitor reactivity.</p>
                </div>
            </Card>

            {/* Graphs Grid */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Area Chart */}
                <Card className="border-border/80 bg-card p-5 space-y-4 md:col-span-2">
                    <div>
                        <CardTitle className="text-sm font-semibold">Event Ingestion Trends (EPS)</CardTitle>
                        <CardDescription className="text-xs font-semibold">Real-time telemetry rates across security clusters</CardDescription>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={volumeData}>
                                <defs>
                                    <linearGradient id="siemGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="edrGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.08)" />
                                <XAxis dataKey="time" tick={{ fill: '#737373', fontSize: 11 }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fill: '#737373', fontSize: 11 }} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #262626', borderRadius: '8px' }} />
                                <Legend verticalAlign="top" height={36} />
                                <Area type={chartCurve} dataKey="siem" stroke="#3b82f6" fillOpacity={1} fill="url(#siemGrad)" strokeWidth={2} name="SIEM Pipeline" />
                                <Area type={chartCurve} dataKey="edr" stroke="#ef4444" fillOpacity={1} fill="url(#edrGrad)" strokeWidth={2} name="EDR Agent telemetry" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Pie Chart */}
                <Card className="border-border/80 bg-card p-5 space-y-4">
                    <div>
                        <CardTitle className="text-sm font-semibold">Severity Breakdown</CardTitle>
                        <CardDescription className="text-xs font-semibold">Active alerts by importance category</CardDescription>
                    </div>
                    <div className="h-60 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={4}
                                    dataKey="value"
                                    nameKey="name"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #262626', borderRadius: '8px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Bar Chart */}
                <Card className="border-border/80 bg-card p-5 space-y-4">
                    <div>
                        <CardTitle className="text-sm font-semibold">Top MITRE Tactics Mapped</CardTitle>
                        <CardDescription className="text-xs font-semibold">Detections grouped by attacker stage</CardDescription>
                    </div>
                    <div className="h-60">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={tacticData} layout="vertical" margin={{ left: -10, right: 10 }}>
                                <CartesianGrid horizontal={false} stroke="rgba(148,163,184,0.08)" />
                                <XAxis type="number" tick={{ fill: '#737373', fontSize: 10 }} tickLine={false} axisLine={false} />
                                <YAxis type="category" dataKey="name" tick={{ fill: '#e5e5e5', fontSize: 10 }} tickLine={false} axisLine={false} width={80} />
                                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #262626', borderRadius: '8px' }} />
                                <Bar dataKey="count" fill="#eab308" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
    );
}

// 4. Reporting Component
function ReportingView() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [genProgress, setGenProgress] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [templates, setTemplates] = useState([]);

    useEffect(() => {
        let active = true;
        async function fetchTemplates() {
            try {
                const res = await listReportTemplates();
                const items = res?.templates || res?.items || res?.data || (Array.isArray(res) ? res : []);
                if (active) {
                    const templateList = items.map(t => ({
                        id: t.id || t.template_id || String(Math.random()),
                        name: t.name || t.title || 'Untitled Template'
                    }));
                    if (templateList.length > 0) {
                        setTemplates(templateList);
                        setSelectedTemplate(templateList[0].name);
                    } else {
                        throw new Error("No templates returned from backend");
                    }
                }
            } catch (err) {
                console.warn("Could not load templates from live backend. Using fallbacks:", err);
                const fallbacks = [
                    { id: 'pci', name: 'PCI-DSS v4.0 Readiness Audit' },
                    { id: 'gdpr', name: 'GDPR Article 32 Technical Controls' },
                    { id: 'forensic', name: 'CMT Evidentiary Chain-of-Custody' },
                    { id: 'summary', name: 'Weekly Executive Incident Summary' }
                ];
                if (active) {
                    setTemplates(fallbacks);
                    setSelectedTemplate(fallbacks[0].name);
                }
            }
        }
        fetchTemplates();
        return () => { active = false; };
    }, []);

    const [reports, setReports] = useState([
        { id: 'REP-001', name: 'Weekly Executive SOC Summary', format: 'PDF', size: '2.4 MB', date: '2026-05-18 10:24:11', status: 'Ready' },
        { id: 'REP-002', name: 'CMT Evidentiary Forensic Log', format: 'CSV', size: '15.8 MB', date: '2026-05-15 16:44:02', status: 'Ready' },
        { id: 'REP-003', name: 'EDR Rollback Containment Audit', format: 'PDF', size: '1.8 MB', date: '2026-05-10 09:12:55', status: 'Ready' }
    ]);

    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const deleteReport = (id) => {
        setReports(prev => prev.filter(r => r.id !== id));
        setCurrentPage(1);
    };

    const filteredReports = reports.filter(rep => 
        rep.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.format.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
    const paginatedReports = filteredReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleGenerate = () => {
        setIsGenerating(true);
        setGenProgress('Initializing engine...');
        
        setTimeout(() => {
            setGenProgress('Querying indices and databases...');
            setTimeout(() => {
                setGenProgress('Rendering document templates...');
                setTimeout(() => {
                    const newReport = {
                        id: `REP-${Math.floor(Math.random() * 900) + 100}`,
                        name: `${selectedTemplate} Audit Evidence compilation`,
                        format: 'PDF',
                        size: '3.1 MB',
                        date: new Date().toISOString().replace('T', ' ').slice(0, 19),
                        status: 'Ready'
                    };
                    setReports(prev => [newReport, ...prev]);
                    setIsGenerating(false);
                    setGenProgress('');
                }, 1000);
            }, 1000);
        }, 1000);
    };

    const downloadReport = (name) => {
        const dummyText = `Unified Security Dashboard Report Summary\n=========================================\nGenerated At: ${new Date().toLocaleString()}\nReport Pack: ${name}\nStatus: Compliant\nValidated Indicators: OK`;
        const blob = new Blob([dummyText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${name.toLowerCase().replace(/ /g, '_')}_audit_report.txt`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="grid gap-6 xl:grid-cols-[1fr_1.3fr]">
            {/* Report Generator Controls */}
            <Card className="border-border/80 bg-card p-5 space-y-6">
                <div>
                    <CardTitle className="text-base font-bold tracking-tight">Generate Compliance Report Pack</CardTitle>
                    <CardDescription className="text-xs font-semibold mt-1">Compile executive reports directly from live database indexes.</CardDescription>
                </div>

                <div className="space-y-4">
                    <label className="flex flex-col gap-2">
                        <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Select Template</span>
                        <select
                            value={selectedTemplate}
                            onChange={(e) => setSelectedTemplate(e.target.value)}
                            className="h-11 bg-muted/40 border border-border/80 rounded-xl px-3 text-sm text-foreground outline-none focus:border-primary/50"
                        >
                            {templates.map(t => (
                                <option key={t.id} value={t.name}>{t.name}</option>
                            ))}
                        </select>
                    </label>

                    <label className="flex flex-col gap-2">
                        <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Export Format</span>
                        <select className="h-11 bg-muted/40 border border-border/80 rounded-xl px-3 text-sm text-foreground outline-none focus:border-primary/50">
                            <option>PDF (Strict compliance layout)</option>
                            <option>CSV (Raw table records)</option>
                            <option>JSON (REST Payload structure)</option>
                        </select>
                    </label>
                </div>

                {isGenerating ? (
                    <div className="p-4 rounded-xl border bg-black/40 text-center space-y-3">
                        <RefreshCw className="size-6 text-primary animate-spin mx-auto" />
                        <p className="text-xs font-bold text-primary">{genProgress}</p>
                    </div>
                ) : (
                    <Button onClick={handleGenerate} variant="info" className="w-full h-11 rounded-xl uppercase font-bold text-xs">
                        Compile Report
                    </Button>
                )}
            </Card>

            {/* Generated Reports Log */}
            <Card className="border-border/80 bg-card p-5 space-y-4">
                <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
                    <div>
                        <CardTitle className="text-base font-bold tracking-tight">Report Log History</CardTitle>
                        <CardDescription className="text-xs font-semibold mt-1">Generated and archived exports for active audit validation</CardDescription>
                    </div>
                    <div className="relative w-full md:w-48">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-3.5" />
                        <input
                            type="text"
                            placeholder="Search reports..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full h-8 bg-muted/40 border border-border/80 rounded-lg pl-8 pr-2.5 text-xs outline-none focus:border-primary/50 text-foreground"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto rounded-xl border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Report Name</TableHead>
                                <TableHead>Format</TableHead>
                                <TableHead>Size</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right w-16">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedReports.length > 0 ? (
                                paginatedReports.map(rep => (
                                    <TableRow key={rep.id}>
                                        <TableCell className="font-bold text-xs text-foreground truncate max-w-[200px]">{rep.name}</TableCell>
                                        <TableCell className="text-xs"><Badge variant="outline">{rep.format}</Badge></TableCell>
                                        <TableCell className="text-xs text-muted-foreground font-semibold font-mono">{rep.size}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground font-semibold font-mono">{rep.date}</TableCell>
                                        <TableCell className="text-right">
                                            <ActionsDropdown items={[
                                                { label: 'Download Report', icon: Download, onClick: () => downloadReport(rep.name) },
                                                { label: 'View Meta Details', icon: FileText, onClick: () => alert(`Report ID: ${rep.id}\nSize: ${rep.size}\nFormat: ${rep.format}`) },
                                                { label: 'Delete Report', icon: Trash, danger: true, onClick: () => deleteReport(rep.id) }
                                            ]} />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                                        No reports found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <TablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={(newSize) => {
                        setItemsPerPage(newSize);
                        setCurrentPage(1);
                    }}
                />
            </Card>
        </div>
    );
}

// 5. Alerting rules dashboard
function AlertingView() {
    const [rules, setRules] = useState([
        { id: 'RULE-1002', name: 'Mimikatz Execution Detected', severity: 'Critical', triggerCount: 8, enabled: true, destination: 'Slack + CMT' },
        { id: 'RULE-1005', name: 'Multiple SSH Failed Logins', severity: 'High', triggerCount: 22, enabled: true, destination: 'Slack' },
        { id: 'RULE-1008', name: 'Sudoers Configuration Modification', severity: 'Medium', triggerCount: 3, enabled: false, destination: 'Email' },
        { id: 'RULE-1009', name: 'Outbound TCP Port Scan Sweep', severity: 'Medium', triggerCount: 14, enabled: true, destination: 'Jira + CMT' },
        { id: 'RULE-1012', name: 'AD LDAP Account Query Bulk', severity: 'High', triggerCount: 5, enabled: true, destination: 'CMT' }
    ]);

    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const deleteRule = (id) => {
        setRules(prev => prev.filter(r => r.id !== id));
        setCurrentPage(1);
    };

    const filteredRules = rules.filter(r => 
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.severity.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.ceil(filteredRules.length / itemsPerPage);
    const paginatedRules = filteredRules.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const [isAdding, setIsAdding] = useState(false);
    const [newRuleName, setNewRuleName] = useState('');
    const [newRuleSev, setNewRuleSev] = useState('High');

    const toggleRule = (id) => {
        setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    };

    const handleAddRule = (e) => {
        e.preventDefault();
        if (!newRuleName.trim()) return;

        const newRule = {
            id: `RULE-${Math.floor(Math.random() * 900) + 1000}`,
            name: newRuleName,
            severity: newRuleSev,
            triggerCount: 0,
            enabled: true,
            destination: 'CMT'
        };

        setRules(prev => [...prev, newRule]);
        setNewRuleName('');
        setIsAdding(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-foreground">Detection Alerting Rules</h2>
                    <p className="text-xs text-muted-foreground">Modify threshold levels and trigger actions for automatic CMT promotion.</p>
                </div>
                <Button onClick={() => setIsAdding(!isAdding)} variant="info" className="rounded-xl h-10 gap-1.5 uppercase font-bold text-xs">
                    {isAdding ? <X size={14} /> : <Plus size={14} />}
                    {isAdding ? 'Cancel' : 'Create Detection Rule'}
                </Button>
            </div>

            {isAdding && (
                <Card className="border-border/80 bg-card p-5 max-w-xl animate-in slide-in-from-top-4 duration-200">
                    <form onSubmit={handleAddRule} className="space-y-4">
                        <label className="flex flex-col gap-2">
                            <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Rule Title / Event Trigger</span>
                            <input
                                type="text"
                                placeholder="e.g. AWS Console Login without MFA"
                                value={newRuleName}
                                onChange={(e) => setNewRuleName(e.target.value)}
                                className="h-11 bg-muted/40 border border-border/80 rounded-xl px-3 text-sm text-foreground outline-none focus:border-primary/50"
                            />
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <label className="flex flex-col gap-2">
                                <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Severity</span>
                                <select
                                    value={newRuleSev}
                                    onChange={(e) => setNewRuleSev(e.target.value)}
                                    className="h-11 bg-muted/40 border border-border/80 rounded-xl px-3 text-sm text-foreground outline-none focus:border-primary/50"
                                >
                                    <option>Critical</option>
                                    <option>High</option>
                                    <option>Medium</option>
                                    <option>Low</option>
                                </select>
                            </label>
                            <label className="flex flex-col gap-2">
                                <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Target Route</span>
                                <select className="h-11 bg-muted/40 border border-border/80 rounded-xl px-3 text-sm text-foreground outline-none focus:border-primary/50">
                                    <option>CMT Case Queue (Auto Escalation)</option>
                                    <option>Slack Triage Notification Only</option>
                                    <option>Jira Ticket Creation</option>
                                    <option>Syslog Relayer Endpoint</option>
                                </select>
                            </label>
                        </div>
                        <Button type="submit" variant="info" className="w-full h-11 rounded-xl uppercase font-bold text-xs">Save Rule Policy</Button>
                    </form>
                </Card>
            )}

            <Card className="border-border/80 bg-card overflow-hidden">
                <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between p-4 border-b border-border/40">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Detection Rules Directory</span>
                    <div className="relative w-full md:w-48">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-3.5" />
                        <input
                            type="text"
                            placeholder="Search rules..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full h-8 bg-muted/40 border border-border/80 rounded-lg pl-8 pr-2.5 text-xs outline-none focus:border-primary/50 text-foreground"
                        />
                    </div>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Rule ID</TableHead>
                            <TableHead>Rule Name</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead>Triggers (24h)</TableHead>
                            <TableHead>Target Channel</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right w-16">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedRules.length > 0 ? (
                            paginatedRules.map(rule => (
                                <TableRow key={rule.id}>
                                    <TableCell className="font-mono text-xs font-bold text-muted-foreground">{rule.id}</TableCell>
                                    <TableCell className="font-bold text-xs text-foreground">{rule.name}</TableCell>
                                    <TableCell><Badge variant={severityVariant(rule.severity)}>{rule.severity}</Badge></TableCell>
                                    <TableCell className="font-mono text-xs font-semibold text-center">{rule.triggerCount}</TableCell>
                                    <TableCell className="text-xs font-semibold text-muted-foreground">{rule.destination}</TableCell>
                                    <TableCell>
                                        <Badge variant={rule.enabled ? 'success' : 'outline'}>{rule.enabled ? 'Enabled' : 'Disabled'}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <ActionsDropdown items={[
                                            { label: rule.enabled ? 'Disable Rule' : 'Enable Rule', icon: rule.enabled ? X : Check, onClick: () => toggleRule(rule.id) },
                                            { label: 'Trigger Test Alert', icon: Play, onClick: () => alert(`Triggered manual execution of rule: ${rule.name}`) },
                                            { label: 'Delete Rule', icon: Trash, danger: true, onClick: () => deleteRule(rule.id) }
                                        ]} />
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground">
                                    No rules found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={(newSize) => {
                        setItemsPerPage(newSize);
                        setCurrentPage(1);
                    }}
                />
            </Card>
        </div>
    );
}

// 6. SIEM Events Workspace
function SiemEventsView() {
    const mockEvents = [
        { id: 'S-01', time: '2026-05-20 14:38:12', desc: 'Mimikatz memory dump pattern detected on host', agent: 'win-finance-01', tactic: 'Credential Access', level: 12, severity: 'Critical' },
        { id: 'S-02', time: '2026-05-20 14:35:05', desc: 'Multiple failed SSH logins from foreign source IP', agent: 'linux-web-prod', tactic: 'Credential Access', level: 8, severity: 'High' },
        { id: 'S-03', time: '2026-05-20 14:29:44', desc: 'Sudoers file modification detected by file integrity monitoring', agent: 'linux-web-prod', tactic: 'Privilege Escalation', level: 5, severity: 'Medium' },
        { id: 'S-04', time: '2026-05-20 14:22:11', desc: 'Outbound port sweep activity identified', agent: 'workstation-dev-12', tactic: 'Discovery', level: 3, severity: 'Low' },
        { id: 'S-05', time: '2026-05-20 14:15:30', desc: 'Active Directory accounts queried via LDAP from non-DC host', agent: 'win-finance-01', tactic: 'Discovery', level: 10, severity: 'High' }
    ];

    const [eventList, setEventList] = useState(mockEvents);
    const [activeDetail, setActiveDetail] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const promoteAlert = (id) => {
        alert(`Successfully promoted SIEM Alert ${id} to CMT Case!`);
        setEventList(prev => prev.filter(e => e.id !== id));
        setCurrentPage(1);
    };

    const deleteEvent = (id) => {
        setEventList(prev => prev.filter(e => e.id !== id));
        setCurrentPage(1);
    };

    const filteredEvents = eventList.filter(ev => 
        ev.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.agent.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.tactic.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
    const paginatedEvents = filteredEvents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
                <Card className="border-border/80 bg-card overflow-hidden flex flex-col justify-between">
                    <div>
                        <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between p-4 border-b border-border/40">
                            <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">SIEM Event Log Queue</span>
                            <div className="relative w-full md:w-48">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-3.5" />
                                <input
                                    type="text"
                                    placeholder="Search events..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full h-8 bg-muted/40 border border-border/80 rounded-lg pl-8 pr-2.5 text-xs outline-none focus:border-primary/50 text-foreground"
                                />
                            </div>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Wazuh / Rule Description</TableHead>
                                    <TableHead>Agent</TableHead>
                                    <TableHead>MITRE Tactic</TableHead>
                                    <TableHead>Severity</TableHead>
                                    <TableHead className="text-right w-16">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedEvents.length > 0 ? (
                                    paginatedEvents.map(ev => (
                                        <TableRow key={ev.id} className="cursor-pointer hover:bg-muted/10 animate-in fade-in duration-150" onClick={() => setActiveDetail(ev)}>
                                            <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">{ev.time}</TableCell>
                                            <TableCell className="font-bold text-xs text-foreground max-w-[280px] truncate">{ev.desc}</TableCell>
                                            <TableCell className="text-xs font-semibold text-muted-foreground">{ev.agent}</TableCell>
                                            <TableCell className="text-xs"><Badge variant="outline">{ev.tactic}</Badge></TableCell>
                                            <TableCell><Badge variant={severityVariant(ev.severity)}>{ev.severity}</Badge></TableCell>
                                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                <ActionsDropdown items={[
                                                    { label: 'Promote to CMT', icon: GitBranch, onClick: () => promoteAlert(ev.id) },
                                                    { label: 'Inspect Details', icon: Eye, onClick: () => setActiveDetail(ev) },
                                                    { label: 'Dismiss Event', icon: Trash, danger: true, onClick: () => deleteEvent(ev.id) }
                                                ]} />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10 text-xs text-muted-foreground">
                                            No events found matching query.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <TablePagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        itemsPerPage={itemsPerPage}
                        onItemsPerPageChange={(newSize) => {
                            setItemsPerPage(newSize);
                            setCurrentPage(1);
                        }}
                    />
                </Card>

                {/* Event Enrichment Details Panel */}
                <Card className="border-border/80 bg-card p-5 flex flex-col justify-between min-h-[300px]">
                    {activeDetail ? (
                        <div className="space-y-4">
                            <div>
                                <Badge variant={severityVariant(activeDetail.severity)} className="uppercase">{activeDetail.severity} Severity</Badge>
                                <h3 className="text-sm font-bold text-foreground mt-3">{activeDetail.desc}</h3>
                                <p className="text-xs font-semibold text-muted-foreground mt-1">Rule Engine Trigger log - Level {activeDetail.level}</p>
                            </div>
                            <Separator />
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="p-2 rounded bg-muted/40 font-semibold text-muted-foreground">
                                    <span className="block text-[10px] uppercase text-muted-foreground/60 mb-1">Agent Name</span>
                                    {activeDetail.agent}
                                </div>
                                <div className="p-2 rounded bg-muted/40 font-semibold text-muted-foreground">
                                    <span className="block text-[10px] uppercase text-muted-foreground/60 mb-1">MITRE Tactic</span>
                                    {activeDetail.tactic}
                                </div>
                            </div>
                            <div className="p-3 bg-black/40 rounded-xl border">
                                <span className="block text-[10px] uppercase text-primary font-bold mb-2">Internal Wazuh XML Decoder</span>
                                <pre className="font-mono text-[10px] text-muted-foreground overflow-x-auto max-h-36">
{`<alert>
  <rule_id>${activeDetail.level * 1000 + 201}</rule_id>
  <description>${activeDetail.desc}</description>
  <mitre_tactic>${activeDetail.tactic}</mitre_tactic>
  <agent>${activeDetail.agent}</agent>
  <timestamp>${activeDetail.time}</timestamp>
</alert>`}
                                </pre>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8 border border-dashed border-border/80 rounded-xl bg-muted/10">
                            <SlidersHorizontal size={36} className="text-muted-foreground/40 mb-3" />
                            <p className="text-xs font-semibold">Select a security event in the table to display full SIEM payload decoding.</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}

// 7. MITRE ATT&CK Matrix View
function MitreView() {
    const tactics = [
        {
            name: 'Initial Access',
            techniques: [
                { id: 'T1566', name: 'Phishing', count: 4 },
                { id: 'T1190', name: 'Exploit Public-Facing App', count: 1 },
                { id: 'T1078', name: 'Valid Accounts', count: 0 }
            ]
        },
        {
            name: 'Execution',
            techniques: [
                { id: 'T1059', name: 'Command & Scripting Interpreter', count: 12 },
                { id: 'T1047', name: 'Windows Management Instrumentation', count: 2 },
                { id: 'T1106', name: 'Native API', count: 0 }
            ]
        },
        {
            name: 'Persistence',
            techniques: [
                { id: 'T1547', name: 'Registry Run Keys', count: 7 },
                { id: 'T1505', name: 'Server Software Component (Web Shell)', count: 3 },
                { id: 'T1098', name: 'Account Manipulation', count: 0 }
            ]
        },
        {
            name: 'Privilege Escalation',
            techniques: [
                { id: 'T1055', name: 'Process Injection', count: 5 },
                { id: 'T1548', name: 'Bypass User Account Control', count: 1 },
                { id: 'T1546', name: 'Event Trigger Execution', count: 0 }
            ]
        },
        {
            name: 'Defense Evasion',
            techniques: [
                { id: 'T1027', name: 'Obfuscated Files/Info', count: 6 },
                { id: 'T1036', name: 'Masquerading', count: 2 },
                { id: 'T1070', name: 'Indicator Removal', count: 0 }
            ]
        },
        {
            name: 'Credential Access',
            techniques: [
                { id: 'T1003', name: 'OS Credential Dumping', count: 8 },
                { id: 'T1110', name: 'Brute Force', count: 9 },
                { id: 'T1539', name: 'Credentials from Browsers', count: 0 }
            ]
        },
        {
            name: 'Discovery',
            techniques: [
                { id: 'T1046', name: 'Network Service Discovery', count: 14 },
                { id: 'T1087', name: 'Account Discovery', count: 1 },
                { id: 'T1057', name: 'Process Discovery', count: 2 }
            ]
        },
        {
            name: 'Lateral Movement',
            techniques: [
                { id: 'T1021', name: 'Remote Services', count: 3 },
                { id: 'T1550', name: 'Use of Alternate Auth Material', count: 0 }
            ]
        },
        {
            name: 'Collection',
            techniques: [
                { id: 'T1560', name: 'Archive Collected Data', count: 2 },
                { id: 'T1114', name: 'Email Collection', count: 0 }
            ]
        },
        {
            name: 'C2',
            techniques: [
                { id: 'T1071', name: 'Application Layer Protocol', count: 11 },
                { id: 'T1568', name: 'Dynamic Resolution', count: 1 }
            ]
        },
        {
            name: 'Exfiltration',
            techniques: [
                { id: 'T1041', name: 'Exfiltration Over C2 Channel', count: 4 },
                { id: 'T1048', name: 'Exfiltration Over Alt Protocol', count: 0 }
            ]
        },
        {
            name: 'Impact',
            techniques: [
                { id: 'T1486', name: 'Data Encrypted for Impact', count: 5 },
                { id: 'T1489', name: 'Service Stop', count: 2 }
            ]
        }
    ];

    const [selectedTech, setSelectedTech] = useState(null);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
                <div>
                    <h3 className="text-xl font-bold text-foreground">MITRE ATT&CK® Enterprise Matrix</h3>
                    <p className="text-xs text-muted-foreground">Observed technique heatmap mapped from Wazuh and EDR detection metrics</p>
                </div>
            </div>

            <div className="overflow-x-auto pb-4">
                <div className="flex gap-3 min-w-[1400px]">
                    {tactics.map(tactic => (
                        <div key={tactic.name} className="w-[180px] shrink-0 space-y-3">
                            <div className="p-3 bg-muted/40 rounded-xl border font-bold text-xs text-center truncate text-foreground uppercase tracking-wider">
                                {tactic.name}
                            </div>
                            <div className="space-y-2">
                                {tactic.techniques.map(tech => {
                                    let colorClass = 'border-border/80 bg-muted/10 text-muted-foreground';
                                    if (tech.count >= 8) {
                                        colorClass = 'border-destructive bg-destructive/15 text-destructive';
                                    } else if (tech.count >= 3) {
                                        colorClass = 'border-warning bg-warning/15 text-warning';
                                    } else if (tech.count >= 1) {
                                        colorClass = 'border-info bg-info/15 text-info';
                                    }

                                    return (
                                        <button
                                            key={tech.id}
                                            onClick={() => setSelectedTech(tech)}
                                            className={`w-full p-2.5 rounded-xl border text-[11px] font-semibold text-left transition-all duration-300 hover:scale-[1.02] ${colorClass}`}
                                        >
                                            <div className="flex justify-between items-start mb-1 font-mono text-[9px] text-muted-foreground font-bold">
                                                <span>{tech.id}</span>
                                                {tech.count > 0 && <span className="rounded-full px-1.5 py-0.5 bg-black/30 font-bold">{tech.count}</span>}
                                            </div>
                                            <div className="truncate text-foreground font-bold">{tech.name}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {selectedTech && (
                <Card className="border-border/80 bg-card p-5 max-w-3xl animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="font-mono text-xs font-bold text-primary">{selectedTech.id}</span>
                            <h4 className="text-base font-black mt-1 text-foreground">{selectedTech.name}</h4>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedTech(null)}>
                            <X className="size-4" />
                        </Button>
                    </div>
                    <Separator className="my-4" />
                    <div className="space-y-3 text-xs">
                        <p className="font-semibold text-muted-foreground leading-5">
                            Attacker techniques mapped under this ID represent tactics observed in active security endpoints. 
                            Active detections: <span className="font-bold text-foreground">{selectedTech.count} events</span>.
                        </p>
                        <div className="p-3 bg-muted/30 rounded-xl space-y-2">
                            <span className="font-bold block text-foreground">Recommended Containment Rules:</span>
                            <ul className="list-disc pl-5 space-y-1 text-muted-foreground font-semibold">
                                <li>Enable EDR host protection policies.</li>
                                <li>Run automated IOC scan sweeps across endpoints.</li>
                                <li>Check Active Directory logs for credential access indicators.</li>
                            </ul>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}

// 8. IDS Intrusion Alerts
function IdsAlertsView() {
    const mockIdsAlerts = [
        { id: 'I-01', time: '2026-05-20 14:38:12', signature: 'ET SCAN Potential SSH Scan Bruteforce', severity: 'High', srcIp: '185.220.101.4', destIp: '192.168.1.15', port: 22, protocol: 'TCP' },
        { id: 'I-02', time: '2026-05-20 14:35:05', signature: 'ET MALWARE Trojan Downloader payload check', severity: 'Critical', srcIp: '91.240.118.5', destIp: '192.168.1.42', port: 443, protocol: 'TCP' },
        { id: 'I-03', time: '2026-05-20 14:29:44', signature: 'ET EXPLOIT Log4j RCE CVE-2021-44228 JNDI', severity: 'Critical', srcIp: '198.51.100.72', destIp: '192.168.10.8', port: 8080, protocol: 'TCP' },
        { id: 'I-04', time: '2026-05-20 14:22:11', signature: 'ET WEB_SPECIFIC SQL Injection UNION SELECT attempt', severity: 'High', srcIp: '203.0.113.88', destIp: '192.168.10.9', port: 80, protocol: 'TCP' },
        { id: 'I-05', time: '2026-05-20 14:15:30', signature: 'ET DOS HTTP GET Flooding attempt blocked', severity: 'Medium', srcIp: '192.168.1.155', destIp: '10.0.0.4', port: 80, protocol: 'TCP' }
    ];

    const [alertsList, setAlertsList] = useState(mockIdsAlerts);
    const [activeAlert, setActiveAlert] = useState(mockIdsAlerts[0]);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const deleteAlert = (id) => {
        setAlertsList(prev => {
            const nextList = prev.filter(a => a.id !== id);
            if (activeAlert?.id === id) {
                setActiveAlert(nextList[0] || null);
            }
            return nextList;
        });
        setCurrentPage(1);
    };

    const filteredAlerts = alertsList.filter(a => 
        a.signature.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.srcIp.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.destIp.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage);
    const paginatedAlerts = filteredAlerts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
            <Card className="border-border/80 bg-card overflow-hidden flex flex-col justify-between">
                <div>
                    <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between p-4 border-b border-border/40">
                        <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">IDS Intrusion Queue</span>
                        <div className="relative w-full md:w-48">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-3.5" />
                            <input
                                type="text"
                                placeholder="Search IDS..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full h-8 bg-muted/40 border border-border/80 rounded-lg pl-8 pr-2.5 text-xs outline-none focus:border-primary/50 text-foreground"
                            />
                        </div>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Time</TableHead>
                                <TableHead>IDS Signature</TableHead>
                                <TableHead>Source IP</TableHead>
                                <TableHead>Dest IP</TableHead>
                                <TableHead>Severity</TableHead>
                                <TableHead className="text-right w-16">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedAlerts.length > 0 ? (
                                paginatedAlerts.map(alert => (
                                    <TableRow key={alert.id} className="cursor-pointer hover:bg-muted/10 animate-in fade-in duration-150" onClick={() => setActiveAlert(alert)}>
                                        <TableCell className="font-mono text-[10px] text-muted-foreground whitespace-nowrap">{alert.time}</TableCell>
                                        <TableCell className="font-bold text-xs text-foreground truncate max-w-[200px]">{alert.signature}</TableCell>
                                        <TableCell className="font-mono text-xs font-semibold text-muted-foreground">{alert.srcIp}</TableCell>
                                        <TableCell className="font-mono text-xs font-semibold text-muted-foreground">{alert.destIp}</TableCell>
                                        <TableCell><Badge variant={severityVariant(alert.severity)}>{alert.severity}</Badge></TableCell>
                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <ActionsDropdown items={[
                                                { label: 'Inspect Payload', icon: Eye, onClick: () => setActiveAlert(alert) },
                                                { label: 'Block Source IP', icon: Lock, onClick: () => alert(`Blocked IP address: ${alert.srcIp}`) },
                                                { label: 'Dismiss Alert', icon: Trash, danger: true, onClick: () => deleteAlert(alert.id) }
                                            ]} />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10 text-xs text-muted-foreground">
                                        No IDS alerts found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <TablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={(newSize) => {
                        setItemsPerPage(newSize);
                        setCurrentPage(1);
                    }}
                />
            </Card>

            {/* Packet Payload Hex View */}
            <Card className="border-border/80 bg-card p-5 space-y-4">
                {activeAlert ? (
                    <div className="space-y-4">
                        <div>
                            <Badge variant={severityVariant(activeAlert.severity)} className="uppercase">{activeAlert.severity} Intrusion Alert</Badge>
                            <h4 className="font-bold text-sm text-foreground mt-3">{activeAlert.signature}</h4>
                            <p className="text-[11px] font-semibold text-muted-foreground mt-1">
                                Packet metadata: {activeAlert.protocol} • {activeAlert.srcIp}:{activeAlert.port} &rarr; {activeAlert.destIp}
                            </p>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Raw Payload Hex Dump</span>
                            <pre className="font-mono text-[10px] bg-black/60 p-3 rounded-lg overflow-x-auto text-muted-foreground leading-5">
{`0000  00 0c 29 3e 5b 6a 00 50  56 c0 00 08 08 00 45 00  ..)>[j.PV.....E.
0010  00 3c 1a 2d 40 00 40 06  3a 11 c0 a8 01 02 c0 a8  .<.-@.@.:.......
0020  01 03 01 bb 00 50 00 00  00 01 00 00 00 01 a0 12  .....P..........
0030  16 80 d8 a3 00 00 02 04  05 b4 04 02 08 0a 00 00  ................
0040  47 45 54 20 2f 20 48 54  54 50 2f 31 2e 31 0d 0a  GET / HTTP/1.1..
0050  55 73 65 72 2d 41 67 65  6e 74 3a 20 4e 6d 61 70  User-Agent: Nmap`}
                            </pre>
                        </div>
                        <div className="flex gap-2">
                            <Button className="flex-1 h-9 rounded-lg text-xs uppercase font-bold" variant="outline" onClick={() => alert("Block policy configured!")}>
                                Add Block Rule
                            </Button>
                            <Button className="flex-1 h-9 rounded-lg text-xs uppercase font-bold" variant="info" onClick={() => alert("Escalated to Case!")}>
                                Escalate to CMT
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-center text-muted-foreground py-12">
                        Select an intrusion alert to inspect.
                    </div>
                )}
            </Card>
        </div>
    );
}

// 9. Blocked Threats View
function BlockedView() {
    const [blockedList, setBlockedList] = useState([
        { ip: '185.220.101.4', reason: 'Repetitive Bruteforce', scope: 'IP Scope', date: '2026-05-20 14:12:11' },
        { ip: '91.240.118.5', reason: 'Malware Host C2', scope: 'IP Scope', date: '2026-05-20 13:44:02' },
        { ip: '198.51.100.72', reason: 'Log4j Exploit Exploit Attempt', scope: 'CIDR Range', date: '2026-05-19 09:12:55' }
    ]);

    const [newIp, setNewIp] = useState('');
    const [newReason, setNewReason] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const addBlock = (e) => {
        e.preventDefault();
        if (!newIp.trim()) return;

        const block = {
            ip: newIp,
            reason: newReason || 'Manual Admin block',
            scope: 'IP Scope',
            date: new Date().toISOString().replace('T', ' ').slice(0, 19)
        };

        setBlockedList(prev => [block, ...prev]);
        setNewIp('');
        setNewReason('');
        setCurrentPage(1);
    };

    const removeBlock = (ip) => {
        setBlockedList(prev => prev.filter(item => item.ip !== ip));
        setCurrentPage(1);
    };

    const filteredBlocked = blockedList.filter(item => 
        item.ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.scope.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.ceil(filteredBlocked.length / itemsPerPage);
    const paginatedBlocked = filteredBlocked.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="grid gap-6 xl:grid-cols-[1fr_1.3fr]">
            {/* Add Block Form */}
            <Card className="border-border/80 bg-card p-5 space-y-6">
                <div>
                    <CardTitle className="text-base font-bold tracking-tight">Add Firewall Block Policy</CardTitle>
                    <CardDescription className="text-xs font-semibold mt-1">Instantly distribute firewall policies to block threat vectors.</CardDescription>
                </div>
                <form onSubmit={addBlock} className="space-y-4">
                    <label className="flex flex-col gap-2">
                        <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Target IP Address / CIDR Range</span>
                        <input
                            type="text"
                            placeholder="e.g. 192.168.1.1"
                            value={newIp}
                            onChange={(e) => setNewIp(e.target.value)}
                            className="h-11 bg-muted/40 border border-border/80 rounded-xl px-3 text-sm text-foreground outline-none focus:border-primary/50"
                        />
                    </label>
                    <label className="flex flex-col gap-2">
                        <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Block Reason / Ticket Reference</span>
                        <input
                            type="text"
                            placeholder="e.g. Host brute force attempts"
                            value={newReason}
                            onChange={(e) => setNewReason(e.target.value)}
                            className="h-11 bg-muted/40 border border-border/80 rounded-xl px-3 text-sm text-foreground outline-none focus:border-primary/50"
                        />
                    </label>
                    <Button type="submit" variant="info" className="w-full h-11 rounded-xl uppercase font-bold text-xs">Deploy Block Rule</Button>
                </form>
            </Card>

            {/* Block list Queue */}
            <Card className="border-border/80 bg-card p-5 space-y-4">
                <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
                    <div>
                        <CardTitle className="text-base font-bold tracking-tight">Active IPS Blocklist Queue</CardTitle>
                        <CardDescription className="text-xs font-semibold mt-1">Enforced firewall block scopes on routing gateways</CardDescription>
                    </div>
                    <div className="relative w-full md:w-48">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-3.5" />
                        <input
                            type="text"
                            placeholder="Search blocklist..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full h-8 bg-muted/40 border border-border/80 rounded-lg pl-8 pr-2.5 text-xs outline-none focus:border-primary/50 text-foreground"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto rounded-xl border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Target Address</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Blocked Date</TableHead>
                                <TableHead className="text-right w-16">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedBlocked.length > 0 ? (
                                paginatedBlocked.map(item => (
                                    <TableRow key={item.ip}>
                                        <TableCell className="font-mono text-xs font-bold text-foreground">{item.ip}</TableCell>
                                        <TableCell className="font-semibold text-xs text-muted-foreground">{item.reason}</TableCell>
                                        <TableCell className="text-xs"><Badge variant="outline">{item.scope}</Badge></TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">{item.date}</TableCell>
                                        <TableCell className="text-right">
                                            <ActionsDropdown items={[
                                                { label: 'Unblock IP / Remove Policy', icon: Trash, danger: true, onClick: () => removeBlock(item.ip) },
                                                { label: 'Verify Firewall State', icon: CheckSquare, onClick: () => alert(`Firewall rule verified for ${item.ip} on all interfaces!`) },
                                                { label: 'Query Threat Intelligence', icon: Shield, onClick: () => alert(`Querying IP ${item.ip} on VirusTotal...`) }
                                            ]} />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                                        No blocked addresses found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <TablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={(newSize) => {
                        setItemsPerPage(newSize);
                        setCurrentPage(1);
                    }}
                />
            </Card>
        </div>
    );
}

// 10. Geo Attack Map
function MapsView() {
    const attackingCountries = [
        { name: 'China (AS4134)', count: 342, pct: 85, color: '#ef4444' },
        { name: 'Russia (AS12389)', count: 218, pct: 60, color: '#f97316' },
        { name: 'United States (AS15169)', count: 180, pct: 45, color: '#3b82f6' },
        { name: 'Netherlands (AS16265)', count: 95, pct: 25, color: '#a855f7' }
    ];

    return (
        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            {/* Visual Animated SVG Radar Radar Sweep Map */}
            <Card className="border-border/80 bg-card p-6 flex flex-col justify-between overflow-hidden relative min-h-[400px]">
                <div>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Globe className="size-4 text-primary animate-spin" />
                        Live Security Threat Geolocation Radar
                    </CardTitle>
                    <CardDescription className="text-xs font-semibold mt-1">Real-time visualization of network attack origins mapped to SOC gateways</CardDescription>
                </div>

                {/* Radar Grid Animation */}
                <div className="flex items-center justify-center my-6 relative h-64">
                    <svg className="w-full h-full max-w-[340px]" viewBox="0 0 200 200">
                        {/* Grid lines */}
                        <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(59,130,246,0.15)" strokeWidth="1" />
                        <circle cx="100" cy="100" r="60" fill="none" stroke="rgba(59,130,246,0.15)" strokeWidth="1" />
                        <circle cx="100" cy="100" r="40" fill="none" stroke="rgba(59,130,246,0.15)" strokeWidth="1" />
                        <circle cx="100" cy="100" r="20" fill="none" stroke="rgba(59,130,246,0.15)" strokeWidth="1" />
                        <line x1="20" y1="100" x2="180" y2="100" stroke="rgba(59,130,246,0.12)" strokeWidth="1" />
                        <line x1="100" y1="20" x2="100" y2="180" stroke="rgba(59,130,246,0.12)" strokeWidth="1" />

                        {/* Radar sweep */}
                        <path d="M100,100 L180,100 A80,80 0 0,0 156,43 Z" fill="url(#radarGrad)" opacity="0.3" className="animate-spin-slow origin-center" />

                        {/* Targets dots */}
                        <circle cx="100" cy="100" r="3" fill="#3b82f6" className="animate-ping" />
                        <circle cx="100" cy="100" r="2" fill="#3b82f6" />

                        {/* Inbound threats lines and dots */}
                        <g>
                            <circle cx="50" cy="70" r="2.5" fill="#ef4444" className="animate-pulse" />
                            <path d="M 50 70 Q 75 80 100 100" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3,3" />
                            
                            <circle cx="160" cy="80" r="2.5" fill="#f97316" className="animate-pulse" />
                            <path d="M 160 80 Q 130 90 100 100" fill="none" stroke="#f97316" strokeWidth="1.5" strokeDasharray="3,3" />

                            <circle cx="70" cy="150" r="2.5" fill="#ef4444" className="animate-pulse" />
                            <path d="M 70 150 Q 85 125 100 100" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3,3" />
                        </g>

                        <defs>
                            <linearGradient id="radarGrad" x1="1" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#3b82f6" />
                                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                    </svg>
                    
                    {/* Live radar status indicator */}
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 rounded-full px-2.5 py-1 text-[9px] font-bold text-primary uppercase tracking-wider border">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        Sweep active
                    </div>
                </div>

                <div className="text-center text-xs text-muted-foreground font-semibold">
                    Simulating inbound packet traffic mapping routes to Gateway-Atlanta (US-East)
                </div>
            </Card>

            {/* Country Logs and metrics */}
            <Card className="border-border/80 bg-card p-5 space-y-6">
                <div>
                    <CardTitle className="text-base font-bold tracking-tight">Top Threat Source Origins</CardTitle>
                    <CardDescription className="text-xs font-semibold mt-1">Most frequent autonomous networks originating threat alerts</CardDescription>
                </div>

                <div className="space-y-4">
                    {attackingCountries.map(country => (
                        <div key={country.name} className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs font-semibold">
                                <span className="text-foreground">{country.name}</span>
                                <span className="text-muted-foreground font-bold font-mono">{country.count} hits</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${country.pct}%`, backgroundColor: country.color }} />
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}

// 11. Compliance View (PCI / GDPR)
function ComplianceView({ framework }) {
    const pciChecks = [
        { code: '1.2.1', title: 'Firewall router configuration standards validation', status: 'Passed', date: '2026-05-20' },
        { code: '2.2.4', title: 'Disable unnecessary services and daemon agents', status: 'Passed', date: '2026-05-19' },
        { code: '3.4.1', title: 'Encrypt PAN cardholder storage hashes at rest', status: 'Failed', date: '2026-05-18' },
        { code: '6.4.3', title: 'Authorize production software package changes', status: 'In Progress', date: '2026-05-20' },
        { code: '10.2.2', title: 'Preserve audit logs integrity validation on read attempts', status: 'Passed', date: '2026-05-20' }
    ];

    const gdprChecks = [
        { code: 'Art. 32(1a)', title: 'Pseudonymisation and encryption of user personal data', status: 'Failed', date: '2026-05-18' },
        { code: 'Art. 32(1b)', title: 'Ensure ongoing confidentiality and network integrity', status: 'Passed', date: '2026-05-20' },
        { code: 'Art. 32(1c)', title: 'Restore availability and access in timely fashion', status: 'Passed', date: '2026-05-19' },
        { code: 'Art. 32(1d)', title: 'Process for regularly testing security effectiveness', status: 'Passed', date: '2026-05-20' }
    ];

    const checks = framework === 'pci' ? pciChecks : gdprChecks;
    const score = framework === 'pci' ? 81 : 78;

    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const filteredChecks = checks.filter(check => 
        check.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        check.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        check.status.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.ceil(filteredChecks.length / itemsPerPage);
    const paginatedChecks = filteredChecks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
            {/* Compliance progress gauge */}
            <Card className="border-border/80 bg-card p-5 flex flex-col justify-between items-center text-center space-y-4">
                <div className="w-full">
                    <CardTitle className="text-sm font-semibold">{framework === 'pci' ? 'PCI-DSS v4.0' : 'GDPR Article 32'}</CardTitle>
                    <CardDescription className="text-xs font-semibold mt-1">Regulatory validation audit score</CardDescription>
                </div>

                {/* Score gauge ring */}
                <div className="relative size-36 flex items-center justify-center">
                    <svg className="size-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" stroke="rgba(148,163,184,0.1)" strokeWidth="8" fill="none" />
                        <circle
                            cx="50"
                            cy="50"
                            r="42"
                            stroke="#3b82f6"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={263.89}
                            strokeDashoffset={263.89 - (263.89 * score) / 100}
                            strokeLinecap="round"
                            className="transition-all duration-1000"
                        />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                        <span className="text-3xl font-black text-foreground">{score}%</span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Passing</span>
                    </div>
                </div>

                <div className="w-full">
                    <Button className="w-full h-10 rounded-xl text-xs uppercase font-bold gap-1.5" variant="info" onClick={() => alert("Audit evidence file compiled!")}>
                        <Download size={14} />
                        Export Evidence Pack
                    </Button>
                </div>
            </Card>

            {/* Technical controls checklists */}
            <Card className="border-border/80 bg-card p-5 space-y-4">
                <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
                    <div>
                        <CardTitle className="text-base font-bold tracking-tight">Regulatory Control Audit Checklist</CardTitle>
                        <CardDescription className="text-xs font-semibold mt-1">Technical measures status evaluated from logs index analysis</CardDescription>
                    </div>
                    <div className="relative w-full md:w-48">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-3.5" />
                        <input
                            type="text"
                            placeholder="Search controls..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full h-8 bg-muted/40 border border-border/80 rounded-lg pl-8 pr-2.5 text-xs outline-none focus:border-primary/50 text-foreground"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto rounded-xl border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Control Code</TableHead>
                                <TableHead>Compliance Check description</TableHead>
                                <TableHead>Audit Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right w-16">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedChecks.length > 0 ? (
                                paginatedChecks.map(check => (
                                    <TableRow key={check.code}>
                                        <TableCell className="font-mono text-xs font-bold text-foreground">{check.code}</TableCell>
                                        <TableCell className="font-bold text-xs text-muted-foreground leading-5 max-w-[300px] truncate">{check.title}</TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground font-semibold whitespace-nowrap">{check.date}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    check.status === 'Passed'
                                                        ? 'success'
                                                        : check.status === 'Failed'
                                                            ? 'destructive'
                                                            : 'warning'
                                                }
                                            >
                                                {check.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <ActionsDropdown items={[
                                                { label: 'Verify Technical Evidence', icon: ShieldCheck, onClick: () => alert(`Verifying logs for control ${check.code}...`) },
                                                { label: 'Re-run Posture Scan', icon: Play, onClick: () => alert(`Triggering active check script for control ${check.code}`) },
                                                { label: 'View JSON Schema', icon: FileCode, onClick: () => alert(`Control Code: ${check.code}\nFramework: ${framework.toUpperCase()}\nStatus: ${check.status}`) }
                                            ]} />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                                        No controls found matching query.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <TablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={(newSize) => {
                        setItemsPerPage(newSize);
                        setCurrentPage(1);
                    }}
                />
            </Card>
        </div>
    );
}

/* =========================================================================
   MAIN EXPORT COMPONENT
   ========================================================================= */

export function UnifiedReactDashboard({ activeView = 'home', timeRange = '24h', operator = 'admin', onOpenModule, onManualResponse, onSocOperations }) {
    const isHomeView = activeView === 'home';
    const [liveData, setLiveData] = useState(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            const [agentRes, casesRes, slaRes] = await Promise.allSettled([
                getAgentDashboardSummary(),
                listCases({ page_size: 200 }),
                listSlaBreachedCases()
            ]);
            if (!cancelled) {
                setLiveData({
                    agentSummary: agentRes.status === 'fulfilled' ? agentRes.value : null,
                    caseCount: casesRes.status === 'fulfilled' ? extractCount(casesRes.value) : null,
                    slaCount: slaRes.status === 'fulfilled' ? extractCount(slaRes.value) : null
                });
            }
        }

        load();
        const interval = setInterval(load, 30000);
        return () => { cancelled = true; clearInterval(interval); };
    }, []);

    const agentSummary = liveData?.agentSummary ? extractAgentSummary(liveData.agentSummary) : null;

    const activeScoreCards = scoreCards.map((card) => {
        if (card.label === 'Open cases' && liveData?.caseCount != null) {
            return { ...card, value: String(liveData.caseCount), delta: `${liveData.caseCount} total active` };
        }
        if (card.label === 'SLA breaches' && liveData?.slaCount != null) {
            return { ...card, value: String(liveData.slaCount), delta: liveData.slaCount === 0 ? 'All within SLA' : 'CMT escalation' };
        }
        if (card.label === 'Data sources' && agentSummary?.total != null) {
            return { ...card, label: 'Endpoint agents', value: String(agentSummary.total), delta: agentSummary.active != null ? `${agentSummary.active} active` : 'Wazuh fleet' };
        }
        return card;
    });

    const activeLanes = operationLanes.map((lane) => {
        if (lane.title === 'Endpoint Agents' && agentSummary) {
            return {
                ...lane,
                metrics: [
                    agentSummary.total != null ? `${agentSummary.total} total agents` : '— total agents',
                    agentSummary.active != null ? `${agentSummary.active} active` : '— active',
                    agentSummary.inactive != null ? `${agentSummary.inactive} stale` : '— stale'
                ]
            };
        }
        return lane;
    });

    /* =========================================================================
       SUBPAGE RENDERING & ROUTING
       ========================================================================= */
    const renderContent = () => {
        // --- 1. CMT Views ---
        if (isCmtView(activeView)) {
            return <CmtDashboard view={normalizeCmtView(activeView)} moduleId="unified" />;
        }

        // --- 2. EDR Views ---
        if (['endpoints', 'active-threats', 'isolation', 'malware', 'process-tree', 'file-integrity', 'hunting'].includes(activeView)) {
            return <EdrDashboard activeView={activeView} timeRange={timeRange} />;
        }

        // --- 3. Automation & Response Views ---
        if (AUTOMATION_VIEWS.has(activeView)) {
            return <SocAutomationPage activeView={activeView} moduleId="unified" operatorId={operator} timeRange={timeRange} />;
        }

        // --- 4. Live SIEM Alerts Stream ---
        if (activeView === 'live-alerts') {
            return <SiemAlerts timeRange={timeRange} />;
        }

        // --- 5. Tenants Management ---
        if (activeView === 'tenants') {
            return <Tenants />;
        }

        // --- 6. Index Management ---
        if (activeView === 'indices') {
            return <IndexOverview />;
        }

        // --- 7. Custom OpenSearch replacement React components ---
        switch (activeView) {
            case 'discover':
                return <DiscoverView />;
            case 'dashboards':
                return <DashboardsView onOpenModule={onOpenModule} />;
            case 'visualize':
                return <VisualizeView />;
            case 'reporting':
                return <ReportingView />;
            case 'alerting':
                return <AlertingView />;
            case 'siem-events':
                return <SiemEventsView />;
            case 'mitre':
                return <MitreView />;
            case 'ids-alerts':
                return <IdsAlertsView />;
            case 'blocked':
                return <BlockedView />;
            case 'maps':
                return <MapsView />;
            case 'pci':
                return <ComplianceView framework="pci" />;
            case 'gdpr':
                return <ComplianceView framework="gdpr" />;
            default:
                // Fallback page
                return (
                    <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-3xl bg-card">
                        <AlertTriangle className="size-8 text-warning mx-auto mb-3" />
                        <h3 className="font-bold text-foreground mb-1">Native View Not Found</h3>
                        <p className="text-xs font-semibold">The requested page "/unified-react/{activeView}" is currently missing a custom component mapping.</p>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-full bg-bg-body p-4 md:p-6 text-foreground">
            <div className="mx-auto flex max-w-[1540px] flex-col gap-6">
                {/* Immersive Top Bar Header */}
                <section className="rounded-3xl border bg-card p-5 md:p-7 backdrop-blur-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between relative z-10">
                        <div className="max-w-4xl">
                            <div className="mb-4 flex flex-wrap items-center gap-2">
                                <Badge variant="info" className="gap-2 rounded-full px-3 py-1 font-bold text-[10px] uppercase">
                                    <Globe2 className="size-3.5" />
                                    React Unified SOC Console
                                </Badge>
                                <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] uppercase font-bold text-emerald-500 border-emerald-500/20 bg-emerald-500/10">
                                    No OpenSearch iframe
                                </Badge>
                                <Badge variant="muted" className="rounded-full px-3 py-1 text-[10px] uppercase font-bold">
                                    Time Range: {timeRange}
                                </Badge>
                                {!isHomeView && (
                                    <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] uppercase font-bold border-primary/20 text-primary">
                                        View: {nativeLabel(activeView)}
                                    </Badge>
                                )}
                            </div>
                            <h1 className="text-3xl font-black tracking-tight text-foreground md:text-5xl">
                                {isHomeView ? 'Unified Security Operations Center' : nativeLabel(activeView)}
                            </h1>
                            <p className="mt-3 max-w-3xl text-sm md:text-base font-semibold leading-7 text-muted-foreground">
                                {isHomeView
                                    ? 'A premium native React + shadcn Command & Control center consolidating SIEM alerts, EDR activity, network threat vectors, automated playbooks, and regulatory frameworks.'
                                    : `Investigate and manage ${nativeLabel(activeView)} operations directly inside the React secure routing wrapper.`}
                            </p>
                        </div>

                        <div className="flex flex-col justify-center rounded-2xl border bg-muted/20 p-4 sm:min-w-80">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Operator</p>
                                    <p className="font-black text-foreground text-sm">{operator || 'admin'}</p>
                                </div>
                                <Badge variant="success">Active Connection</Badge>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Main page content injection */}
                {!isHomeView ? (
                    <div className="animate-in fade-in duration-300">
                        {renderContent()}
                    </div>
                ) : (
                    // RENDER NATIVE DASHBOARD HOME
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <Alert className="rounded-2xl border-info/30 bg-info/10">
                            <Shield className="size-4" />
                            <AlertTitle className="font-bold">Pure React Command Suite</AlertTitle>
                            <AlertDescription className="text-xs font-semibold leading-5 text-muted-foreground">
                                This dashboard aggregates live CMT cases, EDR endpoint check-ins, and SIEM live stream pipelines natively without embedding slow, heavy OpenSearch iframes.
                            </AlertDescription>
                        </Alert>

                        {/* Metrics Cards */}
                        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                            {activeScoreCards.map((item) => (
                                <ScoreCard key={item.label} item={item} />
                            ))}
                        </section>

                        {/* Operation Lanes */}
                        <section className="grid gap-4 xl:grid-cols-3">
                            {activeLanes.map((lane) => (
                                <OperationLane key={lane.title} lane={lane} onOpenModule={onOpenModule} />
                            ))}
                        </section>

                        {/* Bottom stats and lists */}
                        <section className="grid gap-6 2xl:grid-cols-[1.45fr_0.95fr]">
                            {/* Incident Queue Card */}
                            <Card className="border-border/80 bg-card">
                                <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <CardTitle className="text-2xl font-black tracking-tight">Active Incident Queue</CardTitle>
                                        <CardDescription className="text-xs font-semibold">
                                            High-priority security tickets aggregated across active CMT and SIEM telemetry.
                                        </CardDescription>
                                    </div>
                                    <Button type="button" variant="outline" className="h-9 text-xs rounded-xl" onClick={() => onOpenModule?.('unified', 'cmt-cases')}>
                                        Open Cases
                                        <ArrowRight className="size-4 ml-1" />
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Incident</TableHead>
                                                    <TableHead>Severity</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Owner</TableHead>
                                                    <TableHead>Source</TableHead>
                                                    <TableHead className="text-right">ETA</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {incidentRows.map((incident) => (
                                                    <TableRow key={incident.id}>
                                                        <TableCell>
                                                            <div className="font-mono text-[10px] font-bold text-muted-foreground">{incident.id}</div>
                                                            <div className="mt-1 font-bold text-xs text-foreground max-w-sm truncate">{incident.title}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={severityVariant(incident.severity)}>
                                                                {incident.severity}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="font-bold text-xs text-muted-foreground">{incident.status}</TableCell>
                                                        <TableCell className="font-bold text-xs text-muted-foreground">{incident.owner}</TableCell>
                                                        <TableCell className="text-xs font-semibold text-muted-foreground">{incident.source}</TableCell>
                                                        <TableCell className="text-right font-mono text-xs font-bold">{incident.eta}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Readiness metrics */}
                            <Card className="border-border/80 bg-card">
                                <CardHeader>
                                    <CardTitle className="text-2xl font-black tracking-tight">Coverage & Response Readiness</CardTitle>
                                    <CardDescription className="text-xs font-semibold">
                                        System-evaluated telemetry health and coverage scores.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {coverageRows.map((item) => (
                                        <CoverageMeter key={item.name} item={item} />
                                    ))}
                                </CardContent>
                            </Card>
                        </section>

                        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                            {/* Workflow steps */}
                            <Card className="border-border/80 bg-card">
                                <CardHeader>
                                    <CardTitle className="text-2xl font-black tracking-tight">SOC Playbook Pipeline</CardTitle>
                                    <CardDescription className="text-xs font-semibold">
                                        End-to-end incident management path.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {workflowSteps.map((step, index) => {
                                        const Icon = step.icon;
                                        return (
                                            <div key={step.label} className="flex gap-4">
                                                <div className="flex flex-col items-center">
                                                    <div className="flex size-10 items-center justify-center rounded-xl border bg-muted text-foreground">
                                                        <Icon className="size-4" />
                                                    </div>
                                                    {index < workflowSteps.length - 1 && <div className="my-2 h-8 w-px bg-border" />}
                                                </div>
                                                <div className="pb-2">
                                                    <p className="font-black text-foreground text-sm">{step.label}</p>
                                                    <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">{step.description}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>

                            {/* Services Status Card */}
                            <Card className="border-border/80 bg-card">
                                <CardHeader>
                                    <CardTitle className="text-2xl font-black tracking-tight">Connected Fabric Services</CardTitle>
                                    <CardDescription className="text-xs font-semibold">
                                        Active endpoints and communication states.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-3 sm:grid-cols-2">
                                    {[
                                        ['CMT backend', 'Cases, alerts, notes, reports', 'success', TicketCheck, 'unified', 'cmt-overview'],
                                        ['Response services', 'Playbooks, approvals, rollback', 'warning', GitBranch, 'unified', 'response-dashboard'],
                                        ['Endpoint telemetry', 'Processes, files, network, persistence', 'success', Server, 'unified', 'endpoints'],
                                        ['Network protection', 'IDS alerts and blocked threats', 'info', Network, 'unified', 'blocked'],
                                        ['Audit storage', 'Compliance trails and evidence', 'success', Database, 'unified', 'audit-trail'],
                                        ['Cloud telemetry', 'AWS, Azure, Docker posture', 'warning', Cloud, 'unified', 'pci']
                                    ].map(([name, description, tone, Icon, moduleId, viewId]) => (
                                        <button
                                            type="button"
                                            key={name}
                                            onClick={() => onOpenModule?.(moduleId, viewId)}
                                            className="rounded-xl border bg-muted/10 p-4 text-left transition-all duration-300 hover:border-primary/45 hover:bg-muted/20"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className={`flex size-10 items-center justify-center rounded-lg border ${toneClasses(tone)}`}>
                                                    <Icon className="size-4" />
                                                </div>
                                                <Badge variant={tone === 'muted' ? 'outline' : tone} className="text-[9px] uppercase font-bold">{tone}</Badge>
                                            </div>
                                            <p className="mt-4 font-black text-foreground text-sm">{name}</p>
                                            <p className="mt-1 text-xs font-semibold text-muted-foreground leading-4">{description}</p>
                                        </button>
                                    ))}
                                </CardContent>
                            </Card>
                        </section>
                    </div>
                )}

                <Separator />

                <div className="flex flex-col gap-3 pb-4 text-xs font-semibold text-muted-foreground md:flex-row md:items-center md:justify-between">
                    <p>React unified dashboard. No iframe, no OpenSearch Dashboards management redirect, no saved-object guard.</p>
                    <div className="flex items-center gap-2">
                        <RefreshCw className="size-4" />
                        Designed for live API wiring and shadcn component expansion.
                    </div>
                </div>
            </div>
        </div>
    );
}
