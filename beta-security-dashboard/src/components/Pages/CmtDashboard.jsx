import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import {
    Activity,
    AlertTriangle,
    Archive,
    ArrowLeft,
    Bell,
    CheckCircle,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Clock3,
    Save,
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
    deleteCaseNote,
    deleteAlertAsset,
    deleteAlertIoc,
    deleteAlertLabel,
    deleteReportTemplate,
    downloadCaseEvidence,
    downloadCaseReport,
    ensureCmtSession,
    generateCaseReport,
    getCase,
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
    loginCmt,
    getCurrentCmtUser,
    linkCaseAlert,
    notifyCase,
    previewReportTemplate,
    promoteAlertToCase,
    isCmtUnauthorized,
    setAlertAnomaly,
    setCaseArchived,
    setCaseEscalated,
    unlinkCaseAlert,
    updateCaseWebhook,
    updateCaseStatus,
    updateCaseNote,
    updateReportTemplate,
    updateUserCustomers,
    uploadCaseEvidence,
    getAgentDashboardSummary,
    listAgentVersions
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
    'cmt-webhooks': 'webhooks',
    'cmt-agents': 'agents'
};

const CMT_INTERNAL_VIEWS = new Set(['overview', 'alerts', 'cases', 'sla', 'reports', 'users', 'webhooks', 'agents']);
const CMT_ALERT_ANNOTATION_STORAGE_KEY = 'cmt_alert_annotations_v1';
const CMT_ALERT_ANNOTATION_FIELDS = new Set(['labels', 'iocs', 'assets']);

function asArray(payload, key) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.data?.[key])) return payload.data[key];
    if (Array.isArray(payload?.result?.[key])) return payload.result[key];
    if (Array.isArray(payload?.results)) return payload.results;
    if (Array.isArray(payload?.records)) return payload.records;
    return [];
}

function firstObjectFromPayload(payload, key) {
    const candidates = [
        Array.isArray(payload) ? payload[0] : null,
        Array.isArray(payload?.data) ? payload.data[0] : null,
        Array.isArray(payload?.items) ? payload.items[0] : null,
        Array.isArray(payload?.results) ? payload.results[0] : null,
        Array.isArray(payload?.records) ? payload.records[0] : null,
        payload?.case,
        payload?.data?.case,
        payload?.data?.[key],
        payload?.result?.case,
        payload?.result?.[key],
        payload?.item,
        payload?.record
    ];
    const found = candidates.find((item) => item && typeof item === 'object' && !Array.isArray(item));

    if (found) return found;
    if (payload && typeof payload === 'object' && !Array.isArray(payload) && (payload.id || payload.case_id || payload.title || payload.summary)) {
        return payload;
    }

    return null;
}

function flattenAnnotationValue(value) {
    if (value == null || value === '') return [];
    if (Array.isArray(value)) return value.flatMap(flattenAnnotationValue);

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return [];

        if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
            try {
                return flattenAnnotationValue(JSON.parse(trimmed));
            } catch (_error) {
                return [trimmed];
            }
        }

        return trimmed.includes(',')
            ? trimmed.split(',').map((item) => item.trim()).filter(Boolean)
            : [trimmed];
    }

    if (typeof value === 'object') {
        return flattenAnnotationValue(
            value.value
            ?? value.label
            ?? value.name
            ?? value.ioc
            ?? value.ioc_value
            ?? value.indicator
            ?? value.indicator_value
            ?? value.asset
            ?? value.asset_id
            ?? value.hostname
            ?? value.host
            ?? value.file_path
            ?? value.path
            ?? value.ip_address
            ?? value.domain
            ?? value.file_hash
            ?? value.process_name
            ?? value.registry_key
            ?? value.hash
            ?? ''
        );
    }

    return [String(value)];
}

function asTextList(...values) {
    const seen = new Set();
    return values
        .flatMap(flattenAnnotationValue)
        .map((value) => String(value).trim())
        .filter((value) => {
            if (!value || seen.has(value)) return false;
            seen.add(value);
            return true;
        });
}

function alertAnnotationId(alert) {
    return String(alert?.source_alert_id || alert?.alert_id || alert?.id || '');
}

function normalizeStoredAnnotations(bucket) {
    return {
        labels: asTextList(bucket?.labels),
        iocs: asTextList(bucket?.iocs),
        assets: asTextList(bucket?.assets)
    };
}

function normalizeAlertAnnotations(alert) {
    return {
        ...alert,
        labels: asTextList(alert?.labels, alert?.label, alert?.alert_labels, alert?.label_names, alert?.tags),
        iocs: asTextList(alert?.iocs, alert?.ioc, alert?.ioc_values, alert?.indicators, alert?.indicators_of_compromise, alert?.indicator_values),
        assets: asTextList(alert?.assets, alert?.asset, alert?.asset_values, alert?.asset_ids, alert?.affected_assets, alert?.hosts, alert?.hostnames)
    };
}

function readStoredAlertAnnotations() {
    if (typeof window === 'undefined') return {};

    try {
        const parsed = JSON.parse(window.localStorage.getItem(CMT_ALERT_ANNOTATION_STORAGE_KEY) || '{}');
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (_error) {
        return {};
    }
}

function writeStoredAlertAnnotations(store) {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.setItem(CMT_ALERT_ANNOTATION_STORAGE_KEY, JSON.stringify(store));
    } catch (_error) {
        // Annotation persistence is a UX fallback; failed storage must not block live API operations.
    }
}

function mergeAlertAnnotations(alertList) {
    const stored = readStoredAlertAnnotations();

    return alertList.map((alert) => {
        const normalized = normalizeAlertAnnotations(alert);
        const saved = normalizeStoredAnnotations(stored[alertAnnotationId(normalized)]);

        return {
            ...normalized,
            labels: asTextList(normalized.labels, saved.labels),
            iocs: asTextList(normalized.iocs, saved.iocs),
            assets: asTextList(normalized.assets, saved.assets)
        };
    });
}

function storeAlertAnnotationValues(alertId, key, values) {
    const id = String(alertId || '');
    if (!id || !CMT_ALERT_ANNOTATION_FIELDS.has(key)) return asTextList(values);

    const store = readStoredAlertAnnotations();
    const nextBucket = {
        ...normalizeStoredAnnotations(store[id]),
        [key]: asTextList(values)
    };

    if (nextBucket.labels.length || nextBucket.iocs.length || nextBucket.assets.length) {
        store[id] = nextBucket;
    } else {
        delete store[id];
    }

    writeStoredAlertAnnotations(store);
    return nextBucket[key];
}

function updateAlertAnnotationList(alert, key, updater) {
    const normalized = normalizeAlertAnnotations(alert);
    return asTextList(updater(normalized[key] || []));
}

function applyAlertAnnotationValues(alertList, alertId, key, values) {
    const id = String(alertId || '');
    return alertList.map((item) => alertAnnotationId(item) === id
        ? { ...normalizeAlertAnnotations(item), [key]: asTextList(values) }
        : item);
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

function normalizeManualCase(payload, fallbackId) {
    const now = new Date().toISOString();

    return {
        ...payload,
        id: payload.id || payload.case_id || fallbackId,
        case_id: payload.case_id || payload.id || fallbackId,
        title: payload.title || payload.summary || 'Manual case',
        summary: payload.summary || payload.title || 'Manual case',
        description: payload.description || payload.summary || '',
        severity: payload.severity || 'high',
        status: payload.status || 'open',
        owner: payload.owner || payload.owner_id || 'unassigned',
        owner_id: payload.owner_id || payload.owner || 'unassigned',
        customer_code: payload.customer_code || '',
        escalated: Boolean(payload.escalated),
        archived: Boolean(payload.archived),
        created_at: payload.created_at || now,
        updated_at: payload.updated_at || now,
        sla_due_at: payload.sla_due_at || new Date(Date.now() + 60 * 60 * 1000).toISOString()
    };
}

function upsertCaseRow(rows, nextCase, replaceId = '') {
    const nextId = itemId(nextCase);
    const replaced = rows.some((item) => itemId(item) === nextId || (replaceId && itemId(item) === replaceId));
    const nextRows = rows.map((item) => (itemId(item) === nextId || (replaceId && itemId(item) === replaceId)) ? nextCase : item);
    return replaced ? nextRows : [nextCase, ...nextRows];
}

function sameCaseText(left, right) {
    return String(left || '').trim().toLowerCase() === String(right || '').trim().toLowerCase();
}

function caseMatchesManualPayload(caseItem, payload, submittedAtMs) {
    const createdAt = new Date(caseItem?.created_at || caseItem?.updated_at || 0).getTime();
    const isRecent = !Number.isFinite(createdAt) || createdAt === 0 || createdAt >= submittedAtMs - 60 * 1000;
    const titleMatches = sameCaseText(caseItem?.title || caseItem?.summary, payload.title || payload.summary);
    const customerMatches = !payload.customer_code || sameCaseText(caseItem?.customer_code, payload.customer_code);
    const severityMatches = !payload.severity || sameCaseText(caseItem?.severity, payload.severity);

    return isRecent && titleMatches && customerMatches && severityMatches;
}

function sleep(ms) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
    });
}

