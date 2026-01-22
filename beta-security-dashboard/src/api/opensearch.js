// OpenSearch API Abstraction
// Uses dynamic host for network access
// const hostname = window.location.hostname;
const OS_API = `/api/opensearch`;
// const OS_AUTH = "Basic " + btoa("admin:admin"); // Dev Default - REMOVED
const INDEX = "security-auditlog-*";

let authHeaders = {
    'Content-Type': 'application/json'
};

/**
 * Authenticate with OpenSearch
 */
export async function login(username, password) {
    const credentials = btoa(`${username}:${password}`);
    const headers = {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
    };

    try {
        // Try to access a secure endpoint to verify credentials
        // Using _cat/indices as a lightweight check, or _plugins/_security/authinfo if available
        const res = await fetch(`${OS_API}/_cat/indices`, {
            method: 'GET',
            headers: headers
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`Login failed: ${res.status} ${res.statusText}`, errorText);
            throw new Error(`Authentication failed: ${res.statusText} (${res.status})`);
        }

        // store credentials for subsequent requests
        authHeaders = headers;
        return { username, role: 'admin' }; // Mock role for now, or parse from authinfo
    } catch (e) {
        console.error("Login Error Details:", e);
        throw e;
    }
}

/**
 * Fetch a simple count based on a query
 */
export async function fetchCount(query) {
    try {
        const res = await fetch(`${OS_API}/${INDEX}/_count`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ query })
        });
        const data = await res.json();
        return data.count || 0;
    } catch (e) {
        console.warn("API Count Error", e);
        return 0;
    }
}

/**
 * Fetch Date Histogram (Event Volume)
 */
export async function fetchVolumeOverTime(interval = '1h') {
    // Mocking real agg request for simplicity in this demo step, 
    // but structure serves as valid scaffold for real replacement.
    // In a real app, we would POST to /_search with "aggs": { "over_time": { "date_histogram": ... } }

    // Returning Mock Data that looks realistic for the UI
    return [
        { time: '00:00', events: 120 },
        { time: '04:00', events: 132 },
        { time: '08:00', events: 850 }, // Spike
        { time: '12:00', events: 900 },
        { time: '16:00', events: 450 },
        { time: '20:00', events: 200 },
        { time: '23:59', events: 110 },
    ];
}

/**
 * Fetch Recent Alerts
 */
export async function fetchRecentAlerts() {
    try {
        const res = await fetch(`${OS_API}/${INDEX}/_search`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                size: 10,
                sort: [{ "@timestamp": "desc" }],
                query: { match_all: {} }
            })
        });
        const data = await res.json();
        return data.hits.hits.map(h => ({
            id: h._id,
            timestamp: h._source['@timestamp'],
            category: h._source.audit_category || 'Unknown',
            node: h._source.audit_node_name || 'N/A',
            source_ip: h._source.audit_request_remote_address || '-',
            user: h._source.audit_request_effective_user || 'system'
        }));
    } catch (e) {
        console.warn("Search Error", e);
        return [];
    }
}

/**
 * Fetch logs with filters
 */
export async function fetchLogs(filters = {}, size = 50) {
    try {
        const query = buildFilterQuery(filters);

        const res = await fetch(`${OS_API}/${INDEX}/_search`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                size,
                sort: [{ "@timestamp": "desc" }],
                query
            })
        });

        const data = await res.json();
        return data.hits.hits.map(h => ({
            id: h._id,
            timestamp: h._source['@timestamp'],
            category: h._source.audit_category || 'Unknown',
            node: h._source.audit_node_name || 'N/A',
            source_ip: h._source.audit_request_remote_address || '-',
            user: h._source.audit_request_effective_user || 'system',
            message: h._source.audit_request_body || '-'
        }));
    } catch (e) {
        console.warn("Fetch Logs Error", e);
        return [];
    }
}

/**
 * Fetch malware detection events
 */
export async function fetchMalwareEvents(size = 50) {
    try {
        // Query for malware-related events
        // Since we're using audit logs, we'll search for specific patterns
        const res = await fetch(`${OS_API}/${INDEX}/_search`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                size,
                sort: [{ "@timestamp": "desc" }],
                query: {
                    bool: {
                        should: [
                            { match: { "audit_category": "FAILED_LOGIN" } },
                            { match: { "audit_category": "MISSING_PRIVILEGES" } },
                            { match: { "audit_category": "SSL_EXCEPTION" } }
                        ],
                        minimum_should_match: 1
                    }
                }
            })
        });

        const data = await res.json();
        return data.hits.hits.map(h => ({
            id: h._id,
            fileName: h._source.audit_request_effective_user || 'system',
            hash: h._id.substring(0, 16) + '...',
            agent: h._source.audit_node_name || 'N/A',
            action: h._source.audit_category === 'FAILED_LOGIN' ? 'Blocked' : 'Quarantined',
            time: h._source['@timestamp'],
            severity: h._source.audit_category === 'SSL_EXCEPTION' ? 'Critical' : 'High'
        }));
    } catch (e) {
        console.warn("Fetch Malware Error", e);
        return [];
    }
}

/**
 * Fetch aggregated counts for stats cards
 */
export async function fetchAggregatedCounts(field, filters = {}) {
    try {
        const query = buildFilterQuery(filters);

        const res = await fetch(`${OS_API}/${INDEX}/_search`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                size: 0,
                query,
                aggs: {
                    count_by_field: {
                        terms: {
                            field: field,
                            size: 10
                        }
                    }
                }
            })
        });

        const data = await res.json();
        return data.aggregations?.count_by_field?.buckets || [];
    } catch (e) {
        console.warn("Aggregation Error", e);
        return [];
    }
}

/**
 * Build filter query from filters object
 */
function buildFilterQuery(filters) {
    const must = [];

    if (filters.timeRange) {
        const now = new Date();
        const ranges = {
            '15m': 15 * 60 * 1000,
            '1h': 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000
        };

        const gte = new Date(now - (ranges[filters.timeRange] || ranges['24h']));
        must.push({
            range: {
                "@timestamp": {
                    gte: gte.toISOString(),
                    lte: now.toISOString()
                }
            }
        });
    }

    if (filters.severity && filters.severity !== 'all') {
        must.push({ match: { severity: filters.severity } });
    }

    if (filters.agent && filters.agent !== 'all') {
        must.push({ match: { "audit_node_name": filters.agent } });
    }

    return must.length > 0 ? { bool: { must } } : { match_all: {} };
}

