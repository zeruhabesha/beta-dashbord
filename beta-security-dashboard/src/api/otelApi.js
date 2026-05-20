/**
 * OTel API — queries the real OpenTelemetry indices on security-central (OpenSearch 3.6.0)
 *
 * Real indices:
 *   opensearch_dashboards_sample_data_otel_logs        — 16 286 docs
 *   opensearch_dashboards_sample_data_otel_spans       — 13 061 docs
 *   opensearch_dashboards_sample_data_otel_service_map — 49 docs
 *   ss4o_metrics-otel-opensearch_dashboards-sample     — 39 923 docs
 */

const OS_API = '/api/opensearch';

const OTEL_LOGS_INDEX    = 'opensearch_dashboards_sample_data_otel_logs';
const OTEL_SPANS_INDEX   = 'opensearch_dashboards_sample_data_otel_spans';
const OTEL_METRICS_INDEX = 'ss4o_metrics-otel-opensearch_dashboards-sample';
const OTEL_MAP_INDEX     = 'opensearch_dashboards_sample_data_otel_service_map';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// ─── Helpers ───────────────────────────────────────────────────────────────

async function osGET(path) {
    const res = await fetch(`${OS_API}${path}`, { method: 'GET', headers: JSON_HEADERS });
    if (!res.ok) throw new Error(`OpenSearch GET ${path} → ${res.status}`);
    return res.json();
}

async function osPOST(path, body) {
    const res = await fetch(`${OS_API}${path}`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`OpenSearch POST ${path} → ${res.status}`);
    return res.json();
}

/** Build a range filter on a date field for the last N hours/days */
function buildTimeFilter(field, timeRange = '24h') {
    return { range: { [field]: { gte: `now-${timeRange}`, lte: 'now' } } };
}

// ─── Cluster ──────────────────────────────────────────────────────────────

/**
 * Fetch cluster health metadata.
 * Returns: { clusterName, status, nodes, activeShards, unassignedShards, activePrimaryShards }
 */
export async function fetchClusterHealth() {
    return null;
}

/**
 * Fetch root cluster info (name + version).
 */
export async function fetchClusterInfo() {
    try {
        const data = await osGET('/');
        return {
            name: data.name,
            clusterName: data.cluster_name,
            version: data.version?.number,
            distribution: data.version?.distribution,
            luceneVersion: data.version?.lucene_version
        };
    } catch (e) {
        console.warn('[otelApi] fetchClusterInfo error', e);
        return null;
    }
}

// ─── OTel Logs ────────────────────────────────────────────────────────────

/**
 * Overall log statistics from the OTel logs index.
 * Returns: { total, severityBreakdown: [{key, count}], topServices: [{key, count}] }
 */
export async function fetchOtelLogStats(timeRange = '24h') {
    try {
        const data = await osPOST(`/${OTEL_LOGS_INDEX}/_search`, {
            size: 0,
            query: { bool: { filter: [buildTimeFilter('time', timeRange)] } },
            aggs: {
                severity_breakdown: {
                    terms: { field: 'severityText.keyword', size: 10, missing: 'UNKNOWN' }
                },
                top_services: {
                    terms: { field: 'serviceName', size: 10 }
                }
            }
        });

        const total = data.hits?.total?.value ?? 0;
        const severityBreakdown = (data.aggregations?.severity_breakdown?.buckets ?? []).map(b => ({
            key: b.key,
            count: b.doc_count
        }));
        const topServices = (data.aggregations?.top_services?.buckets ?? []).map(b => ({
            key: b.key,
            count: b.doc_count
        }));

        return { total, severityBreakdown, topServices };
    } catch (e) {
        console.warn('[otelApi] fetchOtelLogStats error', e);
        return { total: 0, severityBreakdown: [], topServices: [] };
    }
}

/**
 * Date histogram of log volume over the given time range.
 * Returns: [{ time: ISO, count: number }]
 */
