import { getConfiguredApiToken } from '../auth/accessControl';
import { getKeycloakAccessToken } from '../auth/keycloak';

const DEFAULT_CMT_API_BASE = '';
const DEFAULT_REQUEST_TIMEOUT_MS = 4500;
const CMT_TOKEN_STORAGE_KEY = 'cmt_token';
const CMT_SESSION_STORAGE_KEY = 'cmt_session_established';
let pendingCmtSession = null;
let cmtAuthRejected = false;

function readRuntimeValue(key, fallback) {
    return window._env_?.[key] ?? import.meta.env[`VITE_${key}`] ?? fallback;
}

function readRuntimeBoolean(key, fallback = false) {
    const value = readRuntimeValue(key, fallback ? 'true' : 'false');
    return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

export const CMT_API_BASE = String(readRuntimeValue('CMT_API_BASE', DEFAULT_CMT_API_BASE)).replace(/\/$/, '');
export const CMT_AUTO_CONNECT = readRuntimeBoolean('CMT_AUTO_CONNECT', true);
export const CMT_REQUEST_TIMEOUT_MS = Number(readRuntimeValue('CMT_REQUEST_TIMEOUT_MS', DEFAULT_REQUEST_TIMEOUT_MS)) || DEFAULT_REQUEST_TIMEOUT_MS;
export const CMT_ENABLE_SSE = readRuntimeBoolean('CMT_ENABLE_SSE', true);
export const CMT_REQUIRE_AUTH_SESSION = readRuntimeBoolean('CMT_REQUIRE_AUTH_SESSION', false);
export const CMT_USE_KEYCLOAK_TOKEN = readRuntimeBoolean('CMT_USE_KEYCLOAK_TOKEN', true);

export class CmtApiError extends Error {
    constructor(status, error, message) {
        super(message || error || `CMT request failed with status ${status}`);
        this.name = 'CmtApiError';
        this.status = status;
        this.error = error;
    }
}

export function isCmtUnauthorized(error) {
    return error?.status === 401 || error?.status === 403;
}

export function hasCmtSessionHint() {
    return localStorage.getItem(CMT_SESSION_STORAGE_KEY) === 'true'
        || Boolean(localStorage.getItem(CMT_TOKEN_STORAGE_KEY))
        || Boolean(getConfiguredApiToken());
}

function markCmtSessionEstablished() {
    localStorage.setItem(CMT_SESSION_STORAGE_KEY, 'true');
}

function clearCmtSessionState() {
    localStorage.removeItem(CMT_TOKEN_STORAGE_KEY);
    localStorage.removeItem(CMT_SESSION_STORAGE_KEY);
}

async function getCmtBearerToken() {
    const cmtToken = localStorage.getItem(CMT_TOKEN_STORAGE_KEY);
    if (cmtToken) {
        return cmtToken;
    }

    const configuredToken = getConfiguredApiToken();
    if (configuredToken) {
        return configuredToken;
    }

    return CMT_USE_KEYCLOAK_TOKEN ? await getKeycloakAccessToken() : '';
}

async function parseCmtResponse(response, fallbackMessage) {
    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await response.json().catch(() => null) : await response.text();

    if (!response.ok) {
        if (payload && typeof payload === 'object') {
            // Backend error shape: { error: { code, message, request_id } }
            const errObj = payload.error;
            const code = typeof errObj === 'string' ? errObj : (errObj?.code || 'CMT_REQUEST_FAILED');
            const message = payload.message
                || (typeof errObj === 'object' ? errObj?.message : null)
                || fallbackMessage;
            throw new CmtApiError(response.status, code, message);
        }
        throw new CmtApiError(response.status, 'CMT_REQUEST_FAILED', payload || fallbackMessage);
    }

    return payload;
}

export async function cmtFetch(path, options = {}) {
    const { includeAuth = true, timeoutMs: configuredTimeoutMs, ...requestOptions } = options;
    const headers = new Headers(requestOptions.headers || {});
    const isFormData = requestOptions.body instanceof FormData;
    const isUrlSearchParams = requestOptions.body instanceof URLSearchParams;
    const isBlob = requestOptions.body instanceof Blob;
    const isString = typeof requestOptions.body === 'string';
    const isJsonObject = requestOptions.body != null && typeof requestOptions.body === 'object' && !isFormData && !isUrlSearchParams && !isBlob;
    const controller = new AbortController();
    const timeoutMs = Number(configuredTimeoutMs || CMT_REQUEST_TIMEOUT_MS);
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

    if ((isJsonObject || isString) && !headers.has('Content-Type') && requestOptions.body != null) {
        headers.set('Content-Type', 'application/json');
    }

    try {
        if (includeAuth && !headers.has('Authorization')) {
            const token = await getCmtBearerToken();
            if (token) {
                headers.set('Authorization', `Bearer ${token}`);
            }
        }

        const response = await fetch(`${CMT_API_BASE}${path}`, {
            ...requestOptions,
            headers,
            body: isJsonObject ? JSON.stringify(requestOptions.body) : requestOptions.body,
            credentials: requestOptions.credentials || 'include',
            signal: requestOptions.signal || controller.signal
        });

        return parseCmtResponse(response, `CMT API request failed: ${path}`);
    } catch (error) {
        if (error?.name === 'AbortError') {
            throw new CmtApiError(0, 'CMT_TIMEOUT', `CMT backend did not respond within ${timeoutMs} ms.`);
        }
        throw error;
    } finally {
        window.clearTimeout(timeout);
    }
}

function toQueryString(params = {}) {
    const search = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            search.set(key, String(value));
        }
    });

    const query = search.toString();
    return query ? `?${query}` : '';
}

