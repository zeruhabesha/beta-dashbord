import React from 'react';
import {
    AlertTriangle,
    Bell,
    CheckCircle,
    Download,
    Loader2,
    RefreshCw,
    ShieldAlert,
    X
} from 'lucide-react';
import { ALERT_READ_STATE_EVENT, fetchScopedAlerts, markAlertAsRead } from '../../api/notifications';
import { callSecurityService, downloadSecurityServiceFile } from '../../api/securityServices';
import { submitManualResponseAction } from '../../api/responseActions';
import {
    clearConfiguredAccess,
    getConfiguredApiToken,
    getConfiguredScopes,
    hasRequiredScopes,
    missingRequiredScopes,
    setConfiguredApiToken,
    setConfiguredScopes
} from '../../auth/accessControl';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';

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

const REQUIRED_SCOPE_GROUPS = [
    'playbooks:*',
    'approvals:*',
    'response:*',
    'hunts:*',
    'audit:*',
    'forensics:*',
    'artifacts:validate'
];

const IOC_TYPES = ['ip_address', 'domain', 'file_hash', 'process_name', 'file_path', 'registry_key'];
const RESPONSE_ACTIONS = ['collect_forensics', 'block_ip', 'kill_process', 'quarantine_file', 'isolate_host', 'remove_persistence'];
const RISKY_ACTIONS = new Set(['block_ip', 'kill_process', 'quarantine_file', 'isolate_host', 'remove_persistence']);
const PAGE_TITLES = {
    'response-dashboard': ['SOC Overview Dashboard', 'Automated response system state across playbooks, approvals, response actions, audit, evidence, hunts, and services.'],
    approvals: ['Approval Dashboard', 'Review, approve, reject, and bulk decide pending automated response requests.'],
    'playbook-orchestration': ['Playbook Execution Monitor', 'Inspect and control playbook executions, timelines, actions, safety decisions, and context.'],
    'playbook-ops': ['Playbook Execution Monitor', 'Inspect and control playbook executions, timelines, actions, safety decisions, and context.'],
    'execution-control': ['Playbook Execution Monitor', 'Pause, resume, cancel, and update context for active playbook executions.'],
    'automation-ops': ['Automation Operations', 'Operational status for playbooks, approvals, response actions, evidence, hunts, and service health.'],
    'playbook-automation': ['Playbook Config and Simulation', 'View sanitized policy config, validate changes, and simulate threat events without queuing actions.'],
    'playbook-templates': ['Playbook Config and Simulation', 'View sanitized policy config, validate changes, and simulate threat events without queuing actions.'],
    'testing-validation': ['Playbook Config and Simulation', 'Validate policy changes and simulate threat events in a dry-run workflow.'],
    'manual-operations': ['Manual Response Actions', 'Queue controlled manual response actions with artifact validation, operator identity, reason, and confirmation.'],
    'soc-override': ['Manual Response Actions', 'Queue controlled SOC override actions with audit context and backend safety enforcement.'],
    'response-center': ['Response Admin and Recovery', 'Replay failed actions, queue rollback, and inspect response admin outcomes.'],
    'response-governance': ['Response Governance', 'Inspect safety decisions, rate limits, graduated response modes, policy config, and audit records.'],
    'response-metrics': ['Response Metrics', 'Track operational response counts, pending work, evidence, hunts, and service status.'],
    rollback: ['Response Admin and Recovery', 'Queue rollback actions and record operator reason for reversible response actions.'],
    'graduated-response': ['Graduated Response', 'Review execution-mode decisions, risk tiers, and policy behavior before enabling automation.'],
    'safety-checks': ['Safety Checks', 'Inspect whitelist/safety decisions and ensure risky actions require explicit operator confirmation.'],
    'rate-limits': ['Rate Limits and Cooldowns', 'Review cooldown/rate-limit audit records and policy config used to prevent response storms.'],
    'collected-artifacts': ['Forensic Evidence Browser', 'Browse collected response artifacts and evidence metadata.'],
    'forensic-storage': ['Forensic Evidence Browser', 'Browse evidence catalog, download evidence, and export forensic evidence metadata.'],
    'forensic-retention': ['Forensic Evidence Browser', 'Browse evidence catalog, retention metadata, downloads, and exports.'],
    'enhanced-forensics': ['Forensic Evidence Browser', 'Browse enhanced evidence collection records and retrieve stored evidence.'],
    hunting: ['Threat Hunting UI', 'Submit IOC sweeps, list hunt results, and manage recurring hunt schedules.'],
    'threat-hunting': ['Threat Hunting UI', 'Submit IOC sweeps, list hunt results, and manage recurring hunt schedules.'],
    'audit-trail': ['Audit Search and Export', 'Search audit events, inspect integrity fields, and export compliance evidence.'],
    'audit-compliance': ['Audit Search and Export', 'Search audit events, inspect integrity fields, and export compliance evidence.'],
    integrations: ['Enterprise Integrations', 'Track integration health and API requirements for ticketing, notifications, SIEM forwarding, and webhooks.'],
    performance: ['Performance and Scalability', 'Verify service health/readiness and Prometheus metric surfaces for response automation.'],
    reliability: ['Reliability and Error Handling', 'Verify service health and operational recovery endpoints for retries, DLQ replay, and rollback.'],
    'config-management': ['Settings and RBAC Helper', 'Configure API token/scopes and verify what actions the UI should enable.']
};

const UI_API_NEEDS = [
    ['Auth/RBAC', 'Authorization: Bearer <token>; optional future GET /api/v1/auth/scopes or /api/v1/me'],
    ['Approvals', 'GET /api/v1/approvals; POST approve/reject; POST bulk approve/reject'],
    ['Playbooks', 'GET executions/config; POST pause/resume/cancel/validate/simulate; PATCH execution context'],
    ['Response', 'POST manual action; POST replay; POST rollback; POST artifact validate; GET forensics download'],
    ['Audit/Forensics', 'GET audit events/export; GET forensic evidence/export'],
    ['Threat Hunting', 'GET hunts/schedules; POST IOC sweeps/schedules; PATCH/DELETE schedules'],
    ['Health/Metrics', 'GET /healthz; GET /readyz where available; GET /metrics on service ports']
];

const MISSING_UI_APIS = [
    'GET /api/v1/response/dlq for failed action selection before replay',
    'GET /api/v1/response/actions for response action history/status',
    'GET /api/v1/auth/scopes or GET /api/v1/me for dynamic scope discovery',
    'GET /api/v1/dashboard/summary for aggregated SOC overview counts',
    'GET /api/v1/services/status for unified backend health'
];

export function isSocAutomationView(moduleId, viewId) {
    return ['edr', 'unified'].includes(moduleId) && AUTOMATION_VIEWS.has(viewId);
}

function formatDate(value) {
    if (!value) {
        return 'n/a';
    }

    const timestamp = new Date(value);
    return Number.isNaN(timestamp.getTime()) ? String(value) : timestamp.toLocaleString();
}

function itemId(item, fallback = 'item') {
    return item.id || item.request_id || item.approval_id || item.execution_id || item.action_id || item.evidence_id || item.hunt_id || item.schedule_id || item.event_id || fallback;
}

function pickArray(payload, keys = []) {
    if (Array.isArray(payload)) {
        return payload;
    }

    for (const key of keys) {
        if (Array.isArray(payload?.[key])) {
            return payload[key];
        }
    }

    for (const key of ['items', 'data', 'results', 'approvals', 'executions', 'events', 'evidence', 'hunts', 'schedules', 'actions']) {
        if (Array.isArray(payload?.[key])) {
            return payload[key];
        }
    }

    return [];
}

function renderValue(value) {
    if (value === undefined || value === null || value === '') {
        return 'n/a';
    }

    if (typeof value === 'object') {
        return JSON.stringify(value, null, 2);
    }

    return String(value);
}

function parseJson(value) {
    const raw = String(value || '').trim();
    return raw ? JSON.parse(raw) : {};
}

