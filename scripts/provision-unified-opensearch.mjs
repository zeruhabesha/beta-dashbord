const OPENSEARCH_URL = process.env.OPENSEARCH_URL || 'http://localhost:9200';
const DASHBOARDS_URL = process.env.OPENSEARCH_DASHBOARDS_URL || 'http://localhost:5601';
const SIEM_INDEX_NAME = process.env.SIEM_INDEX_NAME || 'tenant-01-siem';
const SIEM_DATA_VIEW_ID = process.env.SIEM_DATA_VIEW_ID || 'siem-index-pattern';
const SIEM_DATA_VIEW_TITLE = process.env.SIEM_DATA_VIEW_TITLE || 'tenant-01-siem*';
const IDS_DATA_VIEW_ID = process.env.IDS_DATA_VIEW_ID || 'unified-index-pattern';
const EDR_DATA_VIEW_ID = process.env.EDR_DATA_VIEW_ID || 'edr-index-pattern';
const NOW = new Date();

const UNIFIED_QUERIES = {
    siemEvents: 'event_type:*',
    siemCritical: 'severity:"Critical" or severity:"High"',
    mitre: 'mitre_technique:*',
    pci: 'pci_control:*',
    gdpr: 'gdpr_article:*',
    idsAlerts: 'event_type:"alert" or flow.alerted:true or alert.signature:*',
    edrThreats: 'threat_type:* and not service_domain:*',
    edrCritical: '(severity:"Critical" or severity:"High") and not service_domain:*',
    endpointStatus: 'endpoint:* and not service_domain:*',
    edrContained: '(containment_reason:* or xcitium_rating:* or status:"Quarantined" or status:"Blocked") and not service_domain:*',
    edrResponse: 'response_action:* and not response_action:"None" and not service_domain:*',
    edrResponsePending: 'response_action:* and response_status:"Pending" and not service_domain:*',
    edrResponseCompleted: 'response_action:* and response_status:"Completed" and not service_domain:*',
    edrHashIntel: 'file_hash:* and not service_domain:*',
    edrAutomation: 'service_name:"playbook-service" or service_name:"response-service"',
    edrPlaybook: 'service_name:"playbook-service"',
    edrResponseService: 'service_name:"response-service"',
    edrDetectionPipeline: 'service_name:"detection-service"',
    edrCtiFailures: 'cti_lookup_status:"Failed"',
    edrPublishedActions: 'service_name:"playbook-service" and playbook_result:"Published"',
    edrCooldownSkips: 'service_name:"playbook-service" and playbook_result:"Cooldown Skipped"',
    edrResponseExecuted: 'service_name:"response-service" and service_event:"Action Executed"',
    edrCollectedArtifacts: 'service_domain:"velociraptor" and velociraptor_feature:"collected_artifacts"',
    edrClientEvents: 'service_domain:"velociraptor" and velociraptor_feature:"client_events"',
    edrServerEvents: 'service_domain:"velociraptor" and velociraptor_feature:"server_events"'
};

const SIEM_EVENT_TYPES = [
    'Unauthorized Access',
    'Privilege Escalation',
    'Malware Detection',
    'Policy Violation',
    'Configuration Change',
    'Data Exfiltration',
    'Suspicious Login',
    'Impossible Travel'
];

const SIEM_CATEGORIES = ['Authentication', 'Authorization', 'Endpoint', 'Network', 'Compliance', 'Cloud'];
const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];
const HOSTS = ['gateway-soc-01', 'srv-auth-02', 'mail-relay-01', 'finance-app-03', 'db-reporting-01', 'dc-core-02'];
const USERS = ['jdoe', 'asmith', 'secops', 'svc-backup', 'admin.platform', 'analyst1', 'mwaniki', 'hr.audit'];
const MITRE = ['T1078', 'T1059.001', 'T1486', 'T1566.001', 'T1110', 'T1021.001'];
const PCI = ['10.2.2', '10.5.1', '11.4', '8.3.1'];
const GDPR = ['Art.5', 'Art.25', 'Art.32', 'Art.33'];

