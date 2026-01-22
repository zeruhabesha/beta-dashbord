// ============================================
// SOC DASHBOARD - MOCK DATA GENERATOR
// Realistic security event data for demonstration
// ============================================

/**
 * Mock Data Generator for SOC Dashboard
 * Generates realistic security events, alerts, and metrics
 */
class MockDataGenerator {
  constructor() {
    this.tenants = ['Tenant_01', 'Tenant_02', 'Tenant_03', 'Tenant_04'];
    this.currentTenant = 'Tenant_01';
    this.timeRange = '24h';
    
    this.severities = ['Critical', 'High', 'Medium', 'Low'];
    this.sources = ['SIEM', 'IDS', 'EDR'];
    
    this.hostnames = [
      'web-server-01', 'web-server-02', 'db-server-01', 'db-server-02',
      'app-server-01', 'app-server-02', 'mail-server-01', 'file-server-01',
      'workstation-01', 'workstation-02', 'workstation-03', 'workstation-04'
    ];
    
    this.ipAddresses = [
      '192.168.1.10', '192.168.1.11', '192.168.1.20', '192.168.1.21',
      '10.0.0.50', '10.0.0.51', '10.0.0.100', '10.0.0.101',
      '172.16.0.10', '172.16.0.11', '172.16.0.20', '172.16.0.21'
    ];
    
    this.externalIPs = [
      '203.0.113.45', '198.51.100.23', '192.0.2.156', '203.0.113.89',
      '198.51.100.67', '192.0.2.234', '203.0.113.12', '198.51.100.145'
    ];
    
    this.siemRules = [
      'Multiple Failed Login Attempts',
      'Suspicious PowerShell Execution',
      'Unauthorized Access Attempt',
      'Privilege Escalation Detected',
      'Data Exfiltration Attempt',
      'Brute Force Attack Detected',
      'Malware Signature Match',
      'Suspicious Network Traffic'
    ];
    
    this.idsSignatures = [
      'SQL Injection Attempt',
      'Cross-Site Scripting (XSS)',
      'Port Scan Detected',
      'DDoS Attack Pattern',
      'Malicious Payload Detected',
      'Command Injection Attempt',
      'Buffer Overflow Attempt',
      'Suspicious File Upload'
    ];
    
    this.edrEvents = [
      'Ransomware Behavior Detected',
      'Suspicious Process Creation',
      'Registry Modification',
      'Credential Dumping Attempt',
      'Lateral Movement Detected',
      'Persistence Mechanism Created',
      'Suspicious DLL Injection',
      'File Encryption Activity'
    ];
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
   * Get random element from array
   */
  randomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
  }
  
  /**
   * Get random integer between min and max
   */
  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  /**
   * Generate timestamp within time range
   */
  generateTimestamp() {
    const now = new Date();
    const ranges = {
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };
    
    const range = ranges[this.timeRange] || ranges['24h'];
    const offset = Math.random() * range;
    return new Date(now - offset);
  }
  
  /**
   * Format timestamp
   */
  formatTimestamp(date) {
    return date.toISOString().replace('T', ' ').substring(0, 19);
  }
  
  /**
   * Generate KPI metrics for unified dashboard
   */
  generateUnifiedKPIs() {
    const multiplier = this.timeRange === '15m' ? 1 : 
                       this.timeRange === '1h' ? 4 : 
                       this.timeRange === '24h' ? 96 : 672;
    
    return {
      totalEvents: this.randomInt(5000, 15000) * multiplier,
      criticalAlerts: this.randomInt(5, 25) * multiplier,
      activeHosts: this.randomInt(8, 12),
      dataSources: {
        siem: Math.random() > 0.1,
        ids: Math.random() > 0.05,
        edr: Math.random() > 0.15
      }
    };
  }
  
