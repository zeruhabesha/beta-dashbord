import React from 'react';
import { AlertTriangle, CheckCircle, Loader2, Send, ShieldAlert } from 'lucide-react';
import { submitManualResponseAction } from '../../api/responseActions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
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

const RESPONSE_ACTIONS = [
    {
        id: 'collect_forensics',
        label: 'Collect Forensics',
        risk: 'Low',
        help: 'Collect endpoint evidence without containment.',
        fields: ['client_id']
    },
    {
        id: 'block_ip',
        label: 'Block IP',
        risk: 'Medium',
        help: 'Block a suspicious remote IP on the target endpoint or firewall scope.',
        fields: ['remote_ip', 'client_id']
    },
    {
        id: 'kill_process',
        label: 'Kill Process',
        risk: 'High',
        help: 'Terminate a suspicious process on an endpoint.',
        fields: ['client_id', 'process_pid', 'process_name']
    },
    {
        id: 'quarantine_file',
        label: 'Quarantine File',
        risk: 'High',
        help: 'Move a suspicious file into quarantine and record rollback metadata.',
        fields: ['client_id', 'file_path']
    },
    {
        id: 'isolate_host',
        label: 'Isolate Host',
        risk: 'Critical',
        help: 'Cut network access for the selected endpoint except management channels.',
        fields: ['client_id']
    },
    {
        id: 'remove_persistence',
        label: 'Remove Persistence',
        risk: 'Critical',
        help: 'Remove a detected persistence mechanism from the endpoint.',
        fields: ['client_id', 'persistence_target']
    }
];

const FIELD_LABELS = {
    client_id: 'Endpoint / Client ID',
    remote_ip: 'Remote IP',
    process_pid: 'Process PID',
    process_name: 'Process Name',
    file_path: 'File Path',
    persistence_target: 'Persistence Target'
};

const REQUIRED_FIELDS = {
    collect_forensics: ['client_id'],
    block_ip: ['remote_ip'],
    kill_process: ['client_id'],
    quarantine_file: ['client_id', 'file_path'],
    isolate_host: ['client_id'],
    remove_persistence: ['client_id', 'persistence_target']
};

function emptyTargets() {
    return {
        client_id: '',
        remote_ip: '',
        process_pid: '',
        process_name: '',
        file_path: '',
        persistence_target: ''
    };
}

function riskClass(risk) {
    switch (risk) {
        case 'Critical':
        case 'High':
            return 'border-destructive/40 bg-destructive/10 text-destructive';
        case 'Medium':
            return 'border-warning/45 bg-warning/10 text-warning';
        default:
            return 'border-info/35 bg-info/10 text-info';
    }
}

function riskBadgeVariant(risk) {
    if (['Critical', 'High'].includes(risk)) return 'destructive';
    if (risk === 'Medium') return 'warning';
    return 'info';
}

function getAction(id) {
    return RESPONSE_ACTIONS.find((action) => action.id === id) || RESPONSE_ACTIONS[0];
}