function splitCsv(value) {
    return String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function serviceErrorText(error) {
    const message = error?.message || 'Request failed.';

    if (/401|403|unauthori[sz]ed|forbidden/i.test(message)) {
        return `${message} Missing or insufficient backend scope for this operation.`;
    }

    if (/failed to fetch|networkerror|load failed/i.test(message)) {
        return `${message} Backend unreachable or proxy target unavailable.`;
    }

    return message;
}

function riskTone(actionName = '') {
    if (['isolate_host', 'remove_persistence'].includes(actionName)) {
        return 'border-destructive/40 bg-destructive/10 text-destructive';
    }

    if (['block_ip', 'kill_process', 'quarantine_file'].includes(actionName)) {
        return 'border-destructive/30 bg-destructive/10 text-destructive';
    }

    return 'border-border bg-background text-foreground';
}

function PageHeader({ title, description, onRefresh, loading }) {
    return (
        <div className="rounded-[32px] border border-primary/20 bg-gradient-to-br from-card via-primary/5 to-accent p-7 shadow-[0_24px_80px_rgba(37,99,235,0.16)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
                <Badge variant="info" className="gap-2 uppercase tracking-[0.18em]">
                    <ShieldAlert size={14} />
                    Response Control Plane
                </Badge>
                <h1 className="mt-4 text-4xl font-black tracking-tight text-text-main">{title}</h1>
                <p className="mt-2 max-w-4xl text-sm text-text-muted">{description}</p>
            </div>
            {onRefresh && (
                <Button
                    onClick={onRefresh}
                    variant="infoOutline"
                    className="rounded-full"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </Button>
            )}
        </div>
        </div>
    );
}

function Panel({ title, children, badge, className = '' }) {
    return (
        <section className={`relative overflow-hidden rounded-[28px] border border-primary/15 bg-card p-5 shadow-[0_18px_60px_rgba(37,99,235,0.10)] ${className}`}>
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-info via-primary to-accent-primary" />
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-text-main">{title}</h2>
                {badge && (
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-primary">
                        {badge}
                    </span>
                )}
            </div>
            {children}
        </section>
    );
}

function Notice({ type = 'info', children }) {
    return (
        <Alert variant={type === 'error' ? 'destructive' : type === 'success' ? 'success' : 'info'}>
            {type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            <AlertTitle>{type === 'error' ? 'Action failed' : type === 'success' ? 'Action successful' : 'Notice'}</AlertTitle>
            <AlertDescription>{children}</AlertDescription>
        </Alert>
    );
}

function EmptyState({ label }) {
    return (
        <div className="rounded-2xl border border-dashed border-border-subtle bg-bg-body/40 p-8 text-center text-sm text-text-muted">
            No {label} returned for the selected filters.
        </div>
    );
}

function ApiNeedsPanel() {
    return (
        <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="API Needs Covered By This UI">
                <div className="space-y-3">
                    {UI_API_NEEDS.map(([area, endpoints]) => (
                        <div key={area} className="rounded-2xl border border-border-subtle bg-bg-body/40 p-4 text-sm">
                            <div className="font-semibold text-text-main">{area}</div>
                            <div className="mt-1 text-text-muted">{endpoints}</div>
                        </div>
                    ))}
                </div>
            </Panel>
            <Panel title="APIs Still Worth Adding">
                <div className="space-y-3">
                    {MISSING_UI_APIS.map((api) => (
                        <div key={api} className="rounded-2xl border border-neutral-500/25 bg-neutral-500/10 p-4 text-sm text-neutral-800 dark:border-white/15 dark:bg-white/5 dark:text-neutral-200">
                            {api}
                        </div>
                    ))}
                </div>
            </Panel>
        </div>
    );
}

function TextInput({ label, value, onChange, placeholder, type = 'text' }) {
    return (
        <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
            <Input
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder || label}
                className="h-12 rounded-2xl"
            />
        </label>
    );
}

function TextArea({ label, value, onChange, rows = 4, mono = false }) {
    return (
        <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
            <Textarea
                value={value}
                onChange={(event) => onChange(event.target.value)}
                rows={rows}
                className={`resize-none rounded-2xl ${mono ? 'font-mono text-xs' : ''}`}
            />
        </label>
    );
}

function SelectInput({ label, value, onChange, options }) {
    return (
        <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="h-12 rounded-2xl">
                    <SelectValue placeholder={label} />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        {options.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
        </label>
    );
}

function ResultBlock({ result }) {
    if (!result) {
        return null;
    }

    return (
        <Notice type="success">
            <div className="font-semibold">Operation completed</div>
            <pre className="mt-3 max-h-80 overflow-auto rounded-xl bg-black p-3 text-xs text-white">
                {renderValue(result)}
            </pre>
        </Notice>
    );
}

function ScopeHint({ requiredScopes, scopes }) {
    const state = hasRequiredScopes(requiredScopes, scopes);

    if (state === true || !requiredScopes?.length) {
        return null;
    }

    if (state === null) {
        return (
            <Notice>
                No local scope metadata is configured. The UI will send the request and rely on backend RBAC for allow/deny decisions.
            </Notice>
        );
    }

    return (
        <Notice type="error">
            Missing UI scope: {missingRequiredScopes(requiredScopes, scopes).join(', ')}.
        </Notice>
    );
}

function ActionButton({ children, onClick, requiredScopes, scopes, loading, className = '', destructive = false, tone = 'info' }) {
    const scopeState = hasRequiredScopes(requiredScopes, scopes);
    const disabled = loading || scopeState === false;

    return (
        <Button
            type="button"
            onClick={onClick}
            disabled={disabled}
            variant={destructive ? 'destructive' : tone}
            className={className}
            title={scopeState === false ? `Missing ${missingRequiredScopes(requiredScopes, scopes).join(', ')}` : undefined}
        >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {children}
        </Button>
    );
}

function MiniTable({ rows, columns, emptyLabel, selectedIds, onToggle }) {
    if (!rows.length) {
        return <EmptyState label={emptyLabel} />;
    }

    return (
        <div className="overflow-x-auto rounded-2xl border border-border-subtle">
            <table className="min-w-full divide-y divide-border-subtle text-sm">
                <thead className="bg-bg-input text-xs uppercase tracking-[0.14em] text-text-muted">
                    <tr>
                        {onToggle && <th className="px-4 py-3 text-left">Select</th>}
                        {columns.map((column) => (
                            <th key={column.key} className="px-4 py-3 text-left">{column.label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle bg-bg-card/50">
                    {rows.map((row, index) => {
                        const id = itemId(row, `${emptyLabel}-${index}`);
                        return (
                            <tr key={id} className="align-top">
                                {onToggle && (
                                    <td className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(id)}
                                            onChange={() => onToggle(id)}
                                        />
                                    </td>
                                )}
                                {columns.map((column) => (
                                    <td key={column.key} className="max-w-[360px] px-4 py-3 text-text-main">
                                        {column.render ? column.render(row) : renderValue(row[column.key])}
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function useApiResource(loader, deps, options = {}) {
    const [data, setData] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const { autoRefreshMs = 0 } = options;

    const load = React.useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const payload = await loader();
            setData(payload);
        } catch (loadError) {
            setError(serviceErrorText(loadError));
            setData(null);
        } finally {
            setLoading(false);
        }
    }, deps);

    React.useEffect(() => {
        load();
    }, [load]);

    React.useEffect(() => {
        if (!autoRefreshMs) {
            return undefined;
        }

        const timer = window.setInterval(load, autoRefreshMs);
        return () => window.clearInterval(timer);
    }, [autoRefreshMs, load]);

    return { data, loading, error, reload: load, setData };
}

function useMutation() {
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [result, setResult] = React.useState(null);

    const run = async (callback) => {
        try {
            setLoading(true);
            setError('');
            setResult(null);
            const payload = await callback();
            setResult(payload || { status: 'ok' });
            return payload;
        } catch (mutationError) {
            setError(serviceErrorText(mutationError));
            return null;
        } finally {
            setLoading(false);
        }
    };

    return { loading, error, result, run, setResult };
}

function OverviewPage({ scopes }) {
    const loader = React.useCallback(async () => {
        const [approvals, executions, auditEvents, evidence, hunts, schedules, health] = await Promise.allSettled([
            callSecurityService('approvals', '/api/v1/approvals'),
            callSecurityService('playbooks', '/api/v1/playbooks/executions'),
            callSecurityService('audit', '/api/v1/audit/events', { query: { limit: 10 } }),
            callSecurityService('audit', '/api/v1/forensics/evidence'),
            callSecurityService('hunts', '/api/v1/hunts'),
            callSecurityService('hunts', '/api/v1/hunts/schedules'),
            Promise.allSettled([
                callSecurityService('playbooks', '/healthz'),
                callSecurityService('response', '/healthz'),
                callSecurityService('approvals', '/healthz'),
                callSecurityService('hunts', '/healthz'),
                callSecurityService('audit', '/healthz')
            ])
        ]);

        return { approvals, executions, auditEvents, evidence, hunts, schedules, health };
    }, []);
    const { data, loading, error, reload } = useApiResource(loader, [loader], { autoRefreshMs: 30000 });

    const cards = [
        { label: 'Pending Approvals', value: pickArray(data?.approvals?.value, ['approvals']).length, tone: 'warning', note: 'Analyst decisions waiting in queue.' },
        { label: 'Active Executions', value: pickArray(data?.executions?.value, ['executions']).filter((item) => ['running', 'in_progress', 'paused'].includes(String(item.status || '').toLowerCase())).length, tone: 'info', note: 'Playbooks currently moving through steps.' },
        { label: 'Recent Audit Events', value: pickArray(data?.auditEvents?.value, ['events']).length, tone: 'primary', note: 'Compliance records from the audit index.' },
        { label: 'Evidence Records', value: pickArray(data?.evidence?.value, ['evidence']).length, tone: 'success', note: 'Forensic artifacts indexed for review.' },
        { label: 'Hunts', value: pickArray(data?.hunts?.value, ['hunts']).length, tone: 'accent', note: 'IOC sweep results available to analysts.' },
        { label: 'Scheduled Hunts', value: pickArray(data?.schedules?.value, ['schedules']).length, tone: 'warning', note: 'Recurring hunt campaigns configured.' }
    ];
    const healthItems = ['playbook-service', 'response-service', 'approval-service', 'threat-hunting-service', 'audit-service'];

    return (
        <div className="space-y-6">
            <PageHeader title="SOC Overview Dashboard" description={PAGE_TITLES['response-dashboard'][1]} onRefresh={reload} loading={loading} />
            <ScopeHint requiredScopes={['approvals:read', 'playbooks:read', 'audit:read', 'forensics:read', 'hunts:read']} scopes={scopes} />
            {error && <Notice type="error">{error}</Notice>}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {cards.map((card) => (
                    <section
                        key={card.label}
                        className={`relative overflow-hidden rounded-[28px] border p-6 shadow-[0_20px_70px_rgba(37,99,235,0.12)] ${
                            card.tone === 'warning'
                                ? 'border-warning/25 bg-warning/10'
                                : card.tone === 'success'
                                    ? 'border-success/25 bg-success/10'
                                    : card.tone === 'accent'
                                        ? 'border-accent-primary/25 bg-accent'
                                        : card.tone === 'primary'
                                            ? 'border-primary/25 bg-primary/10'
                                            : 'border-info/25 bg-info/10'
                        }`}
                    >
                        <div className="text-xs font-bold uppercase tracking-[0.18em] text-text-muted">{card.label}</div>
                        <div className="mt-5 text-5xl font-black tracking-tight text-text-main">{loading ? '...' : card.value}</div>
                        <div className="mt-3 text-sm font-medium text-text-muted">{card.note}</div>
                    </section>
                ))}
            </div>
            <Panel title="Service Health Indicators" badge="healthz">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                    {healthItems.map((label, index) => {
                        const result = data?.health?.value?.[index];
                        const healthy = result?.status === 'fulfilled';
                        return (
                            <div key={label} className={`rounded-2xl border p-4 text-sm ${healthy ? 'border-success/25 bg-success/10 text-success' : 'border-destructive/30 bg-destructive/10 text-destructive'}`}>
                                <div className="font-semibold">{label}</div>
                                <div className="mt-1">{healthy ? 'healthy' : 'unreachable'}</div>
                            </div>
                        );
                    })}
                </div>
            </Panel>
            <ApiNeedsPanel />
        </div>
    );
}

function ApprovalDashboard({ operatorId, scopes }) {
    const [orgId, setOrgId] = React.useState('');
    const [reason, setReason] = React.useState('');
    const [selectedIds, setSelectedIds] = React.useState([]);
    const loader = React.useCallback(() => callSecurityService('approvals', '/api/v1/approvals', { query: { org_id: orgId } }), [orgId]);
    const { data, loading, error, reload } = useApiResource(loader, [loader], { autoRefreshMs: 30000 });
    const mutation = useMutation();
    const rows = pickArray(data, ['approvals']);

    React.useEffect(() => {
        setSelectedIds([]);
    }, [data]);

    const requireReason = () => {
        if (reason.trim().length < 8) {
            mutation.setResult(null);
            window.alert('Operator reason/comment must be at least 8 characters.');
            return false;
        }

        return true;
    };

    const decide = async (id, decision, destructive = true) => {
        if (!requireReason()) {
            return;
        }

        if (destructive && !window.confirm(`${decision} approval ${id}?`)) {
            return;
        }

        await mutation.run(() => callSecurityService('approvals', `/api/v1/approvals/${encodeURIComponent(id)}/${decision}`, {
            method: 'POST',
            body: { operator_id: operatorId || 'unknown-operator', reason: reason.trim() }
        }));
        reload();
    };

    const bulk = async (decision) => {
        if (!selectedIds.length || !requireReason()) {
            return;
        }

        if (!window.confirm(`${decision} ${selectedIds.length} approval request(s)?`)) {
            return;
        }

        await mutation.run(() => callSecurityService('approvals', `/api/v1/approvals/bulk/${decision}`, {
            method: 'POST',
            body: { operator_id: operatorId || 'unknown-operator', reason: reason.trim(), ids: selectedIds }
        }));
        reload();
    };

    const toggle = (id) => {
        setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Approval Dashboard" description={PAGE_TITLES.approvals[1]} onRefresh={reload} loading={loading} />
            <ScopeHint requiredScopes={['approvals:read']} scopes={scopes} />
            <Panel title="Approval Filters And Decision Context">
                <div className="grid gap-4 lg:grid-cols-3">
                    <TextInput label="Org ID" value={orgId} onChange={setOrgId} />
                    <TextInput label="Operator ID" value={operatorId || ''} onChange={() => {}} />
                    <TextInput label="Reason / Comment" value={reason} onChange={setReason} placeholder="Required for approval decisions" />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                    <ActionButton requiredScopes={['approvals:bulk']} scopes={scopes} loading={mutation.loading} onClick={() => bulk('approve')} tone="success">
                        Bulk Approve
                    </ActionButton>
                    <ActionButton requiredScopes={['approvals:bulk']} scopes={scopes} loading={mutation.loading} onClick={() => bulk('reject')} destructive>
                        Bulk Reject
                    </ActionButton>
                </div>
            </Panel>
            {error && <Notice type="error">{error}</Notice>}
            {mutation.error && <Notice type="error">{mutation.error}</Notice>}
            <ResultBlock result={mutation.result} />
            <MiniTable
                rows={rows}
                emptyLabel="approval requests"
                selectedIds={selectedIds}
                onToggle={toggle}
                columns={[
                    { key: 'request_id', label: 'Request ID', render: (row) => itemId(row) },
                    { key: 'org_id', label: 'Org ID' },
                    { key: 'action_name', label: 'Action' },
                    { key: 'client_id', label: 'Endpoint', render: (row) => row.client_id || row.client || row.endpoint || 'n/a' },
                    { key: 'threat_event_id', label: 'Threat Event' },
                    { key: 'reason', label: 'Reason / Context', render: (row) => row.reason || row.context || row.message || 'n/a' },
                    { key: 'requested_at', label: 'Requested', render: (row) => formatDate(row.requested_at || row.created_at) },
                    { key: 'expires_at', label: 'Expires', render: (row) => formatDate(row.expires_at || row.expiration_time) },
                    { key: 'escalation_state', label: 'Escalation', render: (row) => row.escalation_state || row.escalation || 'n/a' },
                    { key: 'risk_tier', label: 'Risk', render: (row) => row.risk_tier || row.severity || 'n/a' },
                    {
                        key: 'actions',
                        label: 'Decision',
                        render: (row) => {
                            const id = itemId(row);
                            return (
                                <div className="flex flex-wrap gap-2">
                                    <ActionButton requiredScopes={['approvals:decide']} scopes={scopes} loading={mutation.loading} onClick={() => decide(id, 'approve')} tone="success">
                                        Approve
                                    </ActionButton>
                                    <ActionButton requiredScopes={['approvals:decide']} scopes={scopes} loading={mutation.loading} onClick={() => decide(id, 'reject')} destructive>
                                        Reject
                                    </ActionButton>
                                </div>
                            );
                        }
                    }
                ]}
            />
        </div>
    );
}

function PlaybookMonitor({ operatorId, scopes }) {
    const [filters, setFilters] = React.useState({ org_id: '', status: '', threat_event_id: '', policy_name: '', start_time: '', end_time: '' });
    const [executionId, setExecutionId] = React.useState('');
    const [reason, setReason] = React.useState('');
    const [contextJson, setContextJson] = React.useState('{}');
    const loader = React.useCallback(() => callSecurityService('playbooks', '/api/v1/playbooks/executions', { query: filters }), [filters]);
    const { data, loading, error, reload } = useApiResource(loader, [loader], { autoRefreshMs: 30000 });
    const detail = useMutation();
    const mutation = useMutation();
    const rows = pickArray(data, ['executions']);

    const control = async (action) => {
        if (!executionId || reason.trim().length < 8) {
            window.alert('Execution ID and an operator reason of at least 8 characters are required.');
            return;
        }

        if (['cancel'].includes(action) && !window.confirm(`Cancel execution ${executionId}?`)) {
            return;
        }

        await mutation.run(() => callSecurityService('playbooks', `/api/v1/playbooks/executions/${encodeURIComponent(executionId)}/${action}`, {
            method: 'POST',
            body: { operator_id: operatorId || 'unknown-operator', reason: reason.trim() }
        }));
        reload();
    };

    const updateContext = async () => {
        if (!executionId || reason.trim().length < 8) {
            window.alert('Execution ID and an operator reason of at least 8 characters are required.');
            return;
        }

        await mutation.run(() => callSecurityService('playbooks', `/api/v1/playbooks/executions/${encodeURIComponent(executionId)}/context`, {
            method: 'PATCH',
            body: { operator_id: operatorId || 'unknown-operator', reason: reason.trim(), context: parseJson(contextJson) }
        }));
        reload();
    };

    const getDetail = (id = executionId) => {
        if (!id) {
            return;
        }

        setExecutionId(id);
        detail.run(() => callSecurityService('playbooks', `/api/v1/playbooks/executions/${encodeURIComponent(id)}`));
    };

    const selected = detail.result;
    const timeline = pickArray(selected, ['timeline', 'stages', 'steps', 'actions', 'events']);

    return (
        <div className="space-y-6">
            <PageHeader title="Playbook Execution Monitor" description={PAGE_TITLES['playbook-orchestration'][1]} onRefresh={reload} loading={loading} />
            <ScopeHint requiredScopes={['playbooks:read']} scopes={scopes} />
            <Panel title="Execution Filters">
                <div className="grid gap-4 md:grid-cols-4">
                    {Object.entries(filters).map(([key, value]) => (
                        <TextInput key={key} label={key.replace(/_/g, ' ')} value={value} onChange={(next) => setFilters((current) => ({ ...current, [key]: next }))} />
                    ))}
                </div>
            </Panel>
            <Panel title="Execution Controls" badge="requires playbooks:control">
                <div className="grid gap-4 lg:grid-cols-3">
                    <TextInput label="Execution ID" value={executionId} onChange={setExecutionId} />
                    <TextInput label="Operator Reason" value={reason} onChange={setReason} />
                    <div className="flex items-end gap-2">
                        <ActionButton requiredScopes={['playbooks:read']} scopes={scopes} loading={detail.loading} onClick={() => getDetail()}>Get Detail</ActionButton>
                    </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                    {['pause', 'resume'].map((action) => (
                        <ActionButton key={action} requiredScopes={['playbooks:control']} scopes={scopes} loading={mutation.loading} onClick={() => control(action)} tone={action === 'pause' ? 'warning' : 'success'}>
                            {action}
                        </ActionButton>
                    ))}
                    <ActionButton requiredScopes={['playbooks:control']} scopes={scopes} loading={mutation.loading} onClick={() => control('cancel')} destructive>
                        cancel
                    </ActionButton>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                    <TextArea label="Context JSON" value={contextJson} onChange={setContextJson} mono />
                    <ActionButton requiredScopes={['playbooks:control']} scopes={scopes} loading={mutation.loading} onClick={updateContext}>
                        Update Context
                    </ActionButton>
                </div>
            </Panel>
            {error && <Notice type="error">{error}</Notice>}
            {mutation.error && <Notice type="error">{mutation.error}</Notice>}
            <ResultBlock result={mutation.result} />
            <MiniTable
                rows={rows}
                emptyLabel="playbook executions"
                columns={[
                    { key: 'execution_id', label: 'Execution ID', render: (row) => itemId(row) },
                    { key: 'org_id', label: 'Org' },
                    { key: 'status', label: 'Status' },
                    { key: 'policy_name', label: 'Policy' },
                    { key: 'policy_revision', label: 'Revision' },
                    { key: 'decision_id', label: 'Decision ID' },
                    { key: 'threat_event_id', label: 'Threat Event' },
                    { key: 'created_at', label: 'Started', render: (row) => formatDate(row.created_at || row.started_at) },
                    { key: 'safety_decisions', label: 'Safety / Approval', render: (row) => renderValue(row.safety_decisions || row.approval_requirements || row.approval_required) },
                    { key: 'open', label: 'Detail', render: (row) => <ActionButton requiredScopes={['playbooks:read']} scopes={scopes} loading={detail.loading} onClick={() => getDetail(itemId(row))}>Open</ActionButton> }
                ]}
            />
            {selected && (
                <Panel title="Execution Detail Timeline" badge={itemId(selected)}>
                    <pre className="mb-4 max-h-72 overflow-auto rounded-2xl bg-black p-4 text-xs text-white">{renderValue(selected)}</pre>
                    <MiniTable
                        rows={timeline}
                        emptyLabel="timeline events"
                        columns={[
                            { key: 'stage', label: 'Stage', render: (row) => row.stage || row.step_id || row.action_name || 'n/a' },
                            { key: 'status', label: 'Status' },
                            { key: 'decision', label: 'Decision', render: (row) => row.decision || row.result || row.reason || 'n/a' },
                            { key: 'timestamp', label: 'Time', render: (row) => formatDate(row.timestamp || row.created_at || row.finished_at) }
                        ]}
                    />
                </Panel>
            )}
        </div>
    );
}

function ConfigSimulation({ scopes }) {
    const configLoader = React.useCallback(() => callSecurityService('playbooks', '/api/v1/playbooks/config'), []);
    const { data, loading, error, reload } = useApiResource(configLoader, [configLoader]);
    const mutation = useMutation();
    const [configJson, setConfigJson] = React.useState('{}');
    const [simulationJson, setSimulationJson] = React.useState('{\n  "org_id": "default",\n  "severity": "HIGH",\n  "threat_type": "malware"\n}');

    const validate = () => mutation.run(() => callSecurityService('playbooks', '/api/v1/playbooks/config/validate', {
        method: 'POST',
        body: parseJson(configJson)
    }));
    const simulate = () => mutation.run(() => callSecurityService('playbooks', '/api/v1/playbooks/simulate', {
        method: 'POST',
        body: parseJson(simulationJson)
    }));

    return (
        <div className="space-y-6">
            <PageHeader title="Playbook Config and Simulation UI" description={PAGE_TITLES['testing-validation'][1]} onRefresh={reload} loading={loading} />
            <ScopeHint requiredScopes={['playbooks:read', 'playbooks:config', 'playbooks:simulate']} scopes={scopes} />
            {error && <Notice type="error">{error}</Notice>}
            <div className="grid gap-6 xl:grid-cols-2">
                <Panel title="Sanitized Playbook Configuration" badge="read-only">
                    <pre className="max-h-[520px] overflow-auto rounded-2xl bg-black p-4 text-xs text-white">{renderValue(data)}</pre>
                </Panel>
                <Panel title="Validate Policy Config">
                    <TextArea label="Policy Config JSON" value={configJson} onChange={setConfigJson} rows={12} mono />
                    <div className="mt-4">
                        <ActionButton requiredScopes={['playbooks:config']} scopes={scopes} loading={mutation.loading} onClick={validate}>Validate Config</ActionButton>
                    </div>
                </Panel>
                <Panel title="Simulate Threat Event" className="xl:col-span-2" badge="dry-run only">
                    <Notice>Simulation is visually distinct from real execution and never queues response actions.</Notice>
                    <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.7fr]">
                        <TextArea label="Threat Event JSON" value={simulationJson} onChange={setSimulationJson} rows={10} mono />
                        <div>
                            <ActionButton requiredScopes={['playbooks:simulate']} scopes={scopes} loading={mutation.loading} onClick={simulate}>
                                Simulate Policy
                            </ActionButton>
                            {mutation.error && <div className="mt-4"><Notice type="error">{mutation.error}</Notice></div>}
                            <div className="mt-4"><ResultBlock result={mutation.result} /></div>
                        </div>
                    </div>
                </Panel>
            </div>
        </div>
    );
}

function GovernancePage({ scopes, activeView }) {
    const defaultStatus = activeView === 'safety-checks'
        ? 'safety_blocked'
        : activeView === 'rate-limits'
            ? 'rate_limited'
            : '';
    const [filters, setFilters] = React.useState({ org_id: '', action_name: '', status: defaultStatus, limit: '50' });
    const loader = React.useCallback(async () => {
        const [config, audit] = await Promise.allSettled([
            callSecurityService('playbooks', '/api/v1/playbooks/config'),
            callSecurityService('audit', '/api/v1/audit/events', { query: filters })
        ]);

        return { config, audit };
    }, [filters]);
    const { data, loading, error, reload } = useApiResource(loader, [loader], { autoRefreshMs: 30000 });
    const auditRows = pickArray(data?.audit?.value, ['events']);

    React.useEffect(() => {
        setFilters((current) => ({ ...current, status: defaultStatus }));
    }, [defaultStatus]);

    return (
        <div className="space-y-6">
            <PageHeader title={PAGE_TITLES[activeView]?.[0] || 'Response Governance'} description={PAGE_TITLES[activeView]?.[1] || PAGE_TITLES['response-governance'][1]} onRefresh={reload} loading={loading} />
            <ScopeHint requiredScopes={['playbooks:read', 'audit:read']} scopes={scopes} />
            {error && <Notice type="error">{error}</Notice>}
            <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                <Panel title="Safety UX Controls In This UI">
                    <div className="space-y-3 text-sm text-text-muted">
                        <div className="rounded-2xl border border-border-subtle bg-bg-body/40 p-4">Approvals, bulk approvals, rollbacks, manual actions, and scheduled hunt deletions require explicit confirmation.</div>
                        <div className="rounded-2xl border border-border-subtle bg-bg-body/40 p-4">Sensitive operations require operator identity plus reason/comment and rely on backend RBAC as the final authority.</div>
                        <div className="rounded-2xl border border-border-subtle bg-bg-body/40 p-4">Simulation and dry-run views are visually marked and never queue real response actions.</div>
                        <div className="rounded-2xl border border-border-subtle bg-bg-body/40 p-4">Destructive manual actions are highlighted by risk level and are not silently retried by the UI.</div>
                    </div>
                </Panel>
                <Panel title="Sanitized Policy / Governance Config" badge="playbooks config">
                    <pre className="max-h-96 overflow-auto rounded-2xl bg-black p-4 text-xs text-white">{renderValue(data?.config?.value)}</pre>
                </Panel>
            </div>
            <Panel title="Safety, Rate Limit, And Response Decision Audit Events">
                <div className="mb-4 grid gap-4 md:grid-cols-4">
                    {Object.entries(filters).map(([key, value]) => (
                        <TextInput key={key} label={key.replace(/_/g, ' ')} value={value} onChange={(next) => setFilters((current) => ({ ...current, [key]: next }))} />
                    ))}
                </div>
                <MiniTable
                    rows={auditRows}
                    emptyLabel="governance audit events"
                    columns={[
                        { key: 'event_id', label: 'Event ID', render: (row) => itemId(row) },
                        { key: 'org_id', label: 'Org' },
                        { key: 'policy_name', label: 'Policy' },
                        { key: 'execution_mode', label: 'Mode' },
                        { key: 'risk_tier', label: 'Risk' },
                        { key: 'action_name', label: 'Action' },
                        { key: 'status', label: 'Status' },
                        { key: 'reason', label: 'Reason' },
                        { key: 'operator_id', label: 'Operator' },
                        { key: 'timestamp', label: 'Time', render: (row) => formatDate(row.timestamp || row.created_at || row.indexed_at) }
                    ]}
                />
            </Panel>
        </div>
    );
}

function PlatformStatusPage({ scopes, activeView }) {
    const services = [
        ['playbooks', 'playbook-service', '9092'],
        ['response', 'response-service', '9093'],
        ['approvals', 'approval-service', '9094'],
        ['hunts', 'threat-hunting-service', '9095'],
        ['audit', 'audit-service', '9096']
    ];
    const loader = React.useCallback(async () => {
        const status = await Promise.allSettled(services.map(([service]) => callSecurityService(service, '/healthz')));
        const readiness = await Promise.allSettled(services.map(([service]) => callSecurityService(service, '/readyz')));
        return { status, readiness };
    }, []);
    const { data, loading, error, reload } = useApiResource(loader, [loader], { autoRefreshMs: 30000 });

    return (
        <div className="space-y-6">
            <PageHeader title={PAGE_TITLES[activeView]?.[0] || 'Platform Status'} description={PAGE_TITLES[activeView]?.[1] || 'Operational service status and API needs for the enhanced response UI.'} onRefresh={reload} loading={loading} />
            <ScopeHint requiredScopes={['playbooks:read', 'response:manual', 'approvals:read', 'hunts:read', 'audit:read']} scopes={scopes} />
            {error && <Notice type="error">{error}</Notice>}
            <Panel title="Service Health And Readiness" badge="auto-refresh 30s">
                <div className="grid gap-3 md:grid-cols-5">
                    {services.map(([service, label, port], index) => {
                        const healthOk = data?.status?.[index]?.status === 'fulfilled';
                        const readyOk = data?.readiness?.[index]?.status === 'fulfilled';

                        return (
                            <div key={service} className={`rounded-2xl border p-4 text-sm ${healthOk ? 'border-success/25 bg-success/10 text-success' : 'border-destructive/30 bg-destructive/10 text-destructive'}`}>
                                <div className="font-semibold">{label}</div>
                                <div className="mt-1">healthz: {healthOk ? 'healthy' : 'unreachable'}</div>
                                <div className="mt-1">readyz: {readyOk ? 'ready' : 'not exposed/unready'}</div>
                                <div className="mt-1">metrics: :{port}/metrics</div>
                            </div>
                        );
                    })}
                </div>
            </Panel>
            <ApiNeedsPanel />
        </div>
    );
}

function ManualResponsePage({ operatorId, scopes }) {
    const [form, setForm] = React.useState({
        org_id: '',
        client_id: '',
        threat_event_id: '',
        action_name: 'collect_forensics',
        artifact_name: '',
        parameters_json: '{}',
        reason: ''
    });
    const mutation = useMutation();
    const artifactValidation = useMutation();
    const selectedRisk = RISKY_ACTIONS.has(form.action_name) ? 'High risk / destructive' : 'Low risk';

    const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
    const validateArtifact = () => artifactValidation.run(() => callSecurityService('response', '/api/v1/response/artifacts/validate', {
        method: 'POST',
        body: { artifact_names: form.artifact_name ? [form.artifact_name] : [] }
    }));
    const submit = async () => {
        if (!form.client_id || !form.artifact_name || !form.reason || form.reason.trim().length < 8) {
            window.alert('Client ID, artifact name, and an operator reason of at least 8 characters are required.');
            return;
        }

        if (RISKY_ACTIONS.has(form.action_name) && !window.confirm(`Queue real ${form.action_name} action with dry_run=false?`)) {
            return;
        }

        const validation = await artifactValidation.run(() => callSecurityService('response', '/api/v1/response/artifacts/validate', {
            method: 'POST',
            body: { artifact_names: form.artifact_name ? [form.artifact_name] : [] }
        }));

        if (!validation) {
            return;
        }

        await mutation.run(() => submitManualResponseAction({
            org_id: form.org_id || undefined,
            client_id: form.client_id,
            threat_event_id: form.threat_event_id || undefined,
            action_name: form.action_name,
            artifact_name: form.artifact_name || undefined,
            parameters: parseJson(form.parameters_json),
            operator_id: operatorId || 'unknown-operator',
            reason: form.reason
        }));
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Manual Response Actions UI" description={PAGE_TITLES['manual-operations'][1]} />
            <ScopeHint requiredScopes={['response:manual', 'artifacts:validate']} scopes={scopes} />
            <Panel title="Manual Response Request" badge="dry_run=false">
                <div className={`mb-4 rounded-2xl border p-4 text-sm ${riskTone(form.action_name)}`}>
                    <div className="font-semibold">{selectedRisk}</div>
                    <div className="mt-1">Backend must enforce RBAC, whitelist, cooldown, approvals, and audit logging.</div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <TextInput label="Org ID" value={form.org_id} onChange={(value) => setField('org_id', value)} />
                    <TextInput label="Client ID" value={form.client_id} onChange={(value) => setField('client_id', value)} />
                    <TextInput label="Threat Event ID" value={form.threat_event_id} onChange={(value) => setField('threat_event_id', value)} />
                    <SelectInput label="Action Name" value={form.action_name} onChange={(value) => setField('action_name', value)} options={RESPONSE_ACTIONS} />
                    <TextInput label="Artifact Name" value={form.artifact_name} onChange={(value) => setField('artifact_name', value)} />
                    <TextInput label="Operator ID" value={operatorId || ''} onChange={() => {}} />
                </div>
                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                    <TextArea label="Parameters JSON" value={form.parameters_json} onChange={(value) => setField('parameters_json', value)} mono />
                    <TextArea label="Reason" value={form.reason} onChange={(value) => setField('reason', value)} />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                    <ActionButton requiredScopes={['artifacts:validate']} scopes={scopes} loading={artifactValidation.loading} onClick={validateArtifact}>
                        Validate Artifact
                    </ActionButton>
                    <ActionButton requiredScopes={['response:manual']} scopes={scopes} loading={mutation.loading} onClick={submit} destructive={RISKY_ACTIONS.has(form.action_name)}>
                        Queue Manual Action
                    </ActionButton>
                </div>
            </Panel>
            {artifactValidation.error && <Notice type="error">{artifactValidation.error}</Notice>}
            <ResultBlock result={artifactValidation.result} />
            {mutation.error && <Notice type="error">{mutation.error}</Notice>}
            <ResultBlock result={mutation.result} />
        </div>
    );
}

function ResponseAdminPage({ operatorId, scopes }) {
    const [form, setForm] = React.useState({ failed_action_id: '', action_result_id: '', rollback_action: 'restore_network', reason: '' });
    const mutation = useMutation();
    const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
    const replay = () => {
        if (!form.failed_action_id || form.reason.trim().length < 8) {
            window.alert('Failed action ID and reason are required.');
            return;
        }

        mutation.run(() => callSecurityService('response', '/api/v1/response/replay', {
            method: 'POST',
            body: { operator_id: operatorId || 'unknown-operator', reason: form.reason, action_id: form.failed_action_id }
        }));
    };
    const rollback = () => {
        if (!form.action_result_id || form.reason.trim().length < 8) {
            window.alert('Action result ID and reason are required.');
            return;
        }

        if (!window.confirm(`Queue rollback ${form.rollback_action}?`)) {
            return;
        }

        mutation.run(() => callSecurityService('response', '/api/v1/response/rollback', {
            method: 'POST',
            body: { operator_id: operatorId || 'unknown-operator', reason: form.reason, action_result_id: form.action_result_id, rollback_action: form.rollback_action }
        }));
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Response Admin UI" description={PAGE_TITLES['response-center'][1]} />
            <ScopeHint requiredScopes={['response:replay', 'response:rollback']} scopes={scopes} />
            <Notice>Replay needs a failed action ID because the backend does not yet expose `GET /api/v1/response/dlq`.</Notice>
            <Panel title="Replay And Rollback">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <TextInput label="Failed Action ID" value={form.failed_action_id} onChange={(value) => setField('failed_action_id', value)} />
                    <TextInput label="Action Result ID" value={form.action_result_id} onChange={(value) => setField('action_result_id', value)} />
                    <SelectInput label="Rollback Action" value={form.rollback_action} onChange={(value) => setField('rollback_action', value)} options={['restore_quarantined_file', 'unblock_ip', 'restore_network', 'restore_persistence']} />
                    <TextInput label="Reason" value={form.reason} onChange={(value) => setField('reason', value)} />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                    <ActionButton requiredScopes={['response:replay']} scopes={scopes} loading={mutation.loading} onClick={replay}>Replay Failed Action</ActionButton>
                    <ActionButton requiredScopes={['response:rollback']} scopes={scopes} loading={mutation.loading} onClick={rollback} destructive>Queue Rollback</ActionButton>
                </div>
            </Panel>
            {mutation.error && <Notice type="error">{mutation.error}</Notice>}
            <ResultBlock result={mutation.result} />
        </div>
    );
}

function ForensicEvidencePage({ scopes, operatorId }) {
    const [filters, setFilters] = React.useState({ org_id: '', threat_event_id: '', action_id: '', action_name: '', client_id: '', status: '', start_time: '', end_time: '' });
    const [storageUri, setStorageUri] = React.useState('');
    const [format, setFormat] = React.useState('json');
    const loader = React.useCallback(() => callSecurityService('audit', '/api/v1/forensics/evidence', { query: filters }), [filters]);
    const { data, loading, error, reload } = useApiResource(loader, [loader], { autoRefreshMs: 30000 });
    const mutation = useMutation();
    const rows = pickArray(data, ['evidence']);
    const download = (uri = storageUri) => mutation.run(() => downloadSecurityServiceFile('response', '/api/v1/response/forensics/download', { query: { storage_uri: uri, operator_id: operatorId || undefined }, filename: 'evidence.bin' }));
    const exportCatalog = () => mutation.run(() => downloadSecurityServiceFile('audit', '/api/v1/forensics/export', { query: { ...filters, format }, filename: `forensics.${format}` }));

    return (
        <div className="space-y-6">
            <PageHeader title="Forensic Evidence UI" description={PAGE_TITLES['forensic-storage'][1]} onRefresh={reload} loading={loading} />
            <ScopeHint requiredScopes={['forensics:read', 'forensics:export', 'forensics:download']} scopes={scopes} />
            <Panel title="Evidence Filters">
                <div className="grid gap-4 md:grid-cols-3">
                    {Object.entries(filters).map(([key, value]) => (
                        <TextInput key={key} label={key.replace(/_/g, ' ')} value={value} onChange={(next) => setFilters((current) => ({ ...current, [key]: next }))} />
                    ))}
                    <SelectInput label="Export Format" value={format} onChange={setFormat} options={['json', 'csv']} />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                    <ActionButton requiredScopes={['forensics:export']} scopes={scopes} loading={mutation.loading} onClick={exportCatalog}><Download size={16} /> Export Catalog</ActionButton>
                </div>
            </Panel>
            <Panel title="Download Evidence">
                <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                    <TextInput label="Storage URI" value={storageUri} onChange={setStorageUri} />
                    <ActionButton requiredScopes={['forensics:download']} scopes={scopes} loading={mutation.loading} onClick={() => download()}><Download size={16} /> Download</ActionButton>
                </div>
            </Panel>
            {error && <Notice type="error">{error}</Notice>}
            {mutation.error && <Notice type="error">{mutation.error}</Notice>}
            <ResultBlock result={mutation.result} />
            <MiniTable
                rows={rows}
                emptyLabel="evidence records"
                columns={[
                    { key: 'evidence_id', label: 'Evidence ID', render: (row) => itemId(row) },
                    { key: 'storage_uri', label: 'Storage URI', render: (row) => row.storage_uri || row.storageUri || row.forensic_path || 'n/a' },
                    { key: 'sha256', label: 'Hash / Checksum', render: (row) => row.sha256 || row.checksum || 'n/a' },
                    { key: 'size', label: 'Size', render: (row) => row.size || row.size_bytes || 'n/a' },
                    { key: 'content_type', label: 'Content Type' },
                    { key: 'action_name', label: 'Collection Action' },
                    { key: 'retention_until', label: 'Retention', render: (row) => formatDate(row.retention_until) },
                    { key: 'download', label: 'Download', render: (row) => <ActionButton requiredScopes={['forensics:download']} scopes={scopes} loading={mutation.loading} onClick={() => download(row.storage_uri || row.storageUri || row.forensic_path)}><Download size={16} /> Download</ActionButton> }
                ]}
            />
        </div>
    );
}

function ThreatHuntingPage({ operatorId, scopes }) {
    const [orgId, setOrgId] = React.useState('');
    const [iocType, setIocType] = React.useState('ip_address');
    const [iocValue, setIocValue] = React.useState('');
    const [huntId, setHuntId] = React.useState('');
    const [scheduleId, setScheduleId] = React.useState('');
    const [intervalSeconds, setIntervalSeconds] = React.useState('3600');
    const [enabled, setEnabled] = React.useState('true');
    const [metadataJson, setMetadataJson] = React.useState('{}');
    const [reason, setReason] = React.useState('');
    const huntLoader = React.useCallback(() => callSecurityService('hunts', '/api/v1/hunts', { query: { org_id: orgId } }), [orgId]);
    const scheduleLoader = React.useCallback(() => callSecurityService('hunts', '/api/v1/hunts/schedules', { query: { org_id: orgId } }), [orgId]);
    const hunts = useApiResource(huntLoader, [huntLoader], { autoRefreshMs: 30000 });
    const schedules = useApiResource(scheduleLoader, [scheduleLoader], { autoRefreshMs: 30000 });
    const mutation = useMutation();
    const huntRows = pickArray(hunts.data, ['hunts']);
    const scheduleRows = pickArray(schedules.data, ['schedules']);

    const sweepBody = () => ({ operator_id: operatorId || 'unknown-operator', org_id: orgId || undefined, ioc_type: iocType, ioc_value: iocValue, metadata: parseJson(metadataJson) });
    const submitSweep = () => mutation.run(() => callSecurityService('hunts', '/api/v1/hunts/ioc-sweeps', { method: 'POST', body: sweepBody() }));
    const createSchedule = () => mutation.run(() => callSecurityService('hunts', '/api/v1/hunts/schedules', { method: 'POST', body: { ...sweepBody(), interval_seconds: Number(intervalSeconds) } }));
    const patchSchedule = () => mutation.run(() => callSecurityService('hunts', `/api/v1/hunts/schedules/${encodeURIComponent(scheduleId)}`, {
        method: 'PATCH',
        body: { operator_id: operatorId || 'unknown-operator', reason, enabled: enabled === 'true', interval_seconds: Number(intervalSeconds), metadata: parseJson(metadataJson) }
    }));
    const deleteSchedule = () => {
        if (!reason || reason.trim().length < 8 || !window.confirm(`Delete schedule ${scheduleId}?`)) {
            return;
        }

        mutation.run(() => callSecurityService('hunts', `/api/v1/hunts/schedules/${encodeURIComponent(scheduleId)}`, { method: 'DELETE', body: { operator_id: operatorId || 'unknown-operator', reason } }));
    };
    const getHunt = () => mutation.run(() => callSecurityService('hunts', `/api/v1/hunts/${encodeURIComponent(huntId)}`));
    const getSchedule = () => mutation.run(() => callSecurityService('hunts', `/api/v1/hunts/schedules/${encodeURIComponent(scheduleId)}`));

    return (
        <div className="space-y-6">
            <PageHeader title="Threat Hunting UI" description={PAGE_TITLES['threat-hunting'][1]} onRefresh={() => { hunts.reload(); schedules.reload(); }} loading={hunts.loading || schedules.loading} />
            <ScopeHint requiredScopes={['hunts:read', 'hunts:create', 'hunts:schedule']} scopes={scopes} />
            <Panel title="IOC Sweep And Schedule Controls">
                <div className="grid gap-4 md:grid-cols-3">
                    <TextInput label="Org ID" value={orgId} onChange={setOrgId} />
                    <SelectInput label="IOC Type" value={iocType} onChange={setIocType} options={IOC_TYPES} />
                    <TextInput label="IOC Value" value={iocValue} onChange={setIocValue} />
                    <TextInput label="Hunt ID" value={huntId} onChange={setHuntId} />
                    <TextInput label="Schedule ID" value={scheduleId} onChange={setScheduleId} />
                    <TextInput label="Interval Seconds" value={intervalSeconds} onChange={setIntervalSeconds} />
                    <SelectInput label="Enabled" value={enabled} onChange={setEnabled} options={['true', 'false']} />
                    <TextInput label="Reason" value={reason} onChange={setReason} />
                </div>
                <div className="mt-4">
                    <TextArea label="Metadata JSON" value={metadataJson} onChange={setMetadataJson} rows={4} mono />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                    <ActionButton requiredScopes={['hunts:create']} scopes={scopes} loading={mutation.loading} onClick={submitSweep}>Submit IOC Sweep</ActionButton>
                    <ActionButton requiredScopes={['hunts:schedule']} scopes={scopes} loading={mutation.loading} onClick={createSchedule}>Create Schedule</ActionButton>
                    <ActionButton requiredScopes={['hunts:schedule']} scopes={scopes} loading={mutation.loading} onClick={patchSchedule}>Update Schedule</ActionButton>
                    <ActionButton requiredScopes={['hunts:schedule']} scopes={scopes} loading={mutation.loading} onClick={deleteSchedule} destructive>Delete Schedule</ActionButton>
                    <ActionButton requiredScopes={['hunts:read']} scopes={scopes} loading={mutation.loading} onClick={getHunt}>Get Hunt</ActionButton>
                    <ActionButton requiredScopes={['hunts:read']} scopes={scopes} loading={mutation.loading} onClick={getSchedule}>Get Schedule</ActionButton>
                </div>
            </Panel>
            {(hunts.error || schedules.error || mutation.error) && <Notice type="error">{hunts.error || schedules.error || mutation.error}</Notice>}
            <ResultBlock result={mutation.result} />
            <div className="grid gap-6 xl:grid-cols-2">
                <Panel title="Hunt Results">
                    <MiniTable rows={huntRows} emptyLabel="hunt results" columns={[
                        { key: 'hunt_id', label: 'Hunt ID', render: (row) => itemId(row) },
                        { key: 'ioc_type', label: 'IOC Type' },
                        { key: 'ioc_value', label: 'IOC Value' },
                        { key: 'status', label: 'Status' },
                        { key: 'matched_endpoints', label: 'Matches', render: (row) => renderValue(row.matched_endpoints || row.matches) },
                        { key: 'finished_at', label: 'Finished', render: (row) => formatDate(row.finished_at || row.updated_at) }
                    ]} />
                </Panel>
                <Panel title="Scheduled Hunts">
                    <MiniTable rows={scheduleRows} emptyLabel="scheduled hunts" columns={[
                        { key: 'schedule_id', label: 'Schedule ID', render: (row) => itemId(row) },
                        { key: 'ioc_type', label: 'IOC Type' },
                        { key: 'ioc_value', label: 'IOC Value' },
                        { key: 'enabled', label: 'Enabled', render: (row) => renderValue(row.enabled) },
                        { key: 'last_run_at', label: 'Last Run', render: (row) => formatDate(row.last_run_at) },
                        { key: 'next_run_at', label: 'Next Run', render: (row) => formatDate(row.next_run_at) }
                    ]} />
                </Panel>
            </div>
        </div>
    );
}

function AuditSearchPage({ scopes }) {
    const [filters, setFilters] = React.useState({ org_id: '', threat_event_id: '', action_name: '', status: '', start_time: '', end_time: '', limit: '50' });
    const [format, setFormat] = React.useState('json');
    const loader = React.useCallback(() => callSecurityService('audit', '/api/v1/audit/events', { query: filters }), [filters]);
    const { data, loading, error, reload } = useApiResource(loader, [loader], { autoRefreshMs: 30000 });
    const mutation = useMutation();
    const rows = pickArray(data, ['events']);
    const exportAudit = () => mutation.run(() => downloadSecurityServiceFile('audit', '/api/v1/audit/export', { query: { ...filters, format }, filename: `audit-events.${format}` }));

    return (
        <div className="space-y-6">
            <PageHeader title="Audit Search and Export UI" description={PAGE_TITLES['audit-compliance'][1]} onRefresh={reload} loading={loading} />
            <ScopeHint requiredScopes={['audit:read', 'audit:export']} scopes={scopes} />
            <Panel title="Audit Filters">
                <div className="grid gap-4 md:grid-cols-3">
                    {Object.entries(filters).map(([key, value]) => (
                        <TextInput key={key} label={key.replace(/_/g, ' ')} value={value} onChange={(next) => setFilters((current) => ({ ...current, [key]: next }))} />
                    ))}
                    <SelectInput label="Export Format" value={format} onChange={setFormat} options={['json', 'csv']} />
                </div>
                <div className="mt-4">
                    <ActionButton requiredScopes={['audit:export']} scopes={scopes} loading={mutation.loading} onClick={exportAudit}><Download size={16} /> Export Audit Events</ActionButton>
                </div>
            </Panel>
            {(error || mutation.error) && <Notice type="error">{error || mutation.error}</Notice>}
            <ResultBlock result={mutation.result} />
            <MiniTable
                rows={rows}
                emptyLabel="audit events"
                columns={[
                    { key: 'event_id', label: 'Event ID', render: (row) => itemId(row) },
                    { key: 'org_id', label: 'Org' },
                    { key: 'action_name', label: 'Action' },
                    { key: 'status', label: 'Status' },
                    { key: 'operator_id', label: 'Operator' },
                    { key: 'threat_event_id', label: 'Threat Event' },
                    { key: 'execution_id', label: 'Execution', render: (row) => row.execution_id || row.playbook_execution_id || 'n/a' },
                    { key: 'approval_id', label: 'Approval' },
                    { key: 'evidence_id', label: 'Evidence' },
                    { key: 'event_hash', label: 'Integrity Hash', render: (row) => row.event_hash || row.hash || row.sha256 || 'n/a' },
                    { key: 'timestamp', label: 'Time', render: (row) => formatDate(row.timestamp || row.indexed_at) }
                ]}
            />
        </div>
    );
}

function RbacHelperPage({ scopes, refreshScopes }) {
    const [token, setToken] = React.useState(() => getConfiguredApiToken());
    const [scopeText, setScopeText] = React.useState(() => getConfiguredScopes().join(' '));

    const save = () => {
        setConfiguredApiToken(token);
        setConfiguredScopes(scopeText);
        refreshScopes();
    };
    const clear = () => {
        setToken('');
        setScopeText('');
        clearConfiguredAccess();
        refreshScopes();
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Settings and RBAC Helper Page" description={PAGE_TITLES['config-management'][1]} />
            <Panel title="Bearer Token And Scope Storage">
                <Notice>Use this when Keycloak is not providing the API token/scopes. Tokens are stored in browser localStorage on this workstation.</Notice>
                <div className="mt-4 grid gap-4">
                    <TextArea label="API Bearer Token" value={token} onChange={setToken} rows={4} mono />
                    <TextArea label="Configured Scopes" value={scopeText} onChange={setScopeText} rows={3} />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                    <Button type="button" onClick={save} variant="success">Save Access Config</Button>
                    <Button type="button" onClick={clear} variant="warningOutline">Clear</Button>
                </div>
            </Panel>
            <Panel title="Scope Groups Required By UI">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {REQUIRED_SCOPE_GROUPS.map((scope) => {
                        const hasScope = hasRequiredScopes([scope.replace(':*', ':read')], scopes) !== false || scopes.includes(scope) || scopes.includes('*');
                        return (
                            <div key={scope} className={`rounded-2xl border p-4 text-sm ${hasScope ? 'border-success/25 bg-success/10 text-success' : 'border-warning/25 bg-warning/10 text-warning'}`}>
                                <div className="font-semibold">{scope}</div>
                                <div className="mt-1">{hasScope ? 'configured' : 'not configured locally'}</div>
                            </div>
                        );
                    })}
                </div>
            </Panel>
            <ApiNeedsPanel />
        </div>
    );
}

function resolvePage(viewId) {
    if (['response-dashboard', 'response-metrics', 'automation-ops'].includes(viewId)) return 'overview';
    if (viewId === 'approvals') return 'approvals';
    if (['playbook-orchestration', 'playbook-ops', 'execution-control'].includes(viewId)) return 'playbooks';
    if (['playbook-automation', 'playbook-templates', 'testing-validation'].includes(viewId)) return 'config';
    if (['response-governance', 'safety-checks', 'rate-limits', 'graduated-response'].includes(viewId)) return 'governance';
    if (['manual-operations', 'soc-override'].includes(viewId)) return 'manual';
    if (['response-center', 'rollback'].includes(viewId)) return 'response-admin';
    if (['forensic-storage', 'forensic-retention', 'enhanced-forensics', 'collected-artifacts'].includes(viewId)) return 'forensics';
    if (['hunting', 'threat-hunting'].includes(viewId)) return 'hunts';
    if (['audit-trail', 'audit-compliance'].includes(viewId)) return 'audit';
    if (['integrations', 'performance', 'reliability'].includes(viewId)) return 'platform';
    if (viewId === 'config-management') return 'rbac';
    return 'overview';
}

function formatRelativeTimeFeed(value) {
    if (!value) return 'Unknown';
    const ts = new Date(value).getTime();
    if (Number.isNaN(ts)) return 'Unknown';
    const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function feedSeverityStyle(severity = '') {
    switch (String(severity).toLowerCase()) {
        case 'critical':
            return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700';
        case 'high':
            return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700';
        case 'medium':
            return 'bg-warning/15 text-warning border-warning/35';
        default:
            return 'bg-muted text-muted-foreground border-border';
    }
}

function feedSourceStyle(source = '') {
    switch (source) {
        case 'EDR':
            return 'bg-info/15 text-info border border-info/30';
        case 'Response':
            return 'bg-accent text-accent-foreground border border-primary/20';
        default:
            return 'bg-primary/10 text-primary border border-primary/20';
    }
}

const NOTIFICATION_PAGE_SIZE = 6;

function NotificationFeed({ moduleId, viewId, timeRange = '24h' }) {
    const [alerts, setAlerts] = React.useState([]);
    const [total, setTotal] = React.useState(0);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [collapsed, setCollapsed] = React.useState(true);
    const [page, setPage] = React.useState(0);

    const load = React.useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const payload = await fetchScopedAlerts({
                timeRange,
                size: NOTIFICATION_PAGE_SIZE,
                from: page * NOTIFICATION_PAGE_SIZE,
                moduleId,
                viewId
            });
            setAlerts(payload.items);
            setTotal(payload.total);
        } catch (e) {
            setError(e.message || 'Failed to load notifications');
        } finally {
            setLoading(false);
        }
    }, [timeRange, moduleId, viewId, page]);

    React.useEffect(() => {
        setPage(0);
    }, [timeRange, moduleId, viewId]);

    React.useEffect(() => {
        load();
    }, [load]);

    React.useEffect(() => {
        const handler = () => load();
        window.addEventListener(ALERT_READ_STATE_EVENT, handler);
        return () => window.removeEventListener(ALERT_READ_STATE_EVENT, handler);
    }, [load]);

    // Auto-refresh every 60s
    React.useEffect(() => {
        const timer = window.setInterval(load, 60000);
        return () => window.clearInterval(timer);
    }, [load]);

    const totalPages = Math.max(1, Math.ceil(total / NOTIFICATION_PAGE_SIZE));

    React.useEffect(() => {
        setPage((current) => Math.min(current, Math.max(0, totalPages - 1)));
    }, [totalPages]);

    if (total === 0 && !loading && !error) {
        return null;
    }

    const dismiss = (alert) => {
        markAlertAsRead(alert, [{ moduleId, viewId }]);
        setAlerts((current) => current.filter((a) => a.id !== alert.id));
        setTotal((current) => Math.max(0, current - 1));
    };

    const pageStart = total === 0 ? 0 : page * NOTIFICATION_PAGE_SIZE + 1;
    const pageEnd = Math.min(total, page * NOTIFICATION_PAGE_SIZE + alerts.length);

    return (
        <section className="rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card to-accent shadow-[0_20px_60px_rgba(37,99,235,0.16)] overflow-hidden">
            <button
                onClick={() => setCollapsed((c) => !c)}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-primary/10 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground shadow-sm">
                        <Bell size={16} />
                    </div>
                    <div>
                        <span className="text-sm font-semibold text-text-main">Notifications</span>
                        {total > 0 && (
                            <span className="ml-2 inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-semibold leading-none text-primary-foreground">
                                {total > 99 ? '99+' : total}
                            </span>
                        )}
                    </div>
                </div>
                <span className="text-xs text-text-muted">{collapsed ? 'Show' : 'Hide'}</span>
            </button>

            {!collapsed && (
                <div className="border-t border-border-subtle">
                    {error && (
                        <div className="px-5 py-3 text-sm text-destructive flex items-center gap-2">
                            <AlertTriangle size={14} />
                            <span>{error}</span>
                        </div>
                    )}

                    {loading && alerts.length === 0 && (
                        <div className="px-5 py-6 text-sm text-text-muted flex items-center gap-2">
                            <Loader2 size={14} className="animate-spin" />
                            <span>Loading notifications…</span>
                        </div>
                    )}

                    {!error && !loading && alerts.length === 0 && total === 0 && (
                        <div className="px-5 py-6 text-sm text-text-muted flex items-center gap-2">
                            <ShieldAlert size={14} />
                            <span>No unread notifications for this view.</span>
                        </div>
                    )}

                    {alerts.length > 0 && (
                        <div className="divide-y divide-border-subtle">
                            {alerts.map((alert) => (
                                <div
                                    key={alert.id}
                                    className="flex items-start gap-3 px-5 py-3 hover:bg-bg-input/30 transition-colors group"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${feedSourceStyle(alert.source)}`}>
                                                {alert.source}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${feedSeverityStyle(alert.severity)}`}>
                                                {alert.severity}
                                            </span>
                                            <span className="text-[11px] text-text-muted ml-auto">
                                                {formatRelativeTimeFeed(alert.timestamp)}
                                            </span>
                                        </div>
                                        <div className="text-sm font-semibold text-text-main truncate">{alert.title}</div>
                                        {alert.summary && (
                                            <div className="text-xs text-text-muted mt-0.5 line-clamp-2">{alert.summary}</div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => dismiss(alert)}
                                        className="shrink-0 p-1.5 rounded-full text-text-muted hover:text-text-main hover:bg-bg-input transition-colors opacity-0 group-hover:opacity-100"
                                        title="Dismiss notification"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {!loading && total > 0 && alerts.length === 0 && (
                        <div className="px-5 py-6 text-sm text-text-muted flex items-center gap-2">
                            <ShieldAlert size={14} />
                            <span>No notifications on this page.</span>
                        </div>
                    )}

                    {total > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle bg-bg-input/40 px-5 py-3 text-xs text-text-muted">
                            <span>
                                Showing {pageStart}-{pageEnd} of {total}
                            </span>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="infoOutline"
                                    size="sm"
                                    disabled={loading || page === 0}
                                    onClick={() => setPage((current) => Math.max(0, current - 1))}
                                >
                                    Previous
                                </Button>
                                <Badge variant="info" className="rounded-full">
                                    Page {page + 1} / {totalPages}
                                </Badge>
                                <Button
                                    type="button"
                                    variant="info"
                                    size="sm"
                                    disabled={loading || page >= totalPages - 1}
                                    onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}

export function SocAutomationPage({ activeView, moduleId, operatorId, timeRange = '24h' }) {
    const [scopes, setScopes] = React.useState(() => getConfiguredScopes());
    const page = resolvePage(activeView);
    const refreshScopes = () => setScopes(getConfiguredScopes());

    React.useEffect(() => {
        refreshScopes();
    }, [activeView]);

    return (
        <div className="space-y-6">
            <NotificationFeed moduleId={moduleId} viewId={activeView} timeRange={timeRange} />
            {page === 'overview' && <OverviewPage scopes={scopes} />}
            {page === 'approvals' && <ApprovalDashboard operatorId={operatorId} scopes={scopes} />}
            {page === 'playbooks' && <PlaybookMonitor operatorId={operatorId} scopes={scopes} />}
            {page === 'config' && <ConfigSimulation scopes={scopes} />}
            {page === 'governance' && <GovernancePage activeView={activeView} scopes={scopes} />}
            {page === 'manual' && <ManualResponsePage operatorId={operatorId} scopes={scopes} />}
            {page === 'response-admin' && <ResponseAdminPage operatorId={operatorId} scopes={scopes} />}
            {page === 'forensics' && <ForensicEvidencePage operatorId={operatorId} scopes={scopes} />}
            {page === 'hunts' && <ThreatHuntingPage operatorId={operatorId} scopes={scopes} />}
            {page === 'audit' && <AuditSearchPage scopes={scopes} />}
            {page === 'platform' && <PlatformStatusPage activeView={activeView} scopes={scopes} />}
            {page === 'rbac' && <RbacHelperPage scopes={scopes} refreshScopes={refreshScopes} />}
            <div className="rounded-2xl border border-border-subtle bg-bg-card/70 p-4 text-xs text-text-muted">
                Active module: <span className="font-semibold text-text-main">{moduleId}</span>. Backend RBAC remains authoritative; local scopes only hide or disable clearly unauthorized UI actions.
            </div>
        </div>
    );
}