  /**
   * Generate event timeline data
   */
  generateEventTimeline() {
    const points = this.timeRange === '15m' ? 15 : 
                   this.timeRange === '1h' ? 12 : 
                   this.timeRange === '24h' ? 24 : 7;
    
    const data = {
      labels: [],
      datasets: [
        {
          label: 'SIEM Events',
          data: [],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4
        },
        {
          label: 'IDS Events',
          data: [],
          borderColor: '#eab308',
          backgroundColor: 'rgba(234, 179, 8, 0.1)',
          tension: 0.4
        },
        {
          label: 'EDR Events',
          data: [],
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4
        }
      ]
    };
    
    for (let i = 0; i < points; i++) {
      if (this.timeRange === '7d') {
        data.labels.push(`Day ${i + 1}`);
      } else if (this.timeRange === '24h') {
        data.labels.push(`${i}:00`);
      } else {
        data.labels.push(`${i * (this.timeRange === '1h' ? 5 : 1)}m`);
      }
      
      data.datasets[0].data.push(this.randomInt(100, 500));
      data.datasets[1].data.push(this.randomInt(50, 300));
      data.datasets[2].data.push(this.randomInt(75, 400));
    }
    
    return data;
  }
  
  /**
   * Generate severity distribution
   */
  generateSeverityDistribution() {
    return {
      labels: ['Critical', 'High', 'Medium', 'Low'],
      datasets: [{
        data: [
          this.randomInt(5, 15),
          this.randomInt(15, 35),
          this.randomInt(30, 50),
          this.randomInt(40, 60)
        ],
        backgroundColor: [
          '#ef4444',
          '#f97316',
          '#eab308',
          '#22c55e'
        ],
        borderWidth: 0
      }]
    };
  }
  
  /**
   * Generate top triggered rules
   */
  generateTopRules() {
    const rules = [...this.siemRules, ...this.idsSignatures, ...this.edrEvents];
    const selectedRules = [];
    const counts = [];
    
    for (let i = 0; i < 10; i++) {
      selectedRules.push(this.randomElement(rules));
      counts.push(this.randomInt(10, 100));
    }
    
    return {
      labels: selectedRules,
      datasets: [{
        label: 'Trigger Count',
        data: counts,
        backgroundColor: '#3b82f6',
        borderColor: '#2563eb',
        borderWidth: 1
      }]
    };
  }
  
  /**
   * Generate recent alerts
   */
  generateRecentAlerts(count = 50) {
    const alerts = [];
    
    for (let i = 0; i < count; i++) {
      const source = this.randomElement(this.sources);
      let ruleName;
      
      if (source === 'SIEM') {
        ruleName = this.randomElement(this.siemRules);
      } else if (source === 'IDS') {
        ruleName = this.randomElement(this.idsSignatures);
      } else {
        ruleName = this.randomElement(this.edrEvents);
      }
      
      const severity = this.randomElement(this.severities);
      const timestamp = this.generateTimestamp();
      
      alerts.push({
        id: `alert-${i + 1}`,
        timestamp: this.formatTimestamp(timestamp),
        source: source,
        host: this.randomElement(this.hostnames),
        ruleName: ruleName,
        severity: severity,
        sourceIP: this.randomElement(this.ipAddresses),
        destIP: Math.random() > 0.5 ? this.randomElement(this.externalIPs) : this.randomElement(this.ipAddresses),
        rawTimestamp: timestamp
      });
    }
    
    // Sort by timestamp descending
    alerts.sort((a, b) => b.rawTimestamp - a.rawTimestamp);
    
    return alerts;
  }
  
  /**
   * Generate SIEM-specific data
   */
  generateSIEMData() {
    return {
      kpis: {
        totalAlerts: this.randomInt(500, 2000),
        criticalAlerts: this.randomInt(10, 50),
        highAlerts: this.randomInt(50, 150),
        investigatedAlerts: this.randomInt(200, 800)
      },
      alerts: this.generateRecentAlerts(100).filter(a => a.source === 'SIEM')
    };
  }
  
