import { getConfiguredApiToken } from '../auth/accessControl';
import { getKeycloakAccessToken } from '../auth/keycloak';

const DEFAULT_CMT_API_BASE = '/api/cmt';
const DEFAULT_REQUEST_TIMEOUT_MS = 4500;

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

async function getCmtBearerToken() {
    // Check for a token explicitly returned by the CMT backend first
    const cmtToken = localStorage.getItem('cmt_token');
    if (cmtToken) {
        console.debug(`[CMT] Using stored cmt_token: ${cmtToken.substring(0, 10)}...`);
        return cmtToken;
    }

    const token = getConfiguredApiToken() || await getKeycloakAccessToken();
    if (token) {
        console.debug(`[CMT] Using Keycloak/Global token: ${token.substring(0, 10)}...`);
    } else {
        console.warn('[CMT] No bearer token found in storage or Keycloak');
    }
    return token;
}

async function parseCmtResponse(response, fallbackMessage) {
    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await response.json().catch(() => null) : await response.text();

    if (!response.ok) {
        if (response.status === 503) {
            console.error(`[CMT] Service Unavailable (503) for ${response.url}. Body:`, JSON.stringify(payload));
        }
        if (payload && typeof payload === 'object') {
            throw new CmtApiError(response.status, payload.error, payload.message || fallbackMessage);
        }
        throw new CmtApiError(response.status, 'CMT_REQUEST_FAILED', payload || fallbackMessage);
    }

    return payload;
}

export async function cmtFetch(path, options = {}) {
    const { includeAuth = false, timeoutMs: configuredTimeoutMs, ...requestOptions } = options;
    const headers = new Headers(requestOptions.headers || {});
    const isFormData = requestOptions.body instanceof FormData;
    const controller = new AbortController();
    const timeoutMs = Number(configuredTimeoutMs || CMT_REQUEST_TIMEOUT_MS);
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

    if (!isFormData && !headers.has('Content-Type') && requestOptions.body != null) {
        headers.set('Content-Type', 'application/json');
    }

    try {
        if (includeAuth && !headers.has('Authorization')) {
            const token = await getCmtBearerToken();
            if (token) {
                headers.set('Authorization', `Bearer ${token}`);
            }
        }

        console.debug(`[CMT] Request: ${requestOptions.method || 'GET'} ${CMT_API_BASE}${path}`, {
            includeAuth,
            hasAuthHeader: headers.has('Authorization'),
            body: requestOptions.body
        });

        const response = await fetch(`${CMT_API_BASE}${path}`, {
            ...requestOptions,
            headers,
            body: typeof requestOptions.body === 'object' ? JSON.stringify(requestOptions.body) : requestOptions.body,
            credentials: requestOptions.credentials || 'include',
            signal: requestOptions.signal || controller.signal
        });

        if (response.status === 401) {
            console.warn(`[CMT] 401 Unauthorized for ${path}. Token might be expired or invalid.`);
        }

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

export function getCmtHealth() {
    return cmtFetch('/health', { includeAuth: false, timeoutMs: CMT_REQUEST_TIMEOUT_MS });
}

export function getCurrentCmtUser() {
    return cmtFetch('/auth/me');
}

export async function exchangeCmtSession(providedToken) {
    const token = providedToken || await getCmtBearerToken();

    if (!token) {
        throw new CmtApiError(401, 'CMT_AUTH_REQUIRED', 'Login or configure a bearer token before connecting live CMT.');
    }

    console.log('[CMT] Attempting session exchange (login)...');
    try {
        const response = await cmtFetch('/auth/login', {
            method: 'POST',
            includeAuth: true,
            body: {
                username: "wazuh-wui",
                password: "MyS3cr37P450r.*-",
                token: token
            }
        });
        
        console.debug('[CMT] Login response payload:', response);

        const newToken = response?.token || response?.data?.token || response?.jwt;
        if (newToken) {
            console.log('[CMT] Received new token from login, saving...');
            localStorage.setItem('cmt_token', newToken);
        } else {
            console.warn('[CMT] Login successful but no token found in response body.');
        }
        return response;
    } catch (error) {
        console.error('[CMT] exchangeCmtSession failed:', error);
        throw error;
    }
}

export function loginCmt(payload) {
    return cmtFetch('/auth/login', {
        method: 'POST',
        includeAuth: false,
        body: JSON.stringify(payload)
    });
}

export function logoutCmt() {
    return cmtFetch('/auth/logout', {
        method: 'POST'
    });
}

export async function ensureCmtSession() {
    const token = await getCmtBearerToken();
    console.debug('[CMT] Ensuring session, live token status:', !!token);

    if (!token) {
        console.error('[CMT] Cannot ensure session: No token found. Please ensure you are logged into the dashboard.');
        throw new CmtApiError(401, 'CMT_AUTH_REQUIRED', 'Please sign in to the dashboard to access CMT.');
    }

    if (token) {
        try {
            await exchangeCmtSession(token);
            console.debug('[CMT] Session exchange successful');
        } catch (error) {
            if (error.status === 401) {
                console.warn('[CMT] Login rejected with 401. Possible credential mismatch.');
            }
            // We continue anyway as the Bearer token might be sufficient
        }
    }

    try {
        const user = await getCurrentCmtUser();
        console.debug('[CMT] User authenticated:', user?.username || 'unknown');
        return user;
    } catch (error) {
        if (error.status === 401) {
            console.error('[CMT] Final authentication check failed with 401.');
            // Clear cmt_token if it was invalid
            localStorage.removeItem('cmt_token');
        }
        throw error;
    }
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
        body: JSON.stringify(payload)
    });
}

export function listSlaBreachedCases() {
    return cmtFetch('/cases/sla-breached');
}

