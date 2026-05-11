const SIEM_ALERTS_API = '/api/siem-alerts';

async function parseResponse(response, fallbackMessage) {
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `${fallbackMessage}: ${response.status}`);
    }

    return response.json();
}

export async function fetchLiveAlerts(limit = 100, signal) {
    const response = await fetch(`${SIEM_ALERTS_API}/alerts?limit=${limit}`, {
        credentials: 'include',
        signal
    });

    return parseResponse(response, 'Failed to load alerts');
}

export function createSiemAlertStream() {
    return new EventSource(`${SIEM_ALERTS_API}/alerts/stream`, {
        withCredentials: true
    });
}

export async function createCaseFromAlert(alert) {
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