  /**
   * Generate IDS/IPS data
   */
  generateIDSData() {
    return {
      kpis: {
        totalEvents: this.randomInt(10000, 50000),
        blockedAttempts: this.randomInt(500, 2000),
        uniqueIPs: this.randomInt(100, 500),
        topSignature: this.randomElement(this.idsSignatures)
      },
      blockedIPs: this.externalIPs.slice(0, 10).map(ip => ({
        ip: ip,
        count: this.randomInt(10, 200),
        lastSeen: this.formatTimestamp(this.generateTimestamp())
      })),
      events: this.generateRecentAlerts(100).filter(a => a.source === 'IDS')
    };
  }
  
  /**
   * Generate EDR data
   */
  generateEDRData() {
    return {
      kpis: {
        totalEndpoints: this.hostnames.length,
        threatsDetected: this.randomInt(20, 100),
        quarantinedFiles: this.randomInt(10, 50),
        activeThreats: this.randomInt(0, 5)
      },
      affectedHosts: this.hostnames.slice(0, 8).map(host => ({
        hostname: host,
        threatCount: this.randomInt(1, 15),
        lastActivity: this.formatTimestamp(this.generateTimestamp())
      })),
      events: this.generateRecentAlerts(100).filter(a => a.source === 'EDR')
    };
  }
  
  /**
   * Generate timeline events
   */
  generateTimelineEvents(count = 100) {
    return this.generateRecentAlerts(count);
  }
  
  /**
   * Generate correlation graph data
   */
  generateCorrelationGraph() {
    const nodes = [];
    const links = [];
    let nodeId = 0;
    
    // Add host nodes
    this.hostnames.forEach(host => {
      nodes.push({
        id: nodeId++,
        name: host,
        type: 'host',
        group: 1
      });
    });
    
    // Add source IP nodes
    this.ipAddresses.forEach(ip => {
      nodes.push({
        id: nodeId++,
        name: ip,
        type: 'source-ip',
        group: 2
      });
    });
    
    // Add destination IP nodes
    this.externalIPs.slice(0, 6).forEach(ip => {
      nodes.push({
        id: nodeId++,
        name: ip,
        type: 'dest-ip',
        group: 3,
        suspicious: Math.random() > 0.7
      });
    });
    
    // Generate random connections
    const hostNodes = nodes.filter(n => n.type === 'host');
    const sourceIPNodes = nodes.filter(n => n.type === 'source-ip');
    const destIPNodes = nodes.filter(n => n.type === 'dest-ip');
    
    // Connect hosts to source IPs
    hostNodes.forEach(host => {
      const numConnections = this.randomInt(1, 3);
      for (let i = 0; i < numConnections; i++) {
        const sourceIP = this.randomElement(sourceIPNodes);
        links.push({
          source: host.id,
          target: sourceIP.id,
          value: this.randomInt(5, 50)
        });
      }
    });
    
    // Connect source IPs to dest IPs
    sourceIPNodes.forEach(sourceIP => {
      const numConnections = this.randomInt(1, 2);
      for (let i = 0; i < numConnections; i++) {
        const destIP = this.randomElement(destIPNodes);
        links.push({
          source: sourceIP.id,
          target: destIP.id,
          value: this.randomInt(10, 100),
          suspicious: destIP.suspicious
        });
      }
    });
    
    return { nodes, links };
  }
  
  /**
   * Generate top communicating IPs
   */
  generateTopCommunicators() {
    return this.externalIPs.slice(0, 8).map(ip => ({
      ip: ip,
      connections: this.randomInt(50, 500),
      suspicious: Math.random() > 0.7
    })).sort((a, b) => b.connections - a.connections);
  }
  
  /**
   * Generate suspicious patterns
   */
  generateSuspiciousPatterns() {
    const patterns = [
      {
        title: 'Lateral Movement Detected',
        description: 'Multiple hosts accessed from single source in short timeframe',
        severity: 'Critical'
      },
      {
        title: 'Unusual Data Transfer Volume',
        description: 'Abnormally high data transfer to external IP',
        severity: 'High'
      },
      {
        title: 'Port Scanning Activity',
        description: 'Sequential port access from external source',
        severity: 'Medium'
      }
    ];
    
    return patterns.filter(() => Math.random() > 0.3);
  }
}

// Export for use in other modules
const mockData = new MockDataGenerator();
