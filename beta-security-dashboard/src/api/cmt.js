import { getConfiguredApiToken } from '../auth/accessControl';
import { getKeycloakAccessToken } from '../auth/keycloak';

const DEFAULT_CMT_API_BASE = '/api/siem-alerts';
const DEFAULT_REQUEST_TIMEOUT_MS = 4500;

function readRuntimeValue(key, fallback) {
    return window._env_?.[key] ?? import.meta.env[`VITE_${key}`] ?? fallback;
}

export const CMT_API_BASE = String(readRuntimeValue('CMT_API_BASE', DEFAULT_CMT_API_BASE)).replace(/\/$/, '');
export const CMT_AUTO_CONNECT = String(readRuntimeValue('CMT_AUTO_CONNECT', 'false')).toLowerCase() === 'true';
export const CMT_REQUEST_TIMEOUT_MS = Number(readRuntimeValue('CMT_REQUEST_TIMEOUT_MS', DEFAULT_REQUEST_TIMEOUT_MS)) || DEFAULT_REQUEST_TIMEOUT_MS;
export const CMT_ENABLE_SSE = String(readRuntimeValue('CMT_ENABLE_SSE', 'false')).toLowerCase() === 'true';

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
    return getConfiguredApiToken() || await getKeycloakAccessToken();
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
            throw new CmtApiError(response.status, payload.error, payload.message || fallbackMessage);
        }
        throw new CmtApiError(response.status, 'CMT_REQUEST_FAILED', payload || fallbackMessage);
    }

    return payload;
}

export async function cmtFetch(path, options = {}) {
    const { includeAuth = true, timeoutMs: configuredTimeoutMs, ...requestOptions } = options;
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

        const response = await fetch(`${CMT_API_BASE}${path}`, {
            credentials: 'include',
            ...requestOptions,
            headers,
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

    return cmtFetch('/auth/exchange', {
        method: 'POST',
        includeAuth: false,
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
}

export async function ensureCmtSession() {
    const token = await getCmtBearerToken();

    if (token) {
        await exchangeCmtSession(token);
    }

    return getCurrentCmtUser();
}

export function listCases(params = {}) {
    return cmtFetch(`/cases${toQueryString(params)}`);
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
    return cmtFetch(`/alerts/filter${toQueryString(params)}`);
}

export function listRecentAlerts(limit = 10) {
    return cmtFetch(`/alerts${toQueryString({ limit })}`);
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

export function addAlertComment(sourceAlertId, body) {
    return cmtFetch(`/alerts/${encodeURIComponent(sourceAlertId)}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body })
    });
}

export function listReportTemplates() {
    return cmtFetch('/report-templates');
}

export function createAlertEventSource() {
    return new EventSource(`${CMT_API_BASE}/alerts/stream`, {
        withCredentials: true
    });
}