export function getCurrentCmtUser() {
    return cmtFetch('/auth/me');
}

export async function exchangeCmtSession(providedToken) {
    const token = providedToken || await getCmtBearerToken();

    if (!token) {
        throw new CmtApiError(401, 'CMT_AUTH_REQUIRED', 'Login or configure a bearer token before connecting live CMT.');
    }

    try {
        return await cmtFetch('/auth/exchange', {
            method: 'POST',
            includeAuth: false,
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: { token }
        });
    } catch (error) {
        if (isCmtUnauthorized(error)) {
            cmtAuthRejected = true;
            clearCmtSessionState();
            throw new CmtApiError(401, 'CMT_AUTH_REQUIRED', 'CMT rejected the bearer token. Login to CMT or configure a valid CMT API token.');
        }

        if (![400, 415, 422].includes(error?.status)) {
            throw error;
        }

        try {
            return await cmtFetch('/auth/exchange', {
                method: 'POST',
                includeAuth: false,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
        } catch (fallbackError) {
            if (isCmtUnauthorized(fallbackError)) {
                cmtAuthRejected = true;
                clearCmtSessionState();
                throw new CmtApiError(401, 'CMT_AUTH_REQUIRED', 'CMT rejected the bearer token. Login to CMT or configure a valid CMT API token.');
            }

            throw fallbackError;
        }
    }
}

export async function loginCmt(payload) {
    const response = await cmtFetch('/auth/login', {
        method: 'POST',
        includeAuth: false,
        body: payload
    });

    const token = response?.token || response?.access_token || response?.data?.token || response?.jwt;
    if (token) {
        localStorage.setItem(CMT_TOKEN_STORAGE_KEY, token);
    }
    markCmtSessionEstablished();
    cmtAuthRejected = false;

    return response;
}

export async function logoutCmt() {
    const response = await cmtFetch('/auth/logout', {
        method: 'POST'
    });
    clearCmtSessionState();
    cmtAuthRejected = false;
    return response;
}

async function resolveCmtSession() {
    const token = await getCmtBearerToken();
    const hasSession = hasCmtSessionHint();

    if (!token && !hasSession && !CMT_USE_KEYCLOAK_TOKEN) {
        throw new CmtApiError(401, 'CMT_AUTH_REQUIRED', 'CMT login is required before protected case and alert data can be loaded.');
    }

    // Keycloak is the auth source but returned no token — stale session hint present but
    // the access token is gone (expired / Keycloak unreachable). Clear the hint and fail
    // fast so the app shows the login dialog instead of making data calls that all 401.
    if (!token && CMT_USE_KEYCLOAK_TOKEN) {
        clearCmtSessionState();
        throw new CmtApiError(401, 'CMT_AUTH_REQUIRED', 'Keycloak session expired or is unavailable. Please log in again.');
    }

    if (cmtAuthRejected) {
        throw new CmtApiError(401, 'CMT_AUTH_REQUIRED', 'CMT rejected the bearer token. Login to CMT or configure a valid CMT API token.');
    }

    if (token) {
        await exchangeCmtSession(token);
    }

    try {
        const currentUser = await getCurrentCmtUser();
        markCmtSessionEstablished();
        cmtAuthRejected = false;
        return currentUser;
    } catch (error) {
        if (isCmtUnauthorized(error)) {
            cmtAuthRejected = true;
            clearCmtSessionState();
            throw new CmtApiError(401, 'CMT_AUTH_REQUIRED', 'CMT session is not authenticated. Login to CMT or configure a valid CMT bearer token.');
        }

        throw error;
    }
}

export async function ensureCmtSession() {
    if (!pendingCmtSession) {
        pendingCmtSession = resolveCmtSession().finally(() => {
            pendingCmtSession = null;
        });
    }

    return pendingCmtSession;
}

export function listCases(params = {}) {
    return cmtFetch(`/cases${toQueryString(params)}`);
}

export function getCase(caseId) {
    return cmtFetch(`/cases/${encodeURIComponent(caseId)}`);
}

export function createCase(payload) {
    return cmtFetch('/cases', {
        method: 'POST',
        body: payload
    });
}

export function listSlaBreachedCases() {
    return cmtFetch('/cases/sla-breached');
}

export function updateCaseStatus(caseId, status) {
    return cmtFetch(`/cases/${encodeURIComponent(caseId)}/status`, {
        method: 'PATCH',
        body: { status }
    });
}

export function assignCaseOwner(caseId, ownerId) {
    return cmtFetch(`/cases/${encodeURIComponent(caseId)}/owner`, {
        method: 'PATCH',
        body: { owner_id: ownerId }
    });
}

export function setCaseEscalated(caseId, escalated) {
    return cmtFetch(`/cases/${encodeURIComponent(caseId)}/escalated`, {
        method: 'PATCH',
        body: { escalated }
    });
}

export function setCaseArchived(caseId, archived) {
    return cmtFetch(`/cases/${encodeURIComponent(caseId)}/archived`, {
        method: 'PATCH',
        body: { archived }
    });
}

export function updateCaseCustomer(caseId, customerCode) {
    return cmtFetch(`/cases/${encodeURIComponent(caseId)}/customer`, {
        method: 'PATCH',
        body: { customer_code: customerCode }
    });
}

export function deleteCase(caseId) {
    return cmtFetch(`/cases/${encodeURIComponent(caseId)}`, {
        method: 'DELETE'
    });
}

export function createManualCase(payload) {
    return cmtFetch('/cases/manual', {
        method: 'POST',
        body: payload
    });
}

function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function alertIdentifier(alert) {
    if (alert && typeof alert === 'object') {
        return String(alert.source_alert_id || alert.sourceAlertId || alert.alert_id || alert.id || '');
    }

    return String(alert || '');
}

function internalAlertUuid(alert) {
    if (isUuid(alert)) return String(alert);
    if (!alert || typeof alert !== 'object') return '';

    const candidates = [alert.alert_id, alert.id, alert.uuid];
    return candidates.find(isUuid) || '';
}

function promotedCaseManualPayload(alert) {
    const id = alertIdentifier(alert);

    if (alert && typeof alert === 'object') {
        const title = alert.title || alert.rule_description || alert.description || `Promoted alert ${id}`;
        return {
            title,
            summary: title,
            description: alert.description || alert.rule_description || `Promoted from Wazuh alert ${id}`,
            severity: alert.severity || 'medium',
            customer_code: alert.customer_code || ''
        };
    }

    return {
        title: `Promoted alert ${id}`,
        summary: `Promoted alert ${id}`,
        description: `Promoted from Wazuh alert ${id}`,
        severity: 'medium',
        customer_code: ''
    };
}

function retryableBadRequest(error) {
    return [400, 404, 405, 415, 422].includes(error?.status);
}

export async function createCaseFromCmtAlert(alert) {
    const sourceAlertId = alertIdentifier(alert);

    // Backend: POST /cases  { alert_id: string }  where alert_id is the source alert ID
    try {
        return await cmtFetch('/cases', {
            method: 'POST',
            body: { alert_id: sourceAlertId }
        });
    } catch (error) {
        if (!retryableBadRequest(error)) throw error;
        return createManualCase(promotedCaseManualPayload(alert));
    }
}

export async function promoteAlertToCase(alert) {
    const sourceAlertId = alertIdentifier(alert);
    const uuid = internalAlertUuid(alert);

    if (!uuid) {
        return createCaseFromCmtAlert(alert);
    }

    try {
        return await cmtFetch(`/alerts/${encodeURIComponent(uuid)}/promote`, {
            method: 'POST',
            body: { alert_id: uuid, source_alert_id: sourceAlertId }
        });
    } catch (error) {
        if (!retryableBadRequest(error)) throw error;
        return createCaseFromCmtAlert(alert);
    }
}

export async function listFilteredAlerts(params = {}) {
    const query = toQueryString(params);

    try {
        return await cmtFetch(`/alerts/filter${query}`);
    } catch (error) {
        if (![404, 405].includes(error?.status)) {
            throw error;
        }

        return cmtFetch(`/alerts${query}`);
    }
}

export function listRecentAlerts(limit = 10) {
    return cmtFetch(`/alerts${toQueryString({ limit })}`);
}

export function listAlerts(params = {}) {
    return cmtFetch(`/alerts${toQueryString(params)}`);
}

export function setAlertAnomaly(sourceAlertId, isAnomaly) {
    return cmtFetch(`/alerts/${encodeURIComponent(sourceAlertId)}/anomaly`, {
        method: 'PATCH',
        body: { is_anomaly: isAnomaly }
    });
}

export function addAlertLabel(sourceAlertId, label) {
    return cmtFetch(`/alerts/${encodeURIComponent(sourceAlertId)}/labels`, {
        method: 'POST',
        body: { label }
    });
}

export function deleteAlertLabel(sourceAlertId, label) {
    return cmtFetch(`/alerts/${encodeURIComponent(sourceAlertId)}/labels/${encodeURIComponent(label)}`, {
        method: 'DELETE'
    });
}

export function addAlertIoc(sourceAlertId, ioc) {
    // Backend: { value: string, kind: string }
    const body = {
        value: ioc?.value || ioc?.ioc || String(ioc || ''),
        kind: ioc?.kind || ioc?.ioc_type || ioc?.type || 'unknown'
    };
    return cmtFetch(`/alerts/${encodeURIComponent(sourceAlertId)}/iocs`, {
        method: 'POST',
        body
    });
}

export function deleteAlertIoc(sourceAlertId, ioc) {
    // Backend: { value: string, kind: string }
    const body = {
        value: ioc?.value || ioc?.ioc || String(ioc || ''),
        kind: ioc?.kind || ioc?.ioc_type || ioc?.type || 'unknown'
    };
    return cmtFetch(`/alerts/${encodeURIComponent(sourceAlertId)}/iocs`, {
        method: 'DELETE',
        body
    });
}

export function addAlertAsset(sourceAlertId, asset) {
    // Backend: { name: string, kind: string }
    const body = {
        name: asset?.name || asset?.asset || asset?.value || String(asset || ''),
        kind: asset?.kind || asset?.asset_type || asset?.type || 'unknown'
    };
    return cmtFetch(`/alerts/${encodeURIComponent(sourceAlertId)}/assets`, {
        method: 'POST',
        body
    });
}

export function deleteAlertAsset(sourceAlertId, asset) {
    // Backend: { name: string, kind: string }
    const body = {
        name: asset?.name || asset?.asset || asset?.value || String(asset || ''),
        kind: asset?.kind || asset?.asset_type || asset?.type || 'unknown'
    };
    return cmtFetch(`/alerts/${encodeURIComponent(sourceAlertId)}/assets`, {
        method: 'DELETE',
        body
    });
}

export function listAlertComments(sourceAlertId) {
    return cmtFetch(`/alerts/${encodeURIComponent(sourceAlertId)}/comments`);
}

export function addAlertComment(sourceAlertId, body) {
    return cmtFetch(`/alerts/${encodeURIComponent(sourceAlertId)}/comments`, {
        method: 'POST',
        body: { body }
    });
}

export function deleteAlertComment(sourceAlertId, commentId) {
    return cmtFetch(`/alerts/${encodeURIComponent(sourceAlertId)}/comments/${encodeURIComponent(commentId)}`, {
        method: 'DELETE'
    });
}

export function listCaseNotes(caseId) {
    return cmtFetch(`/cases/${encodeURIComponent(caseId)}/notes`);
}

export function createCaseNote(caseId, body) {
    return cmtFetch(`/cases/${encodeURIComponent(caseId)}/notes`, {
        method: 'POST',
        body: { body }
    });
}

export function updateCaseNote(caseId, noteId, body) {
    return cmtFetch(`/cases/${encodeURIComponent(caseId)}/notes/${encodeURIComponent(noteId)}`, {
        method: 'PATCH',
        body: { body }
    });
}

export function deleteCaseNote(caseId, noteId) {
    return cmtFetch(`/cases/${encodeURIComponent(caseId)}/notes/${encodeURIComponent(noteId)}`, {
        method: 'DELETE'
    });
}

export function listCaseEvidence(caseId) {
    return cmtFetch(`/cases/${encodeURIComponent(caseId)}/evidence`);
}

export function uploadCaseEvidence(caseId, file, metadata = {}) {
    const body = new FormData();
    body.append('file', file);
    Object.entries(metadata).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            body.append(key, value);
        }
    });

    return cmtFetch(`/cases/${encodeURIComponent(caseId)}/evidence`, {
        method: 'POST',
        body
    });
}

