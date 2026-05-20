import React from 'react';
import { AlertTriangle, CheckCircle, Download, Loader2, Send, ShieldCheck } from 'lucide-react';
import { callSecurityService, downloadSecurityServiceFile } from '../../api/securityServices';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';

const DEFAULT_FORM = {
    org_id: '',
    execution_id: '',
    approval_id: '',
    hunt_id: '',
    schedule_id: '',
    failed_action_id: '',
    action_result_id: '',
    rollback_action: 'restore_network',
    storage_uri: '',
    format: 'json',
    action_name: '',
    policy_name: '',
    threat_event_id: '',
    ioc_type: 'ip_address',
    ioc_value: '',
    interval_seconds: '3600',
    enabled: 'true',
    ids: '',
    reason: '',
    config_json: '{}',
    simulation_json: '{}',
    context_json: '{}',
    metadata_json: '{}',
    artifact_names: ''
};

const FIELD_LABELS = {
    org_id: 'Organization ID',
    execution_id: 'Playbook Execution ID',
    approval_id: 'Approval ID',
    hunt_id: 'Hunt ID',
    schedule_id: 'Schedule ID',
    failed_action_id: 'Failed Action ID',
    action_result_id: 'Action Result ID',
    rollback_action: 'Rollback Action',
    storage_uri: 'Storage URI',
    format: 'Export Format',
    action_name: 'Action Name',
    policy_name: 'Policy Name',
    threat_event_id: 'Threat Event ID',
    ioc_type: 'IOC Type',
    ioc_value: 'IOC Value',
    interval_seconds: 'Interval Seconds',
    enabled: 'Enabled',
    ids: 'IDs',
    reason: 'Reason',
    config_json: 'Config JSON',
    simulation_json: 'Simulation JSON',
    context_json: 'Context JSON',
    metadata_json: 'Metadata JSON',
    artifact_names: 'Artifact Names'
};

const IOC_TYPES = ['file_hash', 'ip_address', 'domain', 'process_name', 'file_path', 'registry_key'];
const ROLLBACK_ACTIONS = ['restore_quarantined_file', 'unblock_ip', 'restore_network', 'restore_persistence'];