async function waitForPersistedManualCase(payload, response, submittedAtMs) {
    const responseCase = firstObjectFromPayload(response, 'cases');
    const responseId = responseCase ? itemId(responseCase, '') : '';
    let latestRows = [];

    for (const delayMs of [0, 500, 1500, 3000]) {
        if (delayMs) await sleep(delayMs);

        if (responseId) {
            try {
                const detail = await getCase(responseId);
                const detailCase = firstObjectFromPayload(detail, 'cases') || firstObjectFromPayload(detail, 'case');
                if (detailCase && itemId(detailCase, '') === responseId) {
                    return {
                        case: detailCase,
                        rows: upsertCaseRow(latestRows, detailCase)
                    };
                }
            } catch (_error) {
                // Fall back to the list endpoint below; some backends create but do not expose detail immediately.
            }
        }

        const listResponse = await listCases({ archived: false, page: 1, page_size: 100, order: 'desc' });
        latestRows = asArray(listResponse, 'cases');
        const persistedCase = responseId
            ? latestRows.find((item) => itemId(item, '') === responseId)
            : latestRows.find((item) => caseMatchesManualPayload(item, payload, submittedAtMs));

        if (persistedCase) {
            return {
                case: persistedCase,
                rows: latestRows
            };
        }
    }

    return {
        case: null,
        rows: latestRows
    };
}

function caseMatchesPromotedAlert(caseItem, alert, submittedAtMs) {
    const createdAt = new Date(caseItem?.created_at || caseItem?.updated_at || 0).getTime();
    const isRecent = !Number.isFinite(createdAt) || createdAt === 0 || createdAt >= submittedAtMs - 60 * 1000;
    const sourceAlertId = alertAnnotationId(alert);
    const linkedIds = linkedAlertIds(caseItem).map(String);
    const title = alertTitle(alert);
    const description = alert?.description || alert?.rule_description || '';
    const caseText = [
        caseItem?.title,
        caseItem?.summary,
        caseItem?.description,
        caseItem?.rule_description
    ].filter(Boolean).join(' ').toLowerCase();
    const titleMatches = title && (sameCaseText(caseItem?.title || caseItem?.summary, title) || caseText.includes(title.toLowerCase()));
    const descriptionMatches = description && caseText.includes(String(description).toLowerCase());
    const severityMatches = !alert?.severity || sameCaseText(caseItem?.severity, alert.severity);
    const customerMatches = !alert?.customer_code || sameCaseText(caseItem?.customer_code, alert.customer_code);

    return isRecent && customerMatches && (
        (sourceAlertId && linkedIds.includes(String(sourceAlertId)))
        || ((titleMatches || descriptionMatches) && severityMatches)
    );
}

async function waitForPersistedPromotedCase(alert, response, submittedAtMs) {
    const responseCase = firstObjectFromPayload(response, 'cases') || firstObjectFromPayload(response, 'case');
    const responseId = responseCase ? itemId(responseCase, '') : '';
    let latestRows = [];

    for (const delayMs of [0, 500, 1500, 3000]) {
        if (delayMs) await sleep(delayMs);

        if (responseId) {
            try {
                const detail = await getCase(responseId);
                const detailCase = firstObjectFromPayload(detail, 'cases') || firstObjectFromPayload(detail, 'case');
                if (detailCase && itemId(detailCase, '') === responseId) {
                    return {
                        case: detailCase,
                        rows: upsertCaseRow(latestRows, detailCase)
                    };
                }
            } catch (_error) {
                // Some CMT backends expose the created case through the list endpoint before detail lookup.
            }
        }

        const listResponse = await listCases({ archived: false, page: 1, page_size: 100, order: 'desc' });
        latestRows = asArray(listResponse, 'cases');
        const persistedCase = responseId
            ? latestRows.find((item) => itemId(item, '') === responseId)
            : latestRows.find((item) => caseMatchesPromotedAlert(item, alert, submittedAtMs));

        if (persistedCase) {
            return {
                case: persistedCase,
                rows: latestRows
            };
        }
    }

    return {
        case: null,
        rows: latestRows
    };
}

function alertTitle(item) {
    return item?.title || item?.rule_description || item?.description || 'Untitled alert';
}