export async function fetchOtelLogVolume(timeRange = '24h', interval = '1h') {
    try {
        const data = await osPOST(`/${OTEL_LOGS_INDEX}/_search`, {
            size: 0,
            query: { bool: { filter: [buildTimeFilter('time', timeRange)] } },
            aggs: {
                over_time: {
                    date_histogram: {
                        field: 'time',
                        fixed_interval: interval,
                        min_doc_count: 0
                    }
                }
            }
        });

        return (data.aggregations?.over_time?.buckets ?? []).map(b => ({
            time: b.key_as_string,
            count: b.doc_count
        }));
    } catch (e) {
        console.warn('[otelApi] fetchOtelLogVolume error', e);
        return [];
    }
}

/**
 * Most recent raw log entries.
 * Returns: [{ id, time, severityText, severityNumber, serviceName, body, traceId, spanId }]
 */
export async function fetchOtelRecentLogs(size = 50, timeRange = '24h') {
    try {
        const data = await osPOST(`/${OTEL_LOGS_INDEX}/_search`, {
            size,
            sort: [{ time: 'desc' }],
            query: { bool: { filter: [buildTimeFilter('time', timeRange)] } },
            _source: ['time', 'observedTime', 'severityText', 'severityNumber', 'serviceName', 'body', 'traceId', 'spanId']
        });

        return (data.hits?.hits ?? []).map(h => ({
            id: h._id,
            time: h._source.time ?? h._source.observedTime,
            severityText: h._source.severityText ?? 'UNKNOWN',
            severityNumber: h._source.severityNumber ?? 0,
            serviceName: h._source.serviceName ?? '—',
            body: h._source.body ?? '',
            traceId: h._source.traceId,
            spanId: h._source.spanId
        }));
    } catch (e) {
        console.warn('[otelApi] fetchOtelRecentLogs error', e);
        return [];
    }
}

// ─── OTel Traces / Spans ──────────────────────────────────────────────────

/**
 * High-level trace/span statistics.
 * Returns: { total, errorCount, errorRate, avgDurationMs, p99DurationMs, topServices }
 */
export async function fetchOtelTraceStats(timeRange = '24h') {
    try {
        const data = await osPOST(`/${OTEL_SPANS_INDEX}/_search`, {
            size: 0,
            query: { bool: { filter: [buildTimeFilter('startTime', timeRange)] } },
            aggs: {
                avg_duration: {
                    avg: { field: 'durationInNanos' }
                },
                p99_duration: {
                    percentiles: { field: 'durationInNanos', percents: [99] }
                },
                error_count: {
                    filter: { range: { 'status.code': { gt: 0 } } }
                },
                top_services: {
                    terms: { field: 'serviceName', size: 10 }
                },
                http_methods: {
                    terms: { field: 'span.attributes.http@method', size: 10 }
                }
            }
        });

        const total = data.hits?.total?.value ?? 0;
        const errorCount = data.aggregations?.error_count?.doc_count ?? 0;
        const avgNanos = data.aggregations?.avg_duration?.value ?? 0;
        const p99Nanos = data.aggregations?.p99_duration?.values?.['99.0'] ?? 0;
        const topServices = (data.aggregations?.top_services?.buckets ?? []).map(b => ({
            key: b.key,
            count: b.doc_count
        }));
        const httpMethods = (data.aggregations?.http_methods?.buckets ?? []).map(b => ({
            key: b.key,
            count: b.doc_count
        }));

        return {
            total,
            errorCount,
            errorRate: total > 0 ? ((errorCount / total) * 100).toFixed(1) : '0.0',
            avgDurationMs: (avgNanos / 1_000_000).toFixed(2),
            p99DurationMs: (p99Nanos / 1_000_000).toFixed(2),
            topServices,
            httpMethods
        };
    } catch (e) {
        console.warn('[otelApi] fetchOtelTraceStats error', e);
        return { total: 0, errorCount: 0, errorRate: '0.0', avgDurationMs: '0', p99DurationMs: '0', topServices: [], httpMethods: [] };
    }
}

/**
 * Recent span/trace entries.
 * Returns: [{ id, traceId, spanId, serviceName, name, startTime, endTime, durationMs, statusCode, httpMethod, httpStatus }]
 */
