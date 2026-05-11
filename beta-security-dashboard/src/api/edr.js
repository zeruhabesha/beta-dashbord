const OS_API = '/api/opensearch';
const EDR_INDEX = 'tenant-*-edr*,tenant_*_edr*,tenant-01-edr';

const SEARCH_FIELDS = [
    'threat_type^3',
    'endpoint^3',
    'severity^2',
    'status^2',
    'user^2',
    'process_name^2',
    'parent_process',
    'file_path',
    'file_hash',
    'mitre_technique',
    'command_line'
];

const MALWARE_TYPES = ['Malware', 'Ransomware', 'Trojan', 'Rootkit', 'Spyware', 'Adware'];
const CONTAINED_STATUSES = ['Quarantined', 'Blocked'];
const FILE_ACTIONS = ['File Created', 'File Modified', 'File Deleted'];
const PROCESS_ACTIONS = ['Process Started', 'Process Terminated'];

function buildTimeRangeFilter(timeRange = '24h') {
    return {
        range: {
            '@timestamp': {
                gte: `now-${timeRange}`,
                lte: 'now'
            }
        }
    };
}

function buildSearchClause(searchQuery = '') {
    const trimmed = searchQuery.trim();

    if (!trimmed) {
        return null;
    }

    return {
        simple_query_string: {
            query: trimmed,
            fields: SEARCH_FIELDS,
            default_operator: 'and'
        }
    };
}

function buildQuery({ timeRange = '24h', searchQuery = '', filters = [] } = {}) {
    const must = [];
    const filterClauses = [buildTimeRangeFilter(timeRange), ...filters];
    const searchClause = buildSearchClause(searchQuery);

    if (searchClause) {
        must.push(searchClause);
    }

    return {
        bool: {
            filter: filterClauses,
            ...(must.length > 0 ? { must } : {})
        }
    };
}

async function searchEdr(body) {
    const response = await fetch(`${OS_API}/${EDR_INDEX}/_search?ignore_unavailable=true&allow_no_indices=true`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const details = await response.text();
        throw new Error(details || `EDR query failed with ${response.status}`);
    }

    return response.json();
}

function totalHits(total) {
    if (typeof total === 'number') {
        return total;
    }

    return total?.value || 0;
}

function bucketKey(bucket, fallback = 'Unknown') {
    return String(bucket?.key ?? fallback);
}

function normalizeHit(hit) {
    const source = hit?._source || {};

    return {
        id: hit?._id || source.detection_id || crypto.randomUUID?.() || Math.random().toString(36).slice(2),
        detectionId: source.detection_id || hit?._id || '-',
        timestamp: source['@timestamp'] || '',
        threatType: source.threat_type || 'Unknown',
        endpoint: source.endpoint || 'Unknown endpoint',
        user: source.user || 'Unknown user',
        processName: source.process_name || 'n/a',
        processId: source.process_id ?? '-',
        parentProcess: source.parent_process || 'n/a',
        filePath: source.file_path || 'n/a',
        fileHash: source.file_hash || 'n/a',
        action: source.action || 'Observed',
        severity: source.severity || 'Unknown',
        status: source.status || 'Observed',
        mitreTechnique: source.mitre_technique || '-',
        commandLine: source.command_line || '-'
    };
}

function extractHits(topHitsAggregation) {
    return (topHitsAggregation?.hits?.hits || []).map(normalizeHit);
}

function containedFileFilter() {
    return {
        bool: {
            filter: [
                { terms: { 'status.keyword': CONTAINED_STATUSES } },
                { terms: { 'action.keyword': FILE_ACTIONS } }
            ]
        }
    };
}

function malwareFilter() {
    return {
        terms: {
            'threat_type.keyword': MALWARE_TYPES
        }
    };
}

function getViewFilters(viewId) {
    switch (viewId) {
        case 'active-threats':
            return [
                {
                    terms: {
                        'severity.keyword': ['Critical', 'High']
                    }
                }
            ];
        case 'isolation':
            return [
                {
                    terms: {
                        'status.keyword': ['Quarantined', 'Blocked', 'Investigating']
                    }
                }
            ];
        case 'malware':
            return [malwareFilter()];
        case 'process-tree':
            return [
                {
                    terms: {
                        'action.keyword': PROCESS_ACTIONS
                    }
                }
            ];
        case 'file-integrity':
            return [
                {
                    terms: {
                        'action.keyword': FILE_ACTIONS
                    }
                }
            ];
        default:
            return [];
    }
}