function linkedAlertIds(item) {
    const linked = item?.linked_alerts || item?.alerts || [item?.alert_id].filter(Boolean);
    const ids = linked
        .map((alert) => (typeof alert === 'string' ? alert : alert?.source_alert_id || alert?.alert_id || alert?.id))
        .filter(Boolean);
    return [...new Set(ids)];
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

const CONFIRM_VARIANT_STYLES = {
    info: {
        wrap: 'bg-blue-500/10 border-b border-blue-500/20',
        icon: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
        Icon: Clock3
    },
    warning: {
        wrap: 'bg-amber-500/10 border-b border-amber-500/20',
        icon: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
        Icon: Zap
    },
    destructive: {
        wrap: 'bg-destructive/10 border-b border-destructive/20',
        icon: 'bg-destructive/15 text-destructive',
        Icon: Archive
    },
    default: {
        wrap: 'bg-muted/40 border-b',
        icon: 'bg-muted text-foreground',
        Icon: CheckCircle
    }
};

function CaseConfirmDialog({ open, onClose, title, description, confirmLabel, confirmVariant, onConfirm, children }) {
    const style = CONFIRM_VARIANT_STYLES[confirmVariant] || CONFIRM_VARIANT_STYLES.default;
    const VariantIcon = style.Icon;

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="max-w-md overflow-hidden p-0" showClose={false}>
                <div className={clsx('flex items-start gap-4 p-5', style.wrap)}>
                    <div className={clsx('flex size-10 shrink-0 items-center justify-center rounded-full', style.icon)}>
                        <VariantIcon className="size-5" />
                    </div>
                    <div className="flex-1 pt-0.5">
                        <DialogTitle className="text-base leading-tight">{title}</DialogTitle>
                        <DialogDescription className="mt-1 text-xs leading-relaxed">{description}</DialogDescription>
                    </div>
                    <button
                        type="button"
                        className="rounded-sm opacity-60 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        onClick={onClose}
                    >
                        <X className="size-4" />
                        <span className="sr-only">Close</span>
                    </button>
                </div>
                {children && (
                    <div className="px-5 pt-4">
                        {children}
                    </div>
                )}
                <DialogFooter className="px-5 pb-5 pt-4">
                    <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                    <Button type="button" size="sm" variant={confirmVariant || 'default'} onClick={() => { onConfirm(); onClose(); }}>
                        <VariantIcon className="size-3.5" />
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function CaseRowActionMenu({ item, busyCaseId, onOpen, onStatusChange, onEscalate, onArchive }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [confirm, setConfirm] = useState(null);
    const menuRef = useRef(null);
    const id = itemId(item);
    const busy = busyCaseId === id;

    useEffect(() => {
        if (!menuOpen) return undefined;
        const handle = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, [menuOpen]);

    const run = (fn) => { fn(); setMenuOpen(false); };

    const confirmConfigs = {
        triage: {
            title: 'Triage Case',
            description: `Move "${caseTitle(item)}" to in-progress and begin investigation?`,
            confirmLabel: 'Start Triage',
            confirmVariant: 'info',
            onConfirm: () => onStatusChange(id, 'in-progress')
        },
        escalate: {
            title: item.escalated ? 'De-escalate Case' : 'Escalate Case',
            description: item.escalated
                ? `Remove the escalation flag from "${caseTitle(item)}"?`
                : `Flag "${caseTitle(item)}" for management attention and higher priority?`,
            confirmLabel: item.escalated ? 'De-escalate' : 'Escalate',
            confirmVariant: 'warning',
            onConfirm: () => onEscalate(id, !item.escalated)
        },
        archive: {
            title: 'Archive Case',
            description: `Archive "${caseTitle(item)}"? It will no longer appear in active queues.`,
            confirmLabel: 'Archive',
            confirmVariant: 'destructive',
            onConfirm: () => onArchive(id, true)
        }
    };

    const activeConfirm = confirm ? confirmConfigs[confirm] : null;

    return (
        <>
            <div ref={menuRef} className="relative flex justify-end">
                <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    title="Case actions"
                    disabled={busy}
                    onClick={() => setMenuOpen((v) => !v)}
                >
                    <MoreVertical className="size-4" />
                </Button>
                {menuOpen && (
                    <div className="absolute right-0 top-11 z-40 w-52 overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg">
                        <button
                            type="button"
                            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-muted"
                            onClick={() => run(() => onOpen(id))}
                        >
                            Open case
                        </button>
                        <div className="my-1 h-px bg-border" />
                        <button
                            type="button"
                            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-muted"
                            onClick={() => run(() => setConfirm('triage'))}
                        >
                            Triage
                        </button>
                        <button
                            type="button"
                            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-muted"
                            onClick={() => run(() => setConfirm('escalate'))}
                        >
                            {item.escalated ? 'De-escalate' : 'Escalate'}
                        </button>
                        <div className="my-1 h-px bg-border" />
                        <button
                            type="button"
                            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold text-destructive hover:bg-destructive/10"
                            onClick={() => run(() => setConfirm('archive'))}
                        >
                            Archive
                        </button>
                    </div>
                )}
            </div>
            {activeConfirm && (
                <CaseConfirmDialog
                    open={Boolean(confirm)}
                    onClose={() => setConfirm(null)}
                    title={activeConfirm.title}
                    description={activeConfirm.description}
                    confirmLabel={activeConfirm.confirmLabel}
                    confirmVariant={activeConfirm.confirmVariant}
                    onConfirm={activeConfirm.onConfirm}
                >
                    <div className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
                        <p className="font-mono text-[11px] text-muted-foreground">{id}</p>
                        <div className="mt-1 flex flex-wrap gap-2">
                            <SeverityBadge severity={item.severity} />
                            <StatusBadge status={item.status} />
                            <SlaIndicator item={item} />
                        </div>
                    </div>
                </CaseConfirmDialog>
            )}
        </>
    );
}

const CASE_TABLE_PAGE_SIZE = 10;

function CaseTable({ rows, selectedCaseId, busyCaseId, onOpen, onStatusChange, onEscalate, onArchive }) {
    const [page, setPage] = useState(1);

    useEffect(() => { setPage(1); }, [rows]);

    if (!rows.length) {
        return <EmptyState title="No cases match the current filters" description="Adjust the filters or use the Create Case action to open a manual case." />;
    }

    const totalPages = Math.ceil(rows.length / CASE_TABLE_PAGE_SIZE);
    const start = (page - 1) * CASE_TABLE_PAGE_SIZE;
    const pageRows = rows.slice(start, start + CASE_TABLE_PAGE_SIZE);

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
                        <TableHead className="w-12" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {pageRows.map((item) => {
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
                                    <CaseRowActionMenu
                                        item={item}
                                        busyCaseId={busyCaseId}
                                        onOpen={onOpen}
                                        onStatusChange={onStatusChange}
                                        onEscalate={onEscalate}
                                        onArchive={onArchive}
                                    />
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
            <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-3">
                <p className="text-sm text-muted-foreground">
                    {start + 1}–{Math.min(start + CASE_TABLE_PAGE_SIZE, rows.length)} of <span className="font-semibold text-foreground">{rows.length}</span> cases
                </p>
                <div className="flex items-center gap-1">
                    <Button type="button" variant="outline" size="icon" className="size-8" disabled={page === 1} onClick={() => setPage(1)} title="First page">
                        <ChevronsLeft className="size-4" />
                    </Button>
                    <Button type="button" variant="outline" size="icon" className="size-8" disabled={page === 1} onClick={() => setPage((p) => p - 1)} title="Previous page">
                        <ChevronLeft className="size-4" />
                    </Button>
                    <span className="min-w-[90px] text-center text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                    </span>
                    <Button type="button" variant="outline" size="icon" className="size-8" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} title="Next page">
                        <ChevronRight className="size-4" />
                    </Button>
                    <Button type="button" variant="outline" size="icon" className="size-8" disabled={page === totalPages} onClick={() => setPage(totalPages)} title="Last page">
                        <ChevronsRight className="size-4" />
                    </Button>
                </div>
            </div>
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

function PromoteAlertDialog({ alert, open, onClose, onConfirm }) {
    if (!alert) return null;
    const id = alert.source_alert_id || alert.id || '';
    const isAnomaly = alert.anomaly || alert.is_anomaly;

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Promote to Case</DialogTitle>
                    <DialogDescription>
                        A new CMT case will be created from this Wazuh alert and linked to it.
                    </DialogDescription>
                </DialogHeader>
                <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="font-mono text-[11px] text-muted-foreground">{id}</p>
                    <p className="mt-1 font-semibold text-foreground">{alertTitle(alert)}</p>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{alert.description || alert.rule_description || 'No description.'}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        <SeverityBadge severity={alert.severity} />
                        {isAnomaly && <Badge variant="warning" className="rounded-full">anomaly</Badge>}
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                    <Button type="button" variant="info" onClick={() => { onConfirm(); onClose(); }}>
                        <TicketCheck className="size-4" />
                        Promote to Case
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AnomalyToggleDialog({ alert, open, onClose, onConfirm }) {
    if (!alert) return null;
    const isAnomaly = alert.anomaly || alert.is_anomaly;

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>{isAnomaly ? 'Clear Anomaly Flag' : 'Mark as Anomaly'}</DialogTitle>
                    <DialogDescription>
                        {isAnomaly
                            ? 'Remove the anomaly flag. This alert will return to normal classification.'
                            : 'Flag this alert as an anomaly. It will be highlighted for analyst review.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
                    <p className="font-mono text-[11px] text-muted-foreground">{alert.source_alert_id || alert.id}</p>
                    <p className="mt-1 truncate font-semibold text-foreground">{alertTitle(alert)}</p>
                    <div className="mt-2">
                        <Badge variant={isAnomaly ? 'warning' : 'outline'} className="rounded-full">
                            {isAnomaly ? 'Currently: anomaly' : 'Currently: normal'}
                        </Badge>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                        type="button"
                        variant={isAnomaly ? 'outline' : 'warning'}
                        onClick={() => { onConfirm(); onClose(); }}
                    >
                        {isAnomaly ? 'Clear Anomaly' : 'Mark as Anomaly'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function RowActionMenu({ item, onPromote, onToggleAnomaly, onOpenAction }) {
    const [open, setOpen] = useState(false);
    const [promoteOpen, setPromoteOpen] = useState(false);
    const [anomalyOpen, setAnomalyOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const handle = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, [open]);

    const run = (fn) => { fn(); setOpen(false); };

    return (
        <>
            <div ref={menuRef} className="relative flex justify-end">
                <Button type="button" size="icon" variant="ghost" title="Alert actions" onClick={() => setOpen((v) => !v)}>
                    <MoreVertical className="size-4" />
                </Button>
                {open && (
                    <div className="absolute right-0 top-11 z-40 w-56 overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg">
                        <button
                            type="button"
                            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-muted"
                            onClick={() => run(() => setPromoteOpen(true))}
                        >
                            Promote to case
                        </button>
                        <button
                            type="button"
                            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-muted"
                            onClick={() => run(() => setAnomalyOpen(true))}
                        >
                            Toggle anomaly
                        </button>
                        <div className="my-1 h-px bg-border" />
                        <button
                            type="button"
                            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-muted"
                            onClick={() => run(() => onOpenAction('label', item))}
                        >
                            Add label
                        </button>
                        <button
                            type="button"
                            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-muted"
                            onClick={() => run(() => onOpenAction('ioc', item))}
                        >
                            Add IOC
                        </button>
                        <button
                            type="button"
                            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-muted"
                            onClick={() => run(() => onOpenAction('asset', item))}
                        >
                            Add asset
                        </button>
                        <button
                            type="button"
                            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-muted"
                            onClick={() => run(() => onOpenAction('comment', item))}
                        >
                            Add comment
                        </button>
                    </div>
                )}
            </div>
            <PromoteAlertDialog
                alert={item}
                open={promoteOpen}
                onClose={() => setPromoteOpen(false)}
                onConfirm={() => onPromote(item)}
            />
            <AnomalyToggleDialog
                alert={item}
                open={anomalyOpen}
                onClose={() => setAnomalyOpen(false)}
                onConfirm={() => onToggleAnomaly(item)}
            />
        </>
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
                <div className="hidden border-b bg-muted/10 px-4 py-3 xl:grid xl:grid-cols-[44px_minmax(300px,0.9fr)_minmax(180px,0.55fr)_minmax(480px,1.15fr)_56px] xl:items-center">
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
                        Agent / Status
                    </button>
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Indicators</span>
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
                                'grid gap-3 p-3 transition-colors hover:bg-muted/30 xl:grid-cols-[44px_minmax(300px,0.9fr)_minmax(180px,0.55fr)_minmax(480px,1.15fr)_56px] xl:items-center',
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
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <SeverityBadge severity={item.severity} />
                                        <Badge variant={item.anomaly || item.is_anomaly ? 'warning' : 'outline'} className="rounded-full">
                                            {item.anomaly || item.is_anomaly ? 'anomaly' : 'normal'}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="grid gap-3 md:grid-cols-3">
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
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    const handleSubmit = async (event) => {
        if (busy) {
            event.preventDefault();
            return;
        }

        setBusy(true);
        try {
            const created = await onSubmit(event);
            if (created !== false) {
                setOpen(false);
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <Card className="min-w-0">
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <CardTitle className="text-base">Create Manual Case</CardTitle>
                        <CardDescription className="mt-1">
                            Open a case for analyst-originated incidents without an initial Wazuh alert.
                        </CardDescription>
                    </div>
                    <Button type="button" className="shrink-0" onClick={() => setOpen(true)} disabled={disabled || busy}>
                        <Plus className="size-4" />
                        Create Case
                    </Button>
                </CardContent>
            </Card>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl gap-0 p-0">
                    <DialogHeader className="border-b bg-muted/20 p-6 pb-5">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg border bg-background p-2 text-primary">
                                <TicketCheck className="size-5" />
                            </div>
                            <div>
                                <DialogTitle>Create Manual Case</DialogTitle>
                                <DialogDescription>
                                    Capture enough context for triage, ownership, SLA tracking, and reporting.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="grid gap-5 p-6">
                        <div className="grid gap-2">
                            <label className="text-sm font-semibold text-foreground" htmlFor="manual-case-title">Case title</label>
                            <Input
                                id="manual-case-title"
                                value={value.title}
                                onChange={(event) => onChange({ ...value, title: event.target.value })}
                                placeholder="Example: Suspicious privileged login from external VPN"
                                required
                                autoFocus
                            />
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-semibold text-foreground" htmlFor="manual-case-description">Investigation context</label>
                            <Textarea
                                id="manual-case-description"
                                value={value.description}
                                onChange={(event) => onChange({ ...value, description: event.target.value })}
                                placeholder="What happened, affected asset/user, initial evidence, and why this needs a case..."
                                rows={5}
                            />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <label className="text-sm font-semibold text-foreground">Severity</label>
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
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-semibold text-foreground" htmlFor="manual-case-customer">Customer code</label>
                                <Input
                                    id="manual-case-customer"
                                    value={value.customer_code}
                                    onChange={(event) => onChange({ ...value, customer_code: event.target.value })}
                                    placeholder="acme, tenant-01, core-infra"
                                />
                            </div>
                        </div>

                        <Alert variant="info" className="bg-info/5">
                            <ShieldCheck className="size-4" />
                            <AlertTitle>Manual analyst action</AlertTitle>
                            <AlertDescription>
                                This creates a CMT case only. It does not execute endpoint response actions.
                            </AlertDescription>
                        </Alert>

                        <DialogFooter className="border-t pt-5">
                            <Button type="button" variant="cancel" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={disabled || busy || !value.title.trim()}>
                                {disabled || busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                                Create Case
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

function CmtLoginPanel({ value, onChange, onSubmit, busy, backendReady }) {
    return (
        <Card className="min-w-0 border-warning/40 bg-warning/5">
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <CardTitle>CMT Authentication Required</CardTitle>
                        <CardDescription>
                            Protected CMT routes require a CMT session. Login through `/auth/login` before loading cases and alerts.
                        </CardDescription>
                    </div>
                    <Badge variant={backendReady ? 'warning' : 'secondary'}>{backendReady ? 'auth required' : 'session pending'}</Badge>
                </div>
            </CardHeader>
            <CardContent>
                <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-foreground">Username</label>
                        <Input
                            value={value.username}
                            onChange={(event) => onChange({ ...value, username: event.target.value })}
                            placeholder="CMT / Wazuh username"
                            autoComplete="username"
                            required
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-foreground">Password</label>
                        <Input
                            value={value.password}
                            onChange={(event) => onChange({ ...value, password: event.target.value })}
                            type="password"
                            placeholder="Password"
                            autoComplete="current-password"
                            required
                        />
                    </div>
                    <Button type="submit" disabled={busy || !value.username.trim() || !value.password}>
                        {busy ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
                        Login CMT
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
    onDeleteNote,
    onDownloadEvidence,
    onDownloadReport,
    onFetchAlerts,
    onGenerateReport,
    onLinkAlert,
    onNotify,
    onStatusChange,
    onUnlinkAlert,
    onUpdateNote,
    onUploadEvidence
}) {
    const [owner, setOwner] = useState(caseItem?.owner || caseItem?.owner_id || '');
    const [noteBody, setNoteBody] = useState('');
    const [editingNoteId, setEditingNoteId] = useState('');
    const [editingNoteBody, setEditingNoteBody] = useState('');
    const [evidenceFile, setEvidenceFile] = useState(null);
    const [templateId, setTemplateId] = useState(templates[0]?.template_id || templates[0]?.id || '');

    const [alertDropdownOpen, setAlertDropdownOpen] = useState(false);
    const [alertSearch, setAlertSearch] = useState('');
    const [availableAlerts, setAvailableAlerts] = useState([]);
    const [alertsLoading, setAlertsLoading] = useState(false);
    const alertDropdownRef = useRef(null);

    useEffect(() => {
        setOwner(caseItem?.owner || caseItem?.owner_id || '');
        setTemplateId(templates[0]?.template_id || templates[0]?.id || '');
    }, [caseItem, templates]);

    useEffect(() => {
        if (!alertDropdownOpen) return undefined;
        const handle = (e) => {
            if (alertDropdownRef.current && !alertDropdownRef.current.contains(e.target)) {
                setAlertDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, [alertDropdownOpen]);

    useEffect(() => {
        if (!alertDropdownOpen || !onFetchAlerts) return undefined;
        let cancelled = false;
        setAlertsLoading(true);
        onFetchAlerts(alertSearch).then((list) => {
            if (!cancelled) { setAvailableAlerts(list); setAlertsLoading(false); }
        }).catch(() => { if (!cancelled) setAlertsLoading(false); });
        return () => { cancelled = true; };
    }, [alertDropdownOpen, alertSearch, onFetchAlerts]);

    if (!caseItem) return null;

    const caseId = itemId(caseItem);
    const linkedAlerts = linkedAlertIds(caseItem);

    const savedOwner = caseItem?.owner || caseItem?.owner_id || '';
    const isDirty = owner.trim() !== savedOwner;

    return (
        <div className="flex min-w-0 flex-col rounded-2xl border bg-card">
            {/* Page header */}
            <div className="flex flex-wrap items-center gap-3 border-b bg-muted/30 px-5 py-4">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                    <ArrowLeft className="size-4" />
                    Back
                </button>
                <div className="h-5 w-px shrink-0 bg-border" />
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <Badge variant="outline" className="shrink-0 font-mono text-[11px]">{caseId}</Badge>
                    <SeverityBadge severity={caseItem.severity} />
                    <StatusBadge status={caseItem.status} />
                    <SlaIndicator item={caseItem} />
                    {caseItem.escalated && <Badge variant="warning">escalated</Badge>}
                    <span className="truncate font-semibold text-foreground">{caseTitle(caseItem)}</span>
                </div>
                <Button
                    type="button"
                    size="sm"
                    disabled={!isDirty}
                    onClick={() => onAssignOwner(caseId, owner)}
                    className="shrink-0 gap-2"
                >
                    <Save className="size-4" />
                    Save Changes
                </Button>
            </div>

            {/* Case title / description */}
            <div className="border-b px-5 py-4">
                <h2 className="text-xl font-bold text-foreground">{caseTitle(caseItem)}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{caseDescription(caseItem)}</p>
            </div>

            {/* Main content */}
            <div className="grid min-w-0 xl:grid-cols-[minmax(0,1fr)_300px]">
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
                                    <div className="rounded-lg border bg-muted/20 p-4">
                                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Search CMT alerts to link</p>
                                        <div ref={alertDropdownRef} className="relative">
                                            <div className="flex gap-2">
                                                <Input
                                                    value={alertSearch}
                                                    onChange={(e) => { setAlertSearch(e.target.value); setAlertDropdownOpen(true); }}
                                                    onFocus={() => setAlertDropdownOpen(true)}
                                                    placeholder="Search by ID, rule, or description…"
                                                    className="flex-1"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => setAlertDropdownOpen((v) => !v)}
                                                    title="Browse alerts"
                                                >
                                                    {alertsLoading
                                                        ? <Loader2 className="size-4 animate-spin" />
                                                        : <ChevronDown className="size-4" />}
                                                </Button>
                                            </div>
                                            {alertDropdownOpen && (
                                                <div className="absolute left-0 right-0 top-11 z-50 max-h-64 overflow-y-auto rounded-xl border bg-popover shadow-lg">
                                                    {alertsLoading && (
                                                        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                                                            <Loader2 className="size-4 animate-spin" />
                                                            Loading alerts…
                                                        </div>
                                                    )}
                                                    {!alertsLoading && !availableAlerts.length && (
                                                        <div className="py-6 text-center text-sm text-muted-foreground">
                                                            No alerts found
                                                        </div>
                                                    )}
                                                    {availableAlerts.map((alert) => {
                                                        const aId = alert.source_alert_id || alert.id;
                                                        const already = linkedAlerts.includes(aId);
                                                        return (
                                                            <button
                                                                key={aId}
                                                                type="button"
                                                                disabled={already}
                                                                className={clsx(
                                                                    'flex w-full flex-col gap-1 border-b px-4 py-3 text-left last:border-b-0 hover:bg-muted',
                                                                    already && 'cursor-not-allowed opacity-50'
                                                                )}
                                                                onClick={() => {
                                                                    if (!already) {
                                                                        onLinkAlert(caseId, aId, alert);
                                                                        setAlertDropdownOpen(false);
                                                                        setAlertSearch('');
                                                                    }
                                                                }}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <SeverityBadge severity={alert.severity} />
                                                                    <span className="font-mono text-[11px] text-muted-foreground">{aId}</span>
                                                                    {already && (
                                                                        <Badge variant="outline" className="text-[10px]">Linked</Badge>
                                                                    )}
                                                                </div>
                                                                <div className="text-sm font-medium leading-tight">
                                                                    {alert.rule_description || alert.description || aId}
                                                                </div>
                                                                {alert.agent_name && (
                                                                    <div className="text-xs text-muted-foreground">Agent: {alert.agent_name}</div>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
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
                                    {!linkedAlerts.length && <EmptyState icon={Link2} title="No linked alerts" description="Search and select an alert above to link it to this case." />}
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
                                                    <div className="flex items-center gap-2">
                                                        <div className="text-xs text-muted-foreground">{formatDateTime(note.created_at)}</div>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => {
                                                                setEditingNoteId(itemId(note));
                                                                setEditingNoteBody(note.body || '');
                                                            }}
                                                        >
                                                            Edit
                                                        </Button>
                                                        <Button type="button" size="sm" variant="ghost" onClick={() => onDeleteNote(caseId, itemId(note))}>
                                                            Delete
                                                        </Button>
                                                    </div>
                                                </div>
                                                {editingNoteId === itemId(note) ? (
                                                    <div className="mt-3 flex flex-col gap-2">
                                                        <Textarea value={editingNoteBody} onChange={(event) => setEditingNoteBody(event.target.value)} rows={3} />
                                                        <div className="flex justify-end gap-2">
                                                            <Button type="button" variant="cancel" size="sm" onClick={() => setEditingNoteId('')}>Cancel</Button>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                disabled={!editingNoteBody.trim()}
                                                                onClick={() => {
                                                                    onUpdateNote(caseId, itemId(note), editingNoteBody);
                                                                    setEditingNoteId('');
                                                                    setEditingNoteBody('');
                                                                }}
                                                            >
                                                                Save Note
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="mt-2 text-sm text-muted-foreground">{note.body}</p>
                                                )}
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
                                                    {templates.filter((t) => {
                                                        const tid = t.template_id || t.id || '';
                                                        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tid);
                                                    }).map((template) => (
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
                                        {reports.map((report, idx) => (
                                            <div key={report.report_id || report.id || `report-${idx}`} className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4">
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
                    <div className="flex flex-col gap-5 bg-muted/20 p-5">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Metadata</p>
                            <div className="mt-3 grid gap-3 text-sm">
                                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Customer</span><span className="font-semibold">{caseItem.customer_code || 'n/a'}</span></div>
                                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Created</span><span className="font-semibold">{formatDateTime(caseItem.created_at)}</span></div>
                                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Updated</span><span className="font-semibold">{formatDateTime(caseItem.updated_at)}</span></div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Owner</p>
                            <Input
                                value={owner}
                                onChange={(event) => setOwner(event.target.value)}
                                placeholder="Assign owner"
                            />
                            {isDirty && (
                                <p className="text-xs text-amber-600 dark:text-amber-400">Unsaved — click Save Changes</p>
                            )}
                        </div>
                        <div className="flex flex-col gap-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Actions</p>
                            <div className="grid grid-cols-2 gap-2">
                                <Button type="button" variant="infoOutline" size="sm" onClick={() => onStatusChange(caseId, 'in-progress')}>Triage</Button>
                                <Button type="button" variant="successOutline" size="sm" onClick={() => onStatusChange(caseId, 'resolved')}>Resolve</Button>
                                <Button type="button" variant="warningOutline" size="sm" onClick={() => onNotify(caseId)}>Notify</Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => onClose()}>
                                    <ArrowLeft className="size-3.5" />
                                    Back
                                </Button>
                            </div>
                        </div>
                    </div>
            </div>
        </div>
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
    const [draft, setDraft] = useState({ name: '', format: 'pdf', renderer: 'react_pdf', body: '' });
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
                    {templates.filter((t) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t.template_id || t.id || '')).map((template) => (
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
                        className="grid gap-4 xl:grid-cols-[minmax(220px,1fr)_130px_150px_auto]"
                        onSubmit={(event) => {
                            event.preventDefault();
                            onCreateTemplate(draft);
                            setDraft({ name: '', format: 'pdf', renderer: 'react_pdf', body: '' });
                        }}
                    >
                        <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Template name" required />
                        <Select value={draft.format} onValueChange={(format) => setDraft({ ...draft, format })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem value="pdf">PDF</SelectItem>
                                    <SelectItem value="docx">DOCX</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <Select value={draft.renderer} onValueChange={(renderer) => setDraft({ ...draft, renderer })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem value="react_pdf">React PDF</SelectItem>
                                    <SelectItem value="builtin">Built-in</SelectItem>
                                    <SelectItem value="docx">DOCX</SelectItem>
                                    <SelectItem value="latex">LaTeX</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={async () => setPreview(await onPreviewTemplate(draft))}>Preview</Button>
                            <Button type="submit">Save</Button>
                        </div>
                        <Textarea
                            className="xl:col-span-4"
                            value={draft.body}
                            onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                            placeholder="Template body — required. Describe the report structure or paste a Markdown/HTML template."
                            rows={4}
                            required
                        />
                        {preview && (
                            <div className="rounded-lg border bg-muted/20 p-4 text-sm xl:col-span-4">
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

function AgentsPage() {
    const [summary, setSummary] = useState(null);
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        try {
            const [sumRes, verRes] = await Promise.allSettled([
                getAgentDashboardSummary(),
                listAgentVersions()
            ]);
            setSummary(sumRes.status === 'fulfilled' ? sumRes.value : null);
            setVersions(verRes.status === 'fulfilled' ? asArray(verRes.value, 'versions') : []);
            if (sumRes.status === 'rejected' && verRes.status === 'rejected') {
                setError(sumRes.reason || verRes.reason);
            } else {
                setError(null);
            }
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        const interval = setInterval(load, 30000);
        return () => clearInterval(interval);
    }, [load]);

    const totalAgents = summary?.total ?? summary?.total_agents ?? summary?.agent_count ?? null;
    const activeAgents = summary?.active ?? summary?.active_agents ?? summary?.online ?? null;
    const inactiveAgents = summary?.inactive ?? summary?.inactive_agents ?? summary?.offline ?? null;
    const latestVersion = summary?.latest_version ?? summary?.version ?? summary?.latestVersion ?? null;

    if (loading) {
        return (
            <div className="flex items-center gap-3 p-6 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
                Loading agent dashboard…
            </div>
        );
    }

    if (error && !summary) {
        return (
            <Alert variant="warning">
                <ShieldAlert className="size-4" />
                <AlertTitle>Agent data unavailable</AlertTitle>
                <AlertDescription>
                    {error?.message || 'Could not reach the agent dashboard endpoint. Check that the CMT backend is running and the /api/v1/agents proxy is configured.'}
                </AlertDescription>
            </Alert>
        );
    }

    const summaryStats = [
        { label: 'Total agents', value: totalAgents ?? '—', icon: Activity },
        { label: 'Active', value: activeAgents ?? '—', icon: ShieldCheck },
        { label: 'Inactive', value: inactiveAgents ?? '—', icon: AlertTriangle },
        { label: 'Latest version', value: latestVersion ?? '—', icon: Zap }
    ];

    return (
        <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {summaryStats.map(({ label, value, icon: Icon }) => (
                    <Card key={label}>
                        <CardContent className="flex items-start justify-between gap-4 p-5">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
                                <p className="mt-2 text-3xl font-black tracking-tight">{String(value)}</p>
                            </div>
                            <div className="flex size-10 items-center justify-center rounded-xl border bg-muted text-muted-foreground">
                                <Icon className="size-4" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Agent Version Distribution</CardTitle>
                        <CardDescription>Wazuh agent versions currently reporting to the CMT backend.</CardDescription>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={load}>
                        <RefreshCw className="size-4" />
                        Refresh
                    </Button>
                </CardHeader>
                <CardContent>
                    {versions.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">No version data returned from the backend.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Version</TableHead>
                                    <TableHead>Agent count</TableHead>
                                    <TableHead>Latest release</TableHead>
                                    <TableHead>OS</TableHead>
                                    <TableHead className="text-right">Share</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {versions.map((v, idx) => {
                                    const ver = v?.version ?? v?.agent_version ?? v?.ver ?? `v${idx + 1}`;
                                    const count = v?.count ?? v?.agent_count ?? v?.total ?? 0;
                                    const isLatest = v?.latest === true || v?.is_latest === true || v?.latest_version === true;
                                    const os = v?.os ?? v?.platform ?? '—';
                                    const share = totalAgents ? Math.round((count / totalAgents) * 100) : null;
                                    return (
                                        <TableRow key={ver}>
                                            <TableCell className="font-mono font-bold">{ver}</TableCell>
                                            <TableCell className="font-semibold">{count}</TableCell>
                                            <TableCell>
                                                {isLatest
                                                    ? <span className="rounded-md bg-success/15 px-2 py-0.5 text-xs font-bold text-success">Latest</span>
                                                    : <span className="text-muted-foreground">—</span>}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{os}</TableCell>
                                            <TableCell className="text-right font-semibold text-muted-foreground">
                                                {share != null ? `${share}%` : '—'}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {summary && Object.keys(summary).length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Raw Summary</CardTitle>
                        <CardDescription>Full JSON payload from <code>/api/v1/agents/dashboard/summary</code>.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs font-mono leading-5">
                            {JSON.stringify(summary, null, 2)}
                        </pre>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export function CmtDashboard({ view = 'overview', moduleId = 'siem' }) {
    const [liveMode, setLiveMode] = useState(CMT_AUTO_CONNECT);
    const [backendReady, setBackendReady] = useState(false);
    const [loading, setLoading] = useState(CMT_AUTO_CONNECT);
    const [message, setMessage] = useState('');
    const [authRequired, setAuthRequired] = useState(false);
    const [cmtAuthenticated, setCmtAuthenticated] = useState(false);
    const [loginBusy, setLoginBusy] = useState(false);
    const [loginDraft, setLoginDraft] = useState({ username: '', password: '' });
    const [user, setUser] = useState(CMT_AUTO_CONNECT ? null : demoUser);
    const [cases, setCases] = useState(CMT_AUTO_CONNECT ? [] : demoCases);
    const [slaCases, setSlaCases] = useState(CMT_AUTO_CONNECT ? [] : demoCases.filter(isSlaBreached));
    const [alerts, setAlerts] = useState(CMT_AUTO_CONNECT ? [] : mergeAlertAnnotations(demoAlerts));
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

    const clearProtectedCmtData = useCallback(() => {
        setUser(null);
        setCases([]);
        setSlaCases([]);
        setAlerts([]);
        setTemplates([]);
        setUsers([]);
        setWebhooks([]);
    }, []);

    const requireCmtAuthentication = useCallback(async () => {
        if (!liveMode) return true;
        if (cmtAuthenticated) return true;

        try {
            const currentUser = await ensureCmtSession();
            setUser(currentUser || demoUser);
            setBackendReady(true);
            setAuthRequired(false);
            setCmtAuthenticated(true);
            return true;
        } catch (error) {
            setBackendReady(true);
            setAuthRequired(true);
            setCmtAuthenticated(false);
            setStreamStatus('auth required');
            setMessage(isCmtUnauthorized(error)
                ? 'CMT login is required before creating database cases. Enter CMT credentials, then retry Create Case.'
                : error.message || 'CMT authentication could not be established.');
            return false;
        }
    }, [cmtAuthenticated, liveMode]);

    const load = useCallback(async (options = {}) => {
        const shouldUseLive = options.liveMode ?? liveMode;
        let authenticated = options.authenticated ?? cmtAuthenticated;
        let resolvedUser = options.user || null;

        if (!shouldUseLive) {
            setBackendReady(false);
            setLoading(false);
            return;
        }

        setLoading(true);
        setMessage('');
        setBackendReady(false);

        try {
            if (!authenticated) {
                try {
                    resolvedUser = await ensureCmtSession();
                    authenticated = true;
                    setUser(resolvedUser || demoUser);
                    setAuthRequired(false);
                    setCmtAuthenticated(true);
                } catch (error) {
                    setBackendReady(true);
                    setAuthRequired(true);
                    setCmtAuthenticated(false);
                    clearProtectedCmtData();
                    setStreamStatus('auth required');
                    setMessage(isCmtUnauthorized(error)
                        ? 'Login to CMT before loading protected cases, alerts, and live stream data.'
                        : error.message || 'CMT authentication could not be established.');
                    return;
                }
            }

            if (options.user) {
                setUser(options.user);
            } else if (resolvedUser) {
                setUser(resolvedUser);
            }

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
            if (alertResult.status === 'fulfilled') setAlerts(mergeAlertAnnotations(asArray(alertResult.value, 'alerts')));
            if (templateResult.status === 'fulfilled') setTemplates(asArray(templateResult.value, 'templates'));
            if (userResult.status === 'fulfilled') setUsers(asArray(userResult.value, 'users'));
            if (webhookResult.status === 'fulfilled') setWebhooks(asArray(webhookResult.value, 'webhooks'));

            const allResults = [caseResult, slaResult, alertResult, templateResult, userResult, webhookResult];
            const anyUnauthorized = allResults.find((r) => r.status === 'rejected' && isCmtUnauthorized(r.reason));
            const criticalRejected = [caseResult, slaResult, alertResult].find((r) => r.status === 'rejected');

            if (anyUnauthorized) {
                setBackendReady(true);
                setAuthRequired(true);
                setCmtAuthenticated(false);
                clearProtectedCmtData();
                setStreamStatus('auth required');
                setMessage('CMT login is required before protected case and alert data can be loaded.');
            } else if (criticalRejected) {
                setBackendReady(true);
                setAuthRequired(false);
                setCmtAuthenticated(true);
                setMessage(criticalRejected.reason?.message || 'Some CMT data could not be loaded.');
            } else {
                setBackendReady(true);
                setAuthRequired(false);
                setCmtAuthenticated(true);
            }
        } catch (error) {
            const unauthorized = isCmtUnauthorized(error);
            if (!unauthorized) {
                setLiveMode(false);
            }
            setBackendReady(unauthorized);
            setAuthRequired(unauthorized);
            setCmtAuthenticated(false);
            clearProtectedCmtData();
            setStreamStatus('standby');
            setMessage(unauthorized
                ? 'CMT login is required. Enter CMT credentials to create a session before loading cases and alerts.'
                : error.message || 'CMT backend is not reachable. Please check your connection.');
        } finally {
            setLoading(false);
        }
    }, [clearProtectedCmtData, cmtAuthenticated, liveMode]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        setSelectedCase(null);
        setSelectedCaseId('');
        sessionStorage.removeItem('cmt_open_case_id');
    }, [view]);

    useEffect(() => {
        if (!backendReady || !cmtAuthenticated) return;
        const savedId = sessionStorage.getItem('cmt_open_case_id');
        if (savedId) loadCaseWorkspace(savedId, true);
    }, [backendReady, cmtAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!liveMode || !backendReady || !cmtAuthenticated || authRequired || !user || !CMT_ENABLE_SSE) {
            setStreamStatus(liveMode && backendReady && !CMT_ENABLE_SSE ? 'disabled' : authRequired ? 'auth required' : liveMode ? 'checking' : 'standby');
            return undefined;
        }

        const eventSource = createAlertEventSource();
        setStreamStatus('connecting');
        eventSource.onopen = () => setStreamStatus('connected');
        eventSource.addEventListener('alert', (event) => {
            try {
                const incoming = mergeAlertAnnotations([JSON.parse(event.data)])[0];
                const incomingId = alertAnnotationId(incoming);
                setAlerts((current) => [incoming, ...current.filter((item) => alertAnnotationId(item) !== incomingId)].slice(0, 100));
            } catch (_error) {
                setMessage('Received an unreadable live alert event.');
            }
        });
        eventSource.onerror = () => {
            eventSource.close();
            setStreamStatus('disconnected');
        };
        return () => eventSource.close();
    }, [authRequired, backendReady, cmtAuthenticated, liveMode, user]);

    const loadCaseWorkspace = useCallback(async (caseId, keepTab = false) => {
        sessionStorage.setItem('cmt_open_case_id', caseId);
        const fallback = cases.find((item) => itemId(item) === caseId) || null;
        setSelectedCaseId(caseId);
        setSelectedCase(fallback);
        if (!keepTab) setActiveCaseTab('overview');

        if (!liveMode) {
            setCaseNotes(demoNotes);
            setCaseEvidence(demoEvidence);
            setCaseAudit(demoAudit);
            setCaseReports(demoReports);
            return;
        }

        if (!(await requireCmtAuthentication())) {
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
            if (reports.status === 'fulfilled') {
                const seen = new Set();
                setCaseReports(asArray(reports.value, 'reports').filter((r) => {
                    const k = r.report_id || r.id;
                    if (!k || seen.has(k)) return false;
                    seen.add(k);
                    return true;
                }));
            }
        } catch (error) {
            setMessage(error.message || 'Failed to load case workspace.');
        }
    }, [cases, liveMode, requireCmtAuthentication]);

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
        setAuthRequired(false);
        setLiveMode(true);
    };

    const handleCmtLogin = async (event) => {
        event.preventDefault();
        setLoginBusy(true);
        setMessage('');
        setBackendReady(false);

        try {
            await loginCmt(loginDraft);
            const currentUser = await getCurrentCmtUser();
            const resolvedUser = currentUser || demoUser;
            setUser(resolvedUser);
            setAuthRequired(false);
            setCmtAuthenticated(true);
            setLiveMode(true);
            setLoginDraft((current) => ({ ...current, password: '' }));
            setMessage('CMT session established. Loading protected case and alert data.');
            await load({ authenticated: true, liveMode: true, user: resolvedUser });
        } catch (error) {
            setAuthRequired(true);
            setCmtAuthenticated(false);
            clearProtectedCmtData();
            setStreamStatus('auth required');
            setMessage(error.message || 'CMT login failed. Check username, password, and backend auth configuration.');
        } finally {
            setLoginBusy(false);
        }
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
        const handlePromoteError = (error, fallbackMessage) => {
            if (isCmtUnauthorized(error)) {
                setAuthRequired(true);
                setCmtAuthenticated(false);
                setStreamStatus('auth required');
                setMessage('CMT session expired or is unauthorized. Login to CMT, then retry Promote to Case.');
                return;
            }

            setMessage(error.message || fallbackMessage);
        };

        const promoteLiveAlerts = async (alertList) => {
            if (!(await requireCmtAuthentication())) {
                return;
            }

            const submittedAtMs = Date.now();
            const confirmedCases = [];
            let latestRows = [];

            setMessage(alertList.length > 1
                ? `Promoting ${alertList.length} alerts to CMT database cases...`
                : 'Promoting alert to a CMT database case...');

            for (const item of alertList) {
                const response = await promoteAlertToCase(item);
                const persisted = await waitForPersistedPromotedCase(item, response, submittedAtMs);
                latestRows = persisted.rows.length ? persisted.rows : latestRows;
                if (persisted.case) {
                    confirmedCases.push(persisted.case);
                }
            }

            setCases(confirmedCases.reduce((rows, nextCase) => upsertCaseRow(rows, nextCase), latestRows));

            if (!confirmedCases.length) {
                setMessage('Promotion request completed, but no promoted case was returned from the database. Check the CMT backend case persistence and alert linking path.');
            } else if (confirmedCases.length < alertList.length) {
                setMessage(`Promoted ${confirmedCases.length}/${alertList.length} alerts. Some created cases were not returned from the database list.`);
            } else {
                setMessage(alertList.length > 1
                    ? `${confirmedCases.length} alerts promoted and confirmed from the database.`
                    : 'Alert promoted and confirmed from the database.');
            }
        };

        if (Array.isArray(alert)) {
            const alertList = alert.filter(Boolean);
            if (!alertList.length) return;

            try {
                if (liveMode) {
                    await promoteLiveAlerts(alertList);
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
                handlePromoteError(error, 'Bulk alert promotion failed.');
            }
            return;
        }

        const alertId = alert.source_alert_id || alert.alert_id || alert.id;
        try {
            if (liveMode) {
                await promoteLiveAlerts([alert]);
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
            handlePromoteError(error, 'Alert promotion failed.');
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
        const nextLabels = storeAlertAnnotationValues(alertId, 'labels', updateAlertAnnotationList(alert, 'labels', (values) => [...values, label]));
        setAlerts((current) => applyAlertAnnotationValues(current, alertId, 'labels', nextLabels));
        try {
            if (liveMode) await addAlertLabel(alertId, label);
        } catch (error) {
            setMessage(error.message || 'Label update failed.');
        }
    };

    const handleRemoveAlertLabel = async (alert, label) => {
        const alertId = alert.source_alert_id || alert.id;
        const nextLabels = storeAlertAnnotationValues(alertId, 'labels', updateAlertAnnotationList(alert, 'labels', (values) => values.filter((value) => value !== label)));
        setAlerts((current) => applyAlertAnnotationValues(current, alertId, 'labels', nextLabels));
        try {
            if (liveMode) await deleteAlertLabel(alertId, label);
        } catch (error) {
            setMessage(error.message || 'Label removal failed.');
        }
    };

    const handleAddAlertIoc = async (alert, ioc, iocType = 'ip_address', file = null) => {
        if (!ioc) return;
        const alertId = alert.source_alert_id || alert.id;
        const nextIocs = storeAlertAnnotationValues(alertId, 'iocs', updateAlertAnnotationList(alert, 'iocs', (values) => [...values, ioc]));
        setAlerts((current) => applyAlertAnnotationValues(current, alertId, 'iocs', nextIocs));
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
        const nextIocs = storeAlertAnnotationValues(alertId, 'iocs', updateAlertAnnotationList(alert, 'iocs', (values) => values.filter((value) => value !== ioc)));
        setAlerts((current) => applyAlertAnnotationValues(current, alertId, 'iocs', nextIocs));
        try {
            if (liveMode) await deleteAlertIoc(alertId, { ioc });
        } catch (error) {
            setMessage(error.message || 'IOC removal failed.');
        }
    };

    const handleAddAlertAsset = async (alert, asset) => {
        if (!asset) return;
        const alertId = alert.source_alert_id || alert.id;
        const nextAssets = storeAlertAnnotationValues(alertId, 'assets', updateAlertAnnotationList(alert, 'assets', (values) => [...values, asset]));
        setAlerts((current) => applyAlertAnnotationValues(current, alertId, 'assets', nextAssets));
        try {
            if (liveMode) await addAlertAsset(alertId, { asset });
        } catch (error) {
            setMessage(error.message || 'Asset update failed.');
        }
    };

    const handleRemoveAlertAsset = async (alert, asset) => {
        const alertId = alert.source_alert_id || alert.id;
        const nextAssets = storeAlertAnnotationValues(alertId, 'assets', updateAlertAnnotationList(alert, 'assets', (values) => values.filter((value) => value !== asset)));
        setAlerts((current) => applyAlertAnnotationValues(current, alertId, 'assets', nextAssets));
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
        if (liveMode && !(await requireCmtAuthentication())) {
            return false;
        }

        const now = new Date().toISOString();
        const submittedAtMs = Date.now();
        const apiPayload = {
            title: manualCase.title.trim(),
            summary: manualCase.title.trim(),
            description: manualCase.description.trim(),
            severity: manualCase.severity || 'high',
            customer_code: manualCase.customer_code.trim()
        };
        const optimisticPayload = {
            ...apiPayload,
            status: 'open',
            owner: 'unassigned',
            escalated: false,
            archived: false,
            created_at: now,
            updated_at: now
        };

        try {
            if (liveMode) {
                setMessage('Creating manual case in CMT database...');
                const response = await createManualCase(apiPayload);
                const persisted = await waitForPersistedManualCase(apiPayload, response, submittedAtMs);

                if (!persisted.case) {
                    setCases(persisted.rows);
                    setMessage('Create request completed, but the new case was not returned from the database. Check the CMT backend /cases/manual persistence path.');
                    return false;
                }

                setCases(persisted.rows);
                setMessage('Manual case created and confirmed from the database.');
            } else {
                setCases((current) => upsertCaseRow(current, normalizeManualCase(optimisticPayload, `case-demo-${Date.now()}`)));
                setMessage('Demo manual case created.');
            }
            setManualCase({ title: '', description: '', severity: 'high', customer_code: '' });
            return true;
        } catch (error) {
            if (isCmtUnauthorized(error)) {
                setAuthRequired(true);
                setCmtAuthenticated(false);
                setStreamStatus('auth required');
                setMessage('CMT session expired or is unauthorized. Login to CMT, then retry Create Case.');
            } else {
                setMessage(error.message || 'Manual case creation failed.');
            }
            return false;
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
                await loadCaseWorkspace(caseId, true);
            }
        } catch (error) {
            setMessage(error.message || 'Note creation failed.');
        }
    };

    const handleUpdateNote = async (caseId, noteId, body) => {
        const previousNotes = caseNotes;
        setCaseNotes((current) => current.map((note) => itemId(note) === noteId ? {
            ...note,
            body,
            updated_at: new Date().toISOString()
        } : note));

        try {
            if (liveMode) {
                await updateCaseNote(caseId, noteId, body);
                await loadCaseWorkspace(caseId, true);
            } else {
                setMessage('Demo case note updated.');
            }
        } catch (error) {
            setCaseNotes(previousNotes);
            setMessage(error.message || 'Note update failed.');
        }
    };

    const handleDeleteNote = async (caseId, noteId) => {
        if (!window.confirm(`Delete note ${noteId}?`)) return;
        const previousNotes = caseNotes;
        setCaseNotes((current) => current.filter((note) => itemId(note) !== noteId));

        try {
            if (liveMode) await deleteCaseNote(caseId, noteId);
            else setMessage('Demo case note deleted.');
        } catch (error) {
            setCaseNotes(previousNotes);
            setMessage(error.message || 'Note deletion failed.');
        }
    };

    const handleUploadEvidence = async (caseId, file) => {
        if (!file) return;
        if (!liveMode) {
            setCaseEvidence((current) => [{
                evidence_id: `evidence-demo-${Date.now()}`,
                filename: file.name,
                content_type: file.type || 'application/octet-stream',
                size: file.size,
                uploaded_by: user?.username || 'analyst',
                created_at: new Date().toISOString()
            }, ...current]);
            return;
        }
        try {
            await uploadCaseEvidence(caseId, file);
            await loadCaseWorkspace(caseId, true);
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

    const handleFetchAlerts = useCallback(async (query = '') => {
        if (!liveMode) {
            const q = query.toLowerCase().trim();
            return demoAlerts.filter((a) =>
                !q ||
                (a.source_alert_id || '').toLowerCase().includes(q) ||
                (a.rule_description || '').toLowerCase().includes(q) ||
                (a.agent_name || '').toLowerCase().includes(q) ||
                (a.description || '').toLowerCase().includes(q)
            );
        }
        if (!(await requireCmtAuthentication())) return [];
        try {
            const result = await listFilteredAlerts({ title: query || undefined, page_size: 50, order: 'desc' });
            const list = Array.isArray(result) ? result : (result?.alerts || result?.data || result?.items || []);
            return list;
        } catch {
            return [];
        }
    }, [liveMode, requireCmtAuthentication]);

    const handleLinkAlert = async (caseId, sourceAlertId, alertObj = null) => {
        const alertIds = String(sourceAlertId).split(',').map((v) => v.trim()).filter(Boolean);
        if (!alertIds.length) return;

        setSelectedCase((current) => current && itemId(current) === caseId ? {
            ...current,
            linked_alerts: [...new Set([...linkedAlertIds(current), ...alertIds])]
        } : current);

        try {
            if (liveMode) {
                if (alertIds.length === 1) {
                    await linkCaseAlert(caseId, alertIds[0]);
                } else {
                    await bulkLinkCaseAlerts(caseId, alertIds);
                }
                await loadCaseWorkspace(caseId, true);
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
        if (!liveMode) {
            setCaseReports((current) => [{
                report_id: `report-demo-${Date.now()}`,
                template_id: templateId,
                format: templates.find((item) => (item.template_id || item.id) === templateId)?.format || 'pdf',
                created_at: new Date().toISOString()
            }, ...current]);
            setMessage('Demo report generated.');
            return;
        }
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(templateId || ''));
        if (!isUuid) {
            setMessage('This template was not saved to the backend. Delete it and create a new one.');
            return;
        }
        try {
            await generateCaseReport(caseId, { template_id: templateId });
            await loadCaseWorkspace(caseId, true);
        } catch (error) {
            setMessage(error.message || 'Report generation failed.');
        }
    };

    const handleSaveTemplate = async (draft) => {
        const name = (draft.name || '').trim();
        const body = (draft.body || '').trim();
        if (!name) { setMessage('Template name is required.'); return; }
        if (!body) { setMessage('Template body is required — enter the report content or structure.'); return; }

        const templateId = draft.template_id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const payload = { ...draft, name, body, template_id: templateId };
        const exists = templates.some((template) => (template.template_id || template.id) === templateId);

        try {
            if (liveMode) {
                if (exists) {
                    setTemplates((current) => current.map((t) => (t.template_id || t.id) === templateId
                        ? { ...payload, id: templateId, updated_at: new Date().toISOString() }
                        : t));
                    await updateReportTemplate(templateId, payload);
                } else {
                    // Backend assigns UUID — send only the required fields, no template_id
                    const createBody = { name, body, format: draft.format || 'pdf', renderer: draft.renderer || 'react_pdf' };
                    const created = await createReportTemplate(createBody);
                    const saved = created?.template || created || {};
                    const realId = saved.template_id || saved.id;
                    if (realId) {
                        setTemplates((current) => [{ ...saved, template_id: realId, id: realId }, ...current]);
                    } else {
                        const list = await listReportTemplates();
                        setTemplates(asArray(list, 'templates'));
                    }
                }
            } else {
                setTemplates((current) => {
                    const next = { ...payload, id: templateId, updated_at: new Date().toISOString() };
                    return exists
                        ? current.map((t) => (t.template_id || t.id) === templateId ? next : t)
                        : [next, ...current];
                });
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
        <div className="flex min-h-full w-full min-w-0 flex-col gap-6">
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
                        <Button type="button" onClick={handleConnectLive}>
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

            {authRequired && (
                <CmtLoginPanel
                    value={loginDraft}
                    onChange={setLoginDraft}
                    onSubmit={handleCmtLogin}
                    busy={loginBusy}
                    backendReady={backendReady}
                />
            )}

            {selectedCase ? (
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
                        sessionStorage.removeItem('cmt_open_case_id');
                    }}
                    onCreateNote={handleCreateNote}
                    onDeleteNote={handleDeleteNote}
                    onDownloadEvidence={handleDownloadEvidence}
                    onDownloadReport={handleDownloadReport}
                    onFetchAlerts={handleFetchAlerts}
                    onGenerateReport={handleGenerateReport}
                    onLinkAlert={handleLinkAlert}
                    onNotify={handleNotify}
                    onStatusChange={handleStatusChange}
                    onUnlinkAlert={handleUnlinkAlert}
                    onUpdateNote={handleUpdateNote}
                    onUploadEvidence={handleUploadEvidence}
                />
            ) : (
                <>
                    <div className="grid min-w-0 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                        <MetricCard icon={TicketCheck} label="Open Cases" value={stats.open} detail="Active investigations" tone="info" />
                        <MetricCard icon={Bell} label="New Alerts" value={stats.alerts} detail="Latest Wazuh alerts" tone="primary" />
                        <MetricCard icon={AlertTriangle} label="SLA Breached" value={stats.breached} detail="Past response deadline" tone="destructive" />
                        <MetricCard icon={Zap} label="Escalated" value={stats.escalated} detail="Management attention" tone="warning" />
                    </div>

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
                        <div className="flex items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-4">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                                <AlertTriangle className="size-4" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-destructive">SLA Breach Queue</p>
                                <p className="text-xs text-muted-foreground">
                                    Cases past their response deadline or explicitly flagged as breached.
                                    {filteredCases.length > 0 && ` ${filteredCases.length} case${filteredCases.length !== 1 ? 's' : ''} require${filteredCases.length === 1 ? 's' : ''} immediate attention.`}
                                </p>
                            </div>
                            <Badge variant="destructive" className="shrink-0 gap-1.5 px-3 py-1 text-xs font-semibold">
                                <Clock3 className="size-3" />
                                {filteredCases.length} overdue
                            </Badge>
                        </div>
                    )}
                    {view === 'cases' ? (
                        <div className="grid min-w-0 gap-6 min-[1900px]:grid-cols-[minmax(0,1fr)_340px]">
                            <CaseTable
                                rows={filteredCases}
                                selectedCaseId={selectedCaseId}
                                busyCaseId={busyCaseId}
                                onOpen={loadCaseWorkspace}
                                onStatusChange={handleStatusChange}
                                onEscalate={handleEscalate}
                                onArchive={handleArchive}
                            />
                            <ManualCasePanel value={manualCase} onChange={setManualCase} onSubmit={handleCreateManualCase} disabled={loading} />
                        </div>
                    ) : (
                        <CaseTable
                            rows={filteredCases}
                            selectedCaseId={selectedCaseId}
                            busyCaseId={busyCaseId}
                            onOpen={loadCaseWorkspace}
                            onStatusChange={handleStatusChange}
                            onEscalate={handleEscalate}
                            onArchive={handleArchive}
                        />
                    )}
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

            {view === 'agents' && <AgentsPage />}
                </>
            )}

            <AlertActionDialog
                action={alertAction}
                onOpenChange={(open) => setAlertAction((current) => ({ ...current, open }))}
                onSubmit={handleSubmitAlertAction}
            />

            <div className="rounded-xl border bg-card p-4 text-xs text-muted-foreground">
                API base: <span className="font-mono text-foreground">{CMT_API_BASE || 'same-origin root'}</span>. Live mode uses HttpOnly/session-cookie compatible requests plus bearer token exchange when available.
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