export async function fetchOtelRecentTraces(size = 30) {
    try {
        const data = await osPOST(`/${OTEL_SPANS_INDEX}/_search`, {
            size,
            sort: [{ startTime: 'desc' }],
            _source: [
                'traceId', 'spanId', 'parentSpanId', 'serviceName', 'name',
                'startTime', 'endTime', 'durationInNanos', 'status.code', 'kind',
                'span.attributes.http@method', 'span.attributes.http@status_code',
                'span.attributes.http@url', 'traceGroup'
            ]
        });

        return (data.hits?.hits ?? []).map(h => {
            const s = h._source;
            return {
                id: h._id,
                traceId: s.traceId,
                spanId: s.spanId,
                parentSpanId: s.parentSpanId,
                serviceName: s.serviceName ?? '—',
                name: s.name ?? '—',
                traceGroup: s.traceGroup,
                startTime: s.startTime,
                endTime: s.endTime,
                durationMs: s.durationInNanos ? (s.durationInNanos / 1_000_000).toFixed(2) : '—',
                statusCode: s['status.code'] ?? 0,
                kind: s.kind ?? '',
                httpMethod: s['span.attributes.http@method'],
                httpStatus: s['span.attributes.http@status_code'],
                httpUrl: s['span.attributes.http@url']
            };
        });
    } catch (e) {
        console.warn('[otelApi] fetchOtelRecentTraces error', e);
        return [];
    }
}

/**
 * Per-service span volume over time (histogram).
 */
export async function fetchOtelTraceVolume(timeRange = '24h', interval = '1h') {
    try {
        const data = await osPOST(`/${OTEL_SPANS_INDEX}/_search`, {
            size: 0,
            query: { bool: { filter: [buildTimeFilter('startTime', timeRange)] } },
            aggs: {
                over_time: {
                    date_histogram: {
                        field: 'startTime',
                        fixed_interval: interval,
                        min_doc_count: 0
                    }
                }
            }
        });

        return (data.aggregations?.over_time?.buckets ?? []).map(b => ({
            time: b.key_as_string,
            count: b.doc_count
        }));
    } catch (e) {
        console.warn('[otelApi] fetchOtelTraceVolume error', e);
        return [];
    }
}

// ─── Metrics ──────────────────────────────────────────────────────────────

/**
 * Summary stats from the ss4o metrics index.
 * Returns: { total, metricNames: [{key, count}] }
 */
export async function fetchOtelMetricStats() {
    try {
        const data = await osPOST(`/${OTEL_METRICS_INDEX}/_search`, {
            size: 0,
            aggs: {
                metric_names: {
                    terms: { field: 'name', size: 20 }
                }
            }
        });

        const total = data.hits?.total?.value ?? 0;
        const metricNames = (data.aggregations?.metric_names?.buckets ?? []).map(b => ({
            key: b.key,
            count: b.doc_count
        }));

        return { total, metricNames };
    } catch (e) {
        console.warn('[otelApi] fetchOtelMetricStats error', e);
        return { total: 0, metricNames: [] };
    }
}

// ─── Service Map ──────────────────────────────────────────────────────────

/**
 * Fetch all service map entries.
 * Returns: [{ source, destination, callCount, errorRate }]
 */
export async function fetchServiceMap() {
    try {
        const data = await osPOST(`/${OTEL_MAP_INDEX}/_search`, {
            size: 100,
            _source: ['source', 'destination', 'callCount', 'errorRate', 'avgLatency']
        });

        return (data.hits?.hits ?? []).map(h => ({
            id: h._id,
            ...h._source
        }));
    } catch (e) {
        console.warn('[otelApi] fetchServiceMap error', e);
        return [];
    }
}

// ─── Unique services (from spans) ─────────────────────────────────────────

/**
 * Count of unique services instrumented.
 */
export async function fetchUniqueServiceCount() {
    try {
        const data = await osPOST(`/${OTEL_SPANS_INDEX}/_search`, {
            size: 0,
            aggs: {
                unique_services: {
                    cardinality: { field: 'serviceName' }
                }
            }
        });
        return data.aggregations?.unique_services?.value ?? 0;
    } catch (e) {
        console.warn('[otelApi] fetchUniqueServiceCount error', e);
        return 0;
    }
}