export async function fetchEdrOverview({ timeRange = '24h', searchQuery = '' } = {}) {
    const response = await searchEdr({
        size: 0,
        track_total_hits: true,
        query: buildQuery({ timeRange, searchQuery }),
        aggs: {
            unique_endpoints: {
                cardinality: {
                    field: 'endpoint.keyword'
                }
            },
            malware_detections: {
                filter: malwareFilter()
            },
            contained_files: {
                filter: containedFileFilter()
            },
            malware_hashes: {
                filter: malwareFilter(),
                aggs: {
                    hashes: {
                        terms: {
                            field: 'file_hash.keyword',
                            size: 6,
                            missing: 'Unavailable'
                        }
                    }
                }
            },
            alerts_by_type: {
                terms: {
                    field: 'threat_type.keyword',
                    size: 8,
                    missing: 'Unknown'
                }
            },
            alerts_by_endpoint: {
                terms: {
                    field: 'endpoint.keyword',
                    size: 6,
                    missing: 'Unknown endpoint'
                }
            },
            recent_alerts: {
                top_hits: {
                    size: 6,
                    sort: [
                        {
                            '@timestamp': {
                                order: 'desc'
                            }
                        }
                    ],
                    _source: {
                        includes: [
                            '@timestamp',
                            'threat_type',
                            'endpoint',
                            'severity',
                            'status',
                            'process_name',
                            'user',
                            'file_path'
                        ]
                    }
                }
            },
            contained_file_rows: {
                filter: containedFileFilter(),
                aggs: {
                    items: {
                        top_hits: {
                            size: 5,
                            sort: [
                                {
                                    '@timestamp': {
                                        order: 'desc'
                                    }
                                }
                            ],
                            _source: {
                                includes: [
                                    '@timestamp',
                                    'endpoint',
                                    'status',
                                    'file_path',
                                    'file_hash',
                                    'process_name',
                                    'user'
                                ]
                            }
                        }
                    }
                }
            },
            severity_breakdown: {
                terms: {
                    field: 'severity.keyword',
                    size: 4,
                    missing: 'Unknown'
                }
            }
        }
    });

    const aggregations = response.aggregations || {};

    return {
        totalAlerts: totalHits(response.hits?.total),
        malwareDetections: aggregations.malware_detections?.doc_count || 0,
        totalDevices: Math.round(aggregations.unique_endpoints?.value || 0),
        containedFiles: aggregations.contained_files?.doc_count || 0,
        detectionsByHash: (aggregations.malware_hashes?.hashes?.buckets || []).map((bucket) => ({
            label: bucketKey(bucket, 'Unavailable'),
            count: bucket.doc_count
        })),
        alertsByType: (aggregations.alerts_by_type?.buckets || []).map((bucket) => ({
            label: bucketKey(bucket),
            count: bucket.doc_count
        })),
        alertsByEndpoint: (aggregations.alerts_by_endpoint?.buckets || []).map((bucket) => ({
            label: bucketKey(bucket, 'Unknown endpoint'),
            count: bucket.doc_count
        })),
        severityBreakdown: (aggregations.severity_breakdown?.buckets || []).map((bucket) => ({
            label: bucketKey(bucket),
            count: bucket.doc_count
        })),
        recentAlerts: extractHits(aggregations.recent_alerts),
        containedFileRows: extractHits(aggregations.contained_file_rows?.items)
    };
}

export async function fetchEdrEndpointInventory({ timeRange = '24h', searchQuery = '' } = {}) {
    const response = await searchEdr({
        size: 0,
        query: buildQuery({ timeRange, searchQuery }),
        aggs: {
            endpoints: {
                terms: {
                    field: 'endpoint.keyword',
                    size: 50,
                    missing: 'Unknown endpoint'
                },
                aggs: {
                    last_seen: {
                        max: {
                            field: '@timestamp'
                        }
                    },
                    top_severity: {
                        terms: {
                            field: 'severity.keyword',
                            size: 1,
                            missing: 'Unknown'
                        }
                    },
                    top_status: {
                        terms: {
                            field: 'status.keyword',
                            size: 1,
                            missing: 'Observed'
                        }
                    },
                    top_threat: {
                        terms: {
                            field: 'threat_type.keyword',
                            size: 1,
                            missing: 'Unknown'
                        }
                    },
                    recent_doc: {
                        top_hits: {
                            size: 1,
                            sort: [
                                {
                                    '@timestamp': {
                                        order: 'desc'
                                    }
                                }
                            ],
                            _source: {
                                includes: [
                                    '@timestamp',
                                    'user',
                                    'process_name',
                                    'status',
                                    'severity',
                                    'threat_type',
                                    'action'
                                ]
                            }
                        }
                    }
                }
            }
        }
    });

    return (response.aggregations?.endpoints?.buckets || []).map((bucket) => {
        const recent = normalizeHit(bucket.recent_doc?.hits?.hits?.[0]);
        return {
            id: `${bucket.key}-${recent.timestamp}`,
            endpoint: bucketKey(bucket, 'Unknown endpoint'),
            alerts: bucket.doc_count,
            severity: bucket.top_severity?.buckets?.[0]?.key || 'Unknown',
            status: bucket.top_status?.buckets?.[0]?.key || 'Observed',
            topThreat: bucket.top_threat?.buckets?.[0]?.key || 'Unknown',
            lastSeen: recent.timestamp,
            lastUser: recent.user,
            lastProcess: recent.processName,
            lastAction: recent.action
        };
    });
}

export async function fetchEdrActivity({ viewId = 'hunting', timeRange = '24h', searchQuery = '' } = {}) {
    const response = await searchEdr({
        size: 100,
        sort: [
            {
                '@timestamp': {
                    order: 'desc'
                }
            }
        ],
        query: buildQuery({
            timeRange,
            searchQuery,
            filters: getViewFilters(viewId)
        })
    });

    return (response.hits?.hits || []).map(normalizeHit);
}
