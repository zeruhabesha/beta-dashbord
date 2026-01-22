// ============================================
// SOC DASHBOARD - MAIN APPLICATION
// Application initialization and page management
// ============================================

/**
 * Main Application Class
 * Manages page loading, data refresh, and global state
 */
class SOCDashboardApp {
    constructor() {
        this.currentPage = 'unified-dashboard';
        this.mainContent = null;
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    /**
     * Setup the application
     */
    setup() {
        this.createMainContent();
        this.attachEventListeners();
        this.loadPage(this.currentPage);
    }

    /**
     * Create main content container
     */
    createMainContent() {
        this.mainContent = document.createElement('main');
        this.mainContent.className = 'main-content';
        this.mainContent.id = 'mainContent';
        document.body.appendChild(this.mainContent);
    }

    /**
     * Attach global event listeners
     */
    attachEventListeners() {
        // Page change event
        window.addEventListener('pageChange', (e) => {
            this.loadPage(e.detail.page);
        });

        // Tenant change event
        window.addEventListener('tenantChange', (e) => {
            this.refreshCurrentPage();
        });

        // Time range change event
        window.addEventListener('timeRangeChange', (e) => {
            this.refreshCurrentPage();
        });

        // Global search event
        window.addEventListener('globalSearch', (e) => {
            this.handleSearch(e.detail.query);
        });
    }

    /**
     * Load a specific page
     */
    loadPage(pageName) {
        this.currentPage = pageName;

        // Clear existing content
        this.mainContent.innerHTML = '';

        // Destroy existing charts
        chartManager.destroyAll();

        // Load page content
        switch (pageName) {
            case 'unified-dashboard':
                this.loadUnifiedDashboard();
                break;
            case 'siem-alerts':
                this.loadSIEMAlerts();
                break;
            case 'ids-ips-analysis':
                this.loadIDSIPSAnalysis();
                break;
            case 'edr-analysis':
                this.loadEDRAnalysis();
                break;
            case 'unified-timeline':
                this.loadUnifiedTimeline();
                break;
            case 'host-ip-correlation':
                this.loadHostIPCorrelation();
                break;
            case 'reports':
                this.loadReports();
                break;
            case 'settings':
                this.loadSettings();
                break;
            default:
                this.loadUnifiedDashboard();
        }
    }

    /**
     * Refresh current page
     */
    refreshCurrentPage() {
        this.loadPage(this.currentPage);
    }

    /**
     * Handle global search
     */
    handleSearch(query) {
        console.log('Searching for:', query);
        // Implement search logic here
    }

    /**
     * Load Unified Dashboard
     */
    loadUnifiedDashboard() {
        const kpis = mockData.generateUnifiedKPIs();

        this.mainContent.innerHTML = `
      <div class="unified-dashboard animate-fadeIn">
        <div class="dashboard-header">
          <h1 class="dashboard-title">Unified Security Dashboard</h1>
          <p class="dashboard-subtitle">Real-time security monitoring across SIEM, IDS/IPS, and EDR</p>
        </div>
        
        <!-- KPI Cards -->
        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-card-header">
              <div class="kpi-card-icon info">📊</div>
            </div>
            <div class="kpi-card-body">
              <div class="kpi-card-label">Total Events</div>
              <div class="kpi-card-value">${kpis.totalEvents.toLocaleString()}</div>
              <div class="kpi-card-change positive">↑ 12% from last period</div>
            </div>
          </div>
          
          <div class="kpi-card">
            <div class="kpi-card-header">
              <div class="kpi-card-icon critical">⚠️</div>
            </div>
            <div class="kpi-card-body">
              <div class="kpi-card-label">Critical Alerts</div>
              <div class="kpi-card-value">${kpis.criticalAlerts}</div>
              <div class="kpi-card-change negative">↑ 3 new alerts</div>
            </div>
          </div>
          
          <div class="kpi-card">
            <div class="kpi-card-header">
              <div class="kpi-card-icon success">💻</div>
            </div>
            <div class="kpi-card-body">
              <div class="kpi-card-label">Active Hosts</div>
              <div class="kpi-card-value">${kpis.activeHosts}</div>
              <div class="kpi-card-change positive">All monitored</div>
            </div>
          </div>
          
          <div class="kpi-card">
            <div class="kpi-card-header">
              <div class="kpi-card-icon info">🔗</div>
            </div>
            <div class="kpi-card-body">
              <div class="kpi-card-label">Data Sources</div>
              <div class="kpi-card-value">3/3</div>
              <div class="kpi-card-change positive">All active</div>
            </div>
          </div>
        </div>
        
        <!-- Data Completeness -->
        <div class="data-source-panel">
          <div class="data-source-item">
            <div class="kpi-card-icon info">🛡️</div>
            <div class="data-source-label">SIEM Data</div>
            <div class="status-indicator ${kpis.dataSources.siem ? 'active' : 'inactive'}">
              <span class="status-dot"></span>
              ${kpis.dataSources.siem ? 'Active' : 'Inactive'}
            </div>
          </div>
          
          <div class="data-source-item">
            <div class="kpi-card-icon warning">🌐</div>
            <div class="data-source-label">IDS/IPS Data</div>
            <div class="status-indicator ${kpis.dataSources.ids ? 'active' : 'inactive'}">
              <span class="status-dot"></span>
              ${kpis.dataSources.ids ? 'Active' : 'Inactive'}
            </div>
          </div>
          
          <div class="data-source-item">
            <div class="kpi-card-icon success">🖥️</div>
            <div class="data-source-label">EDR Data</div>
            <div class="status-indicator ${kpis.dataSources.edr ? 'active' : 'inactive'}">
              <span class="status-dot"></span>
              ${kpis.dataSources.edr ? 'Active' : 'Inactive'}
            </div>
          </div>
        </div>
        
        <!-- Charts -->
        <div class="chart-grid">
          <div class="chart-container">
            <div class="chart-header">
              <h3 class="chart-title">Unified Event Timeline</h3>
            </div>
            <canvas id="eventTimelineChart" class="chart-canvas"></canvas>
          </div>
          
          <div class="chart-container">
            <div class="chart-header">
              <h3 class="chart-title">Alert Severity Distribution</h3>
            </div>
            <canvas id="severityChart" class="chart-canvas"></canvas>
          </div>
        </div>
        
        <div class="full-width-section">
          <div class="chart-container">
            <div class="chart-header">
              <h3 class="chart-title">Top Triggered Rules</h3>
            </div>
            <canvas id="topRulesChart" class="chart-canvas"></canvas>
          </div>
        </div>
        
        <!-- Recent Alerts Table -->
        <div class="full-width-section">
          <div class="data-table-container">
            <div class="card-header">
              <h3 class="card-title">Recent Alerts</h3>
            </div>
            <table class="data-table">
              <thead>
                <tr>
                  <th class="sortable">Timestamp</th>
                  <th class="sortable">Source</th>
                  <th class="sortable">Host</th>
                  <th class="sortable">Rule Name</th>
                  <th class="sortable">Severity</th>
                  <th>Source IP</th>
                  <th>Dest IP</th>
                </tr>
              </thead>
              <tbody id="alertsTableBody">
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

        // Render charts
        setTimeout(() => {
            chartManager.renderEventTimeline('eventTimelineChart');
            chartManager.renderSeverityDistribution('severityChart');
            chartManager.renderTopRules('topRulesChart');
            this.populateAlertsTable();
        }, 100);
    }

    /**
     * Populate alerts table
     */
    populateAlertsTable() {
        const alerts = mockData.generateRecentAlerts(20);
        const tbody = document.getElementById('alertsTableBody');

        if (!tbody) return;

        tbody.innerHTML = alerts.map(alert => `
      <tr>
        <td class="timestamp">${alert.timestamp}</td>
        <td>
          <span class="badge badge-${alert.source.toLowerCase()}">${alert.source}</span>
        </td>
        <td class="hostname">${alert.host}</td>
        <td>${alert.ruleName}</td>
        <td>
          <span class="badge badge-${alert.severity.toLowerCase()}">${alert.severity}</span>
        </td>
        <td class="ip-address">${alert.sourceIP}</td>
        <td class="ip-address">${alert.destIP}</td>
      </tr>
    `).join('');
    }

    /**
     * Load SIEM Alerts page
     */
    loadSIEMAlerts() {
        const data = mockData.generateSIEMData();

        this.mainContent.innerHTML = `
      <div class="siem-alerts-page animate-fadeIn">
        <div class="dashboard-header">
          <h1 class="dashboard-title">SIEM Alerts</h1>
          <p class="dashboard-subtitle">Security Information and Event Management</p>
        </div>
        
        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-card-header">
              <div class="kpi-card-icon info">📋</div>
            </div>
            <div class="kpi-card-body">
              <div class="kpi-card-label">Total Alerts</div>
              <div class="kpi-card-value">${data.kpis.totalAlerts.toLocaleString()}</div>
            </div>
          </div>
          
          <div class="kpi-card">
            <div class="kpi-card-header">
              <div class="kpi-card-icon critical">🚨</div>
            </div>
            <div class="kpi-card-body">
              <div class="kpi-card-label">Critical</div>
              <div class="kpi-card-value">${data.kpis.criticalAlerts}</div>
            </div>
          </div>
          
          <div class="kpi-card">
            <div class="kpi-card-header">
              <div class="kpi-card-icon warning">⚠️</div>
            </div>
            <div class="kpi-card-body">
              <div class="kpi-card-label">High Priority</div>
              <div class="kpi-card-value">${data.kpis.highAlerts}</div>
            </div>
          </div>
          
          <div class="kpi-card">
            <div class="kpi-card-header">
              <div class="kpi-card-icon success">✓</div>
            </div>
            <div class="kpi-card-body">
              <div class="kpi-card-label">Investigated</div>
              <div class="kpi-card-value">${data.kpis.investigatedAlerts}</div>
            </div>
          </div>
        </div>
        
        <div class="chart-grid">
          <div class="chart-container">
            <div class="chart-header">
              <h3 class="chart-title">Alert Trend</h3>
            </div>
            <canvas id="siemTrendChart" class="chart-canvas"></canvas>
          </div>
          
          <div class="chart-container">
            <div class="chart-header">
              <h3 class="chart-title">Severity Distribution</h3>
            </div>
            <canvas id="siemSeverityChart" class="chart-canvas"></canvas>
          </div>
        </div>
        
        <div class="full-width-section">
          <div class="data-table-container">
            <div class="card-header">
              <h3 class="card-title">SIEM Alerts</h3>
            </div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Host</th>
                  <th>Rule Name</th>
                  <th>Severity</th>
                  <th>Source IP</th>
                  <th>Dest IP</th>
                </tr>
              </thead>
              <tbody>
                ${data.alerts.slice(0, 20).map(alert => `
                  <tr>
                    <td class="timestamp">${alert.timestamp}</td>
                    <td class="hostname">${alert.host}</td>
                    <td>${alert.ruleName}</td>
                    <td><span class="badge badge-${alert.severity.toLowerCase()}">${alert.severity}</span></td>
                    <td class="ip-address">${alert.sourceIP}</td>
                    <td class="ip-address">${alert.destIP}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

        setTimeout(() => {
            chartManager.renderEventTimeline('siemTrendChart');
            chartManager.renderSeverityDistribution('siemSeverityChart');
        }, 100);
    }

    /**
     * Load IDS/IPS Analysis page
     */
    loadIDSIPSAnalysis() {
        const data = mockData.generateIDSData();

        this.mainContent.innerHTML = `
      <div class="ids-ips-page animate-fadeIn">
        <div class="dashboard-header">
          <h1 class="dashboard-title">IDS / IPS Analysis</h1>
          <p class="dashboard-subtitle">Intrusion Detection and Prevention System</p>
        </div>
        
        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-card-header">
              <div class="kpi-card-icon info">🌐</div>
            </div>
            <div class="kpi-card-body">
              <div class="kpi-card-label">Total Events</div>
              <div class="kpi-card-value">${data.kpis.totalEvents.toLocaleString()}</div>
            </div>
          </div>
          
          <div class="kpi-card">
            <div class="kpi-card-header">
              <div class="kpi-card-icon critical">🚫</div>
            </div>
            <div class="kpi-card-body">
              <div class="kpi-card-label">Blocked Attempts</div>
              <div class="kpi-card-value">${data.kpis.blockedAttempts.toLocaleString()}</div>
            </div>
          </div>
          
          <div class="kpi-card">
            <div class="kpi-card-header">
              <div class="kpi-card-icon warning">📍</div>
            </div>
            <div class="kpi-card-body">
              <div class="kpi-card-label">Unique IPs</div>
              <div class="kpi-card-value">${data.kpis.uniqueIPs}</div>
            </div>
          </div>
          
          <div class="kpi-card">
            <div class="kpi-card-header">
              <div class="kpi-card-icon info">🎯</div>
            </div>
            <div class="kpi-card-body">
              <div class="kpi-card-label">Top Signature</div>
              <div class="kpi-card-value text-sm">${data.kpis.topSignature}</div>
            </div>
          </div>
        </div>
        
        <div class="chart-grid">
          <div class="chart-container">
            <div class="chart-header">
              <h3 class="chart-title">Traffic Analysis</h3>
            </div>
            <canvas id="trafficChart" class="chart-canvas"></canvas>
          </div>
          
          <div class="chart-container">
            <div class="chart-header">
              <h3 class="chart-title">Top Blocked IPs</h3>
            </div>
            <div class="card-body p-md">
              ${data.blockedIPs.slice(0, 8).map(item => `
                <div class="communicator-item">
                  <span class="communicator-ip">${item.ip}</span>
                  <span class="communicator-count">
                    <span class="communicator-badge">${item.count}</span>
                    blocks
                  </span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        
        <div class="full-width-section">
          <div class="data-table-container">
            <div class="card-header">
              <h3 class="card-title">Intrusion Attempts</h3>
            </div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Signature</th>
                  <th>Source IP</th>
                  <th>Target Host</th>
                  <th>Severity</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${data.events.slice(0, 20).map(event => `
                  <tr>
                    <td class="timestamp">${event.timestamp}</td>
                    <td>${event.ruleName}</td>
                    <td class="ip-address">${event.sourceIP}</td>
                    <td class="hostname">${event.host}</td>
                    <td><span class="badge badge-${event.severity.toLowerCase()}">${event.severity}</span></td>
                    <td><span class="badge badge-critical">Blocked</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

        setTimeout(() => {
            chartManager.renderEventTimeline('trafficChart');
        }, 100);
    }

    /**
     * Load EDR Analysis page
     */
    loadEDRAnalysis() {
        const data = mockData.generateEDRData();

        this.mainContent.innerHTML = `
      <div class="edr-page animate-fadeIn">
        <div class="dashboard-header">
          <h1 class="dashboard-title">EDR Analysis</h1>
          <p class="dashboard-subtitle">Endpoint Detection and Response</p>
        </div>
        
        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-card-header">
              <div class="kpi-card-icon info">💻</div>
            </div>
            <div class="kpi-card-body">
              <div class="kpi-card-label">Total Endpoints</div>
              <div class="kpi-card-value">${data.kpis.totalEndpoints}</div>
            </div>
          </div>
          
          <div class="kpi-card">
            <div class="kpi-card-header">
              <div class="kpi-card-icon critical">🦠</div>
            </div>
            <div class="kpi-card-body">
              <div class="kpi-card-label">Threats Detected</div>
              <div class="kpi-card-value">${data.kpis.threatsDetected}</div>
            </div>
          </div>
          
          <div class="kpi-card">
            <div class="kpi-card-header">
              <div class="kpi-card-icon warning">🔒</div>
            </div>
            <div class="kpi-card-body">
              <div class="kpi-card-label">Quarantined Files</div>
              <div class="kpi-card-value">${data.kpis.quarantinedFiles}</div>
            </div>
          </div>
          
          <div class="kpi-card">
            <div class="kpi-card-header">
              <div class="kpi-card-icon ${data.kpis.activeThreats > 0 ? 'critical' : 'success'}">
                ${data.kpis.activeThreats > 0 ? '⚡' : '✓'}
              </div>
            </div>
            <div class="kpi-card-body">
              <div class="kpi-card-label">Active Threats</div>
              <div class="kpi-card-value">${data.kpis.activeThreats}</div>
            </div>
          </div>
        </div>
        
        <div class="chart-grid">
          <div class="chart-container">
            <div class="chart-header">
              <h3 class="chart-title">Threat Detection Timeline</h3>
            </div>
            <canvas id="edrTimelineChart" class="chart-canvas"></canvas>
          </div>
          
          <div class="chart-container">
            <div class="chart-header">
              <h3 class="chart-title">Top Affected Hosts</h3>
            </div>
            <div class="card-body p-md">
              ${data.affectedHosts.map(host => `
                <div class="communicator-item">
                  <span class="communicator-ip">${host.hostname}</span>
                  <span class="communicator-count">
                    <span class="communicator-badge">${host.threatCount}</span>
                    threats
                  </span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        
        <div class="full-width-section">
          <div class="data-table-container">
            <div class="card-header">
              <h3 class="card-title">EDR Events</h3>
            </div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Host</th>
                  <th>Event Type</th>
                  <th>Severity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${data.events.slice(0, 20).map(event => `
                  <tr>
                    <td class="timestamp">${event.timestamp}</td>
                    <td class="hostname">${event.host}</td>
                    <td>${event.ruleName}</td>
                    <td><span class="badge badge-${event.severity.toLowerCase()}">${event.severity}</span></td>
                    <td><span class="badge badge-warning">Investigating</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

        setTimeout(() => {
            chartManager.renderEventTimeline('edrTimelineChart');
        }, 100);
    }

    /**
     * Load Unified Timeline page
     */
    loadUnifiedTimeline() {
        const events = mockData.generateTimelineEvents(50);

        this.mainContent.innerHTML = `
      <div class="timeline-page animate-fadeIn">
        <div class="dashboard-header">
          <h1 class="dashboard-title">Unified Timeline</h1>
          <p class="dashboard-subtitle">Comprehensive event timeline across all data sources</p>
        </div>
        
        <div class="timeline-visualization">
          <canvas id="unifiedTimelineChart" class="chart-canvas"></canvas>
        </div>
        
        <div class="timeline-events-list">
          ${events.slice(0, 30).map(event => `
            <div class="timeline-event ${event.severity.toLowerCase()}">
              <div class="timeline-event-time">${event.timestamp}</div>
              <div class="timeline-event-content">
                <div class="timeline-event-header">
                  <span class="timeline-event-source">${event.source}</span>
                  <span class="badge badge-${event.severity.toLowerCase()}">${event.severity}</span>
                  <span class="timeline-event-title">${event.ruleName}</span>
                </div>
                <div class="timeline-event-details">
                  <div class="timeline-event-detail">
                    <span class="timeline-event-detail-label">Host:</span>
                    <span class="timeline-event-detail-value">${event.host}</span>
                  </div>
                  <div class="timeline-event-detail">
                    <span class="timeline-event-detail-label">Source IP:</span>
                    <span class="timeline-event-detail-value">${event.sourceIP}</span>
                  </div>
                  <div class="timeline-event-detail">
                    <span class="timeline-event-detail-label">Dest IP:</span>
                    <span class="timeline-event-detail-value">${event.destIP}</span>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

        setTimeout(() => {
            chartManager.renderEventTimeline('unifiedTimelineChart');
        }, 100);
    }

    /**
     * Load Host/IP Correlation page
     */
    loadHostIPCorrelation() {
        const topComms = mockData.generateTopCommunicators();
        const patterns = mockData.generateSuspiciousPatterns();
        const events = mockData.generateRecentAlerts(20);

        this.mainContent.innerHTML = `
      <div class="correlation-page animate-fadeIn">
        <div class="dashboard-header">
          <h1 class="dashboard-title">Host / IP Correlation</h1>
          <p class="dashboard-subtitle">Network relationship analysis and threat hunting</p>
        </div>
        
        <div class="correlation-layout">
          <div class="correlation-graph-section">
            <div class="graph-container">
              <div id="correlationGraph" class="graph-canvas"></div>
              <div class="graph-legend">
                <div class="legend-item">
                  <div class="legend-color" style="background-color: #3b82f6;"></div>
                  <span>Hosts</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color" style="background-color: #eab308;"></div>
                  <span>Source IPs</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color" style="background-color: #22c55e;"></div>
                  <span>Dest IPs</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color" style="background-color: #ef4444;"></div>
                  <span>Suspicious</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="correlation-sidebar">
            <div class="top-communicators">
              <h3 class="card-title mb-md">Top Communicating IPs</h3>
              <div class="top-communicators-list">
                ${topComms.map(comm => `
                  <div class="communicator-item ${comm.suspicious ? 'suspicious' : ''}">
                    <span class="communicator-ip">${comm.ip}</span>
                    <span class="communicator-count">
                      <span class="communicator-badge">${comm.connections}</span>
                      connections
                    </span>
                  </div>
                `).join('')}
              </div>
            </div>
            
            ${patterns.length > 0 ? `
              <div class="suspicious-patterns">
                <h3 class="card-title mb-md">Suspicious Patterns</h3>
                ${patterns.map(pattern => `
                  <div class="suspicious-pattern-item">
                    <div class="suspicious-pattern-icon">⚠️</div>
                    <div class="suspicious-pattern-content">
                      <div class="suspicious-pattern-title">${pattern.title}</div>
                      <div class="suspicious-pattern-description">${pattern.description}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
        
        <div class="full-width-section">
          <div class="data-table-container">
            <div class="card-header">
              <h3 class="card-title">Correlated Events</h3>
            </div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Source</th>
                  <th>Host</th>
                  <th>Source IP</th>
                  <th>Dest IP</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody>
                ${events.map(event => `
                  <tr>
                    <td class="timestamp">${event.timestamp}</td>
                    <td><span class="badge badge-info">${event.source}</span></td>
                    <td class="hostname">${event.host}</td>
                    <td class="ip-address">${event.sourceIP}</td>
                    <td class="ip-address">${event.destIP}</td>
                    <td><span class="badge badge-${event.severity.toLowerCase()}">${event.severity}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

        setTimeout(() => {
            initCorrelationGraph('correlationGraph');
        }, 100);
    }

    /**
     * Load Reports page
     */
    loadReports() {
        this.mainContent.innerHTML = `
      <div class="animate-fadeIn">
        <div class="dashboard-header">
          <h1 class="dashboard-title">Reports</h1>
          <p class="dashboard-subtitle">Generate and view security reports</p>
        </div>
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <div class="empty-state-title">Reports Module</div>
          <div class="empty-state-description">Report generation functionality coming soon</div>
        </div>
      </div>
    `;
    }

    /**
     * Load Settings page
     */
    loadSettings() {
        this.mainContent.innerHTML = `
      <div class="animate-fadeIn">
        <div class="dashboard-header">
          <h1 class="dashboard-title">Settings</h1>
          <p class="dashboard-subtitle">Configure dashboard preferences</p>
        </div>
        <div class="empty-state">
          <div class="empty-state-icon">⚙️</div>
          <div class="empty-state-title">Settings Module</div>
          <div class="empty-state-description">Configuration options coming soon</div>
        </div>
      </div>
    `;
    }
}

// Initialize the application
const app = new SOCDashboardApp();
