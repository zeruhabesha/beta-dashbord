import { getKeycloakAccessToken } from '../auth/keycloak';
import { getConfiguredApiToken } from '../auth/accessControl';

const DEFAULT_RESPONSE_API = '/api/response';

function getRuntimeResponseApi() {
    if (typeof window !== 'undefined' && window._env_?.RESPONSE_SERVICE_API) {
        return window._env_.RESPONSE_SERVICE_API;
    }

    return import.meta.env.VITE_RESPONSE_SERVICE_API || DEFAULT_RESPONSE_API;
}

function buildRequestId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return `manual-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
        throw new Error(message || `Manual response request failed with ${response.status}`);
    }

    return payload || {};
}

export async function submitManualResponseAction(request) {
    const responseApi = getRuntimeResponseApi().replace(/\/+$/, '');
    const token = getConfiguredApiToken() || await getKeycloakAccessToken();
    const headers = {
        'Content-Type': 'application/json'
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${responseApi}/api/v1/response/actions/manual`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            request_id: request.request_id || buildRequestId(),
            source: 'beta-dashboard-manual-response',
            execution_mode: 'manual',
            dry_run: false,
            requires_elevated_privileges: true,
            requested_at: new Date().toISOString(),
            ...request,
            dry_run: false
        })
    });

    return parseResponse(response);
}