export async function downloadCaseEvidence(caseId, evidenceId, filename = 'evidence.bin') {
    const headers = new Headers();
    const token = await getCmtBearerToken();

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${CMT_API_BASE}/cases/${encodeURIComponent(caseId)}/evidence/${encodeURIComponent(evidenceId)}/download`, {
        credentials: 'include',
        headers
    });

    if (!response.ok) {
        await parseCmtResponse(response, 'Evidence download failed.');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    return { filename };
}

export function listCaseAudit(caseId) {
    return cmtFetch(`/cases/${encodeURIComponent(caseId)}/audit`);
}

export function notifyCase(caseId, payload = {}) {
    return cmtFetch(`/cases/${encodeURIComponent(caseId)}/notify`, {
        method: 'POST',
        body: payload
    });
}

export function linkCaseAlert(caseId, sourceAlertId) {
    // Backend: POST /cases/:id/alerts  { alert_id: string }
    return cmtFetch(`/cases/${encodeURIComponent(caseId)}/alerts`, {
        method: 'POST',
        body: { alert_id: sourceAlertId }
    });
}

export function bulkLinkCaseAlerts(caseId, alertIds = []) {
    // Backend: POST /cases/:id/alerts/bulk  { alert_ids: string[] }
    return cmtFetch(`/cases/${encodeURIComponent(caseId)}/alerts/bulk`, {
        method: 'POST',
        body: { alert_ids: alertIds }
    });
}

export function unlinkCaseAlert(caseId, sourceAlertId) {
    return cmtFetch(`/cases/${encodeURIComponent(caseId)}/alerts/${encodeURIComponent(sourceAlertId)}`, {
        method: 'DELETE'
    });
}

export function listReportTemplates() {
    return cmtFetch('/report-templates');
}

export function createReportTemplate(payload) {
    return cmtFetch('/report-templates', {
        method: 'POST',
        body: payload
    });
}

export function getReportTemplate(templateId) {
    return cmtFetch(`/report-templates/${encodeURIComponent(templateId)}`);
}

export function updateReportTemplate(templateId, payload) {
    return cmtFetch(`/report-templates/${encodeURIComponent(templateId)}`, {
        method: 'PUT',
        body: payload
    });
}

export function deleteReportTemplate(templateId) {
    return cmtFetch(`/report-templates/${encodeURIComponent(templateId)}`, {
        method: 'DELETE'
    });
}

export function previewReportTemplate(payload) {
    return cmtFetch('/report-templates/preview', {
        method: 'POST',
        body: payload
    });
}

export function listCaseReports(caseId) {
    return cmtFetch(`/cases/${encodeURIComponent(caseId)}/reports`);
}

export function generateCaseReport(caseId, payload) {
    return cmtFetch(`/cases/${encodeURIComponent(caseId)}/reports`, {
        method: 'POST',
        body: payload
    });
}

export async function downloadCaseReport(caseId, reportId, filename = 'case-report.bin') {
    const headers = new Headers();
    const token = await getCmtBearerToken();

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${CMT_API_BASE}/cases/${encodeURIComponent(caseId)}/reports/${encodeURIComponent(reportId)}/download`, {
        credentials: 'include',
        headers
    });

    if (!response.ok) {
        await parseCmtResponse(response, 'Report download failed.');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    return { filename };
}

