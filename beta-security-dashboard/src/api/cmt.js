const DEFAULT_CMT_API_BASE = '/api/siem-alerts';

export const CMT_API_BASE = (
    window._env_?.CMT_API_BASE
    || import.meta.env.VITE_CMT_API_BASE
    || DEFAULT_CMT_API_BASE
).replace(/\/$/, '');

export class CmtApiError extends Error {
    constructor(status, error, message) {
        super(message || error || `CMT request failed with status ${status}`);
        this.name = 'CmtApiError';
        this.status = status;
        this.error = error;
    }
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
    const headers = new Headers(options.headers || {});
    const isFormData = options.body instanceof FormData;

    if (!isFormData && !headers.has('Content-Type') && options.body != null) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${CMT_API_BASE}${path}`, {
        credentials: 'include',
        ...options,
        headers
    });

    return parseCmtResponse(response, `CMT API request failed: ${path}`);
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