function csv(value) {
    return String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function parseJson(value, fallback = {}) {
    const raw = String(value || '').trim();

    if (!raw) {
        return fallback;
    }

    return JSON.parse(raw);
}

function baseMutationBody(form, operatorId) {
    return {
        operator_id: operatorId || 'unknown-operator',
        reason: form.reason.trim()
    };
}

const OPERATIONS = [
    {
        id: 'playbook-metrics',
        group: 'Observability',
        label: 'Playbook Metrics',
        service: 'playbooks',
        method: 'GET',
        path: () => '/metrics',
        fields: [],
        description: 'Fetch Playbook Service Prometheus metrics.'
    },
    {
        id: 'approval-metrics',
        group: 'Observability',
        label: 'Approval Metrics',
        service: 'approvals',
        method: 'GET',
        path: () => '/metrics',
        fields: [],
        description: 'Fetch Approval Service Prometheus metrics.'
    },
    {
        id: 'response-metrics',
        group: 'Observability',
        label: 'Response Metrics',
        service: 'response',
        method: 'GET',
        path: () => '/metrics',
        fields: [],
        description: 'Fetch Response Service Prometheus metrics.'
    },
    {
        id: 'audit-metrics',
        group: 'Observability',
        label: 'Audit Metrics',
        service: 'audit',
        method: 'GET',
        path: () => '/metrics',
        fields: [],
        description: 'Fetch Audit Service Prometheus metrics.'
    },
    {
        id: 'hunt-metrics',
        group: 'Observability',
        label: 'Threat Hunting Metrics',
        service: 'hunts',
        method: 'GET',
        path: () => '/metrics',
        fields: [],
        description: 'Fetch Threat Hunting Service Prometheus metrics.'
    },
    {
        id: 'playbook-config',
        group: 'Playbook',
        label: 'Config Snapshot',
        service: 'playbooks',
        method: 'GET',
        path: () => '/api/v1/playbooks/config',
        fields: [],
        description: 'Return the public playbook policy config snapshot.'
    },
    {
        id: 'playbook-list',
        group: 'Playbook',
        label: 'List Executions',
        service: 'playbooks',
        method: 'GET',
        path: () => '/api/v1/playbooks/executions',
        query: (form) => ({ org_id: form.org_id }),
        fields: ['org_id'],
        description: 'List playbook executions for an organization.'
    },
    {
        id: 'playbook-get',
        group: 'Playbook',
        label: 'Get Execution',
        service: 'playbooks',
        method: 'GET',
        path: (form) => `/api/v1/playbooks/executions/${encodeURIComponent(form.execution_id)}`,
        fields: ['execution_id'],
        required: ['execution_id'],
        description: 'Fetch one playbook execution by ID.'
    },
    {
        id: 'playbook-pause',
        group: 'Playbook',
        label: 'Pause Execution',
        service: 'playbooks',
        method: 'POST',
        path: (form) => `/api/v1/playbooks/executions/${encodeURIComponent(form.execution_id)}/pause`,
        body: (form, operatorId) => baseMutationBody(form, operatorId),
        fields: ['execution_id', 'reason'],
        required: ['execution_id', 'reason'],
        description: 'Pause remaining playbook steps through Playbook Service.'
    },
    {
        id: 'playbook-resume',
        group: 'Playbook',
        label: 'Resume Execution',
        service: 'playbooks',
        method: 'POST',
        path: (form) => `/api/v1/playbooks/executions/${encodeURIComponent(form.execution_id)}/resume`,
        body: (form, operatorId) => baseMutationBody(form, operatorId),
        fields: ['execution_id', 'reason'],
        required: ['execution_id', 'reason'],
        description: 'Resume a paused playbook execution.'
    },
    {
        id: 'playbook-cancel',
        group: 'Playbook',
        label: 'Cancel Execution',
        service: 'playbooks',
        method: 'POST',
        path: (form) => `/api/v1/playbooks/executions/${encodeURIComponent(form.execution_id)}/cancel`,
        body: (form, operatorId) => baseMutationBody(form, operatorId),
        fields: ['execution_id', 'reason'],
        required: ['execution_id', 'reason'],
        description: 'Cancel remaining playbook steps and publish a cancellation event.'
    },
    {
        id: 'playbook-context',
        group: 'Playbook',
        label: 'Update Context',
        service: 'playbooks',
        method: 'PATCH',
        path: (form) => `/api/v1/playbooks/executions/${encodeURIComponent(form.execution_id)}/context`,
        body: (form, operatorId) => ({
            ...baseMutationBody(form, operatorId),
            context: parseJson(form.context_json)
        }),
        fields: ['execution_id', 'context_json', 'reason'],
        required: ['execution_id', 'context_json', 'reason'],
        description: 'Modify execution context while a playbook is paused.'
    },
    {
        id: 'playbook-validate',
        group: 'Playbook',
        label: 'Validate Config',
        service: 'playbooks',
        method: 'POST',
        path: () => '/api/v1/playbooks/config/validate',
        body: (form) => parseJson(form.config_json),
        fields: ['config_json'],
        required: ['config_json'],
        noConfirm: true,
        description: 'Validate policy YAML/JSON before applying it.'
    },
    {
        id: 'playbook-simulate',
        group: 'Playbook',
        label: 'Simulate Policy',
        service: 'playbooks',
        method: 'POST',
        path: () => '/api/v1/playbooks/simulate',
        body: (form) => parseJson(form.simulation_json),
        fields: ['simulation_json'],
        required: ['simulation_json'],
        noConfirm: true,
        description: 'Run dry policy simulation without triggering response actions.'
    },
    {
        id: 'approval-list',
        group: 'Approval',
        label: 'List Approvals',
        service: 'approvals',
        method: 'GET',
        path: () => '/api/v1/approvals',
        query: (form) => ({ org_id: form.org_id }),
        fields: ['org_id'],
        description: 'List pending approval requests.'
    },
    {
        id: 'approval-approve',
        group: 'Approval',
        label: 'Approve Request',
        service: 'approvals',
        method: 'POST',
        path: (form) => `/api/v1/approvals/${encodeURIComponent(form.approval_id)}/approve`,
        body: (form, operatorId) => baseMutationBody(form, operatorId),
        fields: ['approval_id', 'reason'],
        required: ['approval_id', 'reason'],
        description: 'Approve one pending response action.'
    },
    {
        id: 'approval-reject',
        group: 'Approval',
        label: 'Reject Request',
        service: 'approvals',
        method: 'POST',
        path: (form) => `/api/v1/approvals/${encodeURIComponent(form.approval_id)}/reject`,
        body: (form, operatorId) => baseMutationBody(form, operatorId),
        fields: ['approval_id', 'reason'],
        required: ['approval_id', 'reason'],
        description: 'Reject one pending response action with a reason.'
    },
    {
        id: 'approval-bulk-approve',
        group: 'Approval',
        label: 'Bulk Approve',
        service: 'approvals',
        method: 'POST',
        path: () => '/api/v1/approvals/bulk/approve',
        body: (form, operatorId) => ({
            ...baseMutationBody(form, operatorId),
            ids: csv(form.ids),
            action_name: form.action_name || undefined
        }),
        fields: ['ids', 'action_name', 'reason'],
        required: ['reason'],
        description: 'Bulk approve approval requests by IDs or action filter.'
    },
    {
        id: 'approval-bulk-reject',
        group: 'Approval',
        label: 'Bulk Reject',
        service: 'approvals',
        method: 'POST',
        path: () => '/api/v1/approvals/bulk/reject',
        body: (form, operatorId) => ({
            ...baseMutationBody(form, operatorId),
            ids: csv(form.ids),
            action_name: form.action_name || undefined
        }),
        fields: ['ids', 'action_name', 'reason'],
        required: ['reason'],
        description: 'Bulk reject approval requests by IDs or action filter.'
    },
    {
        id: 'response-replay',
        group: 'Response',
        label: 'Replay DLQ Action',
        service: 'response',
        method: 'POST',
        path: () => '/api/v1/response/replay',
        body: (form, operatorId) => ({
            ...baseMutationBody(form, operatorId),
            action_id: form.failed_action_id
        }),
        fields: ['failed_action_id', 'reason'],
        required: ['failed_action_id', 'reason'],
        description: 'Replay a failed or dead-lettered response action.'
    },
    {
        id: 'response-rollback',
        group: 'Response',
        label: 'Queue Rollback',
        service: 'response',
        method: 'POST',
        path: () => '/api/v1/response/rollback',
        body: (form, operatorId) => ({
            ...baseMutationBody(form, operatorId),
            action_result_id: form.action_result_id,
            rollback_action: form.rollback_action
        }),
        fields: ['action_result_id', 'rollback_action', 'reason'],
        required: ['action_result_id', 'rollback_action', 'reason'],
        description: 'Queue rollback from a completed response result.'
    },
    {
        id: 'response-download-forensics',
        group: 'Response',
        label: 'Download Evidence',
        service: 'response',
        method: 'DOWNLOAD',
        path: () => '/api/v1/response/forensics/download',
        query: (form) => ({ storage_uri: form.storage_uri }),
        fields: ['storage_uri'],
        required: ['storage_uri'],
        description: 'Download stored forensic evidence by storage_uri.'
    },
    {
        id: 'response-validate-artifacts',
        group: 'Response',
        label: 'Validate Artifacts',
        service: 'response',
        method: 'POST',
        path: () => '/api/v1/response/artifacts/validate',
        body: (form) => ({ artifact_names: csv(form.artifact_names) }),
        fields: ['artifact_names'],
        required: ['artifact_names'],
        noConfirm: true,
        description: 'Validate response artifact names under the artifact root.'
    },
    {
        id: 'audit-events',
        group: 'Audit',
        label: 'Query Audit Events',
        service: 'audit',
        method: 'GET',
        path: () => '/api/v1/audit/events',
        query: (form) => ({
            org_id: form.org_id,
            threat_event_id: form.threat_event_id,
            action_name: form.action_name,
            policy_name: form.policy_name
        }),
        fields: ['org_id', 'threat_event_id', 'action_name', 'policy_name'],
        description: 'Query audit trail events with filters.'
    },
    {
        id: 'audit-export',
        group: 'Audit',
        label: 'Export Audit Events',
        service: 'audit',
        method: 'DOWNLOAD',
        path: () => '/api/v1/audit/export',
        query: (form) => ({
            format: form.format,
            org_id: form.org_id,
            threat_event_id: form.threat_event_id,
            action_name: form.action_name,
            policy_name: form.policy_name
        }),
        fields: ['format', 'org_id', 'threat_event_id', 'action_name', 'policy_name'],
        description: 'Export audit events as JSON or CSV.'
    },
    {
        id: 'forensics-evidence',
        group: 'Audit',
        label: 'Query Evidence Catalog',
        service: 'audit',
        method: 'GET',
        path: () => '/api/v1/forensics/evidence',
        query: (form) => ({ org_id: form.org_id, threat_event_id: form.threat_event_id }),
        fields: ['org_id', 'threat_event_id'],
        description: 'Query forensic evidence catalog entries.'
    },
    {
        id: 'forensics-export',
        group: 'Audit',
        label: 'Export Evidence Catalog',
        service: 'audit',
        method: 'DOWNLOAD',
        path: () => '/api/v1/forensics/export',
        query: (form) => ({ format: form.format, org_id: form.org_id, threat_event_id: form.threat_event_id }),
        fields: ['format', 'org_id', 'threat_event_id'],
        description: 'Export forensic evidence catalog as JSON or CSV.'
    },
    {
        id: 'hunt-ioc-sweep',
        group: 'Threat Hunting',
        label: 'Submit IOC Sweep',
        service: 'hunts',
        method: 'POST',
        path: () => '/api/v1/hunts/ioc-sweeps',
        body: (form, operatorId) => ({
            operator_id: operatorId || 'unknown-operator',
            org_id: form.org_id || undefined,
            ioc_type: form.ioc_type,
            ioc_value: form.ioc_value,
            metadata: parseJson(form.metadata_json)
        }),
        fields: ['org_id', 'ioc_type', 'ioc_value', 'metadata_json'],
        required: ['ioc_type', 'ioc_value'],
        description: 'Submit IOC sweep hunt across endpoints.'
    },
    {
        id: 'hunt-list',
        group: 'Threat Hunting',
        label: 'List Hunts',
        service: 'hunts',
        method: 'GET',
        path: () => '/api/v1/hunts',
        query: (form) => ({ org_id: form.org_id }),
        fields: ['org_id'],
        description: 'List hunt results.'
    },
    {
        id: 'hunt-get',
        group: 'Threat Hunting',
        label: 'Get Hunt',
        service: 'hunts',
        method: 'GET',
        path: (form) => `/api/v1/hunts/${encodeURIComponent(form.hunt_id)}`,
        fields: ['hunt_id'],
        required: ['hunt_id'],
        description: 'Fetch one hunt result by ID.'
    },
    {
        id: 'hunt-schedule-create',
        group: 'Threat Hunting',
        label: 'Create Scheduled Hunt',
        service: 'hunts',
        method: 'POST',
        path: () => '/api/v1/hunts/schedules',
        body: (form, operatorId) => ({
            operator_id: operatorId || 'unknown-operator',
            org_id: form.org_id || undefined,
            ioc_type: form.ioc_type,
            ioc_value: form.ioc_value,
            interval_seconds: Number(form.interval_seconds),
            metadata: parseJson(form.metadata_json)
        }),
        fields: ['org_id', 'ioc_type', 'ioc_value', 'interval_seconds', 'metadata_json'],
        required: ['ioc_type', 'ioc_value', 'interval_seconds'],
        description: 'Create a recurring IOC hunt schedule.'
    },
    {
        id: 'hunt-schedule-list',
        group: 'Threat Hunting',
        label: 'List Hunt Schedules',
        service: 'hunts',
        method: 'GET',
        path: () => '/api/v1/hunts/schedules',
        query: (form) => ({ org_id: form.org_id }),
        fields: ['org_id'],
        description: 'List scheduled recurring hunts.'
    },
    {
        id: 'hunt-schedule-get',
        group: 'Threat Hunting',
        label: 'Get Hunt Schedule',
        service: 'hunts',
        method: 'GET',
        path: (form) => `/api/v1/hunts/schedules/${encodeURIComponent(form.schedule_id)}`,
        fields: ['schedule_id'],
        required: ['schedule_id'],
        description: 'Fetch one scheduled recurring hunt.'
    },
    {
        id: 'hunt-schedule-patch',
        group: 'Threat Hunting',
        label: 'Patch Hunt Schedule',
        service: 'hunts',
        method: 'PATCH',
        path: (form) => `/api/v1/hunts/schedules/${encodeURIComponent(form.schedule_id)}`,
        body: (form, operatorId) => ({
            ...baseMutationBody(form, operatorId),
            enabled: form.enabled === 'true',
            interval_seconds: Number(form.interval_seconds),
            metadata: parseJson(form.metadata_json)
        }),
        fields: ['schedule_id', 'enabled', 'interval_seconds', 'metadata_json', 'reason'],
        required: ['schedule_id', 'reason'],
        description: 'Enable, disable, update interval, or replace metadata for a scheduled hunt.'
    },
    {
        id: 'hunt-schedule-delete',
        group: 'Threat Hunting',
        label: 'Delete Hunt Schedule',
        service: 'hunts',
        method: 'DELETE',
        path: (form) => `/api/v1/hunts/schedules/${encodeURIComponent(form.schedule_id)}`,
        body: (form, operatorId) => baseMutationBody(form, operatorId),
        fields: ['schedule_id', 'reason'],
        required: ['schedule_id', 'reason'],
        description: 'Remove a scheduled recurring hunt.'
    }
];

const OPERATION_GROUPS = OPERATIONS.reduce((groups, item) => {
    groups[item.group] = [...(groups[item.group] || []), item];
    return groups;
}, {});

function operationById(id) {
    return OPERATIONS.find((operation) => operation.id === id) || OPERATIONS[0];
}

function fieldInputType(field) {
    if (field.endsWith('_json')) {
        return 'textarea';
    }

    if (field === 'format') {
        return 'format';
    }

    if (field === 'ioc_type') {
        return 'ioc_type';
    }

    if (field === 'enabled') {
        return 'enabled';
    }

    if (field === 'rollback_action') {
        return 'rollback_action';
    }

    return 'text';
}

function renderValue(value) {
    if (typeof value === 'string') {
        return value;
    }

    return JSON.stringify(value, null, 2);
}

export function SocOperationsDialog({ isOpen, onClose, operatorId, moduleId, viewId }) {
    const [operationId, setOperationId] = React.useState('playbook-list');
    const [form, setForm] = React.useState(DEFAULT_FORM);
    const [confirmed, setConfirmed] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);
    const [error, setError] = React.useState('');
    const [result, setResult] = React.useState(null);

    const operation = operationById(operationId);
    const isMutation = !['GET', 'DOWNLOAD'].includes(operation.method);
    const needsConfirmation = isMutation && !operation.noConfirm;
    const missingField = (operation.required || []).find((field) => {
        if (field === 'reason') {
            return form.reason.trim().length < 8;
        }

        return !String(form[field] || '').trim();
    });
    const canSubmit = !submitting && !missingField && (!needsConfirmation || confirmed);

    React.useEffect(() => {
        if (!isOpen) {
            return;
        }

        setError('');
        setResult(null);
        setConfirmed(false);
    }, [isOpen, operationId]);

    if (!isOpen) {
        return null;
    }

    const setField = (field, value) => {
        setForm((current) => ({
            ...current,
            [field]: value
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!canSubmit) {
            return;
        }

        try {
            setSubmitting(true);
            setError('');
            setResult(null);

            if (operation.method === 'DOWNLOAD') {
                const downloadResult = await downloadSecurityServiceFile(operation.service, operation.path(form), {
                    query: operation.query?.(form),
                    filename: `${operation.id}.${form.format || 'bin'}`
                });
                setResult(downloadResult);
                return;
            }

            const nextResult = await callSecurityService(operation.service, operation.path(form), {
                method: operation.method,
                query: operation.query?.(form),
                body: operation.body?.(form, operatorId)
            });
            setResult(nextResult);
        } catch (submitError) {
            setError(submitError.message || 'SOC operation failed.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
            <DialogContent className="flex h-[86vh] max-w-6xl flex-col gap-0 overflow-hidden border-primary/25 p-0" showClose>
                <form onSubmit={handleSubmit} className="flex h-full flex-col">
                <DialogHeader className="shrink-0 border-b bg-muted/30 px-7 py-5">
                    <div>
                        <Badge variant="info" className="w-fit gap-2 uppercase tracking-[0.18em]">
                            <ShieldCheck size={14} />
                            SOC Service Controls
                        </Badge>
                        <DialogTitle className="mt-3 text-2xl">EDR and Unified API Operations</DialogTitle>
                        <DialogDescription className="max-w-3xl text-sm">
                            Execute approved service operations through same-origin proxies. Mutating calls require confirmation and should still be authorized by the backend.
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto">
                    <div className="grid gap-6 bg-background/70 p-7 lg:grid-cols-[0.85fr_1.15fr]">
                    <div className="flex flex-col gap-4">
                        <label className="flex flex-col gap-2">
                            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Operation</span>
                            <Select value={operationId} onValueChange={setOperationId}>
                                <SelectTrigger className="h-12 rounded-md">
                                    <SelectValue placeholder="Select operation" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(OPERATION_GROUPS).map(([group, operations]) => (
                                        <SelectGroup key={group}>
                                            <SelectLabel>{group}</SelectLabel>
                                            {operations.map((item) => (
                                                <SelectItem key={item.id} value={item.id}>
                                                    {item.label}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    ))}
                                </SelectContent>
                            </Select>
                        </label>

                        <div className="rounded-xl border border-info/25 bg-info/10 p-4 text-sm">
                            <div className="font-semibold text-text-main">{operation.group} Service</div>
                            <div className="mt-1 text-text-muted">{operation.description}</div>
                            <div className="mt-3 rounded-xl border border-info/20 bg-card px-3 py-2 font-mono text-xs text-info">
                                {operation.method} {operation.path(form)}
                            </div>
                        </div>

                        <div className="rounded-xl border bg-card p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Dashboard Context</div>
                            <div className="mt-3 grid gap-2 text-sm">
                                <div className="flex justify-between gap-3">
                                    <span className="text-text-muted">Module</span>
                                    <span className="font-semibold text-text-main">{moduleId || 'n/a'}</span>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <span className="text-text-muted">View</span>
                                    <span className="font-semibold text-text-main">{viewId || 'n/a'}</span>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <span className="text-text-muted">Operator</span>
                                    <span className="font-semibold text-text-main">{operatorId || 'unknown'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 rounded-xl border bg-card p-5">
                        <div className="grid gap-4 md:grid-cols-2">
                            {operation.fields.map((field) => {
                                const type = fieldInputType(field);

                                if (type === 'textarea') {
                                    return (
                                        <label key={field} className="flex flex-col gap-2 md:col-span-2">
                                            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                                {FIELD_LABELS[field]} {(operation.required || []).includes(field) ? '*' : ''}
                                            </span>
                                            <Textarea
                                                value={form[field]}
                                                onChange={(event) => setField(field, event.target.value)}
                                                rows={field === 'metadata_json' ? 3 : 5}
                                                className="resize-none font-mono text-xs"
                                            />
                                        </label>
                                    );
                                }

                                if (type === 'format') {
                                    return (
                                        <label key={field} className="flex flex-col gap-2">
                                            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{FIELD_LABELS[field]}</span>
                                            <Select value={form[field]} onValueChange={(value) => setField(field, value)}>
                                                <SelectTrigger className="h-12 rounded-md"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectGroup>
                                                        <SelectItem value="json">JSON</SelectItem>
                                                        <SelectItem value="csv">CSV</SelectItem>
                                                    </SelectGroup>
                                                </SelectContent>
                                            </Select>
                                        </label>
                                    );
                                }

                                if (type === 'ioc_type') {
                                    return (
                                        <label key={field} className="flex flex-col gap-2">
                                            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{FIELD_LABELS[field]} *</span>
                                            <Select value={form[field]} onValueChange={(value) => setField(field, value)}>
                                                <SelectTrigger className="h-12 rounded-md"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectGroup>
                                                        {IOC_TYPES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                                                    </SelectGroup>
                                                </SelectContent>
                                            </Select>
                                        </label>
                                    );
                                }

                                if (type === 'enabled') {
                                    return (
                                        <label key={field} className="flex flex-col gap-2">
                                            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{FIELD_LABELS[field]}</span>
                                            <Select value={form[field]} onValueChange={(value) => setField(field, value)}>
                                                <SelectTrigger className="h-12 rounded-md"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectGroup>
                                                        <SelectItem value="true">true</SelectItem>
                                                        <SelectItem value="false">false</SelectItem>
                                                    </SelectGroup>
                                                </SelectContent>
                                            </Select>
                                        </label>
                                    );
                                }

                                if (type === 'rollback_action') {
                                    return (
                                        <label key={field} className="flex flex-col gap-2">
                                            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{FIELD_LABELS[field]} *</span>
                                            <Select value={form[field]} onValueChange={(value) => setField(field, value)}>
                                                <SelectTrigger className="h-12 rounded-md"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectGroup>
                                                        {ROLLBACK_ACTIONS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                                                    </SelectGroup>
                                                </SelectContent>
                                            </Select>
                                        </label>
                                    );
                                }

                                return (
                                    <label key={field} className="flex flex-col gap-2">
                                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                            {FIELD_LABELS[field]} {(operation.required || []).includes(field) ? '*' : ''}
                                        </span>
                                        <Input
                                            value={form[field]}
                                            onChange={(event) => setField(field, event.target.value)}
                                            placeholder={FIELD_LABELS[field]}
                                            className="h-12"
                                        />
                                    </label>
                                );
                            })}
                        </div>

                        {needsConfirmation && (
                            <Alert variant="destructive">
                                <AlertTriangle size={16} />
                                <AlertTitle>Mutating operation confirmation</AlertTitle>
                                <AlertDescription>
                                    <label className="mt-2 flex items-start gap-3">
                                        <input
                                            type="checkbox"
                                            checked={confirmed}
                                            onChange={(event) => setConfirmed(event.target.checked)}
                                            className="mt-1"
                                        />
                                        <span>I confirm this mutating SOC operation should be sent to the backend service.</span>
                                    </label>
                                </AlertDescription>
                            </Alert>
                        )}

                        {missingField && (
                            <Alert variant="destructive">
                                <AlertTriangle size={16} />
                                <AlertTitle>Missing required field</AlertTitle>
                                <AlertDescription>
                                    {FIELD_LABELS[missingField]} is required{missingField === 'reason' ? ' and must be at least 8 characters' : ''}.
                                </AlertDescription>
                            </Alert>
                        )}

                        {error && (
                            <Alert variant="destructive">
                                <AlertTriangle size={16} />
                                <AlertTitle>Operation failed</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {result && (
                            <Alert variant="success">
                                <CheckCircle size={16} />
                                <AlertTitle>Operation completed</AlertTitle>
                                <AlertDescription>
                                <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-black p-3 text-xs text-white">
                                    {renderValue(result)}
                                </pre>
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                </div>
                </div>

                <DialogFooter className="border-t bg-background px-7 py-5">
                    <Button type="button" variant="cancel" onClick={onClose}>
                        Close
                    </Button>
                    <Button
                        type="submit"
                        disabled={!canSubmit}
                        variant={needsConfirmation ? 'destructive' : operation.method === 'DOWNLOAD' ? 'accent' : 'info'}
                    >
                        {submitting ? (
                            <Loader2 className="animate-spin" />
                        ) : operation.method === 'DOWNLOAD' ? (
                            <Download />
                        ) : (
                            <Send />
                        )}
                        {operation.method === 'DOWNLOAD' ? 'Download' : 'Run Operation'}
                    </Button>
                </DialogFooter>
            </form>
            </DialogContent>
        </Dialog>
    );
}
