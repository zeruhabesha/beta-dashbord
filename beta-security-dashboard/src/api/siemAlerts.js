const SIEM_ALERTS_API = '/api/siem-alerts';

function runtimeEnv() {
    if (typeof window === 'undefined') {
        return {};
    }

    return window._env_ || {};
}

function envFlag(value, fallback = false) {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

export function isSiemAlertsEnabled() {
    const env = runtimeEnv();
    return envFlag(env.SIEM_ALERTS_ENABLED ?? import.meta.env.VITE_SIEM_ALERTS_ENABLED, false);
}

async function parseResponse(response, fallbackMessage) {
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `${fallbackMessage}: ${response.status}`);
    }

    return response.json();
}

export async function fetchLiveAlerts(limit = 100, signal) {
    if (!isSiemAlertsEnabled()) {
        return { alerts: [] };
    }

    const response = await fetch(`${SIEM_ALERTS_API}/alerts?limit=${limit}`, {
        credentials: 'include',
        signal
    });

    return parseResponse(response, 'Failed to load alerts');
}

export function createSiemAlertStream() {
    if (!isSiemAlertsEnabled()) {
        return null;
    }

    return new EventSource(`${SIEM_ALERTS_API}/alerts/stream`, {
        withCredentials: true
    });
}

export async function createCaseFromAlert(alert) {
    if (!isSiemAlertsEnabled()) {
        throw new Error('Live SIEM alert API is disabled. Set VITE_SIEM_ALERTS_ENABLED=true and configure VITE_SIEM_ALERTS_PROXY_TARGET when the alert service is running.');
    }

    const response = await fetch(`${SIEM_ALERTS_API}/cases`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            alert_id: alert?.source_alert_id
        })
    });

    return parseResponse(response, 'Failed to create case');
}