export function listUsers() {
    return cmtFetch('/users');
}

export function listCurrentUserCustomers() {
    return cmtFetch('/users/me/customers');
}

export function listUserCustomers(userId) {
    return cmtFetch(`/users/${encodeURIComponent(userId)}/customers`);
}

export function updateUserCustomers(userId, customers = []) {
    return cmtFetch(`/users/${encodeURIComponent(userId)}/customers`, {
        method: 'PUT',
        body: { customer_codes: customers }
    });
}

export function listCaseWebhooks() {
    return cmtFetch('/webhooks/cases');
}

export function getCaseWebhook(customerCode) {
    return cmtFetch(`/webhooks/cases/${encodeURIComponent(customerCode)}`);
}

export function updateCaseWebhook(customerCode, payload) {
    return cmtFetch(`/webhooks/cases/${encodeURIComponent(customerCode)}`, {
        method: 'PUT',
        body: payload
    });
}

export function createAlertEventSource() {
    return new EventSource(`${CMT_API_BASE}/alerts/stream`, {
        withCredentials: true
    });
}

// Agent dashboard routes — /api/v1/agents/* (public endpoints on the CMT backend)

export function getAgentDashboardSummary() {
    return cmtFetch('/api/v1/agents/dashboard/summary', { includeAuth: false });
}

export function listAgentVersions() {
    return cmtFetch('/api/v1/agents/versions', { includeAuth: false });
}

export function agentCheckin(payload) {
    return cmtFetch('/api/v1/agents/checkin', {
        method: 'POST',
        includeAuth: false,
        body: payload
    });
}