export function ManualResponseDialog({
    isOpen,
    onClose,
    onSubmitted,
    operatorId,
    moduleId,
    viewId,
    alertContext
}) {
    const [actionName, setActionName] = React.useState('collect_forensics');
    const [targets, setTargets] = React.useState(() => emptyTargets());
    const [reason, setReason] = React.useState('');
    const [confirmedLiveExecution, setConfirmedLiveExecution] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);
    const [error, setError] = React.useState('');
    const [result, setResult] = React.useState(null);

    const selectedAction = getAction(actionName);
    const requiredFields = REQUIRED_FIELDS[actionName] || [];

    React.useEffect(() => {
        if (!isOpen) {
            return;
        }

        setError('');
        setResult(null);
        setConfirmedLiveExecution(false);
        setTargets(emptyTargets());
    }, [isOpen]);

    const setTargetValue = (field, value) => {
        setTargets((current) => ({
            ...current,
            [field]: value
        }));
    };

    const missingRequiredField = requiredFields.find((field) => !String(targets[field] || '').trim());
    const canSubmit = !submitting && confirmedLiveExecution && reason.trim().length >= 8 && !missingRequiredField;

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!canSubmit) {
            return;
        }

        try {
            setSubmitting(true);
            setError('');
            setResult(null);

            const payload = {
                action_name: actionName,
                manual_action: actionName,
                operator_id: operatorId || 'unknown-operator',
                reason: reason.trim(),
                module_id: moduleId,
                view_id: viewId,
                target: Object.fromEntries(
                    Object.entries(targets).filter(([, value]) => String(value || '').trim())
                ),
                alert_context: alertContext ? {
                    title: alertContext.title,
                    summary: alertContext.summary,
                    severity: alertContext.severity,
                    source: alertContext.source,
                    document_id: alertContext.documentId,
                    document_index: alertContext.documentIndex,
                    focus_query: alertContext.query
                } : null
            };

            const nextResult = await submitManualResponseAction(payload);
            setResult(nextResult);
            onSubmitted?.(nextResult);
        } catch (submitError) {
            setError(submitError.message || 'Manual response request failed.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
            <DialogContent className="flex h-[86vh] max-w-5xl flex-col gap-0 overflow-hidden border-destructive/25 p-0" showClose>
                <form onSubmit={handleSubmit} className="flex h-full flex-col overflow-hidden">
                    <DialogHeader className="shrink-0 border-b bg-muted/30 px-7 py-6">
                        <Badge variant={['Critical', 'High'].includes(selectedAction.risk) ? 'destructive' : 'warning'} className="w-fit gap-2 uppercase tracking-[0.18em]">
                            <ShieldAlert size={14} />
                            Manual Analyst Action
                        </Badge>
                        <DialogTitle className="mt-3 text-2xl">Execute Response Action</DialogTitle>
                        <DialogDescription className="max-w-2xl">
                            This sends a live dry_run=false request to Response_Service. The backend must enforce RBAC, approval policy, safety checks, cooldowns, and audit logging.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 overflow-y-auto">
                        <div className="grid gap-6 bg-background/70 p-7 lg:grid-cols-[1.1fr_0.9fr]">
                        <div className="flex flex-col gap-5 rounded-xl border bg-card p-5">
                            <label className="flex flex-col gap-2">
                                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Action</span>
                                <Select value={actionName} onValueChange={setActionName}>
                                    <SelectTrigger className="h-12 rounded-md">
                                        <SelectValue placeholder="Select response action" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {RESPONSE_ACTIONS.map((action) => (
                                                <SelectItem key={action.id} value={action.id}>
                                                    {action.label}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </label>

                            <Alert className={riskClass(selectedAction.risk)}>
                                <AlertTriangle size={16} />
                                <AlertTitle className="flex items-center gap-2">
                                    {selectedAction.risk} risk action
                                    <Badge variant={riskBadgeVariant(selectedAction.risk)}>{selectedAction.risk}</Badge>
                                </AlertTitle>
                                <AlertDescription>{selectedAction.help}</AlertDescription>
                            </Alert>

                            <div className="grid gap-4 md:grid-cols-2">
                                {selectedAction.fields.map((field) => (
                                    <label key={field} className="flex flex-col gap-2">
                                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                            {FIELD_LABELS[field]}
                                            {requiredFields.includes(field) ? ' *' : ''}
                                        </span>
                                        <Input
                                            value={targets[field]}
                                            onChange={(event) => setTargetValue(field, event.target.value)}
                                            placeholder={FIELD_LABELS[field]}
                                            className="h-12"
                                        />
                                    </label>
                                ))}
                            </div>

                            <label className="flex flex-col gap-2">
                                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Reason *</span>
                                <Textarea
                                    value={reason}
                                    onChange={(event) => setReason(event.target.value)}
                                    placeholder="Explain why this action is required. Minimum 8 characters."
                                    rows={4}
                                    className="resize-none"
                                />
                            </label>
                        </div>

                        <div className="flex flex-col gap-4">
                            <Card className="border-info/25 bg-info/10">
                                <CardHeader className="p-4 pb-2">
                                    <CardTitle className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Current Context</CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-2 p-4 pt-0 text-sm">
                                    <div className="flex justify-between gap-3">
                                        <span className="text-muted-foreground">Module</span>
                                        <span className="font-semibold">{moduleId || 'n/a'}</span>
                                    </div>
                                    <div className="flex justify-between gap-3">
                                        <span className="text-muted-foreground">View</span>
                                        <span className="font-semibold">{viewId || 'n/a'}</span>
                                    </div>
                                    <div className="flex justify-between gap-3">
                                        <span className="text-muted-foreground">Operator</span>
                                        <span className="font-semibold">{operatorId || 'unknown'}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            {alertContext?.title && (
                                <Card className="border-primary/20">
                                    <CardHeader className="p-4 pb-2">
                                        <CardTitle className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Focused Alert</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <div className="text-sm font-semibold">{alertContext.title}</div>
                                        <div className="mt-1 line-clamp-3 text-xs text-muted-foreground">{alertContext.summary}</div>
                                        <div className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
                                            <div>Index: {alertContext.documentIndex || 'n/a'}</div>
                                            <div>Document: {alertContext.documentId || 'n/a'}</div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            <Alert variant="destructive">
                                <AlertTriangle size={16} />
                                <AlertTitle>Live execution confirmation</AlertTitle>
                                <AlertDescription>
                                    <label className="mt-2 flex items-start gap-3">
                                        <input
                                            type="checkbox"
                                            checked={confirmedLiveExecution}
                                            onChange={(event) => setConfirmedLiveExecution(event.target.checked)}
                                            className="mt-1"
                                        />
                                        <span>
                                            I confirm this is a live manual response request with dry_run=false and requires elevated privileges.
                                        </span>
                                    </label>
                                </AlertDescription>
                            </Alert>

                            {missingRequiredField && (
                                <Alert variant="destructive">
                                    <AlertTriangle size={16} />
                                    <AlertTitle>Missing required field</AlertTitle>
                                    <AlertDescription>
                                        {FIELD_LABELS[missingRequiredField]} is required for {selectedAction.label}.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {error && (
                                <Alert variant="destructive">
                                    <AlertTriangle size={16} />
                                    <AlertTitle>Manual response failed</AlertTitle>
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            {result && (
                                <Alert variant="success">
                                    <CheckCircle size={16} />
                                    <AlertTitle>Manual response submitted</AlertTitle>
                                    <AlertDescription>
                                        Request: {result.request_id || result.action_id || result.id || 'accepted'}.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    </div>
                </div>

                    <DialogFooter className="shrink-0 border-t bg-background px-7 py-5">
                        <Button type="button" variant="cancel" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!canSubmit}
                            variant={['Critical', 'High'].includes(selectedAction.risk) ? 'destructive' : selectedAction.risk === 'Medium' ? 'warning' : 'info'}
                        >
                            {submitting ? <Loader2 className="animate-spin" /> : <Send />}
                            Submit Manual Action
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
