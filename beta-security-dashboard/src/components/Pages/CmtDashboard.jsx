import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import {
    Activity,
    AlertTriangle,
    Archive,
    Bell,
    CheckCircle,
    Clock3,
    Download,
    FileText,
    Globe,
    Link2,
    Loader2,
    Lock,
    MessageSquare,
    MoreVertical,
    Paperclip,
    Plus,
    Radio,
    RefreshCw,
    Search,
    ShieldAlert,
    ShieldCheck,
    TicketCheck,
    Upload,
    UserCog,
    Users,
    Webhook,
    X,
    Zap
} from 'lucide-react';
import {
    CMT_API_BASE,
    CMT_AUTO_CONNECT,
    CMT_ENABLE_SSE,
    addAlertComment,
    addAlertLabel,
    addAlertIoc,
    addAlertAsset,
    assignCaseOwner,
    bulkLinkCaseAlerts,
    createAlertEventSource,
    createCaseNote,
    createManualCase,
    createReportTemplate,
    deleteCase,
    deleteAlertAsset,
    deleteAlertIoc,
    deleteAlertLabel,
    deleteReportTemplate,
    downloadCaseEvidence,
    downloadCaseReport,
    ensureCmtSession,
    generateCaseReport,
    getCase,
    getCmtHealth,
    listCaseAudit,
    listCaseEvidence,
    listCaseNotes,
    listCaseReports,
    listCaseWebhooks,
    listCases,
    listFilteredAlerts,
    listReportTemplates,
    listSlaBreachedCases,
    listUsers,
    linkCaseAlert,
    notifyCase,
    previewReportTemplate,
    promoteAlertToCase,
    setAlertAnomaly,
    setCaseArchived,
    setCaseEscalated,
    unlinkCaseAlert,
    updateCaseWebhook,
    updateCaseStatus,
    updateReportTemplate,
    updateUserCustomers,
    uploadCaseEvidence
} from '../../api/cmt';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

const CASE_TABS = ['overview', 'linked-alerts', 'notes', 'evidence', 'audit', 'reports'];

const demoUser = {
    id: 'demo-admin',
    user_id: 'demo-admin',
    username: 'demo.admin',
    email: 'demo.admin@soc.local',
    role: 'admin',
    customers: ['acme', 'beta-bank', 'core-infra']
};

const demoCases = [
    {
        id: 'case-2026-001',
        title: 'Privileged brute force from external VPN address',
        description: 'Repeated failed privileged login attempts from an external source against VPN gateway and jump host.',
        severity: 'critical',
        status: 'open',
        owner: 'unassigned',
        owner_id: 'unassigned',
        customer_code: 'acme',
        alert_id: 'wazuh-alert-92831',
        created_at: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
        sla_due_at: new Date(Date.now() + 38 * 60 * 1000).toISOString(),
        escalated: true,
        archived: false,
        linked_alerts: ['wazuh-alert-92831', 'wazuh-alert-92833']
    },
    {
        id: 'case-2026-002',
        title: 'Malware signature match on workstation',
        description: 'YARA/FIM alert on workstation-04 with suspicious binary written to user profile path.',
        severity: 'high',
        status: 'in-progress',
        owner: 'analyst-12',
        owner_id: 'analyst-12',
        customer_code: 'beta-bank',
        alert_id: 'wazuh-alert-92844',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 34 * 60 * 1000).toISOString(),
        sla_due_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        escalated: false,
        archived: false,
        linked_alerts: ['wazuh-alert-92844']
    },
    {
        id: 'case-2026-003',
        title: 'Uncontained lateral movement investigation exceeded SLA',
        description: 'Suspicious remote execution pattern across internal servers requires escalation and evidence preservation.',
        severity: 'critical',
        status: 'in-progress',
        owner: 'tier2-07',
        owner_id: 'tier2-07',
        customer_code: 'core-infra',
        alert_id: 'wazuh-alert-91990',
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 23 * 60 * 1000).toISOString(),
        sla_due_at: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
        escalated: true,
        archived: false,
        sla_breached: true,
        linked_alerts: ['wazuh-alert-91990', 'wazuh-alert-91996']
    }
];

const demoAlerts = [
    {
        id: 'demo-alert-001',
        source_alert_id: 'wazuh-alert-92831',
        timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
        severity: 'critical',
        rule: '5712',
        rule_description: 'Privileged brute force detected',
        description: 'Multiple failed root/admin logins from 203.0.113.10.',
        source: 'wazuh',
        parser: 'syslog-auth',
        agent: 'vpn-gateway-01',
        agent_name: 'vpn-gateway-01',
        labels: ['bruteforce', 'vpn'],
        iocs: ['203.0.113.10'],
        assets: ['vpn-gateway-01', 'jump-host-02'],
        anomaly: true,
        is_anomaly: true
    },
    {
        id: 'demo-alert-002',
        source_alert_id: 'wazuh-alert-92844',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        severity: 'high',
        rule: '100101',
        rule_description: 'Malware signature match on workstation',
        description: 'YARA match on suspicious executable under user profile.',
        source: 'wazuh',
        parser: 'fim-yara',
        agent: 'workstation-04',
        agent_name: 'workstation-04',
        labels: ['malware', 'fim'],
        iocs: ['sha256:demo-malware-hash'],
        assets: ['workstation-04'],
        anomaly: false,
        is_anomaly: false
    },
    {
        id: 'demo-alert-003',
        source_alert_id: 'wazuh-alert-91990',
        timestamp: new Date(Date.now() - 48 * 60 * 1000).toISOString(),
        severity: 'critical',
        rule: '80730',
        rule_description: 'Suspicious remote execution chain',
        description: 'Potential lateral movement using remote shell execution and credential reuse.',
        source: 'wazuh',
        parser: 'process-monitor',
        agent: 'server-12',
        agent_name: 'server-12',
        labels: ['lateral-movement'],
        iocs: ['nahom', '192.168.231.130'],
        assets: ['server-12', 'server-16'],
        anomaly: true,
        is_anomaly: true
    }
];

const demoNotes = [
    {
        note_id: 'note-1',
        author: 'demo.admin',
        body: 'Initial triage completed. Evidence collection should be prioritized before containment.',
        created_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 18 * 60 * 1000).toISOString()
    }
];

const demoEvidence = [
    {
        evidence_id: 'evidence-001',
        filename: 'vpn-gateway-authlog.tar.gz',
        content_type: 'application/gzip',
        size: 1847291,
        uploaded_by: 'demo.admin',
        created_at: new Date(Date.now() - 14 * 60 * 1000).toISOString()
    }
];

const demoAudit = [
    { event_id: 'audit-001', actor: 'demo.admin', action: 'case.created', created_at: new Date(Date.now() - 42 * 60 * 1000).toISOString() },
    { event_id: 'audit-002', actor: 'analyst-12', action: 'status.updated', created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString() }
];

const demoTemplates = [
    { template_id: 'executive-summary', id: 'executive-summary', name: 'Executive Incident Summary', format: 'pdf', renderer: 'react_pdf', updated_at: new Date().toISOString() },
    { template_id: 'evidence-pack', id: 'evidence-pack', name: 'Analyst Evidence Pack', format: 'docx', renderer: 'docx', updated_at: new Date().toISOString() }
];

const demoReports = [
    { report_id: 'report-001', template_id: 'executive-summary', format: 'pdf', created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), download_url: '#' }
];

const demoUsers = [
    { id: 'demo-admin', username: 'demo.admin', email: 'demo.admin@soc.local', role: 'admin', customers: ['acme', 'beta-bank', 'core-infra'] },
    { id: 'analyst-12', username: 'analyst.12', email: 'analyst.12@soc.local', role: 'analyst', customers: ['acme', 'beta-bank'] },
    { id: 'viewer-04', username: 'viewer.04', email: 'viewer.04@soc.local', role: 'viewer', customers: ['beta-bank'] }
];

const demoWebhooks = [
    { customer_code: 'acme', destination_url: 'https://hooks.acme.example/cases', enabled: true, last_status: '200 OK', updated_at: new Date().toISOString() },
    { customer_code: 'beta-bank', destination_url: 'https://soc.beta-bank.example/webhook', enabled: false, last_status: 'disabled', updated_at: new Date().toISOString() }
];

const CMT_ROUTE_VIEW_MAP = {
    'cmt-overview': 'overview',
    'cmt-alerts': 'alerts',
    'cmt-cases': 'cases',
    'cmt-sla': 'sla',
    'cmt-reports': 'reports',
    'cmt-users': 'users',
    'cmt-webhooks': 'webhooks'
};

const CMT_INTERNAL_VIEWS = new Set(['overview', 'alerts', 'cases', 'sla', 'reports', 'users', 'webhooks']);

function asArray(payload, key) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
}

function itemId(item, fallback = 'item') {
    return item?.id || item?.case_id || item?.source_alert_id || item?.template_id || item?.report_id || item?.evidence_id || item?.event_id || fallback;
}

function caseTitle(item) {
    return item?.title || item?.summary || item?.description || item?.rule_description || 'Untitled case';
}

function caseDescription(item) {
    return item?.description || item?.summary || 'No case description provided.';
}

function alertTitle(item) {
    return item?.title || item?.rule_description || item?.description || 'Untitled alert';
}

function linkedAlertIds(item) {
    const linked = item?.linked_alerts || item?.alerts || [item?.alert_id].filter(Boolean);
    return linked
        .map((alert) => (typeof alert === 'string' ? alert : alert?.source_alert_id || alert?.alert_id || alert?.id))
        .filter(Boolean);
}

function normalizeSeverity(value) {
    return String(value || 'low').toLowerCase();
}

function normalizeStatus(value) {
    return String(value || 'open').toLowerCase().replace('_', '-');
}

