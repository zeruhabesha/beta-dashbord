/**
 * provision-otel-dashboards.mjs
 *
 * Creates OpenSearch Dashboards saved objects (index patterns, visualizations,
 * and dashboards) for the three live OTel indices on security-central.
 *
 * Usage:
 *   node scripts/provision-otel-dashboards.mjs
 *
 * Env overrides:
 *   OPENSEARCH_URL          (default: http://196.188.249.46:9200)
 *   OPENSEARCH_DASHBOARDS_URL (default: http://196.188.249.46:5601)
 */

const OPENSEARCH_URL    = process.env.OPENSEARCH_URL             || 'http://196.188.249.46:9200';
const DASHBOARDS_URL    = process.env.OPENSEARCH_DASHBOARDS_URL  || 'http://196.188.249.46:5601';

// ── Index names (exact) ─────────────────────────────────────────────────────
const LOGS_INDEX    = 'opensearch_dashboards_sample_data_otel_logs';
const SPANS_INDEX   = 'opensearch_dashboards_sample_data_otel_spans';
const METRICS_INDEX = 'ss4o_metrics-otel-opensearch_dashboards-sample';

// ── Saved-object IDs ────────────────────────────────────────────────────────
const IDS = {
    // Data views
    dpLogs:    'otel-dp-logs',
    dpSpans:   'otel-dp-spans',
    dpMetrics: 'otel-dp-metrics',

    // Visualizations - Logs
    vizLogTotal:    'otel-viz-log-total',
    vizLogSeverity: 'otel-viz-log-severity',
    vizLogVolume:   'otel-viz-log-volume',
    vizLogServices: 'otel-viz-log-services',
    vizLogSevBar:   'otel-viz-log-sev-bar',

    // Visualizations - Traces
    vizSpanTotal:   'otel-viz-span-total',
    vizSpanVolume:  'otel-viz-span-volume',
    vizSpanSvc:     'otel-viz-span-services',
    vizSpanHttp:    'otel-viz-span-http-status',
    vizSpanKind:    'otel-viz-span-kind',
    vizSpanAvgDur:  'otel-viz-span-avg-dur',

    // Visualizations - Metrics
    vizMetricTotal: 'otel-viz-metric-total',
    vizMetricNames: 'otel-viz-metric-names',

    // Dashboards
    dashLogs:     'otel-logs-dashboard',
    dashTraces:   'otel-traces-dashboard',
    dashOverview: 'otel-overview-dashboard',
};

// ── Request helpers ──────────────────────────────────────────────────────────
const OSD_HEADERS = {
    'Content-Type':     'application/json',
    'osd-xsrf':         'true',
    'kbn-xsrf':         'true',
    'securitytenant':   'global',
};

async function osdPut(type, id, attributes) {
    const url  = `${DASHBOARDS_URL}/api/saved_objects/${type}/${id}?overwrite=true`;
    const body = JSON.stringify({ attributes });
    const res  = await fetch(url, { method: 'POST', headers: OSD_HEADERS, body });
    const text = await res.text();
    if (!res.ok) {
        console.warn(`  ✗ ${type}/${id}  HTTP ${res.status}:\n     ${text.slice(0, 300)}`);
        return null;
    }
    return JSON.parse(text);
}

async function osBulk(index, docs) {
    const lines = docs
        .flatMap(d => [JSON.stringify({ index: { _index: index } }), JSON.stringify(d)])
        .join('\n') + '\n';
    const res = await fetch(`${OPENSEARCH_URL}/_bulk`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-ndjson' },
        body:    lines,
    });
    if (!res.ok) console.warn(`  ✗ bulk ingest to ${index}: HTTP ${res.status}`);
    return res.json();
}

// ── Vis-state builders ───────────────────────────────────────────────────────

function searchSourceJson(indexPatternId) {
    return JSON.stringify({
        index:    indexPatternId,
        query:    { query: '', language: 'kuery' },
        filter:   [],
    });
}

function metricVisState(title, label = 'Count') {
    return JSON.stringify({
        title,
        type: 'metric',
        aggs: [{ id: '1', enabled: true, type: 'count', schema: 'metric', params: {} }],
        params: {
            addTooltip: true,
            addLegend:  false,
            type:       'metric',
            metric: {
                percentageMode: false,
                useRanges:      false,
                colorSchema:    'Green to Red',
                metricColorMode: 'None',
                colorsRange:    [{ from: 0, to: 10000 }],
                labels:         { show: true },
                invertColors:   false,
                style:          { bgFill: '#000', bgColor: false, labelColor: false, subText: label, fontSize: 48 },
            },
        },
    });
}