export function updateCaseStatus(caseId, status) {
    return cmtFetch(`/cases/${encodeURIComponent(caseId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
    });
}

export function assignCaseOwner(caseId, ownerId) {
    return cmtFetch(`/cases/${encodeURIComponent(caseId)}/owner`, {
        method: 'PATCH',
        body: JSON.stringify({ owner_id: ownerId })
    });
}

export function setCaseEscalated(caseId, escalated) {
    return cmtFetch(`/cases/${encodeURIComponent(caseId)}/escalated`, {
        method: 'PATCH',
        body: JSON.stringify({ escalated })
    });
}

export function setCaseArchived(caseId, archived) {
    return cmtFetch(`/cases/${encodeURIComponent(caseId)}/archived`, {
        method: 'PATCH',
        body: JSON.stringify({ archived })
    });
}

export function updateCaseCustomer(caseId, customerCode) {
    return cmtFetch(`/cases/${encodeURIComponent(caseId)}/customer`, {
        method: 'PATCH',
        body: JSON.stringify({ customer_code: customerCode })
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
        body: JSON.stringify(payload)
    });
}

export function createCaseFromCmtAlert(alertId) {
    return cmtFetch('/cases', {
        method: 'POST',
        body: JSON.stringify({ alert_id: alertId })
    });
}

export function listFilteredAlerts(params = {}) {
    return cmtFetch(`/alerts${toQueryString(params)}`);
}

export function listRecentAlerts(limit = 10) {
    return cmtFetch(`/alerts${toQueryString({ limit })}`);
}

export function listAlerts(params = {}) {
    return cmtFetch(`/alerts${toQueryString(params)}`);
}

export function promoteAlertToCase(alertId) {
    return cmtFetch(`/alerts/${encodeURIComponent(alertId)}/promote`, {
        method: 'POST'
    });
}

export function setAlertAnomaly(sourceAlertId, isAnomaly) {
    return cmtFetch(`/alerts/${encodeURIComponent(sourceAlertId)}/anomaly`, {
        method: 'PATCH',
        body: JSON.stringify({ is_anomaly: isAnomaly })
    });
}

export function addAlertLabel(sourceAlertId, label) {
    return cmtFetch(`/alerts/${encodeURIComponent(sourceAlertId)}/labels`, {
        method: 'POST',
        body: JSON.stringify({ label })
    });
}

export function deleteAlertLabel(sourceAlertId, label) {
    return cmtFetch(`/alerts/${encodeURIComponent(sourceAlertId)}/labels/${encodeURIComponent(label)}`, {
        method: 'DELETE'
    });
}

export function addAlertIoc(sourceAlertId, ioc) {
    return cmtFetch(`/alerts/${encodeURIComponent(sourceAlertId)}/iocs`, {
        method: 'POST',
        body: JSON.stringify(ioc)
    });
}

export function deleteAlertIoc(sourceAlertId, ioc) {
    return cmtFetch(`/alerts/${encodeURIComponent(sourceAlertId)}/iocs`, {
        method: 'DELETE',
        body: JSON.stringify(ioc)
    });
}

export function addAlertAsset(sourceAlertId, asset) {
    return cmtFetch(`/alerts/${encodeURIComponent(sourceAlertId)}/assets`, {
        method: 'POST',
        body: JSON.stringify(asset)
    });
}

export function deleteAlertAsset(sourceAlertId, asset) {
    return cmtFetch(`/alerts/${encodeURIComponent(sourceAlertId)}/assets`, {
        method: 'DELETE',
        body: JSON.stringify(asset)
    });
}

export function listAlertComments(sourceAlertId) {
    return cmtFetch(`/alerts/${encodeURIComponent(sourceAlertId)}/comments`);
}

export function addAlertComment(sourceAlertId, body) {
    return cmtFetch(`/alerts/${encodeURIComponent(sourceAlertId)}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body })
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
        body: JSON.stringify({ body })
    });
}

export function updateCaseNote(caseId, noteId, body) {
    return cmtFetch(`/cases/${encodeURIComponent(caseId)}/notes/${encodeURIComponent(noteId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ body })
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
        body: JSON.stringify(payload)
    });
}

export function linkCaseAlert(caseId, sourceAlertId) {
    return cmtFetch(`/cases/${encodeURIComponent(caseId)}/alerts`, {
        method: 'POST',
        body: JSON.stringify({ source_alert_id: sourceAlertId })
    });
}

export function bulkLinkCaseAlerts(caseId, sourceAlertIds = []) {
    return cmtFetch(`/cases/${encodeURIComponent(caseId)}/alerts/bulk`, {
        method: 'POST',
        body: JSON.stringify({ source_alert_ids: sourceAlertIds })
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
        body: JSON.stringify(payload)
    });
}

export function getReportTemplate(templateId) {
    return cmtFetch(`/report-templates/${encodeURIComponent(templateId)}`);
}

export function updateReportTemplate(templateId, payload) {
    return cmtFetch(`/report-templates/${encodeURIComponent(templateId)}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
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
        body: JSON.stringify(payload)
    });
}

export function listCaseReports(caseId) {
    return cmtFetch(`/cases/${encodeURIComponent(caseId)}/reports`);
}

export function generateCaseReport(caseId, payload) {
    return cmtFetch(`/cases/${encodeURIComponent(caseId)}/reports`, {
        method: 'POST',
        body: JSON.stringify(payload)
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
        body: JSON.stringify({ customers })
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
        body: JSON.stringify(payload)
    });
}

export function createAlertEventSource() {
    return new EventSource(`${CMT_API_BASE}/alerts/stream`, {
        withCredentials: true
    });
}