function formatDateTime(value) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 'n/a' : parsed.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatBytes(value) {
    const size = Number(value || 0);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isSlaBreached(item) {
    if (item?.sla_breached) return true;
    const due = new Date(item?.sla_due_at || item?.sla_deadline).getTime();
    return Number.isFinite(due) && due < Date.now() && !['closed', 'resolved'].includes(normalizeStatus(item.status));
}

function formatRelativeDeadline(item) {
    const dueValue = item?.sla_due_at || item?.sla_deadline;
    const due = new Date(dueValue).getTime();
    if (!Number.isFinite(due)) return 'No SLA';

    const seconds = Math.round((due - Date.now()) / 1000);
    const abs = Math.abs(seconds);
    const hours = Math.floor(abs / 3600);
    const minutes = Math.floor((abs % 3600) / 60);
    const label = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    return seconds < 0 ? `${label} overdue` : `${label} left`;
}

function severityVariant(severity) {
    const value = normalizeSeverity(severity);
    if (value === 'critical' || value === 'high') return 'destructive';
    if (value === 'medium') return 'warning';
    return 'success';
}

function severityRank(severity) {
    const value = normalizeSeverity(severity);
    if (value === 'critical') return 4;
    if (value === 'high') return 3;
    if (value === 'medium') return 2;
    if (value === 'low') return 1;
    return 0;
}

function statusVariant(status) {
    const value = normalizeStatus(status);
    if (value === 'resolved' || value === 'closed') return 'success';
    if (value === 'in-progress') return 'info';
    return 'secondary';
}

function SeverityBadge({ severity }) {
    return <Badge variant={severityVariant(severity)} className="uppercase tracking-wide">{normalizeSeverity(severity)}</Badge>;
}

function StatusBadge({ status }) {
    return <Badge variant={statusVariant(status)} className="uppercase tracking-wide">{normalizeStatus(status)}</Badge>;
}

function SlaIndicator({ item }) {
    const breached = isSlaBreached(item);
    return (
        <Badge variant={breached ? 'destructive' : 'outline'} className="gap-1.5 uppercase tracking-wide">
            <Clock3 className="size-3" />
            {formatRelativeDeadline(item)}
        </Badge>
    );
}

function EmptyState({ icon: Icon = TicketCheck, title, description }) {
    return (
        <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 p-8 text-center">
            <Icon className="size-10 text-muted-foreground" strokeWidth={1.5} />
            <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
        </div>
    );
}

function MetricCard({ icon: Icon, label, value, detail, tone = 'info' }) {
    const toneClasses = {
        destructive: 'border-destructive/25 bg-destructive/10 text-destructive',
        warning: 'border-warning/25 bg-warning/10 text-warning',
        success: 'border-success/25 bg-success/10 text-success',
        info: 'border-info/25 bg-info/10 text-info',
        primary: 'border-primary/25 bg-primary/10 text-primary'
    };

    return (
        <Card className="overflow-hidden">
            <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
                        <div className="mt-3 text-3xl font-black tracking-tight text-foreground">{value}</div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">{detail}</p>
                    </div>
                    <div className={clsx('rounded-lg border p-2.5', toneClasses[tone])}>
                        <Icon className="size-5" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function Toolbar({ search, setSearch, status, setStatus, severity, setSeverity }) {
    return (
        <div className="grid gap-3 rounded-xl border bg-card p-4 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
            <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by case, alert, asset, customer, owner, IOC..."
                    className="pl-9"
                />
            </div>
            <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in-progress">In progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                    </SelectGroup>
                </SelectContent>
            </Select>
            <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        <SelectItem value="all">All severities</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                    </SelectGroup>
                </SelectContent>
            </Select>
        </div>
    );
}

function CaseTable({ rows, selectedCaseId, busyCaseId, onOpen, onStatusChange, onEscalate, onArchive }) {
    if (!rows.length) {
        return <EmptyState title="No cases match the current filters" description="Adjust the filters or create a manual case from the quick action panel." />;
    }

    return (
        <Card className="min-w-0 overflow-hidden">
            <Table className="min-w-[900px]">
                <TableHeader>
                    <TableRow>
                        <TableHead>Case</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>SLA</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((item) => {
                        const id = itemId(item);
                        const isSelected = selectedCaseId === id;
                        return (
                            <TableRow key={id} data-state={isSelected ? 'selected' : undefined}>
                                <TableCell className="min-w-[320px]">
                                    <button type="button" onClick={() => onOpen(id)} className="text-left">
                                        <div className="font-mono text-[11px] text-muted-foreground">{id}</div>
                                        <div className="mt-1 font-semibold text-foreground">{caseTitle(item)}</div>
                                        <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">{caseDescription(item)}</div>
                                    </button>
                                </TableCell>
                                <TableCell><SeverityBadge severity={item.severity} /></TableCell>
                                <TableCell><StatusBadge status={item.status} /></TableCell>
                                <TableCell className="max-w-[160px] truncate">{item.owner || item.owner_id || 'unassigned'}</TableCell>
                                <TableCell className="max-w-[140px] truncate">{item.customer_code || 'n/a'}</TableCell>
                                <TableCell><SlaIndicator item={item} /></TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap justify-end gap-2">
                                        <Button type="button" size="sm" variant="outline" disabled={busyCaseId === id} onClick={() => onOpen(id)}>
                                            Open
                                        </Button>
                                        <Button type="button" size="sm" variant="infoOutline" disabled={busyCaseId === id} onClick={() => onStatusChange(id, 'in-progress')}>
                                            Triage
                                        </Button>
                                        <Button type="button" size="sm" variant="warningOutline" disabled={busyCaseId === id} onClick={() => onEscalate(id, !item.escalated)}>
                                            {item.escalated ? 'De-escalate' : 'Escalate'}
                                        </Button>
                                        <Button type="button" size="sm" variant="cancel" disabled={busyCaseId === id} onClick={() => onArchive(id, true)}>
                                            Archive
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </Card>
    );
}

function RemovableChip({ children, onRemove }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-0.5 text-xs font-semibold">
            <span>{children}</span>
            {onRemove && (
                <button
                    type="button"
                    onClick={onRemove}
                    className="rounded-sm text-muted-foreground hover:text-destructive focus:outline-none focus:ring-1 focus:ring-ring"
                    title="Remove"
                >
                    <X className="size-3" />
                </button>
            )}
        </span>
    );
}

function alertSortValue(item, sortBy) {
    if (sortBy === 'severity') return severityRank(item.severity);
    if (sortBy === 'agent') return String(item.agent || item.agent_name || '').toLowerCase();
    if (sortBy === 'title') return alertTitle(item).toLowerCase();
    return new Date(item.timestamp || item.received_at || 0).getTime() || 0;
}

function RowActionMenu({ item, onPromote, onToggleAnomaly, onOpenAction }) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;

        const handlePointerDown = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, [open]);

    const run = (callback) => {
        callback();
        setOpen(false);
    };

    return (
        <div ref={menuRef} className="relative flex justify-end">
            <Button type="button" size="icon" variant="ghost" title="Alert actions" onClick={() => setOpen((value) => !value)}>
                <MoreVertical className="size-4" />
            </Button>
            {open && (
                <div className="absolute right-0 top-11 z-40 w-56 overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground">
                    <button type="button" className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-muted" onClick={() => run(() => onPromote(item))}>
                        Promote to case
                    </button>
                    <button type="button" className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-muted" onClick={() => run(() => onToggleAnomaly(item))}>
                        Toggle anomaly
                    </button>
                    <div className="my-1 h-px bg-border" />
                    <button type="button" className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-muted" onClick={() => run(() => onOpenAction('label', item))}>
                        Add label
                    </button>
                    <button type="button" className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-muted" onClick={() => run(() => onOpenAction('ioc', item))}>
                        Add IOC
                    </button>
                    <button type="button" className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-muted" onClick={() => run(() => onOpenAction('asset', item))}>
                        Add asset
                    </button>
                    <button type="button" className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-muted" onClick={() => run(() => onOpenAction('comment', item))}>
                        Add comment
                    </button>
                </div>
            )}
        </div>
    );
}

function AlertTable({
    rows,
    onPromote,
    onToggleAnomaly,
    onBulkSetAnomaly,
    onOpenAction,
    onRemoveLabel,
    onRemoveIoc,
    onRemoveAsset
}) {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState('10');
    const [sortBy, setSortBy] = useState('timestamp');
    const [sortDirection, setSortDirection] = useState('desc');
    const [selectedIds, setSelectedIds] = useState([]);
    const numericPageSize = Number(pageSize);
    const sortedRows = useMemo(() => {
        return [...rows].sort((first, second) => {
            const firstValue = alertSortValue(first, sortBy);
            const secondValue = alertSortValue(second, sortBy);
            let result = 0;

            if (typeof firstValue === 'number' && typeof secondValue === 'number') {
                result = firstValue - secondValue;
            } else {
                result = String(firstValue).localeCompare(String(secondValue));
            }

            return sortDirection === 'asc' ? result : -result;
        });
    }, [rows, sortBy, sortDirection]);
    const totalPages = Math.max(1, Math.ceil(sortedRows.length / numericPageSize));
    const safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * numericPageSize;
    const visibleRows = sortedRows.slice(startIndex, startIndex + numericPageSize);
    const selectedRows = sortedRows.filter((item) => selectedIds.includes(item.source_alert_id || item.id));
    const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((item) => selectedIds.includes(item.source_alert_id || item.id));

    useEffect(() => {
        setPage(1);
    }, [rows.length, pageSize, sortBy, sortDirection]);

    useEffect(() => {
        const validIds = new Set(rows.map((item) => item.source_alert_id || item.id));
        setSelectedIds((current) => current.filter((id) => validIds.has(id)));
    }, [rows]);

    const toggleSelected = (id) => {
        setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
    };

    const toggleVisibleSelected = () => {
        const visibleIds = visibleRows.map((item) => item.source_alert_id || item.id);
        setSelectedIds((current) => {
            if (allVisibleSelected) {
                return current.filter((id) => !visibleIds.includes(id));
            }

            return [...new Set([...current, ...visibleIds])];
        });
    };

    const runBulkAction = (callback) => {
        callback(selectedRows);
        setSelectedIds([]);
    };

    if (!rows.length) {
        return <EmptyState icon={Bell} title="No alerts match the current filters" description="Live alert streaming can be enabled once the CMT backend is reachable." />;
    }

    return (
        <Card className="min-w-0 overflow-hidden">
            <CardHeader className="border-b bg-muted/20">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <CardTitle>Alert Queue</CardTitle>
                        <CardDescription>
                            Showing {startIndex + 1}-{Math.min(startIndex + numericPageSize, sortedRows.length)} of {sortedRows.length} Wazuh alerts.
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem value="timestamp">Sort by time</SelectItem>
                                    <SelectItem value="severity">Sort by severity</SelectItem>
                                    <SelectItem value="agent">Sort by agent</SelectItem>
                                    <SelectItem value="title">Sort by title</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <Button type="button" variant="outline" size="sm" onClick={() => setSortDirection((value) => value === 'asc' ? 'desc' : 'asc')}>
                            {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                        </Button>
                        <Select value={pageSize} onValueChange={setPageSize}>
                            <SelectTrigger className="w-32">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem value="10">10 / page</SelectItem>
                                    <SelectItem value="20">20 / page</SelectItem>
                                    <SelectItem value="50">50 / page</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <Button type="button" variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                            Previous
                        </Button>
                        <Badge variant="outline">Page {safePage} / {totalPages}</Badge>
                        <Button type="button" variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
                            Next
                        </Button>
                    </div>
                </div>
                {selectedRows.length > 0 && (
                    <div className="mt-4 flex flex-col gap-3 rounded-xl border bg-background p-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-sm font-semibold text-foreground">{selectedRows.length} alert{selectedRows.length === 1 ? '' : 's'} selected</p>
                            <p className="text-xs text-muted-foreground">Bulk actions apply to every selected alert.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button type="button" size="sm" variant="info" onClick={() => runBulkAction(onPromote)}>
                                Promote
                            </Button>
                            <Button type="button" size="sm" variant="warningOutline" onClick={() => runBulkAction((items) => onBulkSetAnomaly(items, true))}>
                                Mark anomaly
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => onOpenAction('label', selectedRows)}>
                                Add Label
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => onOpenAction('ioc', selectedRows)}>
                                Add IOC
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => onOpenAction('asset', selectedRows)}>
                                Add Asset
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => onOpenAction('comment', selectedRows)}>
                                Add Comment
                            </Button>
                            <Button type="button" size="sm" variant="cancel" onClick={() => setSelectedIds([])}>
                                Clear
                            </Button>
                        </div>
                    </div>
                )}
            </CardHeader>
            <CardContent className="p-0">
                <div className="hidden border-b bg-muted/10 px-4 py-3 xl:grid xl:grid-cols-[44px_minmax(520px,1fr)_170px_minmax(260px,0.55fr)_96px_56px] xl:items-center">
                    <div>
                        <input
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={toggleVisibleSelected}
                            aria-label="Select visible alerts"
                            className="size-4 rounded border-input accent-primary"
                        />
                    </div>
                    <button type="button" className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground" onClick={() => setSortBy('title')}>
                        Alert
                    </button>
                    <button type="button" className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground" onClick={() => setSortBy('agent')}>
                        Agent
                    </button>
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Indicators</span>
                    <button type="button" className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground" onClick={() => setSortBy('severity')}>
                        Status
                    </button>
                    <span className="text-right text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Actions</span>
                </div>
                <div className="divide-y">
                    {visibleRows.map((item) => {
                        const id = item.source_alert_id || item.id;
                        const labels = item.labels || [];
                        const iocs = item.iocs || [];
                        const assets = item.assets || [];
                        const isSelected = selectedIds.includes(id);
                        return (
                            <div key={id} className={clsx(
                                'grid gap-3 p-4 transition-colors hover:bg-muted/30 xl:grid-cols-[44px_minmax(520px,1fr)_170px_minmax(260px,0.55fr)_96px_56px] xl:items-center',
                                isSelected && 'bg-primary/5'
                            )}>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleSelected(id)}
                                        aria-label={`Select alert ${id}`}
                                        className="size-4 rounded border-input accent-primary"
                                    />
                                </div>

                                <div className="flex min-w-0 items-start">
                                    <div className="min-w-0">
                                        <div className="font-mono text-[11px] text-muted-foreground">{id}</div>
                                        <div className="mt-1 truncate text-base font-semibold text-foreground">{alertTitle(item)}</div>
                                        <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description || item.rule_description}</div>
                                        <div className="mt-2 text-xs text-muted-foreground">{formatDateTime(item.timestamp || item.received_at)}</div>
                                    </div>
                                </div>

                                <div>
                                    <p className="mt-1 truncate font-semibold text-foreground">{item.agent || item.agent_name || 'unknown'}</p>
                                    <div className="mt-2"><SeverityBadge severity={item.severity} /></div>
                                </div>

                                <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-1">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">IOCs</p>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {iocs.slice(0, 3).map((ioc) => (
                                                <RemovableChip key={ioc} onRemove={() => onRemoveIoc(item, ioc)}>{ioc}</RemovableChip>
                                            ))}
                                            {!iocs.length && <span className="text-xs text-muted-foreground">none</span>}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Assets</p>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {assets.slice(0, 3).map((asset) => (
                                                <RemovableChip key={asset} onRemove={() => onRemoveAsset(item, asset)}>{asset}</RemovableChip>
                                            ))}
                                            {!assets.length && <span className="text-xs text-muted-foreground">none</span>}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Labels</p>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {labels.slice(0, 3).map((label) => (
                                                <RemovableChip key={label} onRemove={() => onRemoveLabel(item, label)}>{label}</RemovableChip>
                                            ))}
                                            {!labels.length && <span className="text-xs text-muted-foreground">none</span>}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <Badge variant={item.anomaly || item.is_anomaly ? 'warning' : 'outline'} className="rounded-full">
                                        {item.anomaly || item.is_anomaly ? 'anomaly' : 'normal'}
                                    </Badge>
                                </div>

                                <RowActionMenu
                                    item={item}
                                    onPromote={onPromote}
                                    onToggleAnomaly={onToggleAnomaly}
                                    onOpenAction={onOpenAction}
                                />
                            </div>
                        );
                    })}
                </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 border-t bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                    Page {safePage} of {totalPages}. {sortedRows.length} filtered alerts.
                </p>
                <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(1)}>
                        First
                    </Button>
                    <Button type="button" variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                        Previous
                    </Button>
                    <Button type="button" variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
                        Next
                    </Button>
                    <Button type="button" variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage(totalPages)}>
                        Last
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}