function avgMetricVisState(title, field, label = '') {
    return JSON.stringify({
        title,
        type: 'metric',
        aggs: [{ id: '1', enabled: true, type: 'avg', schema: 'metric', params: { field } }],
        params: {
            addTooltip: true,
            addLegend:  false,
            type:       'metric',
            metric: {
                percentageMode: false,
                useRanges:      false,
                colorSchema:    'Blues',
                metricColorMode: 'None',
                colorsRange:    [{ from: 0, to: 10000 }],
                labels:         { show: true },
                invertColors:   false,
                style:          { bgFill: '#000', bgColor: false, labelColor: false, subText: label, fontSize: 48 },
            },
        },
    });
}

function pieVisState(title, termsField, size = 10) {
    return JSON.stringify({
        title,
        type: 'pie',
        aggs: [
            { id: '1', enabled: true, type: 'count', schema: 'metric', params: {} },
            { id: '2', enabled: true, type: 'terms', schema: 'segment', params: { field: termsField, size, order: 'desc', orderBy: '1' } },
        ],
        params: {
            type:         'pie',
            addTooltip:   true,
            addLegend:    true,
            legendPosition: 'right',
            isDonut:      true,
            labels:       { show: false, values: true, last_level: true, truncate: 100 },
        },
    });
}

function areaVisState(title, dateField, interval = 'auto') {
    return JSON.stringify({
        title,
        type: 'area',
        aggs: [
            { id: '1', enabled: true, type: 'count', schema: 'metric', params: {} },
            { id: '2', enabled: true, type: 'date_histogram', schema: 'segment', params: { field: dateField, interval, min_doc_count: 1 } },
        ],
        params: {
            type: 'area',
            grid: { categoryLines: false },
            categoryAxes: [{
                id: 'CategoryAxis-1', type: 'category', position: 'bottom', show: true,
                labels: { show: true, truncate: 100 }, title: {},
            }],
            valueAxes: [{
                id: 'ValueAxis-1', name: 'LeftAxis-1', type: 'value', position: 'left', show: true,
                scale: { type: 'linear', mode: 'normal' },
                labels: { show: true, rotate: 0, filter: false, truncate: 100 },
                title: { text: 'Count' },
            }],
            seriesParams: [{
                show: true, type: 'area', mode: 'stacked',
                data: { label: 'Count', id: '1' },
                drawLinesBetweenPoints: true, lineWidth: 2, showCircles: true,
                interpolate: 'linear', valueAxis: 'ValueAxis-1',
            }],
            addTooltip: true, addLegend: false, legendPosition: 'right',
            times: [], addTimeMarker: false,
        },
    });
}

function barVisState(title, termsField, size = 10, horizontal = false) {
    return JSON.stringify({
        title,
        type: 'histogram',
        aggs: [
            { id: '1', enabled: true, type: 'count', schema: 'metric', params: {} },
            { id: '2', enabled: true, type: 'terms', schema: 'segment', params: { field: termsField, size, order: 'desc', orderBy: '1' } },
        ],
        params: {
            type:           'histogram',
            addLegend:      false,
            addTooltip:     true,
            addTimeMarker:  false,
            categoryAxes:   [{
                id: 'CategoryAxis-1', type: 'category',
                position: horizontal ? 'left' : 'bottom', show: true,
                labels: { show: true, filter: true, truncate: 100 },
            }],
            valueAxes: [{
                id: 'ValueAxis-1', name: 'LeftAxis-1', type: 'value',
                position: horizontal ? 'bottom' : 'left', show: true,
                scale: { type: 'linear' },
                labels: { show: true },
                title: { text: 'Count' },
            }],
            seriesParams: [{
                show: true, type: 'histogram', mode: 'normal',
                data: { label: 'Count', id: '1' },
                valueAxis: 'ValueAxis-1', drawLinesBetweenPoints: true, showCircles: true,
            }],
        },
    });
}

