import { getKeycloakAccessToken } from '../auth/keycloak';
import { getConfiguredApiToken } from '../auth/accessControl';

const DEFAULT_APIS = {
    playbooks: '/api/playbooks',
    approvals: '/api/approvals',
    response: '/api/response',
    audit: '/api/audit-service',
    hunts: '/api/threat-hunting'
};

function runtimeEnv() {
    if (typeof window === 'undefined') {
        return {};
    }

    return window._env_ || {};
}

function serviceBaseUrl(service) {
    const env = runtimeEnv();
    const envMap = {
        playbooks: env.PLAYBOOK_SERVICE_API || import.meta.env.VITE_PLAYBOOK_SERVICE_API,
        approvals: env.APPROVAL_SERVICE_API || import.meta.env.VITE_APPROVAL_SERVICE_API,
        response: env.RESPONSE_SERVICE_API || import.meta.env.VITE_RESPONSE_SERVICE_API,
        audit: env.AUDIT_SERVICE_API || import.meta.env.VITE_AUDIT_SERVICE_API,
        hunts: env.THREAT_HUNTING_SERVICE_API || import.meta.env.VITE_THREAT_HUNTING_SERVICE_API
    };

    return String(envMap[service] || DEFAULT_APIS[service] || '').replace(/\/+$/, '');
}

function withQuery(path, query = {}) {
    const params = new URLSearchParams();

    Object.entries(query || {}).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
            return;
        }

        params.set(key, value);
    });

    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
}

async function parseResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
        ? await response.json().catch(() => null)
        : await response.text().catch(() => '');

    if (!response.ok) {
        const message = typeof payload === 'string'
            ? payload
            : payload?.message || payload?.error || payload?.detail;
        throw new Error(message || `Service request failed with ${response.status}`);
    }

    return payload || {};
}

async function buildHeaders(extraHeaders = {}) {
    const token = getConfiguredApiToken() || await getKeycloakAccessToken();
    const headers = {
        ...extraHeaders
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return headers;
}

export async function callSecurityService(service, path, options = {}) {
    const {
        method = 'GET',
        query,
        body,
        headers: extraHeaders
    } = options;
    const headers = await buildHeaders({
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...extraHeaders
    });
    const response = await fetch(`${serviceBaseUrl(service)}${withQuery(path, query)}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
    });

    return parseResponse(response);
}

export async function downloadSecurityServiceFile(service, path, options = {}) {
    const headers = await buildHeaders();
    const response = await fetch(`${serviceBaseUrl(service)}${withQuery(path, options.query)}`, {
        method: 'GET',
        headers
    });

    if (!response.ok) {
        await parseResponse(response);
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('content-disposition') || '';
    const filename = contentDisposition.match(/filename="?([^";]+)"?/)?.[1] || options.filename || 'security-export.bin';
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