const ALERT_ACTION_COPY = {
    label: {
        title: 'Add Alert Label',
        description: 'Attach a triage label to this Wazuh alert.',
        label: 'Label',
        placeholder: 'malware, vip-asset, phishing',
        button: 'Add Label'
    },
    ioc: {
        title: 'Add Indicator Of Compromise',
        description: 'Record an IP, domain, hash, process name, or file path found during triage.',
        label: 'IOC value',
        placeholder: '203.0.113.10, bad.example, sha256:...',
        button: 'Add IOC'
    },
    asset: {
        title: 'Add Affected Asset',
        description: 'Attach an endpoint, host, user, workload, or business asset to this alert.',
        label: 'Asset',
        placeholder: 'web-server-01, user@domain, prod-vpn',
        button: 'Add Asset'
    },
    comment: {
        title: 'Add Analyst Comment',
        description: 'Capture analyst context without blocking the browser with a native prompt.',
        label: 'Comment',
        placeholder: 'Write triage notes, assumptions, next step, or escalation reason...',
        button: 'Add Comment'
    }
};

function AlertActionDialog({ action, onOpenChange, onSubmit }) {
    const config = ALERT_ACTION_COPY[action.type] || ALERT_ACTION_COPY.label;
    const [value, setValue] = useState('');
    const [iocType, setIocType] = useState('ip_address');
    const [selectedFile, setSelectedFile] = useState(null);
    const targets = action.alerts?.length ? action.alerts : action.alert ? [action.alert] : [];
    const isBulk = targets.length > 1;

    useEffect(() => {
        if (action.open) {
            setValue('');
            setIocType('ip_address');
            setSelectedFile(null);
        }
    }, [action.open, action.type, action.alert]);

    const alertId = isBulk ? `${targets.length} selected alerts` : action.alert?.source_alert_id || action.alert?.id || 'selected alert';

    return (
        <Dialog open={action.open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader className="border-b p-6 pb-4">
                    <DialogTitle>{config.title}</DialogTitle>
                    <DialogDescription>{config.description}</DialogDescription>
                </DialogHeader>
                <form
                    className="flex flex-col gap-4 p-6 pt-2"
                    onSubmit={(event) => {
                        event.preventDefault();
                        onSubmit({
                            alert: targets[0],
                            alerts: targets,
                            type: action.type,
                            value: action.type === 'ioc' && iocType === 'file_path' ? selectedFile?.name || value.trim() : value.trim(),
                            file: selectedFile,
                            iocType
                        });
                    }}
                >
                    <div className="rounded-lg border bg-muted/20 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Target alert</p>
                        <p className="mt-1 font-mono text-sm text-foreground">{alertId}</p>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                            {isBulk ? 'This change will be applied to every selected alert.' : action.alert ? alertTitle(action.alert) : 'No alert selected'}
                        </p>
                    </div>

                    {action.type === 'ioc' && (
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-foreground">IOC type</label>
                            <Select value={iocType} onValueChange={setIocType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="ip_address">IP address</SelectItem>
                                        <SelectItem value="domain">Domain</SelectItem>
                                        <SelectItem value="file_hash">File hash</SelectItem>
                                        <SelectItem value="process_name">Process name</SelectItem>
                                        <SelectItem value="file_path">File path</SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-foreground">{config.label}</label>
                        {action.type === 'comment' ? (
                            <Textarea value={value} onChange={(event) => setValue(event.target.value)} placeholder={config.placeholder} rows={5} autoFocus />
                        ) : action.type === 'ioc' && iocType === 'file_path' ? (
                            <div className="flex flex-col gap-2">
                                <Input
                                    type="file"
                                    onChange={(event) => {
                                        const file = event.target.files?.[0] || null;
                                        setSelectedFile(file);
                                        setValue(file?.name || '');
                                    }}
                                    autoFocus
                                />
                                <p className="text-xs text-muted-foreground">
                                    The selected filename is stored as the file-path IOC value.
                                </p>
                            </div>
                        ) : (
                            <Input value={value} onChange={(event) => setValue(event.target.value)} placeholder={config.placeholder} autoFocus />
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="cancel" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={action.type === 'ioc' && iocType === 'file_path' ? !selectedFile : !value.trim()}>
                            {config.button}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function ManualCasePanel({ value, onChange, onSubmit, disabled }) {
    return (
        <Card className="min-w-0">
            <CardHeader>
                <CardTitle className="text-base">Create Manual Case</CardTitle>
                <CardDescription>For analyst-originated incidents without an initial Wazuh alert.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={onSubmit} className="flex flex-col gap-3">
                    <Input
                        value={value.title}
                        onChange={(event) => onChange({ ...value, title: event.target.value })}
                        placeholder="Case title"
                        required
                    />
                    <Textarea
                        value={value.description}
                        onChange={(event) => onChange({ ...value, description: event.target.value })}
                        placeholder="Investigation context"
                        rows={3}
                    />
                    <div className="grid gap-3">
                        <Select value={value.severity} onValueChange={(severity) => onChange({ ...value, severity })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem value="critical">Critical</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="low">Low</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <Input
                            value={value.customer_code}
                            onChange={(event) => onChange({ ...value, customer_code: event.target.value })}
                            placeholder="Customer code"
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={disabled}>
                        <Plus className="size-4" />
                        Create Case
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

function CaseTimeline({ audit }) {
    const rows = audit.length ? audit : demoAudit;
    return (
        <div className="flex flex-col gap-3">
            {rows.map((event) => (
                <div key={itemId(event)} className="flex gap-3 rounded-lg border bg-muted/20 p-3">
                    <div className="mt-1 size-2 rounded-full bg-primary" />
                    <div>
                        <div className="text-sm font-semibold text-foreground">{event.action || event.event_type || 'case.event'}</div>
                        <div className="text-xs text-muted-foreground">{event.actor || event.operator_id || 'system'} - {formatDateTime(event.created_at || event.timestamp)}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function CaseWorkspace({
    activeTab,
    audit,
    caseItem,
    evidence,
    notes,
    reports,
    setActiveTab,
    templates,
    onAssignOwner,
    onClose,
    onCreateNote,
    onDownloadEvidence,
    onDownloadReport,
    onGenerateReport,
    onLinkAlert,
    onNotify,
    onStatusChange,
    onUnlinkAlert,
    onUploadEvidence
}) {
    const [owner, setOwner] = useState(caseItem?.owner || caseItem?.owner_id || '');
    const [noteBody, setNoteBody] = useState('');
    const [evidenceFile, setEvidenceFile] = useState(null);
    const [linkAlertId, setLinkAlertId] = useState('');
    const [templateId, setTemplateId] = useState(templates[0]?.template_id || templates[0]?.id || '');

    useEffect(() => {
        setOwner(caseItem?.owner || caseItem?.owner_id || '');
        setTemplateId(templates[0]?.template_id || templates[0]?.id || '');
    }, [caseItem, templates]);

    if (!caseItem) return null;

    const caseId = itemId(caseItem);
    const linkedAlerts = linkedAlertIds(caseItem);

    return (
        <Card className="min-w-0 overflow-hidden border-primary/30">
            <CardHeader className="border-b bg-muted/20">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="font-mono">{caseId}</Badge>
                            <SeverityBadge severity={caseItem.severity} />
                            <StatusBadge status={caseItem.status} />
                            <SlaIndicator item={caseItem} />
                            {caseItem.escalated && <Badge variant="warning">escalated</Badge>}
                        </div>
                        <CardTitle className="mt-4 text-2xl">{caseTitle(caseItem)}</CardTitle>
                        <CardDescription className="mt-2 max-w-4xl">{caseDescription(caseItem)}</CardDescription>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={onClose} title="Close workspace">
                        <X className="size-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="grid min-h-[520px] min-w-0 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="min-w-0 border-r">
                        <div className="flex flex-wrap gap-2 border-b bg-background p-3">
                            {CASE_TABS.map((tab) => (
                                <Button
                                    key={tab}
                                    type="button"
                                    variant={activeTab === tab ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setActiveTab(tab)}
                                    className="capitalize"
                                >
                                    {tab.replace('-', ' ')}
                                </Button>
                            ))}
                        </div>
                        <div className="p-5">
                            {activeTab === 'overview' && (
                                <div className="grid gap-4 md:grid-cols-2">
                                    <MetricCard icon={Bell} label="Linked Alerts" value={linkedAlerts.length} detail="Wazuh alerts attached" tone="info" />
                                    <MetricCard icon={Paperclip} label="Evidence" value={evidence.length} detail="Files attached" tone="primary" />
                                    <MetricCard icon={MessageSquare} label="Notes" value={notes.length} detail="Analyst notes" tone="success" />
                                    <MetricCard icon={Activity} label="Audit Events" value={audit.length} detail="Tracked changes" tone="warning" />
                                </div>
                            )}

                            {activeTab === 'linked-alerts' && (
                                <div className="flex flex-col gap-3">
                                    <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 md:grid-cols-[1fr_auto]">
                                        <Input
                                            value={linkAlertId}
                                            onChange={(event) => setLinkAlertId(event.target.value)}
                                            placeholder="Wazuh source_alert_id to link"
                                        />
                                        <Button
                                            type="button"
                                            disabled={!linkAlertId.trim()}
                                            onClick={() => {
                                                onLinkAlert(caseId, linkAlertId.trim());
                                                setLinkAlertId('');
                                            }}
                                        >
                                            <Link2 className="size-4" />
                                            Link Alert
                                        </Button>
                                    </div>
                                    {linkedAlerts.map((alertId) => (
                                        <div key={alertId} className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
                                            <div>
                                                <div className="font-mono text-sm font-semibold">{alertId}</div>
                                                <div className="text-xs text-muted-foreground">Linked Wazuh alert source ID</div>
                                            </div>
                                            <Button type="button" size="sm" variant="cancel" onClick={() => onUnlinkAlert(caseId, alertId)}>Unlink</Button>
                                        </div>
                                    ))}
                                    {!linkedAlerts.length && <EmptyState icon={Link2} title="No linked alerts" description="Use bulk link from the alert triage queue when the backend is available." />}
                                </div>
                            )}

                            {activeTab === 'notes' && (
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-3">
                                        <Textarea value={noteBody} onChange={(event) => setNoteBody(event.target.value)} placeholder="Add investigation note..." />
                                        <Button type="button" disabled={!noteBody.trim()} onClick={() => {
                                            onCreateNote(caseId, noteBody);
                                            setNoteBody('');
                                        }}>
                                            <MessageSquare className="size-4" />
                                            Add Note
                                        </Button>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        {notes.map((note) => (
                                            <div key={itemId(note)} className="rounded-lg border bg-card p-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="text-sm font-semibold">{note.author || note.created_by || 'analyst'}</div>
                                                    <div className="text-xs text-muted-foreground">{formatDateTime(note.created_at)}</div>
                                                </div>
                                                <p className="mt-2 text-sm text-muted-foreground">{note.body}</p>
                                            </div>
                                        ))}
                                        {!notes.length && <EmptyState icon={MessageSquare} title="No notes yet" description="Add the first analyst note for this case." />}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'evidence' && (
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4">
                                        <Input type="file" onChange={(event) => setEvidenceFile(event.target.files?.[0] || null)} />
                                        <Button type="button" disabled={!evidenceFile} onClick={() => {
                                            onUploadEvidence(caseId, evidenceFile);
                                            setEvidenceFile(null);
                                        }}>
                                            <Upload className="size-4" />
                                            Upload Evidence
                                        </Button>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        {evidence.map((item) => (
                                            <div key={itemId(item)} className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4">
                                                <div>
                                                    <div className="font-semibold">{item.filename || item.name}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {item.content_type || 'file'} - {formatBytes(item.size)} - {formatDateTime(item.created_at)}
                                                    </div>
                                                </div>
                                                <Button type="button" size="sm" variant="outline" onClick={() => onDownloadEvidence(caseId, item)}>
                                                    <Download className="size-4" />
                                                    Download
                                                </Button>
                                            </div>
                                        ))}
                                        {!evidence.length && <EmptyState icon={Paperclip} title="No evidence uploaded" description="Upload logs, screenshots, PCAPs, or endpoint artifacts." />}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'audit' && <CaseTimeline audit={audit} />}

                            {activeTab === 'reports' && (
                                <div className="flex flex-col gap-4">
                                    <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 md:grid-cols-[1fr_auto]">
                                        <Select value={templateId} onValueChange={setTemplateId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select report template" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    {templates.map((template) => (
                                                        <SelectItem key={template.template_id || template.id} value={template.template_id || template.id}>
                                                            {template.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                        <Button type="button" disabled={!templateId} onClick={() => onGenerateReport(caseId, templateId)}>
                                            <FileText className="size-4" />
                                            Generate
                                        </Button>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        {reports.map((report) => (
                                            <div key={itemId(report)} className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4">
                                                <div>
                                                    <div className="font-semibold">{report.template_id || report.name || 'Case report'}</div>
                                                    <div className="text-xs text-muted-foreground">{report.format || 'pdf'} - {formatDateTime(report.created_at)}</div>
                                                </div>
                                                <Button type="button" size="sm" variant="outline" onClick={() => onDownloadReport(caseId, report)}>
                                                    <Download className="size-4" />
                                                    Download
                                                </Button>
                                            </div>
                                        ))}
                                        {!reports.length && <EmptyState icon={FileText} title="No reports generated" description="Generate PDF or DOCX case reports from templates." />}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col gap-4 bg-muted/20 p-5">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Metadata</p>
                            <div className="mt-3 grid gap-3 text-sm">
                                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Owner</span><span className="font-semibold">{caseItem.owner || caseItem.owner_id || 'unassigned'}</span></div>
                                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Customer</span><span className="font-semibold">{caseItem.customer_code || 'n/a'}</span></div>
                                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Created</span><span className="font-semibold">{formatDateTime(caseItem.created_at)}</span></div>
                                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Updated</span><span className="font-semibold">{formatDateTime(caseItem.updated_at)}</span></div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Input value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="Assign owner" />
                            <Button type="button" variant="outline" onClick={() => onAssignOwner(caseId, owner)} disabled={!owner.trim()}>
                                <UserCog className="size-4" />
                                Assign Owner
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Button type="button" variant="infoOutline" onClick={() => onStatusChange(caseId, 'in-progress')}>Triage</Button>
                            <Button type="button" variant="successOutline" onClick={() => onStatusChange(caseId, 'resolved')}>Resolve</Button>
                            <Button type="button" variant="warningOutline" onClick={() => onNotify(caseId)}>Notify</Button>
                            <Button type="button" variant="cancel" onClick={() => onClose()}>Close</Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function ReportsPage({
    cases,
    templates,
    selectedCaseId,
    setSelectedCaseId,
    onCreateTemplate,
    onDeleteTemplate,
    onGenerateReport,
    onPreviewTemplate
}) {
    const [draft, setDraft] = useState({ template_id: '', name: '', format: 'pdf', renderer: 'default', body: '' });
    const [preview, setPreview] = useState('');

    return (
        <div className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
            <Card className="min-w-0 overflow-hidden">
                <CardHeader>
                    <CardTitle>Report Templates</CardTitle>
                    <CardDescription>Templates used to generate PDF/DOCX incident reports.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table className="min-w-[760px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Template</TableHead>
                                <TableHead>Format</TableHead>
                                <TableHead>Renderer</TableHead>
                                <TableHead>Updated</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {templates.map((template) => (
                                <TableRow key={template.template_id || template.id}>
                                    <TableCell className="font-semibold">{template.name}</TableCell>
                                    <TableCell><Badge variant="outline">{template.format || 'pdf'}</Badge></TableCell>
                                    <TableCell>{template.renderer || 'default'}</TableCell>
                                    <TableCell>{formatDateTime(template.updated_at || template.created_at)}</TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setDraft({
                                                    template_id: template.template_id || template.id || '',
                                                    name: template.name || '',
                                                    format: template.format || 'pdf',
                                                    renderer: template.renderer || 'default',
                                                    body: template.body || ''
                                                })}
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => onDeleteTemplate(template.template_id || template.id)}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Card className="min-w-0">
                <CardHeader>
                    <CardTitle>Generate Case Report</CardTitle>
                    <CardDescription>Select an active case and report template.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                    <Select value={selectedCaseId || ''} onValueChange={setSelectedCaseId}>
                        <SelectTrigger><SelectValue placeholder="Select case" /></SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {cases.map((item) => <SelectItem key={itemId(item)} value={itemId(item)}>{caseTitle(item)}</SelectItem>)}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    {templates.map((template) => (
                        <Button key={template.template_id || template.id} type="button" variant="outline" disabled={!selectedCaseId} onClick={() => onGenerateReport(selectedCaseId, template.template_id || template.id)}>
                            <FileText className="size-4" />
                            Generate {template.name}
                        </Button>
                    ))}
                </CardContent>
            </Card>
            <Card className="xl:col-span-2">
                <CardHeader>
                    <CardTitle>Report Template Editor</CardTitle>
                    <CardDescription>Create, edit, preview, and save report templates used by case workspaces.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form
                        className="grid gap-4 xl:grid-cols-[minmax(160px,260px)_140px_minmax(140px,180px)_minmax(220px,1fr)_auto]"
                        onSubmit={(event) => {
                            event.preventDefault();
                            onCreateTemplate(draft);
                            setDraft({ template_id: '', name: '', format: 'pdf', renderer: 'default', body: '' });
                        }}
                    >
                        <Input value={draft.template_id} onChange={(event) => setDraft({ ...draft, template_id: event.target.value })} placeholder="template_id" />
                        <Select value={draft.format} onValueChange={(format) => setDraft({ ...draft, format })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem value="pdf">PDF</SelectItem>
                                    <SelectItem value="docx">DOCX</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <Input value={draft.renderer} onChange={(event) => setDraft({ ...draft, renderer: event.target.value })} placeholder="renderer" />
                        <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Template name" required />
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={async () => setPreview(await onPreviewTemplate(draft))}>Preview</Button>
                            <Button type="submit">Save</Button>
                        </div>
                        <Textarea
                            className="xl:col-span-5"
                            value={draft.body}
                            onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                            placeholder="Template body or renderer configuration"
                            rows={4}
                        />
                        {preview && (
                            <div className="rounded-lg border bg-muted/20 p-4 text-sm xl:col-span-5">
                                <div className="mb-2 font-semibold">Preview</div>
                                <pre className="whitespace-pre-wrap text-muted-foreground">{preview}</pre>
                            </div>
                        )}
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

function UsersPage({ currentUser, users, onUpdateUserCustomers }) {
    const isAdmin = normalizeStatus(currentUser?.role) === 'admin' || currentUser?.role === 'admin';
    const [customerDrafts, setCustomerDrafts] = useState({});

    useEffect(() => {
        setCustomerDrafts(Object.fromEntries(users.map((user) => [
            user.id || user.user_id || user.username,
            (user.customers || user.customer_codes || []).join(', ')
        ])));
    }, [users]);

    if (!isAdmin) {
        return (
            <Alert variant="warning">
                <Lock className="size-4" />
                <AlertTitle>Admin access required</AlertTitle>
                <AlertDescription>User and customer access management is visible only to CMT administrators.</AlertDescription>
            </Alert>
        );
    }

    return (
        <Card className="min-w-0 overflow-hidden">
            <CardHeader>
                <CardTitle>User Access Matrix</CardTitle>
                <CardDescription>Role-aware access across customer codes.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table className="min-w-[860px]">
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Customers</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id || user.user_id || user.username}>
                                <TableCell className="font-semibold">{user.username}</TableCell>
                                <TableCell><Badge variant={user.role === 'admin' ? 'destructive' : user.role === 'analyst' ? 'info' : 'outline'}>{user.role}</Badge></TableCell>
                                <TableCell>{user.email || 'n/a'}</TableCell>
                                <TableCell>
                                    <Input
                                        value={customerDrafts[user.id || user.user_id || user.username] || ''}
                                        onChange={(event) => setCustomerDrafts({
                                            ...customerDrafts,
                                            [user.id || user.user_id || user.username]: event.target.value
                                        })}
                                        placeholder="customer-a, customer-b"
                                    />
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onUpdateUserCustomers(
                                            user.id || user.user_id || user.username,
                                            (customerDrafts[user.id || user.user_id || user.username] || '')
                                                .split(',')
                                                .map((value) => value.trim())
                                                .filter(Boolean)
                                        )}
                                    >
                                        Update Access
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function WebhooksPage({ currentUser, webhooks, onUpdateWebhook }) {
    const isAdmin = ['admin', 'customer-admin'].includes(currentUser?.role);
    const [drafts, setDrafts] = useState({});

    useEffect(() => {
        setDrafts(Object.fromEntries(webhooks.map((hook) => [
            hook.customer_code,
            {
                destination_url: hook.destination_url || hook.url || '',
                enabled: hook.enabled !== false
            }
        ])));
    }, [webhooks]);

    if (!isAdmin) {
        return (
            <Alert variant="warning">
                <Lock className="size-4" />
                <AlertTitle>Admin access required</AlertTitle>
                <AlertDescription>Webhook destination management is restricted to administrators and customer administrators.</AlertDescription>
            </Alert>
        );
    }

    return (
        <Card className="min-w-0 overflow-hidden">
            <CardHeader>
                <CardTitle>Case Webhooks</CardTitle>
                <CardDescription>Outbound case notification subscriptions by customer.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table className="min-w-[980px]">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Destination URL</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Last Result</TableHead>
                            <TableHead>Updated</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {webhooks.map((hook) => (
                            <TableRow key={hook.customer_code}>
                                <TableCell className="font-semibold">{hook.customer_code}</TableCell>
                                <TableCell>
                                    <Input
                                        value={drafts[hook.customer_code]?.destination_url || ''}
                                        onChange={(event) => setDrafts({
                                            ...drafts,
                                            [hook.customer_code]: {
                                                ...(drafts[hook.customer_code] || {}),
                                                destination_url: event.target.value
                                            }
                                        })}
                                        placeholder="https://..."
                                    />
                                </TableCell>
                                <TableCell>
                                    <Select
                                        value={drafts[hook.customer_code]?.enabled ? 'enabled' : 'disabled'}
                                        onValueChange={(enabled) => setDrafts({
                                            ...drafts,
                                            [hook.customer_code]: {
                                                ...(drafts[hook.customer_code] || {}),
                                                enabled: enabled === 'enabled'
                                            }
                                        })}
                                    >
                                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem value="enabled">Enabled</SelectItem>
                                                <SelectItem value="disabled">Disabled</SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>{hook.last_status || hook.status || 'n/a'}</TableCell>
                                <TableCell>{formatDateTime(hook.updated_at)}</TableCell>
                                <TableCell className="text-right">
                                    <Button type="button" size="sm" variant="outline" onClick={() => onUpdateWebhook(hook.customer_code, drafts[hook.customer_code] || {})}>
                                        Save
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export function CmtDashboard({ view = 'overview', moduleId = 'siem' }) {
    const [liveMode, setLiveMode] = useState(CMT_AUTO_CONNECT);
    const [backendReady, setBackendReady] = useState(false);
    const [loading, setLoading] = useState(CMT_AUTO_CONNECT);
    const [message, setMessage] = useState('');
    const [user, setUser] = useState(CMT_AUTO_CONNECT ? null : demoUser);
    const [cases, setCases] = useState(CMT_AUTO_CONNECT ? [] : demoCases);
    const [slaCases, setSlaCases] = useState(CMT_AUTO_CONNECT ? [] : demoCases.filter(isSlaBreached));
    const [alerts, setAlerts] = useState(CMT_AUTO_CONNECT ? [] : demoAlerts);
    const [templates, setTemplates] = useState(CMT_AUTO_CONNECT ? [] : demoTemplates);
    const [users, setUsers] = useState(CMT_AUTO_CONNECT ? [] : demoUsers);
    const [webhooks, setWebhooks] = useState(CMT_AUTO_CONNECT ? [] : demoWebhooks);
    const [selectedCaseId, setSelectedCaseId] = useState('');
    const [selectedCase, setSelectedCase] = useState(null);
    const [caseNotes, setCaseNotes] = useState(demoNotes);
    const [caseEvidence, setCaseEvidence] = useState(demoEvidence);
    const [caseAudit, setCaseAudit] = useState(demoAudit);
    const [caseReports, setCaseReports] = useState(demoReports);
    const [activeCaseTab, setActiveCaseTab] = useState('overview');
    const [streamStatus, setStreamStatus] = useState(CMT_AUTO_CONNECT ? 'checking' : 'standby');
    const [busyCaseId, setBusyCaseId] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [severityFilter, setSeverityFilter] = useState('all');
    const [manualCase, setManualCase] = useState({ title: '', description: '', severity: 'high', customer_code: '' });
    const [alertAction, setAlertAction] = useState({ open: false, type: 'label', alert: null });

    const load = useCallback(async () => {
        if (!liveMode) {
            setBackendReady(false);
            setLoading(false);
            return;
        }

        setLoading(true);
        setMessage('');
        setBackendReady(false);

        try {
            await getCmtHealth();
            const currentUser = await ensureCmtSession();
            setUser(currentUser || demoUser);
            setBackendReady(true);

            const [caseResult, slaResult, alertResult, templateResult, userResult, webhookResult] = await Promise.allSettled([
                listCases({ archived: false, page: 1, page_size: 50 }),
                listSlaBreachedCases(),
                listFilteredAlerts({ page: 1, page_size: 50, order: 'desc' }),
                listReportTemplates(),
                listUsers(),
                listCaseWebhooks()
            ]);

            if (caseResult.status === 'fulfilled') setCases(asArray(caseResult.value, 'cases'));
            if (slaResult.status === 'fulfilled') setSlaCases(asArray(slaResult.value, 'cases'));
            if (alertResult.status === 'fulfilled') setAlerts(asArray(alertResult.value, 'alerts'));
            if (templateResult.status === 'fulfilled') setTemplates(asArray(templateResult.value, 'templates'));
            if (userResult.status === 'fulfilled') setUsers(asArray(userResult.value, 'users'));
            if (webhookResult.status === 'fulfilled') setWebhooks(asArray(webhookResult.value, 'webhooks'));

            const rejected = [caseResult, slaResult, alertResult, templateResult, userResult, webhookResult].find((item) => item.status === 'rejected');
            if (rejected) setMessage(rejected.reason?.message || 'Some CMT data could not be loaded.');
        } catch (error) {
            setLiveMode(false);
            setBackendReady(false);
            setUser(null);
            setCases([]);
            setSlaCases([]);
            setAlerts([]);
            setTemplates([]);
            setUsers([]);
            setWebhooks([]);
            setStreamStatus('standby');
            setMessage(error.message || 'CMT backend is not reachable. Please check your connection.');
        } finally {
            setLoading(false);
        }
    }, [liveMode]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!liveMode || !backendReady || !CMT_ENABLE_SSE) {
            setStreamStatus(liveMode && backendReady && !CMT_ENABLE_SSE ? 'disabled' : liveMode ? 'checking' : 'standby');
            return undefined;
        }

        const eventSource = createAlertEventSource();
        setStreamStatus('connecting');
        eventSource.onopen = () => setStreamStatus('connected');
        eventSource.addEventListener('alert', (event) => {
            try {
                const incoming = JSON.parse(event.data);
                setAlerts((current) => [incoming, ...current.filter((item) => item.source_alert_id !== incoming.source_alert_id)].slice(0, 100));
            } catch (_error) {
                setMessage('Received an unreadable live alert event.');
            }
        });
        eventSource.onerror = () => {
            eventSource.close();
            setStreamStatus('disconnected');
        };
        return () => eventSource.close();
    }, [backendReady, liveMode]);

    const loadCaseWorkspace = useCallback(async (caseId) => {
        const fallback = cases.find((item) => itemId(item) === caseId) || null;
        setSelectedCaseId(caseId);
        setSelectedCase(fallback);
        setActiveCaseTab('overview');

        if (!liveMode) {
            setCaseNotes(demoNotes);
            setCaseEvidence(demoEvidence);
            setCaseAudit(demoAudit);
            setCaseReports(demoReports);
            return;
        }

        try {
            const [detail, notes, evidence, audit, reports] = await Promise.allSettled([
                getCase(caseId),
                listCaseNotes(caseId),
                listCaseEvidence(caseId),
                listCaseAudit(caseId),
                listCaseReports(caseId)
            ]);

            if (detail.status === 'fulfilled') setSelectedCase(detail.value?.case || detail.value || fallback);
            if (notes.status === 'fulfilled') setCaseNotes(asArray(notes.value, 'notes'));
            if (evidence.status === 'fulfilled') setCaseEvidence(asArray(evidence.value, 'evidence'));
            if (audit.status === 'fulfilled') setCaseAudit(asArray(audit.value, 'events'));
            if (reports.status === 'fulfilled') setCaseReports(asArray(reports.value, 'reports'));
        } catch (error) {
            setMessage(error.message || 'Failed to load case workspace.');
        }
    }, [cases, liveMode]);

    const stats = useMemo(() => {
        const openCases = cases.filter((item) => !['closed', 'resolved'].includes(normalizeStatus(item.status)));
        const bySeverity = cases.reduce((acc, item) => {
            const severity = normalizeSeverity(item.severity);
            acc[severity] = (acc[severity] || 0) + 1;
            return acc;
        }, {});
        const byStatus = cases.reduce((acc, item) => {
            const status = normalizeStatus(item.status);
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        return {
            open: openCases.length,
            alerts: alerts.length,
            breached: slaCases.length,
            escalated: cases.filter((item) => item.escalated).length,
            bySeverity,
            byStatus
        };
    }, [alerts.length, cases, slaCases.length]);

    const filteredCases = useMemo(() => {
        const source = view === 'sla' ? slaCases : cases;
        const needle = search.trim().toLowerCase();

        return source.filter((item) => {
            const matchesSearch = !needle || [
                itemId(item),
                caseTitle(item),
                caseDescription(item),
                item.customer_code,
                item.owner,
                item.owner_id,
                item.alert_id
            ].filter(Boolean).join(' ').toLowerCase().includes(needle);
            const matchesStatus = statusFilter === 'all' || normalizeStatus(item.status) === statusFilter;
            const matchesSeverity = severityFilter === 'all' || normalizeSeverity(item.severity) === severityFilter;
            return matchesSearch && matchesStatus && matchesSeverity;
        });
    }, [cases, search, severityFilter, slaCases, statusFilter, view]);

    const filteredAlerts = useMemo(() => {
        const needle = search.trim().toLowerCase();

        return alerts.filter((item) => {
            const matchesSearch = !needle || [
                item.source_alert_id,
                alertTitle(item),
                item.description,
                item.rule,
                item.agent,
                item.agent_name,
                ...(item.labels || []),
                ...(item.iocs || []),
                ...(item.assets || [])
            ].filter(Boolean).join(' ').toLowerCase().includes(needle);
            const matchesSeverity = severityFilter === 'all' || normalizeSeverity(item.severity) === severityFilter;
            return matchesSearch && matchesSeverity;
        });
    }, [alerts, search, severityFilter]);

    const handleConnectLive = () => {
        setBackendReady(false);
        setLiveMode(true);
    };

    const handleStatusChange = async (caseId, nextStatus) => {
        setBusyCaseId(caseId);
        const previousCases = cases;
        setCases((current) => current.map((item) => itemId(item) === caseId ? { ...item, status: nextStatus, updated_at: new Date().toISOString() } : item));
        setSelectedCase((current) => current && itemId(current) === caseId ? { ...current, status: nextStatus, updated_at: new Date().toISOString() } : current);
        try {
            if (liveMode) await updateCaseStatus(caseId, nextStatus);
            else setMessage(`Demo case moved to ${nextStatus}.`);
        } catch (error) {
            setCases(previousCases);
            setMessage(error.message || 'Status update failed.');
        } finally {
            setBusyCaseId('');
        }
    };

    const handleAssignOwner = async (caseId, owner) => {
        if (!owner.trim()) return;
        setCases((current) => current.map((item) => itemId(item) === caseId ? { ...item, owner, owner_id: owner } : item));
        setSelectedCase((current) => current && itemId(current) === caseId ? { ...current, owner, owner_id: owner } : current);
        try {
            if (liveMode) await assignCaseOwner(caseId, owner);
            else setMessage(`Demo case assigned to ${owner}.`);
        } catch (error) {
            setMessage(error.message || 'Owner assignment failed.');
        }
    };

    const handleEscalate = async (caseId, escalated) => {
        setCases((current) => current.map((item) => itemId(item) === caseId ? { ...item, escalated } : item));
        setSelectedCase((current) => current && itemId(current) === caseId ? { ...current, escalated } : current);
        try {
            if (liveMode) await setCaseEscalated(caseId, escalated);
            else setMessage(escalated ? 'Demo case escalated.' : 'Demo case de-escalated.');
        } catch (error) {
            setMessage(error.message || 'Escalation update failed.');
        }
    };

    const handleArchive = async (caseId, archived) => {
        setCases((current) => current.filter((item) => itemId(item) !== caseId));
        if (selectedCaseId === caseId) setSelectedCaseId('');
        try {
            if (liveMode) await setCaseArchived(caseId, archived);
            else setMessage('Demo case archived.');
        } catch (error) {
            setMessage(error.message || 'Archive failed.');
        }
    };

    const handleDeleteCase = async (caseId) => {
        if (!window.confirm(`Delete case ${caseId}?`)) return;
        setCases((current) => current.filter((item) => itemId(item) !== caseId));
        try {
            if (liveMode) await deleteCase(caseId);
            else setMessage('Demo case deleted.');
        } catch (error) {
            setMessage(error.message || 'Delete failed.');
        }
    };

    const handlePromoteAlert = async (alert) => {
        if (Array.isArray(alert)) {
            const alertList = alert.filter(Boolean);
            if (!alertList.length) return;

            try {
                if (liveMode) {
                    await Promise.all(alertList.map((item) => promoteAlertToCase(item.source_alert_id || item.alert_id || item.id)));
                    await load();
                } else {
                    const promotedCases = alertList.map((item, index) => {
                        const alertId = item.source_alert_id || item.alert_id || item.id;
                        return {
                            id: `case-demo-${Date.now()}-${index}`,
                            title: alertTitle(item),
                            description: item.description || item.rule_description,
                            severity: item.severity,
                            status: 'open',
                            owner: 'unassigned',
                            customer_code: item.customer_code || 'demo',
                            alert_id: alertId,
                            linked_alerts: [alertId],
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            sla_due_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
                        };
                    });
                    setCases((current) => [...promotedCases, ...current]);
                    setMessage(`${promotedCases.length} demo alerts promoted to local cases.`);
                }
            } catch (error) {
                setMessage(error.message || 'Bulk alert promotion failed.');
            }
            return;
        }

        const alertId = alert.source_alert_id || alert.alert_id || alert.id;
        try {
            if (liveMode) {
                await promoteAlertToCase(alertId);
                await load();
            } else {
                const nextCase = {
                    id: `case-demo-${Date.now()}`,
                    title: alertTitle(alert),
                    description: alert.description || alert.rule_description,
                    severity: alert.severity,
                    status: 'open',
                    owner: 'unassigned',
                    customer_code: alert.customer_code || 'demo',
                    alert_id: alertId,
                    linked_alerts: [alertId],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    sla_due_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
                };
                setCases((current) => [nextCase, ...current]);
                setMessage('Demo alert promoted to a local case.');
            }
        } catch (error) {
            setMessage(error.message || 'Alert promotion failed.');
        }
    };

    const handleToggleAnomaly = async (alert) => {
        const alertId = alert.source_alert_id || alert.id;
        const nextValue = !(alert.anomaly || alert.is_anomaly);
        setAlerts((current) => current.map((item) => (item.source_alert_id || item.id) === alertId ? { ...item, anomaly: nextValue, is_anomaly: nextValue } : item));
        try {
            if (liveMode) await setAlertAnomaly(alertId, nextValue);
        } catch (error) {
            setMessage(error.message || 'Anomaly update failed.');
        }
    };

    const handleBulkSetAnomaly = async (alertList, nextValue) => {
        const targets = alertList.filter(Boolean);
        const targetIds = targets.map((item) => item.source_alert_id || item.id);

        setAlerts((current) => current.map((item) => targetIds.includes(item.source_alert_id || item.id) ? {
            ...item,
            anomaly: nextValue,
            is_anomaly: nextValue
        } : item));

        try {
            if (liveMode) {
                await Promise.all(targets.map((item) => setAlertAnomaly(item.source_alert_id || item.id, nextValue)));
            }
        } catch (error) {
            setMessage(error.message || 'Bulk anomaly update failed.');
        }
    };

    const handleOpenAlertAction = (type, alertOrAlerts) => {
        const targets = Array.isArray(alertOrAlerts) ? alertOrAlerts.filter(Boolean) : [alertOrAlerts].filter(Boolean);
        setAlertAction({ open: true, type, alert: targets[0] || null, alerts: targets });
    };

    const handleAddAlertLabel = async (alert, label) => {
        if (!label) return;
        const alertId = alert.source_alert_id || alert.id;
        setAlerts((current) => current.map((item) => (item.source_alert_id || item.id) === alertId ? { ...item, labels: [...new Set([...(item.labels || []), label])] } : item));
        try {
            if (liveMode) await addAlertLabel(alertId, label);
        } catch (error) {
            setMessage(error.message || 'Label update failed.');
        }
    };

    const handleRemoveAlertLabel = async (alert, label) => {
        const alertId = alert.source_alert_id || alert.id;
        setAlerts((current) => current.map((item) => (item.source_alert_id || item.id) === alertId ? {
            ...item,
            labels: (item.labels || []).filter((value) => value !== label)
        } : item));
        try {
            if (liveMode) await deleteAlertLabel(alertId, label);
        } catch (error) {
            setMessage(error.message || 'Label removal failed.');
        }
    };

    const handleAddAlertIoc = async (alert, ioc, iocType = 'ip_address', file = null) => {
        if (!ioc) return;
        const alertId = alert.source_alert_id || alert.id;
        setAlerts((current) => current.map((item) => (item.source_alert_id || item.id) === alertId ? { ...item, iocs: [...new Set([...(item.iocs || []), ioc])] } : item));
        try {
            if (liveMode) await addAlertIoc(alertId, {
                ioc,
                type: iocType,
                filename: file?.name,
                size: file?.size,
                content_type: file?.type
            });
        } catch (error) {
            setMessage(error.message || 'IOC update failed.');
        }
    };

    const handleRemoveAlertIoc = async (alert, ioc) => {
        const alertId = alert.source_alert_id || alert.id;
        setAlerts((current) => current.map((item) => (item.source_alert_id || item.id) === alertId ? {
            ...item,
            iocs: (item.iocs || []).filter((value) => value !== ioc)
        } : item));
        try {
            if (liveMode) await deleteAlertIoc(alertId, { ioc });
        } catch (error) {
            setMessage(error.message || 'IOC removal failed.');
        }
    };

    const handleAddAlertAsset = async (alert, asset) => {
        if (!asset) return;
        const alertId = alert.source_alert_id || alert.id;
        setAlerts((current) => current.map((item) => (item.source_alert_id || item.id) === alertId ? { ...item, assets: [...new Set([...(item.assets || []), asset])] } : item));
        try {
            if (liveMode) await addAlertAsset(alertId, { asset });
        } catch (error) {
            setMessage(error.message || 'Asset update failed.');
        }
    };

    const handleRemoveAlertAsset = async (alert, asset) => {
        const alertId = alert.source_alert_id || alert.id;
        setAlerts((current) => current.map((item) => (item.source_alert_id || item.id) === alertId ? {
            ...item,
            assets: (item.assets || []).filter((value) => value !== asset)
        } : item));
        try {
            if (liveMode) await deleteAlertAsset(alertId, { asset });
        } catch (error) {
            setMessage(error.message || 'Asset removal failed.');
        }
    };

    const handleAddAlertComment = async (alert, body) => {
        if (!body) return;
        try {
            if (liveMode) await addAlertComment(alert.source_alert_id || alert.id, body);
            else setMessage('Demo alert comment added.');
        } catch (error) {
            setMessage(error.message || 'Comment failed.');
        }
    };

    const handleSubmitAlertAction = async ({ alert, alerts: targetAlerts, type, value, iocType, file }) => {
        const targets = targetAlerts?.length ? targetAlerts : alert ? [alert] : [];
        if (!targets.length || !value) return;

        for (const target of targets) {
            if (type === 'label') await handleAddAlertLabel(target, value);
            if (type === 'ioc') await handleAddAlertIoc(target, value, iocType, file);
            if (type === 'asset') await handleAddAlertAsset(target, value);
            if (type === 'comment') await handleAddAlertComment(target, value);
        }

        setAlertAction({ open: false, type: 'label', alert: null, alerts: [] });
    };

    const handleCreateManualCase = async (event) => {
        event.preventDefault();
        const payload = {
            ...manualCase,
            summary: manualCase.title,
            created_at: new Date().toISOString()
        };
        try {
            if (liveMode) {
                await createManualCase(payload);
                await load();
            } else {
                setCases((current) => [{
                    ...payload,
                    id: `case-demo-${Date.now()}`,
                    status: 'open',
                    owner: 'unassigned',
                    updated_at: new Date().toISOString(),
                    sla_due_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
                }, ...current]);
                setMessage('Demo manual case created.');
            }
            setManualCase({ title: '', description: '', severity: 'high', customer_code: '' });
        } catch (error) {
            setMessage(error.message || 'Manual case creation failed.');
        }
    };

    const handleCreateNote = async (caseId, body) => {
        const optimisticNote = {
            note_id: `note-demo-${Date.now()}`,
            author: user?.username || 'analyst',
            body,
            created_at: new Date().toISOString()
        };
        setCaseNotes((current) => [optimisticNote, ...current]);
        try {
            if (liveMode) {
                await createCaseNote(caseId, body);
                await loadCaseWorkspace(caseId);
            }
        } catch (error) {
            setMessage(error.message || 'Note creation failed.');
        }
    };

    const handleUploadEvidence = async (caseId, file) => {
        if (!file) return;
        const optimisticEvidence = {
            evidence_id: `evidence-demo-${Date.now()}`,
            filename: file.name,
            content_type: file.type || 'application/octet-stream',
            size: file.size,
            uploaded_by: user?.username || 'analyst',
            created_at: new Date().toISOString()
        };
        setCaseEvidence((current) => [optimisticEvidence, ...current]);
        try {
            if (liveMode) {
                await uploadCaseEvidence(caseId, file);
                await loadCaseWorkspace(caseId);
            }
        } catch (error) {
            setMessage(error.message || 'Evidence upload failed.');
        }
    };

    const handleDownloadEvidence = async (caseId, evidenceItem) => {
        try {
            if (liveMode) await downloadCaseEvidence(caseId, evidenceItem.evidence_id || evidenceItem.id, evidenceItem.filename);
            else setMessage(`Demo download: ${evidenceItem.filename}`);
        } catch (error) {
            setMessage(error.message || 'Evidence download failed.');
        }
    };

    const handleLinkAlert = async (caseId, sourceAlertId) => {
        const alertIds = sourceAlertId.split(',').map((value) => value.trim()).filter(Boolean);
        if (!alertIds.length) return;

        setSelectedCase((current) => current && itemId(current) === caseId ? {
            ...current,
            linked_alerts: [...new Set([...linkedAlertIds(current), ...alertIds])]
        } : current);

        try {
            if (liveMode) {
                if (alertIds.length > 1) await bulkLinkCaseAlerts(caseId, alertIds);
                else await linkCaseAlert(caseId, alertIds[0]);
                await loadCaseWorkspace(caseId);
            } else {
                setMessage('Demo alert linked to case.');
            }
        } catch (error) {
            setMessage(error.message || 'Alert link failed.');
        }
    };

    const handleUnlinkAlert = async (caseId, sourceAlertId) => {
        setSelectedCase((current) => current && itemId(current) === caseId ? {
            ...current,
            linked_alerts: linkedAlertIds(current).filter((value) => value !== sourceAlertId)
        } : current);

        try {
            if (liveMode) await unlinkCaseAlert(caseId, sourceAlertId);
            else setMessage('Demo alert unlinked from case.');
        } catch (error) {
            setMessage(error.message || 'Alert unlink failed.');
        }
    };

    const handleGenerateReport = async (caseId, templateId) => {
        const optimisticReport = {
            report_id: `report-demo-${Date.now()}`,
            template_id: templateId,
            format: templates.find((item) => (item.template_id || item.id) === templateId)?.format || 'pdf',
            created_at: new Date().toISOString()
        };
        setCaseReports((current) => [optimisticReport, ...current]);
        try {
            if (liveMode) {
                await generateCaseReport(caseId, { template_id: templateId });
                await loadCaseWorkspace(caseId);
            } else {
                setMessage('Demo report generated.');
            }
        } catch (error) {
            setMessage(error.message || 'Report generation failed.');
        }
    };

    const handleSaveTemplate = async (draft) => {
        const templateId = draft.template_id || draft.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const payload = { ...draft, template_id: templateId };
        const exists = templates.some((template) => (template.template_id || template.id) === templateId);

        setTemplates((current) => {
            const nextTemplate = { ...payload, id: templateId, updated_at: new Date().toISOString() };
            return exists
                ? current.map((template) => (template.template_id || template.id) === templateId ? nextTemplate : template)
                : [nextTemplate, ...current];
        });

        try {
            if (liveMode) {
                if (exists) await updateReportTemplate(templateId, payload);
                else await createReportTemplate(payload);
            } else {
                setMessage('Demo report template saved.');
            }
        } catch (error) {
            setMessage(error.message || 'Template save failed.');
        }
    };

    const handlePreviewTemplate = async (draft) => {
        try {
            if (liveMode) {
                const result = await previewReportTemplate(draft);
                return result?.preview || result?.body || JSON.stringify(result, null, 2);
            }
            return `Preview for ${draft.name || 'untitled template'}\n\nCase title, severity, notes, evidence, and analyst actions will render here.`;
        } catch (error) {
            setMessage(error.message || 'Template preview failed.');
            return '';
        }
    };

    const handleDeleteTemplate = async (templateId) => {
        if (!templateId || !window.confirm(`Delete report template ${templateId}?`)) return;
        setTemplates((current) => current.filter((template) => (template.template_id || template.id) !== templateId));
        try {
            if (liveMode) await deleteReportTemplate(templateId);
            else setMessage('Demo report template deleted.');
        } catch (error) {
            setMessage(error.message || 'Template delete failed.');
        }
    };

    const handleUpdateUserCustomers = async (userId, customers) => {
        setUsers((current) => current.map((entry) => (entry.id || entry.user_id || entry.username) === userId ? { ...entry, customers } : entry));
        try {
            if (liveMode) await updateUserCustomers(userId, customers);
            else setMessage('Demo user customer access updated.');
        } catch (error) {
            setMessage(error.message || 'User access update failed.');
        }
    };

    const handleUpdateWebhook = async (customerCode, payload) => {
        setWebhooks((current) => current.map((hook) => hook.customer_code === customerCode ? { ...hook, ...payload, updated_at: new Date().toISOString() } : hook));
        try {
            if (liveMode) await updateCaseWebhook(customerCode, payload);
            else setMessage('Demo webhook settings updated.');
        } catch (error) {
            setMessage(error.message || 'Webhook update failed.');
        }
    };

    const handleDownloadReport = async (caseId, report) => {
        try {
            if (liveMode) await downloadCaseReport(caseId, report.report_id || report.id, `${report.template_id || 'case-report'}.${report.format || 'pdf'}`);
            else setMessage(`Demo report download: ${report.template_id || report.report_id}`);
        } catch (error) {
            setMessage(error.message || 'Report download failed.');
        }
    };

    const handleNotify = async (caseId) => {
        try {
            if (liveMode) await notifyCase(caseId, { channel: 'default' });
            setMessage('Notification requested for this case.');
        } catch (error) {
            setMessage(error.message || 'Notification failed.');
        }
    };

    const pageTitle = {
        overview: 'CMT Operations Dashboard',
        alerts: 'CMT Alert Triage',
        cases: 'CMT Case Queue',
        sla: 'SLA Breach Monitor',
        reports: 'CMT Reports',
        users: 'CMT User Access',
        webhooks: 'CMT Webhooks'
    }[view] || 'CMT Operations Dashboard';

    const pageDescription = {
        overview: 'Review case load, Wazuh alert flow, SLA risk, escalation state, and analyst workload.',
        alerts: 'Search Wazuh alerts, tag IOCs/assets, flag anomalies, and promote alerts into cases.',
        cases: 'Filter active investigations, assign owners, move status, escalate, archive, and open case workspace.',
        sla: 'Prioritize breached and near-breach incidents before response deadlines are missed.',
        reports: 'Manage report templates and generate PDF/DOCX case reports.',
        users: 'Admin-only customer access and role visibility for analysts and viewers.',
        webhooks: 'Admin/customer-admin outbound case notification destinations.'
    }[view] || 'SOC case management for Wazuh SIEM workflows.';

    return (
        <div className="mx-auto flex min-h-full w-full min-w-0 max-w-[1600px] flex-col gap-6">
            <div className="rounded-2xl border bg-card p-5">
            <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                        <TicketCheck className="size-4 text-primary" />
                        CMT - {moduleId === 'unified' ? 'Unified SOC' : 'SIEM Operations'}
                    </div>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">{pageTitle}</h1>
                    <p className="mt-2 max-w-4xl text-sm text-muted-foreground">{pageDescription}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Badge variant={backendReady ? 'success' : 'outline'} className="gap-1.5">
                        <Radio className="size-3" />
                        {liveMode ? `backend ${backendReady ? 'ready' : 'checking'}` : 'demo mode'}
                    </Badge>
                    <Badge variant={streamStatus === 'connected' ? 'success' : 'outline'} className="gap-1.5">
                        <Activity className="size-3" />
                        stream {streamStatus}
                    </Badge>
                    <Badge variant="secondary" className="gap-1.5">
                        <UserCog className="size-3" />
                        {user?.username || 'unknown'} - {user?.role || 'viewer'}
                    </Badge>
                    {!liveMode && (
                        <Button type="button" onClick={() => setLiveMode(true)}>
                            <Globe className="size-4" />
                            Connect Live CMT
                        </Button>
                    )}
                    <Button type="button" variant="outline" size="icon" onClick={load} disabled={loading}>
                        {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                    </Button>
                </div>
            </div>
            </div>

            {message && (
                <Alert variant={message.toLowerCase().includes('failed') || message.toLowerCase().includes('not reachable') ? 'warning' : 'info'}>
                    <Bell className="size-4" />
                    <AlertTitle>CMT status</AlertTitle>
                    <AlertDescription className="flex items-center justify-between gap-4">
                        <span>{message}</span>
                        <button type="button" onClick={() => setMessage('')} className="text-muted-foreground hover:text-foreground">
                            <X className="size-4" />
                        </button>
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid min-w-0 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                <MetricCard icon={TicketCheck} label="Open Cases" value={stats.open} detail="Active investigations" tone="info" />
                <MetricCard icon={Bell} label="New Alerts" value={stats.alerts} detail="Latest Wazuh alerts" tone="primary" />
                <MetricCard icon={AlertTriangle} label="SLA Breached" value={stats.breached} detail="Past response deadline" tone="destructive" />
                <MetricCard icon={Zap} label="Escalated" value={stats.escalated} detail="Management attention" tone="warning" />
            </div>

            {selectedCase && (
                <CaseWorkspace
                    activeTab={activeCaseTab}
                    audit={caseAudit}
                    caseItem={selectedCase}
                    evidence={caseEvidence}
                    notes={caseNotes}
                    reports={caseReports}
                    setActiveTab={setActiveCaseTab}
                    templates={templates}
                    onAssignOwner={handleAssignOwner}
                    onClose={() => {
                        setSelectedCase(null);
                        setSelectedCaseId('');
                    }}
                    onCreateNote={handleCreateNote}
                    onDownloadEvidence={handleDownloadEvidence}
                    onDownloadReport={handleDownloadReport}
                    onGenerateReport={handleGenerateReport}
                    onLinkAlert={handleLinkAlert}
                    onNotify={handleNotify}
                    onStatusChange={handleStatusChange}
                    onUnlinkAlert={handleUnlinkAlert}
                    onUploadEvidence={handleUploadEvidence}
                />
            )}

            <AlertActionDialog
                action={alertAction}
                onOpenChange={(open) => setAlertAction((current) => ({ ...current, open }))}
                onSubmit={handleSubmitAlertAction}
            />

            {['overview', 'cases', 'sla', 'alerts'].includes(view) && (
                <Toolbar
                    search={search}
                    setSearch={setSearch}
                    status={statusFilter}
                    setStatus={setStatusFilter}
                    severity={severityFilter}
                    setSeverity={setSeverityFilter}
                />
            )}

            {view === 'overview' && (
                <div className="grid min-w-0 gap-6 min-[2200px]:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="flex min-w-0 flex-col gap-6">
                        <Card className="min-w-0">
                            <CardHeader>
                                <CardTitle>Case Distribution</CardTitle>
                                <CardDescription>Fast scan of active workload by severity and status.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid min-w-0 gap-4 xl:grid-cols-2">
                                <div className="flex flex-col gap-3">
                                    {['critical', 'high', 'medium', 'low'].map((severity) => (
                                        <div key={severity} className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
                                            <SeverityBadge severity={severity} />
                                            <span className="text-2xl font-black">{stats.bySeverity[severity] || 0}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-col gap-3">
                                    {['open', 'in-progress', 'resolved', 'closed'].map((status) => (
                                        <div key={status} className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
                                            <StatusBadge status={status} />
                                            <span className="text-2xl font-black">{stats.byStatus[status] || 0}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                        <CaseTable
                            rows={filteredCases.slice(0, 8)}
                            selectedCaseId={selectedCaseId}
                            busyCaseId={busyCaseId}
                            onOpen={loadCaseWorkspace}
                            onStatusChange={handleStatusChange}
                            onEscalate={handleEscalate}
                            onArchive={handleArchive}
                        />
                    </div>
                    <div className="flex min-w-0 flex-col gap-6">
                        <ManualCasePanel value={manualCase} onChange={setManualCase} onSubmit={handleCreateManualCase} disabled={loading} />
                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Alert Stream</CardTitle>
                                <CardDescription>Promote high-signal alerts into cases.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3">
                                {alerts.slice(0, 7).map((alert) => (
                                    <div key={alert.source_alert_id || alert.id} className="rounded-lg border bg-muted/20 p-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-semibold">{alertTitle(alert)}</div>
                                                <div className="mt-1 text-xs text-muted-foreground">{alert.agent || alert.agent_name || 'unknown'} - {formatDateTime(alert.timestamp || alert.received_at)}</div>
                                            </div>
                                            <SeverityBadge severity={alert.severity} />
                                        </div>
                                        <Button type="button" variant="outline" size="sm" className="mt-3 w-full" onClick={() => handlePromoteAlert(alert)}>
                                            <Plus className="size-4" />
                                            Promote to Case
                                        </Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {view === 'alerts' && (
                <AlertTable
                    rows={filteredAlerts}
                    onPromote={handlePromoteAlert}
                    onToggleAnomaly={handleToggleAnomaly}
                    onBulkSetAnomaly={handleBulkSetAnomaly}
                    onOpenAction={handleOpenAlertAction}
                    onRemoveLabel={handleRemoveAlertLabel}
                    onRemoveIoc={handleRemoveAlertIoc}
                    onRemoveAsset={handleRemoveAlertAsset}
                />
            )}

            {['cases', 'sla'].includes(view) && (
                <div className="flex flex-col gap-6">
                    {view === 'sla' && (
                        <Alert variant="destructive">
                            <AlertTriangle className="size-4" />
                            <AlertTitle>SLA breach queue</AlertTitle>
                            <AlertDescription>These cases are past response deadline or explicitly marked as breached.</AlertDescription>
                        </Alert>
                    )}
                    <CaseTable
                        rows={filteredCases}
                        selectedCaseId={selectedCaseId}
                        busyCaseId={busyCaseId}
                        onOpen={loadCaseWorkspace}
                        onStatusChange={handleStatusChange}
                        onEscalate={handleEscalate}
                        onArchive={handleArchive}
                    />
                    {user?.role === 'admin' && selectedCaseId && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Admin Case Controls</CardTitle>
                                <CardDescription>Destructive operations remain protected by backend RBAC.</CardDescription>
                            </CardHeader>
                            <CardFooter className="gap-2">
                                <Button type="button" variant="destructive" onClick={() => handleDeleteCase(selectedCaseId)}>
                                    <Archive className="size-4" />
                                    Delete Selected Case
                                </Button>
                            </CardFooter>
                        </Card>
                    )}
                </div>
            )}

            {view === 'reports' && (
                <ReportsPage
                    cases={cases}
                    templates={templates}
                    selectedCaseId={selectedCaseId}
                    setSelectedCaseId={(caseId) => {
                        setSelectedCaseId(caseId);
                        loadCaseWorkspace(caseId);
                    }}
                    onCreateTemplate={handleSaveTemplate}
                    onDeleteTemplate={handleDeleteTemplate}
                    onGenerateReport={handleGenerateReport}
                    onPreviewTemplate={handlePreviewTemplate}
                />
            )}

            {view === 'users' && <UsersPage currentUser={user} users={users} onUpdateUserCustomers={handleUpdateUserCustomers} />}

            {view === 'webhooks' && <WebhooksPage currentUser={user} webhooks={webhooks} onUpdateWebhook={handleUpdateWebhook} />}

            <div className="rounded-xl border bg-card p-4 text-xs text-muted-foreground">
                API base: <span className="font-mono text-foreground">{CMT_API_BASE}</span>. Live mode uses HttpOnly/session-cookie compatible requests plus bearer token exchange when available.
            </div>
        </div>
    );
}

export function isCmtView(viewId) {
    return Object.prototype.hasOwnProperty.call(CMT_ROUTE_VIEW_MAP, viewId);
}

export function normalizeCmtView(viewId) {
    if (Object.prototype.hasOwnProperty.call(CMT_ROUTE_VIEW_MAP, viewId)) {
        return CMT_ROUTE_VIEW_MAP[viewId];
    }

    if (CMT_INTERNAL_VIEWS.has(viewId)) {
        return viewId;
    }

    return 'overview';
}