function randomItem(values) {
    return values[Math.floor(Math.random() * values.length)];
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isoWithinLastHours(hours) {
    const offsetMinutes = randomInt(0, hours * 60);
    return new Date(NOW.getTime() - offsetMinutes * 60 * 1000).toISOString();
}

function buildIp(octet) {
    return `10.${randomInt(1, 20)}.${randomInt(1, 254)}.${octet}`;
}

function buildSiemDocument(index) {
    const eventType = randomItem(SIEM_EVENT_TYPES);
    const severity = randomItem(SEVERITIES);
    const category = randomItem(SIEM_CATEGORIES);
    const includeCompliance = Math.random() > 0.45;
    const includeMitre = Math.random() > 0.25;
    const includeMalware = eventType === 'Malware Detection' || Math.random() > 0.8;

    return {
        event_id: `siem-seed-${index}-${randomInt(1000, 9999)}`,
        '@timestamp': isoWithinLastHours(72),
        event_type: eventType,
        severity,
        source_ip: buildIp(randomInt(10, 200)),
        destination_ip: buildIp(randomInt(10, 200)),
        user: randomItem(USERS),
        host: randomItem(HOSTS),
        description: `${eventType} observed on ${category.toLowerCase()} controls`,
        rule_name: `${category} Rule ${randomInt(10, 99)}`,
        category,
        data_source: 'SIEM',
        ...(includeMitre ? { mitre_technique: randomItem(MITRE) } : {}),
        ...(includeCompliance ? { pci_control: randomItem(PCI), gdpr_article: randomItem(GDPR) } : {}),
        ...(includeMalware ? { malware_name: randomItem(['Emotet', 'Cobalt Strike', 'QakBot', 'Lumma']) } : {})
    };
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};

    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}: ${text}`);
    }

    return payload;
}

async function upsertSavedObject(type, id, attributes, references = []) {
    return fetchJson(`${DASHBOARDS_URL}/api/saved_objects/${type}/${id}?overwrite=true`, {
        method: 'POST',
        headers: {
            'osd-xsrf': 'true',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            attributes,
            references
        })
    });
}

async function ensureSeedData() {
    const countPayload = await fetchJson(`${OPENSEARCH_URL}/${SIEM_INDEX_NAME}/_count`, {
        method: 'GET'
    }).catch(() => ({ count: 0 }));

    if ((countPayload.count || 0) > 0) {
        console.log(`SIEM index ${SIEM_INDEX_NAME} already has ${countPayload.count} documents. Skipping seed.`);
        return;
    }

    const lines = [];
    for (let index = 0; index < 160; index += 1) {
        lines.push(JSON.stringify({ index: { _index: SIEM_INDEX_NAME } }));
        lines.push(JSON.stringify(buildSiemDocument(index)));
    }

    await fetchJson(`${OPENSEARCH_URL}/_bulk?refresh=true`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-ndjson'
        },
        body: `${lines.join('\n')}\n`
    });

    console.log(`Seeded ${lines.length / 2} SIEM documents into ${SIEM_INDEX_NAME}.`);
}

async function ensureDataView(id, title) {
    await upsertSavedObject('index-pattern', id, {
        title,
        timeFieldName: '@timestamp'
    });
    console.log(`Ensured data view ${id} -> ${title}.`);
}

function createMetricVisualization({ title, description, query, subtitle, dataViewId, metricType = 'count', field }) {
    const metricAgg = {
        id: '1',
        enabled: true,
        type: metricType,
        schema: 'metric',
        params: {}
    };

    if (field) {
        metricAgg.params.field = field;
    }

    return {
        attributes: {
            title,
            description,
            visState: JSON.stringify({
                title,
                type: 'metric',
                params: {
                    addTooltip: true,
                    addLegend: false,
                    type: 'metric',
                    metric: {
                        percentageMode: false,
                        useRanges: false,
                        colorSchema: 'Green to Red',
                        metricColorMode: 'None',
                        colorsRange: [{ from: 0, to: 10000 }],
                        labels: { show: true },
                        invertColors: false,
                        style: {
                            bgFill: '#0f172a',
                            bgColor: false,
                            labelColor: false,
                            subText: subtitle,
                            fontSize: 34
                        }
                    }
                },
                aggs: [metricAgg]
            }),
            uiStateJSON: '{}',
            version: 1,
            kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                    query: { language: 'kuery', query },
                    filter: [],
                    indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index'
                })
            }
        },
        references: [
            {
                name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                type: 'index-pattern',
                id: dataViewId
            }
        ]
    };
}

function createPieVisualization({ title, description, query, field, size = 8, dataViewId }) {
    return {
        attributes: {
            title,
            description,
            visState: JSON.stringify({
                title,
                type: 'pie',
                params: {
                    addTooltip: true,
                    addLegend: true,
                    legendPosition: 'right',
                    isDonut: true,
                    labels: {
                        show: false,
                        values: true,
                        last_level: true,
                        truncate: 100
                    }
                },
                aggs: [
                    {
                        id: '1',
                        enabled: true,
                        type: 'count',
                        schema: 'metric',
                        params: {}
                    },
                    {
                        id: '2',
                        enabled: true,
                        type: 'terms',
                        schema: 'segment',
                        params: {
                            field,
                            size,
                            order: 'desc',
                            orderBy: '1',
                            otherBucket: false,
                            missingBucket: false
                        }
                    }
                ]
            }),
            uiStateJSON: '{}',
            version: 1,
            kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                    query: { language: 'kuery', query },
                    filter: [],
                    indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index'
                })
            }
        },
        references: [
            {
                name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                type: 'index-pattern',
                id: dataViewId
            }
        ]
    };
}

function createLineVisualization({ title, description, query, dataViewId }) {
    return {
        attributes: {
            title,
            description,
            visState: JSON.stringify({
                title,
                type: 'line',
                params: {
                    addTooltip: true,
                    addLegend: false,
                    legendPosition: 'right',
                    categoryAxes: [
                        {
                            id: 'CategoryAxis-1',
                            type: 'category',
                            position: 'bottom',
                            show: true,
                            style: {},
                            scale: { type: 'linear' },
                            labels: {
                                show: true,
                                truncate: 100
                            },
                            title: { text: 'Time' }
                        }
                    ],
                    valueAxes: [
                        {
                            id: 'ValueAxis-1',
                            name: 'LeftAxis-1',
                            type: 'value',
                            position: 'left',
                            show: true,
                            style: {},
                            scale: {
                                type: 'linear',
                                mode: 'normal'
                            },
                            labels: {
                                show: true,
                                rotate: 0,
                                filter: false,
                                truncate: 100
                            },
                            title: { text: 'Events' }
                        }
                    ],
                    seriesParams: [
                        {
                            show: true,
                            type: 'line',
                            mode: 'normal',
                            data: {
                                id: '1',
                                label: 'Events'
                            },
                            valueAxis: 'ValueAxis-1',
                            drawLinesBetweenPoints: true,
                            showCircles: true
                        }
                    ]
                },
                aggs: [
                    {
                        id: '1',
                        enabled: true,
                        type: 'count',
                        schema: 'metric',
                        params: {}
                    },
                    {
                        id: '2',
                        enabled: true,
                        type: 'date_histogram',
                        schema: 'segment',
                        params: {
                            field: '@timestamp',
                            interval: 'auto',
                            customInterval: '2h',
                            min_doc_count: 1,
                            extended_bounds: {}
                        }
                    }
                ]
            }),
            uiStateJSON: '{}',
            version: 1,
            kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                    query: { language: 'kuery', query },
                    filter: [],
                    indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index'
                })
            }
        },
        references: [
            {
                name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                type: 'index-pattern',
                id: dataViewId
            }
        ]
    };
}

function createSavedSearch({ title, description, query, columns, dataViewId }) {
    return {
        attributes: {
            title,
            description,
            columns,
            sort: ['@timestamp', 'desc'],
            kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                    query: { language: 'kuery', query },
                    filter: [],
                    indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index'
                })
            }
        },
        references: [
            {
                name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                type: 'index-pattern',
                id: dataViewId
            }
        ]
    };
}

function createDashboard({ title, description, panels }) {
    const references = [];
    const panelObjects = panels.map((panel, index) => {
        const panelRefName = `panel_${index}`;
        references.push({
            name: panelRefName,
            type: panel.type,
            id: panel.id
        });

        return {
            version: '7.10.0',
            gridData: {
                x: panel.x,
                y: panel.y,
                w: panel.w,
                h: panel.h,
                i: `${index + 1}`
            },
            panelIndex: `${index + 1}`,
            embeddableConfig: {},
            panelRefName,
            type: panel.type
        };
    });

    return {
        attributes: {
            title,
            description,
            hits: 0,
            optionsJSON: JSON.stringify({
                hidePanelTitles: false,
                useMargins: true
            }),
            panelsJSON: JSON.stringify(panelObjects),
            version: 1,
            timeRestore: false,
            kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                    query: { language: 'kuery', query: '' },
                    filter: []
                })
            }
        },
        references
    };
}

const dashboardSpecs = [
    {
        id: 'unified-home',
        title: 'Unified Security Operations Center',
        description: 'Cross-domain SOC dashboard with SIEM, IDS, EDR containment, and response visibility in one OpenSearch view.',
        objects: [
            ['visualization', 'unified-home-siem-total', createMetricVisualization({ title: 'SIEM Events', description: 'Seeded SIEM alerts and events.', query: UNIFIED_QUERIES.siemEvents, subtitle: 'SIEM telemetry', dataViewId: SIEM_DATA_VIEW_ID })],
            ['visualization', 'unified-home-ids-total', createMetricVisualization({ title: 'IDS Alerts', description: 'Current IDS alert volume.', query: UNIFIED_QUERIES.idsAlerts, subtitle: 'Network detections', dataViewId: IDS_DATA_VIEW_ID })],
            ['visualization', 'unified-home-edr-total', createMetricVisualization({ title: 'EDR Detections', description: 'Current endpoint detection volume.', query: UNIFIED_QUERIES.edrThreats, subtitle: 'Endpoint detections', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-home-contained-total', createMetricVisualization({ title: 'Contained Threats', description: 'Containment events across endpoints.', query: UNIFIED_QUERIES.edrContained, subtitle: 'Contained queue', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-home-response-pending', createMetricVisualization({ title: 'Pending Responses', description: 'Response actions still awaiting closure.', query: UNIFIED_QUERIES.edrResponsePending, subtitle: 'Needs follow-up', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-home-siem-severity', createPieVisualization({ title: 'SIEM Severity', description: 'Severity mix for SIEM events.', query: UNIFIED_QUERIES.siemEvents, field: 'severity.keyword', dataViewId: SIEM_DATA_VIEW_ID })],
            ['visualization', 'unified-home-edr-threats', createPieVisualization({ title: 'EDR Threat Types', description: 'Endpoint threat mix.', query: UNIFIED_QUERIES.edrThreats, field: 'threat_type.keyword', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-home-edr-verdict', createPieVisualization({ title: 'Verdict Sources', description: 'How endpoint verdicts are being assigned.', query: UNIFIED_QUERIES.edrContained, field: 'verdict_source.keyword', dataViewId: EDR_DATA_VIEW_ID })],
            ['search', 'unified-home-siem-recent', createSavedSearch({ title: 'Recent SIEM Events', description: 'Latest security events.', query: UNIFIED_QUERIES.siemEvents, columns: ['@timestamp', 'event_type', 'severity', 'host', 'user', 'mitre_technique'], dataViewId: SIEM_DATA_VIEW_ID })],
            ['search', 'unified-home-edr-recent', createSavedSearch({ title: 'Containment And Response Queue', description: 'Latest endpoint containment and response activity.', query: 'containment_reason:* or response_action:*', columns: ['@timestamp', 'incident_id', 'endpoint', 'threat_type', 'response_action', 'response_status', 'policy_name', 'response_artifact', 'action_by', 'admin_rating'], dataViewId: EDR_DATA_VIEW_ID })]
        ],
        panels: [
            { type: 'visualization', id: 'unified-home-siem-total', x: 0, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-home-ids-total', x: 12, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-home-edr-total', x: 24, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-home-contained-total', x: 36, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-home-response-pending', x: 0, y: 8, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-home-siem-severity', x: 12, y: 8, w: 12, h: 12 },
            { type: 'visualization', id: 'unified-home-edr-threats', x: 24, y: 8, w: 12, h: 12 },
            { type: 'visualization', id: 'unified-home-edr-verdict', x: 36, y: 8, w: 12, h: 12 },
            { type: 'search', id: 'unified-home-siem-recent', x: 0, y: 20, w: 24, h: 16 },
            { type: 'search', id: 'unified-home-edr-recent', x: 24, y: 20, w: 24, h: 16 }
        ]
    },
    {
        id: 'unified-overview',
        title: 'Security Overview',
        description: 'Overview dashboard for severity, compliance, endpoint posture, and containment state.',
        objects: [
            ['visualization', 'unified-overview-critical', createMetricVisualization({ title: 'Critical SIEM Alerts', description: 'High-priority SIEM events.', query: UNIFIED_QUERIES.siemCritical, subtitle: 'Priority alerts', dataViewId: SIEM_DATA_VIEW_ID })],
            ['visualization', 'unified-overview-compliance', createPieVisualization({ title: 'Compliance Events', description: 'PCI/GDPR-tagged SIEM events.', query: 'pci_control:* or gdpr_article:*', field: 'category.keyword', dataViewId: SIEM_DATA_VIEW_ID })],
            ['visualization', 'unified-overview-mitre', createPieVisualization({ title: 'MITRE Coverage', description: 'MITRE techniques in SIEM events.', query: UNIFIED_QUERIES.mitre, field: 'mitre_technique.keyword', dataViewId: SIEM_DATA_VIEW_ID })],
            ['visualization', 'unified-overview-endpoints', createPieVisualization({ title: 'Top EDR Endpoints', description: 'Top endpoints by detection volume.', query: UNIFIED_QUERIES.endpointStatus, field: 'endpoint.keyword', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-overview-response', createPieVisualization({ title: 'Response Status', description: 'Status of EDR response actions.', query: UNIFIED_QUERIES.edrResponse, field: 'response_status.keyword', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-overview-containment', createPieVisualization({ title: 'Containment Reasons', description: 'Why endpoints were contained.', query: UNIFIED_QUERIES.edrContained, field: 'containment_reason.keyword', dataViewId: EDR_DATA_VIEW_ID })],
            ['search', 'unified-overview-compliance-grid', createSavedSearch({ title: 'Compliance Stream', description: 'Recent compliance-tagged security events.', query: 'pci_control:* or gdpr_article:*', columns: ['@timestamp', 'event_type', 'severity', 'pci_control', 'gdpr_article', 'host', 'user'], dataViewId: SIEM_DATA_VIEW_ID })],
            ['search', 'unified-overview-ids-grid', createSavedSearch({ title: 'IDS Alert Stream', description: 'Recent IDS alert activity.', query: UNIFIED_QUERIES.idsAlerts, columns: ['timestamp', 'tenant_id', 'event_type', 'alert.signature', 'src_ip', 'dest_ip', 'proto'], dataViewId: IDS_DATA_VIEW_ID })]
        ],
        panels: [
            { type: 'visualization', id: 'unified-overview-critical', x: 0, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-overview-compliance', x: 12, y: 0, w: 12, h: 12 },
            { type: 'visualization', id: 'unified-overview-mitre', x: 24, y: 0, w: 12, h: 12 },
            { type: 'visualization', id: 'unified-overview-endpoints', x: 36, y: 0, w: 12, h: 12 },
            { type: 'visualization', id: 'unified-overview-response', x: 0, y: 12, w: 24, h: 12 },
            { type: 'visualization', id: 'unified-overview-containment', x: 24, y: 12, w: 24, h: 12 },
            { type: 'search', id: 'unified-overview-compliance-grid', x: 0, y: 24, w: 24, h: 16 },
            { type: 'search', id: 'unified-overview-ids-grid', x: 24, y: 24, w: 24, h: 16 }
        ]
    },
    {
        id: 'unified-siem-events',
        title: 'Unified Security Events',
        description: 'Dedicated SIEM event dashboard for the Unified SOC module.',
        objects: [
            ['visualization', 'unified-siem-total', createMetricVisualization({ title: 'Security Events', description: 'All SIEM security events.', query: UNIFIED_QUERIES.siemEvents, subtitle: 'Unified SIEM', dataViewId: SIEM_DATA_VIEW_ID })],
            ['visualization', 'unified-siem-critical', createMetricVisualization({ title: 'Critical And High', description: 'Critical and high-severity events.', query: UNIFIED_QUERIES.siemCritical, subtitle: 'Triage queue', dataViewId: SIEM_DATA_VIEW_ID })],
            ['visualization', 'unified-siem-category', createPieVisualization({ title: 'Event Categories', description: 'Category distribution for SIEM events.', query: UNIFIED_QUERIES.siemEvents, field: 'category.keyword', dataViewId: SIEM_DATA_VIEW_ID })],
            ['visualization', 'unified-siem-severity', createPieVisualization({ title: 'Severity Distribution', description: 'Severity distribution for SIEM events.', query: UNIFIED_QUERIES.siemEvents, field: 'severity.keyword', dataViewId: SIEM_DATA_VIEW_ID })],
            ['visualization', 'unified-siem-trend', createLineVisualization({ title: 'Security Event Trend', description: 'Trend for SIEM event volume.', query: UNIFIED_QUERIES.siemEvents, dataViewId: SIEM_DATA_VIEW_ID })],
            ['search', 'unified-siem-grid', createSavedSearch({ title: 'Security Event Stream', description: 'Recent SIEM security events.', query: UNIFIED_QUERIES.siemEvents, columns: ['@timestamp', 'event_type', 'severity', 'category', 'host', 'user', 'source_ip', 'mitre_technique'], dataViewId: SIEM_DATA_VIEW_ID })]
        ],
        panels: [
            { type: 'visualization', id: 'unified-siem-total', x: 0, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-siem-critical', x: 12, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-siem-category', x: 24, y: 0, w: 12, h: 12 },
            { type: 'visualization', id: 'unified-siem-severity', x: 36, y: 0, w: 12, h: 12 },
            { type: 'visualization', id: 'unified-siem-trend', x: 0, y: 12, w: 24, h: 14 },
            { type: 'search', id: 'unified-siem-grid', x: 24, y: 12, w: 24, h: 14 }
        ]
    },
    {
        id: 'unified-containment-response',
        title: 'Unified Containment And Response',
        description: 'Unified SOC dashboard for containment decisions and endpoint response execution.',
        objects: [
            ['visualization', 'unified-containment-total', createMetricVisualization({ title: 'Contained Threats', description: 'Contained or quarantined endpoint threats.', query: UNIFIED_QUERIES.edrContained, subtitle: 'Contained queue', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-containment-endpoints', createMetricVisualization({ title: 'Contained Endpoints', description: 'Unique endpoints under containment pressure.', query: UNIFIED_QUERIES.edrContained, subtitle: 'Unique hosts', dataViewId: EDR_DATA_VIEW_ID, metricType: 'cardinality', field: 'endpoint.keyword' })],
            ['visualization', 'unified-containment-pending', createMetricVisualization({ title: 'Pending Responses', description: 'Response actions still waiting on closure.', query: UNIFIED_QUERIES.edrResponsePending, subtitle: 'Needs analyst review', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-containment-completed', createMetricVisualization({ title: 'Completed Responses', description: 'Response actions already completed.', query: UNIFIED_QUERIES.edrResponseCompleted, subtitle: 'Resolved actions', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-containment-reason', createPieVisualization({ title: 'Containment Reasons', description: 'Reasons endpoints entered containment.', query: UNIFIED_QUERIES.edrContained, field: 'containment_reason.keyword', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-containment-verdict', createPieVisualization({ title: 'Verdict Sources', description: 'Source of trust or malicious verdicts.', query: UNIFIED_QUERIES.edrContained, field: 'verdict_source.keyword', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-containment-action', createPieVisualization({ title: 'Response Actions', description: 'Actions taken after detection.', query: UNIFIED_QUERIES.edrResponse, field: 'response_action.keyword', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-containment-owner', createPieVisualization({ title: 'Action Ownership', description: 'Analysts or automation handling actions.', query: UNIFIED_QUERIES.edrResponse, field: 'action_by.keyword', dataViewId: EDR_DATA_VIEW_ID })],
            ['search', 'unified-containment-queue', createSavedSearch({ title: 'Contained Threat Queue', description: 'Contained endpoints and files awaiting action or review.', query: UNIFIED_QUERIES.edrContained, columns: ['@timestamp', 'incident_id', 'endpoint', 'process_name', 'file_hash', 'admin_rating', 'verdict_source', 'containment_reason', 'status', 'response_action'], dataViewId: EDR_DATA_VIEW_ID })],
            ['search', 'unified-containment-response-grid', createSavedSearch({ title: 'Response Action Stream', description: 'Recent response decisions across the SOC.', query: UNIFIED_QUERIES.edrResponse, columns: ['@timestamp', 'incident_id', 'endpoint', 'response_action', 'response_status', 'policy_name', 'response_artifact', 'action_by', 'severity', 'threat_type'], dataViewId: EDR_DATA_VIEW_ID })]
        ],
        panels: [
            { type: 'visualization', id: 'unified-containment-total', x: 0, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-containment-endpoints', x: 12, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-containment-pending', x: 24, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-containment-completed', x: 36, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-containment-reason', x: 0, y: 8, w: 12, h: 12 },
            { type: 'visualization', id: 'unified-containment-verdict', x: 12, y: 8, w: 12, h: 12 },
            { type: 'visualization', id: 'unified-containment-action', x: 24, y: 8, w: 12, h: 12 },
            { type: 'visualization', id: 'unified-containment-owner', x: 36, y: 8, w: 12, h: 12 },
            { type: 'search', id: 'unified-containment-queue', x: 0, y: 20, w: 24, h: 16 },
            { type: 'search', id: 'unified-containment-response-grid', x: 24, y: 20, w: 24, h: 16 }
        ]
    },
    {
        id: 'unified-automation-ops',
        title: 'Unified Automation Ops',
        description: 'Cross-team automation dashboard for playbook decisions, action publication, and remote execution.',
        objects: [
            ['visualization', 'unified-automation-total', createMetricVisualization({ title: 'Automation Events', description: 'Response-service and playbook-service events.', query: UNIFIED_QUERIES.edrAutomation, subtitle: 'Automation control plane', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-automation-published', createMetricVisualization({ title: 'Actions Published', description: 'Playbook actions published to the response queue.', query: UNIFIED_QUERIES.edrPublishedActions, subtitle: 'Queue writes', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-automation-executed', createMetricVisualization({ title: 'Actions Executed', description: 'Remote actions executed by the response service.', query: UNIFIED_QUERIES.edrResponseExecuted, subtitle: 'Artifact runs', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-automation-cti-failures', createMetricVisualization({ title: 'CTI Failures', description: 'Automation-side CTI enrichment failures.', query: `${UNIFIED_QUERIES.edrPlaybook} and cti_lookup_status:"Failed"`, subtitle: 'External dependency gap', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-automation-policies', createPieVisualization({ title: 'Policy Hits', description: 'Policies driving automated response decisions.', query: UNIFIED_QUERIES.edrPlaybook, field: 'policy_name.keyword', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-automation-artifacts', createPieVisualization({ title: 'Response Artifacts', description: 'Artifacts executed by response orchestration.', query: UNIFIED_QUERIES.edrResponseService, field: 'response_artifact.keyword', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-automation-results', createPieVisualization({ title: 'Automation Outcomes', description: 'Playbook outcomes across the SOC.', query: UNIFIED_QUERIES.edrPlaybook, field: 'playbook_result.keyword', dataViewId: EDR_DATA_VIEW_ID })],
            ['search', 'unified-automation-stream', createSavedSearch({ title: 'Automation Stream', description: 'Published and executed response actions across EDR operations.', query: UNIFIED_QUERIES.edrAutomation, columns: ['@timestamp', 'service_name', 'service_event', 'policy_name', 'response_action', 'response_status', 'response_artifact', 'client_id', 'endpoint', 'incident_id'], dataViewId: EDR_DATA_VIEW_ID })],
            ['search', 'unified-automation-cti-grid', createSavedSearch({ title: 'CTI Failure Stream', description: 'CTI lookup failures that impact automated response confidence.', query: `${UNIFIED_QUERIES.edrPlaybook} and cti_lookup_status:"Failed"`, columns: ['@timestamp', 'event_id', 'policy_name', 'cti_indicator_type', 'cti_indicator_value', 'cti_error', 'endpoint', 'client_id'], dataViewId: EDR_DATA_VIEW_ID })]
        ],
        panels: [
            { type: 'visualization', id: 'unified-automation-total', x: 0, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-automation-published', x: 12, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-automation-executed', x: 24, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-automation-cti-failures', x: 36, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-automation-policies', x: 0, y: 8, w: 16, h: 12 },
            { type: 'visualization', id: 'unified-automation-artifacts', x: 16, y: 8, w: 16, h: 12 },
            { type: 'visualization', id: 'unified-automation-results', x: 32, y: 8, w: 16, h: 12 },
            { type: 'search', id: 'unified-automation-stream', x: 0, y: 20, w: 24, h: 16 },
            { type: 'search', id: 'unified-automation-cti-grid', x: 24, y: 20, w: 24, h: 16 }
        ]
    },
    {
        id: 'unified-detection-health',
        title: 'Unified Detection Health',
        description: 'Unified operational dashboard for detection pipeline readiness, monitor coverage, and CTI sync health.',
        objects: [
            ['visualization', 'unified-detection-total', createMetricVisualization({ title: 'Pipeline Events', description: 'Detection-service operational events.', query: UNIFIED_QUERIES.edrDetectionPipeline, subtitle: 'Detection runtime', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-detection-artifacts', createMetricVisualization({ title: 'Monitored Artifacts', description: 'Unique artifacts actively polled by detection-service.', query: UNIFIED_QUERIES.edrDetectionPipeline, subtitle: 'Coverage', dataViewId: EDR_DATA_VIEW_ID, metricType: 'cardinality', field: 'artifact_name.keyword' })],
            ['visualization', 'unified-detection-cti-syncs', createMetricVisualization({ title: 'CTI Sync Jobs', description: 'Completed CTI sync operations from the detection pipeline.', query: `${UNIFIED_QUERIES.edrDetectionPipeline} and service_event:"CTI Sync Complete"`, subtitle: 'Threat DB refresh', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-detection-bootstrap', createMetricVisualization({ title: 'Bootstrap Steps', description: 'Startup bootstrap queries applied by the detection pipeline.', query: `${UNIFIED_QUERIES.edrDetectionPipeline} and service_event:"Bootstrap Applied"`, subtitle: 'Startup health', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-detection-components', createPieVisualization({ title: 'Detection Components', description: 'Components emitting pipeline telemetry.', query: UNIFIED_QUERIES.edrDetectionPipeline, field: 'service_component.keyword', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-detection-monitor-artifacts', createPieVisualization({ title: 'Monitor Artifacts', description: 'Artifact mix currently monitored by the detection pipeline.', query: `${UNIFIED_QUERIES.edrDetectionPipeline} and artifact_name:*`, field: 'artifact_name.keyword', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-detection-stages', createPieVisualization({ title: 'Detection Stages', description: 'Stage coverage in pipeline telemetry.', query: `${UNIFIED_QUERIES.edrDetectionPipeline} and detection_stage:*`, field: 'detection_stage.keyword', dataViewId: EDR_DATA_VIEW_ID })],
            ['search', 'unified-detection-ops-grid', createSavedSearch({ title: 'Detection Operations', description: 'Detection-service runtime, YARA, and CTI sync events.', query: UNIFIED_QUERIES.edrDetectionPipeline, columns: ['@timestamp', 'service_event', 'service_component', 'pipeline_mode', 'detection_stage', 'cti_url', 'memory_scan_enabled', 'service_status'], dataViewId: EDR_DATA_VIEW_ID })],
            ['search', 'unified-detection-monitor-grid', createSavedSearch({ title: 'Monitor Coverage', description: 'Artifact polling and startup telemetry across the detection pipeline.', query: UNIFIED_QUERIES.edrDetectionPipeline, columns: ['@timestamp', 'artifact_name', 'monitor_status', 'lookback_window_ms', 'start_time_unix_ms', 'bootstrap_step', 'bloom_upserted', 'yara_cache_path'], dataViewId: EDR_DATA_VIEW_ID })]
        ],
        panels: [
            { type: 'visualization', id: 'unified-detection-total', x: 0, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-detection-artifacts', x: 12, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-detection-cti-syncs', x: 24, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-detection-bootstrap', x: 36, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-detection-components', x: 0, y: 8, w: 16, h: 12 },
            { type: 'visualization', id: 'unified-detection-monitor-artifacts', x: 16, y: 8, w: 16, h: 12 },
            { type: 'visualization', id: 'unified-detection-stages', x: 32, y: 8, w: 16, h: 12 },
            { type: 'search', id: 'unified-detection-ops-grid', x: 0, y: 20, w: 24, h: 16 },
            { type: 'search', id: 'unified-detection-monitor-grid', x: 24, y: 20, w: 24, h: 16 }
        ]
    },
    {
        id: 'unified-collected-artifacts',
        title: 'Unified Collected Artifacts',
        description: 'Unified SOC view of collected artifacts, response flows, and collection metadata.',
        objects: [
            ['visualization', 'unified-collected-total', createMetricVisualization({ title: 'Collected Artifacts', description: 'Collections completed across EDR operations.', query: UNIFIED_QUERIES.edrCollectedArtifacts, subtitle: 'Artifact runs', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-collected-flows', createMetricVisualization({ title: 'Unique Flows', description: 'Distinct flow identifiers from collected artifacts.', query: UNIFIED_QUERIES.edrCollectedArtifacts, subtitle: 'Flow coverage', dataViewId: EDR_DATA_VIEW_ID, metricType: 'cardinality', field: 'response_flow_id.keyword' })],
            ['visualization', 'unified-collected-rows', createMetricVisualization({ title: 'Total Rows', description: 'Rows returned by collected artifacts.', query: UNIFIED_QUERIES.edrCollectedArtifacts, subtitle: 'Returned rows', dataViewId: EDR_DATA_VIEW_ID, metricType: 'sum', field: 'collection_rows' })],
            ['visualization', 'unified-collected-artifacts-split', createPieVisualization({ title: 'Artifact Types', description: 'Artifacts executed by collection workflows.', query: UNIFIED_QUERIES.edrCollectedArtifacts, field: 'collected_artifact.keyword', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-collected-creators', createPieVisualization({ title: 'Collection Creators', description: 'Creator split for collection workflows.', query: UNIFIED_QUERIES.edrCollectedArtifacts, field: 'collection_creator.keyword', dataViewId: EDR_DATA_VIEW_ID })],
            ['search', 'unified-collected-grid', createSavedSearch({ title: 'Collected Artifact Stream', description: 'Collection metadata and result counts across the SOC.', query: UNIFIED_QUERIES.edrCollectedArtifacts, columns: ['@timestamp', 'response_flow_id', 'collected_artifact', 'collection_created_at', 'collection_last_active_at', 'collection_creator', 'collection_rows', 'collection_status', 'client_id', 'endpoint'], dataViewId: EDR_DATA_VIEW_ID })],
            ['search', 'unified-collected-details', createSavedSearch({ title: 'Artifact Result Details', description: 'Detailed collection outputs, uploads, and durations.', query: UNIFIED_QUERIES.edrCollectedArtifacts, columns: ['@timestamp', 'collection_id', 'request_count', 'result_count', 'uploaded_bytes', 'files_uploaded', 'collection_duration_seconds', 'user'], dataViewId: EDR_DATA_VIEW_ID })]
        ],
        panels: [
            { type: 'visualization', id: 'unified-collected-total', x: 0, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-collected-flows', x: 12, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-collected-rows', x: 24, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-collected-artifacts-split', x: 36, y: 0, w: 12, h: 12 },
            { type: 'visualization', id: 'unified-collected-creators', x: 0, y: 8, w: 24, h: 12 },
            { type: 'search', id: 'unified-collected-grid', x: 0, y: 20, w: 28, h: 16 },
            { type: 'search', id: 'unified-collected-details', x: 28, y: 20, w: 20, h: 16 }
        ]
    },
    {
        id: 'unified-client-events',
        title: 'Unified Client Events',
        description: 'Unified SOC view of client-side process and endpoint telemetry.',
        objects: [
            ['visualization', 'unified-client-total', createMetricVisualization({ title: 'Client Events', description: 'Client events reported by endpoints.', query: UNIFIED_QUERIES.edrClientEvents, subtitle: 'Endpoint telemetry', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-client-hosts', createMetricVisualization({ title: 'Unique Clients', description: 'Distinct clients reporting events.', query: UNIFIED_QUERIES.edrClientEvents, subtitle: 'Reporting endpoints', dataViewId: EDR_DATA_VIEW_ID, metricType: 'cardinality', field: 'client_id.keyword' })],
            ['visualization', 'unified-client-processes', createMetricVisualization({ title: 'Unique Processes', description: 'Distinct processes seen in client events.', query: UNIFIED_QUERIES.edrClientEvents, subtitle: 'Observed binaries', dataViewId: EDR_DATA_VIEW_ID, metricType: 'cardinality', field: 'process_name.keyword' })],
            ['visualization', 'unified-client-threat-types', createPieVisualization({ title: 'Threat Types', description: 'Threat types across client telemetry.', query: UNIFIED_QUERIES.edrClientEvents, field: 'threat_type.keyword', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-client-detection-methods', createPieVisualization({ title: 'Detection Methods', description: 'Detection methods associated with client events.', query: UNIFIED_QUERIES.edrClientEvents, field: 'detection_method.keyword', dataViewId: EDR_DATA_VIEW_ID })],
            ['search', 'unified-client-grid', createSavedSearch({ title: 'Client Event Stream', description: 'Client event rows with process and threat context.', query: UNIFIED_QUERIES.edrClientEvents, columns: ['@timestamp', 'client_event_name', 'threat_type', 'severity', 'category', 'mitre_techniques', 'process_id', 'parent_process_id', 'process_name', 'exe_path', 'command_line', 'client_id'], dataViewId: EDR_DATA_VIEW_ID })],
            ['search', 'unified-client-details', createSavedSearch({ title: 'Client Event Details', description: 'Detailed parent process, user, and working directory context.', query: UNIFIED_QUERIES.edrClientEvents, columns: ['@timestamp', 'process_name', 'exe_path', 'command_line', 'parent_name', 'parent_command_line', 'username', 'uid', 'cwd', 'detection_method', 'hostname', 'os'], dataViewId: EDR_DATA_VIEW_ID })]
        ],
        panels: [
            { type: 'visualization', id: 'unified-client-total', x: 0, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-client-hosts', x: 12, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-client-processes', x: 24, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-client-threat-types', x: 36, y: 0, w: 12, h: 12 },
            { type: 'visualization', id: 'unified-client-detection-methods', x: 0, y: 8, w: 24, h: 12 },
            { type: 'search', id: 'unified-client-grid', x: 0, y: 20, w: 28, h: 16 },
            { type: 'search', id: 'unified-client-details', x: 28, y: 20, w: 20, h: 16 }
        ]
    },
    {
        id: 'unified-server-events',
        title: 'Unified Server Events',
        description: 'Unified SOC view of server-side monitor events across process, network, and file telemetry.',
        objects: [
            ['visualization', 'unified-server-total', createMetricVisualization({ title: 'Server Events', description: 'Server events received across monitored endpoints.', query: UNIFIED_QUERIES.edrServerEvents, subtitle: 'Server-side telemetry', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-server-artifacts', createMetricVisualization({ title: 'Server Artifacts', description: 'Unique server event artifacts.', query: UNIFIED_QUERIES.edrServerEvents, subtitle: 'Monitor coverage', dataViewId: EDR_DATA_VIEW_ID, metricType: 'cardinality', field: 'server_event_name.keyword' })],
            ['visualization', 'unified-server-high', createMetricVisualization({ title: 'High Severity', description: 'High-severity server event rows.', query: `${UNIFIED_QUERIES.edrServerEvents} and severity:"HIGH"`, subtitle: 'Priority server rows', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-server-event-split', createPieVisualization({ title: 'Server Event Types', description: 'Distribution of server event artifacts.', query: UNIFIED_QUERIES.edrServerEvents, field: 'server_event_name.keyword', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-server-categories', createPieVisualization({ title: 'Event Categories', description: 'Execution, network, and integrity categories.', query: UNIFIED_QUERIES.edrServerEvents, field: 'category.keyword', dataViewId: EDR_DATA_VIEW_ID })],
            ['search', 'unified-server-grid', createSavedSearch({ title: 'Server Event Stream', description: 'Server event timeline with host and severity context.', query: UNIFIED_QUERIES.edrServerEvents, columns: ['server_time', 'event_timestamp', 'client_id', 'hostname', 'os', 'threat_type', 'severity', 'severity_num', 'category', 'mitre_techniques', 'process_id', 'server_event_name'], dataViewId: EDR_DATA_VIEW_ID })],
            ['search', 'unified-server-details', createSavedSearch({ title: 'Server Event Details', description: 'Detailed detection method and artifact context for server events.', query: UNIFIED_QUERIES.edrServerEvents, columns: ['@timestamp', 'server_event_name', 'artifact_name', 'detection_method', 'endpoint', 'client_id', 'hostname', 'os', 'mitre_technique', 'user'], dataViewId: EDR_DATA_VIEW_ID })]
        ],
        panels: [
            { type: 'visualization', id: 'unified-server-total', x: 0, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-server-artifacts', x: 12, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-server-high', x: 24, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-server-event-split', x: 36, y: 0, w: 12, h: 12 },
            { type: 'visualization', id: 'unified-server-categories', x: 0, y: 8, w: 24, h: 12 },
            { type: 'search', id: 'unified-server-grid', x: 0, y: 20, w: 28, h: 16 },
            { type: 'search', id: 'unified-server-details', x: 28, y: 20, w: 20, h: 16 }
        ]
    },
    {
        id: 'unified-incident-timeline',
        title: 'Unified Incident Timeline',
        description: 'Cross-domain incident timeline connecting SIEM, IDS, and EDR activity in one SOC view.',
        objects: [
            ['visualization', 'unified-incident-siem-critical', createMetricVisualization({ title: 'Critical SIEM Alerts', description: 'High-priority SIEM activity contributing to incidents.', query: UNIFIED_QUERIES.siemCritical, subtitle: 'SIEM priority', dataViewId: SIEM_DATA_VIEW_ID })],
            ['visualization', 'unified-incident-ids-total', createMetricVisualization({ title: 'IDS Alerts', description: 'Network alerts associated with incident review.', query: UNIFIED_QUERIES.idsAlerts, subtitle: 'Network signals', dataViewId: IDS_DATA_VIEW_ID })],
            ['visualization', 'unified-incident-edr-total', createMetricVisualization({ title: 'EDR Incident Candidates', description: 'EDR detections carrying incident identifiers.', query: 'incident_id:*', subtitle: 'Endpoint cases', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-incident-hash-blocks', createMetricVisualization({ title: 'Hash Blocks', description: 'Global hash blocks tied to incident handling.', query: 'response_action:"Block Hash"', subtitle: 'Preventive actions', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-incident-mitre', createPieVisualization({ title: 'MITRE Techniques', description: 'Technique coverage across SIEM incident telemetry.', query: UNIFIED_QUERIES.mitre, field: 'mitre_technique.keyword', dataViewId: SIEM_DATA_VIEW_ID })],
            ['visualization', 'unified-incident-signatures', createPieVisualization({ title: 'IDS Signatures', description: 'Top IDS signatures contributing to incident noise or value.', query: UNIFIED_QUERIES.idsAlerts, field: 'alert.signature.keyword', dataViewId: IDS_DATA_VIEW_ID })],
            ['visualization', 'unified-incident-threats', createPieVisualization({ title: 'EDR Threat Types', description: 'Threat families participating in incident timelines.', query: UNIFIED_QUERIES.edrThreats, field: 'threat_type.keyword', dataViewId: EDR_DATA_VIEW_ID })],
            ['visualization', 'unified-incident-endpoints', createPieVisualization({ title: 'Impacted Endpoints', description: 'Endpoints showing the most incident activity.', query: 'incident_id:*', field: 'endpoint.keyword', dataViewId: EDR_DATA_VIEW_ID })],
            ['search', 'unified-incident-siem-grid', createSavedSearch({ title: 'SIEM Event Timeline', description: 'Recent SIEM events relevant to active incidents.', query: UNIFIED_QUERIES.siemEvents, columns: ['@timestamp', 'event_type', 'severity', 'host', 'user', 'source_ip', 'mitre_technique'], dataViewId: SIEM_DATA_VIEW_ID })],
            ['search', 'unified-incident-edr-grid', createSavedSearch({ title: 'EDR Incident Timeline', description: 'Endpoint-side incident timeline with actions and hashes.', query: 'incident_id:*', columns: ['@timestamp', 'incident_id', 'endpoint', 'threat_type', 'response_action', 'response_status', 'policy_name', 'response_artifact', 'file_hash', 'process_name'], dataViewId: EDR_DATA_VIEW_ID })]
        ],
        panels: [
            { type: 'visualization', id: 'unified-incident-siem-critical', x: 0, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-incident-ids-total', x: 12, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-incident-edr-total', x: 24, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-incident-hash-blocks', x: 36, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'unified-incident-mitre', x: 0, y: 8, w: 12, h: 12 },
            { type: 'visualization', id: 'unified-incident-signatures', x: 12, y: 8, w: 12, h: 12 },
            { type: 'visualization', id: 'unified-incident-threats', x: 24, y: 8, w: 12, h: 12 },
            { type: 'visualization', id: 'unified-incident-endpoints', x: 36, y: 8, w: 12, h: 12 },
            { type: 'search', id: 'unified-incident-siem-grid', x: 0, y: 20, w: 24, h: 16 },
            { type: 'search', id: 'unified-incident-edr-grid', x: 24, y: 20, w: 24, h: 16 }
        ]
    },
    {
        id: 'unified-ids-alerts',
        title: 'Unified Intrusion Alerts',
        description: 'Unified SOC dashboard for IDS intrusion alerts.',
        objects: [
            ['visualization', 'unified-ids-alerts-total', createMetricVisualization({ title: 'Intrusion Alerts', description: 'Alert-like IDS events.', query: UNIFIED_QUERIES.idsAlerts, subtitle: 'Network alert queue', dataViewId: IDS_DATA_VIEW_ID })],
            ['visualization', 'unified-ids-alerts-source', createPieVisualization({ title: 'IDS Source Split', description: 'Source distribution for intrusion alerts.', query: UNIFIED_QUERIES.idsAlerts, field: 'source_type.keyword', dataViewId: IDS_DATA_VIEW_ID })],
            ['visualization', 'unified-ids-alerts-proto', createPieVisualization({ title: 'Protocol Split', description: 'Protocol distribution for intrusion alerts.', query: UNIFIED_QUERIES.idsAlerts, field: 'proto.keyword', dataViewId: IDS_DATA_VIEW_ID })],
            ['search', 'unified-ids-alerts-grid', createSavedSearch({ title: 'Intrusion Alert Stream', description: 'Recent intrusion alert rows.', query: UNIFIED_QUERIES.idsAlerts, columns: ['timestamp', 'tenant_id', 'event_type', 'alert.signature', 'src_ip', 'dest_ip', 'dest_port', 'proto'], dataViewId: IDS_DATA_VIEW_ID })]
        ],
        panels: [
            { type: 'visualization', id: 'unified-ids-alerts-total', x: 0, y: 0, w: 16, h: 8 },
            { type: 'visualization', id: 'unified-ids-alerts-source', x: 16, y: 0, w: 16, h: 12 },
            { type: 'visualization', id: 'unified-ids-alerts-proto', x: 32, y: 0, w: 16, h: 12 },
            { type: 'search', id: 'unified-ids-alerts-grid', x: 0, y: 12, w: 48, h: 16 }
        ]
    },
    {
        id: 'unified-blocked-threats',
        title: 'Unified Blocked Threats',
        description: 'Unified SOC dashboard for blocked or flagged network threats.',
        objects: [
            ['visualization', 'unified-blocked-total', createMetricVisualization({ title: 'Blocked Threats', description: 'Blocked or flagged IDS events.', query: UNIFIED_QUERIES.idsAlerts, subtitle: 'Blocked flow context', dataViewId: IDS_DATA_VIEW_ID })],
            ['visualization', 'unified-blocked-tenant', createPieVisualization({ title: 'Tenant Split', description: 'Tenant distribution for blocked threats.', query: UNIFIED_QUERIES.idsAlerts, field: 'tenant_id.keyword', dataViewId: IDS_DATA_VIEW_ID })],
            ['visualization', 'unified-blocked-signatures', createPieVisualization({ title: 'Top Signatures', description: 'Signature distribution for blocked threats.', query: UNIFIED_QUERIES.idsAlerts, field: 'alert.signature.keyword', dataViewId: IDS_DATA_VIEW_ID })],
            ['search', 'unified-blocked-grid', createSavedSearch({ title: 'Blocked Threat Stream', description: 'Recent blocked-threat records.', query: UNIFIED_QUERIES.idsAlerts, columns: ['timestamp', 'tenant_id', 'alert.signature', 'src_ip', 'dest_ip', 'dest_port', 'proto', '_index'], dataViewId: IDS_DATA_VIEW_ID })]
        ],
        panels: [
            { type: 'visualization', id: 'unified-blocked-total', x: 0, y: 0, w: 16, h: 8 },
            { type: 'visualization', id: 'unified-blocked-tenant', x: 16, y: 0, w: 16, h: 12 },
            { type: 'visualization', id: 'unified-blocked-signatures', x: 32, y: 0, w: 16, h: 12 },
            { type: 'search', id: 'unified-blocked-grid', x: 0, y: 12, w: 48, h: 16 }
        ]
    }
];

async function provisionUnifiedDashboards() {
    for (const spec of dashboardSpecs) {
        for (const [type, id, payload] of spec.objects) {
            await upsertSavedObject(type, id, payload.attributes, payload.references);
        }

        const dashboardPayload = createDashboard({
            title: spec.title,
            description: spec.description,
            panels: spec.panels
        });

        await upsertSavedObject('dashboard', spec.id, dashboardPayload.attributes, dashboardPayload.references);
        console.log(`Provisioned dashboard ${spec.id}.`);
    }
}

async function main() {
    await ensureSeedData();
    await ensureDataView(SIEM_DATA_VIEW_ID, SIEM_DATA_VIEW_TITLE);
    await ensureDataView(IDS_DATA_VIEW_ID, 'logs-tenant-*');
    await ensureDataView(EDR_DATA_VIEW_ID, 'tenant-01-edr*');
    await provisionUnifiedDashboards();
    console.log('Unified OpenSearch provisioning complete.');
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