// ── Panel builder (48-column grid) ───────────────────────────────────────────
let panelSeq = 0;
function panel(id, x, y, w, h) {
    panelSeq += 1;
    return {
        gridData:        { x, y, w, h, i: String(panelSeq) },
        version:         '3.6.0',
        type:            'visualization',
        id,
        embeddableConfig: { enhancements: {} },
    };
}

function dashboardAttributes(title, description, panels, timeFrom = 'now-7d', timeTo = 'now') {
    return {
        title,
        description,
        panelsJSON:    JSON.stringify(panels),
        optionsJSON:   JSON.stringify({ useMargins: true, syncColors: true, hidePanelTitles: false }),
        version:       1,
        timeRestore:   true,
        timeFrom,
        timeTo,
        refreshInterval: { pause: false, value: 30000 },
        kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [] }),
        },
    };
}

// ── Step runner ──────────────────────────────────────────────────────────────
async function run(label, fn) {
    process.stdout.write(`  ${label} ... `);
    try {
        await fn();
        console.log('✓');
    } catch (err) {
        console.log(`✗  ${err.message}`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║  OTel OpenSearch Dashboards Provisioner                  ║');
console.log('║  Cluster : security-central  (OpenSearch 3.6.0)          ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

console.log(`OpenSearch     : ${OPENSEARCH_URL}`);
console.log(`Dashboards     : ${DASHBOARDS_URL}\n`);

// ── 1. Index Patterns (Data Views) ──────────────────────────────────────────
console.log('► Creating index patterns …');

await run(`Data view: ${LOGS_INDEX}`, () => osdPut('index-pattern', IDS.dpLogs, {
    title:         LOGS_INDEX,
    timeFieldName: 'time',
}));

await run(`Data view: ${SPANS_INDEX}`, () => osdPut('index-pattern', IDS.dpSpans, {
    title:         SPANS_INDEX,
    timeFieldName: 'startTime',
}));

await run(`Data view: ${METRICS_INDEX}`, () => osdPut('index-pattern', IDS.dpMetrics, {
    title:         METRICS_INDEX,
    timeFieldName: '@timestamp',
}));

// ── 2. Log Visualizations ────────────────────────────────────────────────────
console.log('\n► Creating log visualizations …');

await run('Metric: Total Log Count', () => osdPut('visualization', IDS.vizLogTotal, {
    title:     'Total Log Count',
    visState:  metricVisState('Total Log Count', 'OTel Log Entries'),
    uiStateJSON: '{}',
    description: 'Total number of OTel log entries',
    kibanaSavedObjectMeta: { searchSourceJSON: searchSourceJson(IDS.dpLogs) },
}));

await run('Pie: Log Severity Distribution', () => osdPut('visualization', IDS.vizLogSeverity, {
    title:     'Log Severity Distribution',
    visState:  pieVisState('Log Severity Distribution', 'severityText.keyword', 10),
    uiStateJSON: '{}',
    description: 'Distribution of log severity levels',
    kibanaSavedObjectMeta: { searchSourceJSON: searchSourceJson(IDS.dpLogs) },
}));

await run('Area: Log Volume Over Time', () => osdPut('visualization', IDS.vizLogVolume, {
    title:     'Log Volume Over Time',
    visState:  areaVisState('Log Volume Over Time', 'time', 'auto'),
    uiStateJSON: '{}',
    description: 'Number of log entries per time bucket',
    kibanaSavedObjectMeta: { searchSourceJSON: searchSourceJson(IDS.dpLogs) },
}));

await run('Bar: Top Services by Log Volume', () => osdPut('visualization', IDS.vizLogServices, {
    title:     'Top Services by Log Volume',
    visState:  barVisState('Top Services by Log Volume', 'serviceName', 15, true),
    uiStateJSON: '{}',
    description: 'Services with the most log entries',
    kibanaSavedObjectMeta: { searchSourceJSON: searchSourceJson(IDS.dpLogs) },
}));

await run('Bar: Severity Breakdown (Bar)', () => osdPut('visualization', IDS.vizLogSevBar, {
    title:     'Severity Breakdown (Bar)',
    visState:  barVisState('Severity Breakdown (Bar)', 'severityText.keyword', 10, false),
    uiStateJSON: '{}',
    description: 'Bar chart of log severity counts',
    kibanaSavedObjectMeta: { searchSourceJSON: searchSourceJson(IDS.dpLogs) },
}));

// ── 3. Trace / Span Visualizations ──────────────────────────────────────────
console.log('\n► Creating trace/span visualizations …');

await run('Metric: Total Span Count', () => osdPut('visualization', IDS.vizSpanTotal, {
    title:     'Total Span Count',
    visState:  metricVisState('Total Span Count', 'Distributed Spans'),
    uiStateJSON: '{}',
    description: 'Total OTel spans indexed',
    kibanaSavedObjectMeta: { searchSourceJSON: searchSourceJson(IDS.dpSpans) },
}));

await run('Area: Span Volume Over Time', () => osdPut('visualization', IDS.vizSpanVolume, {
    title:     'Span Volume Over Time',
    visState:  areaVisState('Span Volume Over Time', 'startTime', 'auto'),
    uiStateJSON: '{}',
    description: 'Number of spans per time bucket',
    kibanaSavedObjectMeta: { searchSourceJSON: searchSourceJson(IDS.dpSpans) },
}));

await run('Bar: Top Services by Span Count', () => osdPut('visualization', IDS.vizSpanSvc, {
    title:     'Top Services by Span Count',
    visState:  barVisState('Top Services by Span Count', 'serviceName', 15, true),
    uiStateJSON: '{}',
    description: 'Services producing the most spans',
    kibanaSavedObjectMeta: { searchSourceJSON: searchSourceJson(IDS.dpSpans) },
}));

await run('Pie: HTTP Status Distribution', () => osdPut('visualization', IDS.vizSpanHttp, {
    title:     'HTTP Status Distribution',
    visState:  pieVisState('HTTP Status Distribution', 'span.attributes.http@status_code', 10),
    uiStateJSON: '{}',
    description: 'Distribution of HTTP response status codes in spans',
    kibanaSavedObjectMeta: { searchSourceJSON: searchSourceJson(IDS.dpSpans) },
}));

await run('Pie: Span Kind Distribution', () => osdPut('visualization', IDS.vizSpanKind, {
    title:     'Span Kind Distribution',
    visState:  pieVisState('Span Kind Distribution', 'kind', 10),
    uiStateJSON: '{}',
    description: 'Distribution of OTel span kinds (SERVER, CLIENT, etc.)',
    kibanaSavedObjectMeta: { searchSourceJSON: searchSourceJson(IDS.dpSpans) },
}));

await run('Metric: Avg Span Duration (ns)', () => osdPut('visualization', IDS.vizSpanAvgDur, {
    title:     'Avg Span Duration (ns)',
    visState:  avgMetricVisState('Avg Span Duration (ns)', 'durationInNanos', 'nanoseconds'),
    uiStateJSON: '{}',
    description: 'Average span duration in nanoseconds',
    kibanaSavedObjectMeta: { searchSourceJSON: searchSourceJson(IDS.dpSpans) },
}));

// ── 4. Metrics Visualizations ────────────────────────────────────────────────
console.log('\n► Creating metrics visualizations …');

await run('Metric: Total Metric Data Points', () => osdPut('visualization', IDS.vizMetricTotal, {
    title:     'Total Metric Data Points',
    visState:  metricVisState('Total Metric Data Points', 'ss4o_metrics Index'),
    uiStateJSON: '{}',
    description: 'Total metric data points in the ss4o_metrics index',
    kibanaSavedObjectMeta: { searchSourceJSON: searchSourceJson(IDS.dpMetrics) },
}));

await run('Bar: Metric Series Distribution', () => osdPut('visualization', IDS.vizMetricNames, {
    title:     'Metric Series Distribution',
    visState:  barVisState('Metric Series Distribution', 'name', 20, true),
    uiStateJSON: '{}',
    description: 'Count of data points per metric series name',
    kibanaSavedObjectMeta: { searchSourceJSON: searchSourceJson(IDS.dpMetrics) },
}));

// ── 5. Dashboard: OTel Logs ──────────────────────────────────────────────────
console.log('\n► Creating dashboards …');
panelSeq = 0;

const logsDashPanels = [
    // Row 1: 3 metric cards  (h=8, y=0)
    panel(IDS.vizLogTotal,    0,  0, 16,  8),   // Total log count
    panel(IDS.vizLogSeverity, 16, 0, 16,  8),   // Severity donut
    panel(IDS.vizLogServices, 32, 0, 16,  8),   // Top services
    // Row 2: full-width area  (h=15, y=8)
    panel(IDS.vizLogVolume,   0,  8, 48, 15),   // Volume over time
    // Row 3: severity bar     (h=15, y=23)
    panel(IDS.vizLogSevBar,   0, 23, 48, 15),   // Severity bar
];

await run('Dashboard: OTel Logs', () => osdPut('dashboard', IDS.dashLogs,
    dashboardAttributes(
        'OTel Logs Dashboard',
        'OpenTelemetry log analytics — severity breakdown, volume over time, top services',
        logsDashPanels,
        'now-24h', 'now',
    )
));

// ── 6. Dashboard: OTel Traces ────────────────────────────────────────────────
panelSeq = 0;

const tracesDashPanels = [
    // Row 1: 3 metric cards (h=8, y=0)
    panel(IDS.vizSpanTotal,    0,  0, 16,  8),
    panel(IDS.vizSpanAvgDur,  16,  0, 16,  8),
    panel(IDS.vizSpanHttp,    32,  0, 16,  8),
    // Row 2: area + pie (h=18, y=8)
    panel(IDS.vizSpanVolume,   0,  8, 32, 18),
    panel(IDS.vizSpanKind,    32,  8, 16, 18),
    // Row 3: top services horizontal bar (h=18, y=26)
    panel(IDS.vizSpanSvc,      0, 26, 48, 18),
];

await run('Dashboard: OTel Traces', () => osdPut('dashboard', IDS.dashTraces,
    dashboardAttributes(
        'OTel Traces Dashboard',
        'Distributed trace analytics — span volume, duration, service breakdown, HTTP status codes',
        tracesDashPanels,
        'now-24h', 'now',
    )
));

// ── 7. Dashboard: Observability Overview ─────────────────────────────────────
panelSeq = 0;

const overviewPanels = [
    // Row 1: top-line metrics (h=8, y=0)
    panel(IDS.vizLogTotal,     0,  0, 12,  8),
    panel(IDS.vizSpanTotal,   12,  0, 12,  8),
    panel(IDS.vizMetricTotal, 24,  0, 12,  8),
    panel(IDS.vizSpanAvgDur,  36,  0, 12,  8),
    // Row 2: log volume + span volume (h=16, y=8)
    panel(IDS.vizLogVolume,    0,  8, 24, 16),
    panel(IDS.vizSpanVolume,  24,  8, 24, 16),
    // Row 3: pies (h=18, y=24)
    panel(IDS.vizLogSeverity,  0, 24, 16, 18),
    panel(IDS.vizSpanHttp,    16, 24, 16, 18),
    panel(IDS.vizSpanKind,    32, 24, 16, 18),
    // Row 4: services (h=18, y=42)
    panel(IDS.vizLogServices,  0, 42, 24, 18),
    panel(IDS.vizSpanSvc,     24, 42, 24, 18),
    // Row 5: metrics series (h=18, y=60)
    panel(IDS.vizMetricNames,  0, 60, 48, 18),
];

await run('Dashboard: Observability Overview', () => osdPut('dashboard', IDS.dashOverview,
    dashboardAttributes(
        'Observability Overview',
        'Unified OTel observability — logs, traces, and metrics from security-central',
        overviewPanels,
        'now-24h', 'now',
    )
));

// ── 8. Print summary ─────────────────────────────────────────────────────────
console.log(`
╔══════════════════════════════════════════════════════════╗
║  Provisioning Complete                                   ║
╚══════════════════════════════════════════════════════════╝

  Dashboards created in OpenSearch Dashboards:

  📊  OTel Logs Dashboard
      ${DASHBOARDS_URL}/app/dashboards#/view/${IDS.dashLogs}

  📡  OTel Traces Dashboard
      ${DASHBOARDS_URL}/app/dashboards#/view/${IDS.dashTraces}

  🌐  Observability Overview
      ${DASHBOARDS_URL}/app/dashboards#/view/${IDS.dashOverview}

  Data Views created:
      otel-dp-logs    → ${LOGS_INDEX}
      otel-dp-spans   → ${SPANS_INDEX}
      otel-dp-metrics → ${METRICS_INDEX}

  Re-run this script at any time to overwrite/update objects.
`);
