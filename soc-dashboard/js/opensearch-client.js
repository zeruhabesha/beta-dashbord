// ============================================
// OPENSEARCH CLIENT - BETA DASHBOARD
// OpenSearch integration for multi-tenant security data
// ============================================

/**
 * OpenSearch Client
 * Handles all interactions with OpenSearch cluster
 */
class OpenSearchClient {
    constructor(config = {}) {
        this.baseUrl = config.baseUrl || 'http://196.188.249.46:9200';
        this.username = config.username || 'admin';
        this.password = config.password || 'admin';
        this.currentTenant = 'Tenant_01';
        this.timeRange = '24h';
    }

    /**
     * Get authentication headers
     */
    getHeaders() {
        const auth = btoa(`${this.username}:${this.password}`);
        return {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Set current tenant
     */
    setTenant(tenant) {
        this.currentTenant = tenant;
    }

    /**
     * Set time range
     */
    setTimeRange(range) {
        this.timeRange = range;
    }

    /**
     * Get time range in milliseconds
     */
    getTimeRangeMs() {
        const ranges = {
            '15m': 15 * 60 * 1000,
            '1h': 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000
        };
        return ranges[this.timeRange] || ranges['24h'];
    }

    /**
     * Build time filter for queries
     */
    getTimeFilter() {
        const now = Date.now();
        const from = now - this.getTimeRangeMs();

        return {
            range: {
                '@timestamp': {
                    gte: from,
                    lte: now,
                    format: 'epoch_millis'
                }
            }
        };
    }

    /**
     * Get index pattern for current tenant
     */
    getIndexPattern(source) {
        const tenantName = this.currentTenant.toLowerCase();
        const patterns = {
            'siem': `${tenantName}_siem-*`,
            'ids': `${tenantName}_ips-*`,
            'ips': `${tenantName}_ips-*`,
            'edr': `${tenantName}_edr-*`,
            'all': `${tenantName}_*`
        };
        return patterns[source] || patterns['all'];
    }

    /**
     * Execute search query
     */
    async search(index, query) {
        try {
            const response = await fetch(`${this.baseUrl}/${index}/_search`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(query)
            });

            if (!response.ok) {
                throw new Error(`OpenSearch query failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('OpenSearch search error:', error);
            // Fallback to mock data if OpenSearch is unavailable
            return this.getMockFallback(index, query);
        }
    }

    /**
     * Get unified dashboard KPIs
     */
    async getUnifiedKPIs() {
        const query = {
            size: 0,
            query: {
                bool: {
                    must: [this.getTimeFilter()]
                }
            },
            aggs: {
                total_events: {
                    value_count: {
                        field: '_id'
                    }
                },
                critical_alerts: {
                    filter: {
                        term: { 'severity.keyword': 'Critical' }
                    }
                },
                unique_hosts: {
                    cardinality: {
                        field: 'host.keyword'
                    }
                },
                by_source: {
                    terms: {
                        field: 'data_source.keyword',
                        size: 10
                    }
                }
            }
        };

        const result = await this.search(this.getIndexPattern('all'), query);

        return {
            totalEvents: result.hits?.total?.value || 0,
            criticalAlerts: result.aggregations?.critical_alerts?.doc_count || 0,
            activeHosts: result.aggregations?.unique_hosts?.value || 0,
            dataSources: {
                siem: this.checkDataSource(result, 'SIEM'),
                ids: this.checkDataSource(result, 'IDS'),
                edr: this.checkDataSource(result, 'EDR')
            }
        };
    }

    /**
     * Check if data source is active
     */
    checkDataSource(result, sourceName) {
        const buckets = result.aggregations?.by_source?.buckets || [];
        return buckets.some(b => b.key.toUpperCase() === sourceName.toUpperCase());
    }

    /**
     * Get event timeline data
     */
    async getEventTimeline() {
        const interval = this.timeRange === '15m' ? '1m' :
            this.timeRange === '1h' ? '5m' :
                this.timeRange === '24h' ? '1h' : '1d';

        const query = {
            size: 0,
            query: {
                bool: {
                    must: [this.getTimeFilter()]
                }
            },
            aggs: {
                timeline: {
                    date_histogram: {
                        field: '@timestamp',
                        fixed_interval: interval
                    },
                    aggs: {
                        by_source: {
                            terms: {
                                field: 'data_source.keyword'
                            }
                        }
                    }
                }
            }
        };

        const result = await this.search(this.getIndexPattern('all'), query);
        return this.formatTimelineData(result);
    }

    /**
     * Format timeline data for Chart.js
     */
    formatTimelineData(result) {
        const buckets = result.aggregations?.timeline?.buckets || [];

        const datasets = {
            'SIEM': { label: 'SIEM Events', data: [], borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)' },
            'IDS': { label: 'IDS Events', data: [], borderColor: '#eab308', backgroundColor: 'rgba(234, 179, 8, 0.1)' },
            'EDR': { label: 'EDR Events', data: [], borderColor: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.1)' }
        };

        const labels = [];

        buckets.forEach(bucket => {
            const date = new Date(bucket.key);
            labels.push(date.toLocaleTimeString());

            const sourceCounts = { 'SIEM': 0, 'IDS': 0, 'EDR': 0 };
            bucket.by_source?.buckets?.forEach(src => {
                const source = src.key.toUpperCase();
                if (sourceCounts.hasOwnProperty(source)) {
                    sourceCounts[source] = src.doc_count;
                }
            });

            Object.keys(datasets).forEach(source => {
                datasets[source].data.push(sourceCounts[source]);
            });
        });

        return {
            labels,
            datasets: Object.values(datasets).map(ds => ({ ...ds, tension: 0.4 }))
        };
    }

    /**
     * Get severity distribution
     */
    async getSeverityDistribution() {
        const query = {
            size: 0,
            query: {
                bool: {
                    must: [this.getTimeFilter()]
                }
            },
            aggs: {
                by_severity: {
                    terms: {
                        field: 'severity.keyword',
                        size: 10
                    }
                }
            }
        };

        const result = await this.search(this.getIndexPattern('all'), query);
        const buckets = result.aggregations?.by_severity?.buckets || [];

        const severityOrder = ['Critical', 'High', 'Medium', 'Low'];
        const severityColors = {
            'Critical': '#ef4444',
            'High': '#f97316',
            'Medium': '#eab308',
            'Low': '#22c55e'
        };

        const data = severityOrder.map(sev => {
            const bucket = buckets.find(b => b.key === sev);
            return bucket ? bucket.doc_count : 0;
        });

        return {
            labels: severityOrder,
            datasets: [{
                data,
                backgroundColor: severityOrder.map(s => severityColors[s]),
                borderWidth: 0
            }]
        };
    }

    /**
     * Get recent alerts
     */
    async getRecentAlerts(size = 50, source = null) {
        const query = {
            size,
            query: {
                bool: {
                    must: [this.getTimeFilter()]
                }
            },
            sort: [
                { '@timestamp': { order: 'desc' } }
            ]
        };

        if (source) {
            query.query.bool.must.push({
                term: { 'data_source.keyword': source }
            });
        }

        const index = source ? this.getIndexPattern(source.toLowerCase()) : this.getIndexPattern('all');
        const result = await this.search(index, query);

        return (result.hits?.hits || []).map(hit => ({
            id: hit._id,
            timestamp: new Date(hit._source['@timestamp']).toISOString().replace('T', ' ').substring(0, 19),
            source: hit._source.data_source || 'Unknown',
            host: hit._source.host || 'Unknown',
            ruleName: hit._source.rule_name || hit._source.signature || 'Unknown',
            severity: hit._source.severity || 'Medium',
            sourceIP: hit._source.source_ip || hit._source.src_ip || 'N/A',
            destIP: hit._source.dest_ip || hit._source.dst_ip || 'N/A',
            rawTimestamp: new Date(hit._source['@timestamp'])
        }));
    }

    /**
     * Get top triggered rules
     */
    async getTopRules(size = 10) {
        const query = {
            size: 0,
            query: {
                bool: {
                    must: [this.getTimeFilter()]
                }
            },
            aggs: {
                top_rules: {
                    terms: {
                        field: 'rule_name.keyword',
                        size
                    }
                }
            }
        };

        const result = await this.search(this.getIndexPattern('all'), query);
        const buckets = result.aggregations?.top_rules?.buckets || [];

        return {
            labels: buckets.map(b => b.key),
            datasets: [{
                label: 'Trigger Count',
                data: buckets.map(b => b.doc_count),
                backgroundColor: '#3b82f6',
                borderColor: '#2563eb',
                borderWidth: 1
            }]
        };
    }

    /**
     * Fallback to mock data when OpenSearch is unavailable
     */
    getMockFallback(index, query) {
        console.warn('Using mock data fallback - OpenSearch unavailable');
        // Use the existing mock data generator
        return mockData ? {
            hits: {
                total: { value: 1000 },
                hits: []
            },
            aggregations: {}
        } : { hits: { total: { value: 0 }, hits: [] }, aggregations: {} };
    }

    /**
     * Test connection to OpenSearch
     */
    async testConnection() {
        try {
            const response = await fetch(`${this.baseUrl}/_cluster/health`, {
                headers: this.getHeaders()
            });

            if (response.ok) {
                const health = await response.json();
                console.log('OpenSearch connection successful:', health.cluster_name);
                return true;
            }
            return false;
        } catch (error) {
            console.error('OpenSearch connection failed:', error);
            return false;
        }
    }
}

// Initialize OpenSearch client
const openSearchClient = new OpenSearchClient({
    baseUrl: 'http://196.188.249.46:9200',
    username: 'admin',
    password: 'admin'
});

// Test connection on load
openSearchClient.testConnection().then(connected => {
    if (connected) {
        console.log('✓ Connected to OpenSearch - Using real data');
    } else {
        console.warn('✗ OpenSearch unavailable - Using mock data');
    }
});
