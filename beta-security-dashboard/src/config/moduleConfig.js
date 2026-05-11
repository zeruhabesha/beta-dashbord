import {
    Home, Compass, Shield, Activity, Cloud, Database,
    Settings, ChevronDown, ChevronRight, FileText,
    Map as MapIcon, Bell, Target, Lock, Server,
    Code, CreditCard, Eye, LayoutDashboard, Zap, Monitor, Network,
    Globe, AlertTriangle, Terminal, ShieldAlert,
    GitBranch, BarChart2, Layers, Cpu, Wifi, Search, CheckCircle
} from 'lucide-react';

export const MODULE_CONFIG = {
    siem: {
        id: 'siem',
        title: 'SIEM Operations',
        defaultView: 'home',
        menuStructure: [
            {
                category: "Main",
                hideLabel: true,
                items: [
                    { id: 'home', label: 'Home', icon: Home },
                    { id: 'overview', label: 'SIEM Overview', icon: Home },
                    { id: 'live-alerts', label: 'Live Alerts', icon: Bell },
                ]
            },
            {
                category: "Explore",
                items: [
                    { id: 'discover', label: 'Discover', icon: Compass },
                    { id: 'dashboards', label: 'Dashboards', icon: LayoutDashboard },
                    { id: 'visualize', label: 'Visualize', icon: Activity },
                    { id: 'reporting', label: 'Reporting', icon: FileText },
                    { id: 'alerting', label: 'Alerting', icon: Bell },
                    { id: 'anomaly', label: 'Anomaly Detection', icon: Target },
                    { id: 'maps', label: 'Maps', icon: MapIcon },
                ]
            },
            {
                category: "Endpoint Security",
                items: [
                    { id: 'config-assessment', label: 'Config Assessment', icon: Settings },
                    { id: 'malware', label: 'Malware Detection', icon: ShieldAlert },
                    { id: 'fim', label: 'File Integrity', icon: FileText },
                ]
            },
            {
                category: "Threat Intelligence",
                items: [
                    { id: 'hunting', label: 'Threat Hunting', icon: Target },
                    { id: 'vuln-detect', label: 'Vuln Detection', icon: Eye },
                    { id: 'mitre', label: 'MITRE ATT&CK', icon: Shield },
                ]
            },
            {
                category: "Security Operations",
                items: [
                    { id: 'hygiene', label: 'IT Hygiene', icon: Activity },
                    { id: 'pci', label: 'PCI DSS', icon: CreditCard },
                    { id: 'gdpr', label: 'GDPR', icon: Lock },
                    { id: 'hipaa', label: 'HIPAA', icon: FileText },
                    { id: 'nist', label: 'NIST 800-53', icon: FileText },
                ]
            },
            {
                category: "Cloud Security",
                items: [
                    { id: 'docker', label: 'Docker', icon: Code },
                    { id: 'aws', label: 'AWS Security', icon: Cloud },
                    { id: 'gcp', label: 'Google Cloud', icon: Cloud },
                    { id: 'azure', label: 'Azure / M365', icon: Cloud },
                ]
            },
            {
                category: "Server Management",
                items: [
                    { id: 'rules', label: 'Ruleset', icon: FileText },
                    { id: 'decoders', label: 'Decoders', icon: Code },
                    { id: 'logs', label: 'System Logs', icon: Terminal },
                ]
            }
        ]
    },
    ids: {
        id: 'ids',
        title: 'IDS / IPS Analysis',
        defaultView: 'home',
        menuStructure: [
            {
                category: "Main",
                hideLabel: true,
                items: [
                    { id: 'home', label: 'Home', icon: Home },
                    { id: 'traffic', label: 'Traffic Overview', icon: Activity },
                ]
            },
            {
                category: "Threat Monitoring",
                items: [
                    { id: 'blocked', label: 'Blocked Threats', icon: Lock },
                    { id: 'ids-alerts', label: 'Intrusion Alerts', icon: ShieldAlert },
                    { id: 'signatures', label: 'Signatures', icon: Code },
                ]
            },
            {
                category: "Management",
                items: [
                    { id: 'tenants', label: 'Tenant Management', icon: Server },
                ]
            },
            {
                category: "Analysis Tools",
                items: [
                    { id: 'discover', label: 'Packet Check (Discover)', icon: Compass },
                    { id: 'maps', label: 'Geo Attack Map', icon: MapIcon },
                    { id: 'flows', label: 'Network Flows', icon: Network },
                ]
            }
        ]
    },
    edr: {
        id: 'edr',
        title: 'EDR Analysis',
        defaultView: 'home',
        menuStructure: [
            {
                category: "Main",
                hideLabel: true,
                items: [
                    { id: 'home', label: 'Home', icon: Home },
                    { id: 'endpoints', label: 'Endpoint Status', icon: Server },
                ]
            },
            {
                category: "Response",
                items: [
                    { id: 'active-threats', label: 'Active Threats', icon: Zap },
                    { id: 'isolation', label: 'Host Isolation', icon: Monitor },
                    { id: 'contained-threats', label: 'Contained Threats', icon: Shield },
                    { id: 'response-dashboard', label: 'Response Dashboard', icon: LayoutDashboard },
                    { id: 'response-center', label: 'Response Center', icon: Bell },
                    { id: 'execution-control', label: 'Execution Control', icon: Terminal },
                    { id: 'manual-operations', label: 'Manual Operations', icon: Eye },
                    { id: 'approvals', label: 'Approval Queue', icon: Eye },
                    { id: 'soc-override', label: 'SOC Override', icon: Lock },
                    { id: 'rollback', label: 'Rollback Actions', icon: GitBranch },
                    { id: 'response-metrics', label: 'Response Metrics', icon: BarChart2 },
                    { id: 'malware', label: 'Malware Analysis', icon: ShieldAlert },
                ]
            },
            {
                category: "Automation",
                items: [
                    { id: 'playbook-automation', label: 'Playbook Automation', icon: ShieldAlert },
                    { id: 'playbook-orchestration', label: 'Playbook Flow', icon: GitBranch },
                    { id: 'playbook-templates', label: 'Playbook Templates', icon: LayoutDashboard },
                    { id: 'detection-pipeline', label: 'Detection Pipeline', icon: Terminal },
                    { id: 'graduated-response', label: 'Graduated Response', icon: BarChart2 },
                ]
            },
            {
                category: "Governance",
                items: [
                    { id: 'safety-checks', label: 'Safety Checks', icon: Shield },
                    { id: 'rate-limits', label: 'Rate Limits', icon: Activity },
                    { id: 'audit-trail', label: 'Audit Trail', icon: FileText },
                    { id: 'audit-compliance', label: 'Audit Compliance', icon: CreditCard },
                ]
            },
            {
                category: "Telemetry",
                items: [
                    { id: 'collected-artifacts', label: 'Collected Artifacts', icon: Database },
                    { id: 'forensic-storage', label: 'Forensic Storage', icon: Database },
                    { id: 'forensic-retention', label: 'Forensic Retention', icon: Database },
                    { id: 'enhanced-forensics', label: 'Enhanced Forensics', icon: Search },
                    { id: 'client-events', label: 'Client Events', icon: Activity },
                    { id: 'server-events', label: 'Server Events', icon: Server },
                ]
            },
            {
                category: "Forensics",
                items: [
                    { id: 'process-tree', label: 'Process Tree', icon: Activity },
                    { id: 'hash-intelligence', label: 'Hash Intelligence', icon: Database },
                    { id: 'file-integrity', label: 'File Integrity', icon: FileText },
                    { id: 'hunting', label: 'Threat Hunting', icon: Target },
                    { id: 'threat-hunting', label: 'Hunt Campaigns', icon: Target },
                ]
            },
            {
                category: "Platform",
                items: [
                    { id: 'integrations', label: 'Integrations', icon: Globe },
                    { id: 'performance', label: 'Performance', icon: Cpu },
                    { id: 'reliability', label: 'Reliability', icon: Wifi },
                    { id: 'config-management', label: 'Configuration', icon: Settings },
                    { id: 'testing-validation', label: 'Testing', icon: CheckCircle },
                ]
            }
        ]
    },
    unified: {
        id: 'unified',
        title: 'Unified Security Operations Center',
        defaultView: 'home',
        menuStructure: [
            {
                category: "Main",
                hideLabel: true,
                items: [
                    { id: 'home', label: 'Unified Dashboard', icon: Home },
                    { id: 'dashboards', label: 'Dashboard List', icon: LayoutDashboard },
                    { id: 'overview', label: 'Security Overview', icon: LayoutDashboard },
                ]
            },
            {
                category: "Explore",
                items: [
                    { id: 'discover', label: 'Discover', icon: Compass },
                    { id: 'dashboards', label: 'Dashboards', icon: LayoutDashboard },
                    { id: 'visualize', label: 'Visualize', icon: Activity },
                    { id: 'reporting', label: 'Reporting', icon: FileText },
                    { id: 'alerting', label: 'Alerting', icon: Bell },
                ]
            },
            {
                category: "Security Operations",
                items: [
                    { id: 'siem-events', label: 'Security Events', icon: ShieldAlert },
                    { id: 'malware', label: 'Malware Detection', icon: AlertTriangle },
                    { id: 'mitre', label: 'MITRE ATT&CK', icon: Shield },
                    { id: 'ids-alerts', label: 'Intrusion Alerts', icon: Bell },
                    { id: 'blocked', label: 'Blocked Threats', icon: Lock },
                    { id: 'maps', label: 'Geo Attack Map', icon: MapIcon },
                    { id: 'endpoints', label: 'Endpoint Status', icon: Server },
                    { id: 'active-threats', label: 'Active Threats', icon: Zap },
                    { id: 'isolation', label: 'Host Isolation', icon: Monitor },
                    { id: 'containment-response', label: 'Containment & Response', icon: Shield },
                    { id: 'response-dashboard', label: 'Response Dashboard', icon: LayoutDashboard },
                    { id: 'execution-control', label: 'Execution Control', icon: Terminal },
                    { id: 'manual-operations', label: 'Manual Operations', icon: Eye },
                    { id: 'response-governance', label: 'Response Governance', icon: BarChart2 },
                    { id: 'response-metrics', label: 'Response Metrics', icon: BarChart2 },
                    { id: 'automation-ops', label: 'Automation Ops', icon: Bell },
                    { id: 'playbook-ops', label: 'Playbook Ops', icon: GitBranch },
                    { id: 'approvals', label: 'Approval Queue', icon: Eye },
                    { id: 'safety-checks', label: 'Safety Checks', icon: Shield },
                    { id: 'rate-limits', label: 'Rate Limits', icon: Activity },
                    { id: 'soc-override', label: 'SOC Override', icon: Lock },
                    { id: 'rollback', label: 'Rollback Actions', icon: GitBranch },
                    { id: 'detection-health', label: 'Detection Health', icon: Terminal },
                    { id: 'collected-artifacts', label: 'Collected Artifacts', icon: Database },
                    { id: 'forensic-storage', label: 'Forensic Storage', icon: Database },
                    { id: 'forensic-retention', label: 'Forensic Retention', icon: Database },
                    { id: 'enhanced-forensics', label: 'Enhanced Forensics', icon: Search },
                    { id: 'client-events', label: 'Client Events', icon: Activity },
                    { id: 'server-events', label: 'Server Events', icon: Server },
                    { id: 'incident-timeline', label: 'Incident Timeline', icon: Activity },
                    { id: 'hunting', label: 'Threat Hunting', icon: Target },
                    { id: 'threat-hunting', label: 'Hunt Campaigns', icon: Target },
                    { id: 'audit-trail', label: 'Audit Trail', icon: FileText },
                    { id: 'audit-compliance', label: 'Audit Compliance', icon: CreditCard },
                    { id: 'integrations', label: 'Integrations', icon: Globe },
                    { id: 'performance', label: 'Performance', icon: Cpu },
                    { id: 'reliability', label: 'Reliability', icon: Wifi },
                    { id: 'config-management', label: 'Configuration', icon: Settings },
                    { id: 'testing-validation', label: 'Testing', icon: CheckCircle },
                    { id: 'pci', label: 'PCI DSS', icon: CreditCard },
                    { id: 'gdpr', label: 'GDPR', icon: Lock },
                ]
            }
        ]
    },
    observability: {
        id: 'observability',
        title: 'Observability',
        defaultView: 'home',
        menuStructure: [
            {
                category: "Main",
                hideLabel: true,
                items: [
                    { id: 'home', label: 'OTel Overview', icon: Home },
                    { id: 'cluster-health', label: 'Cluster Health', icon: Wifi },
                ]
            },
            {
                category: "Signals",
                items: [
                    { id: 'logs', label: 'Live Logs', icon: Layers },
                    { id: 'traces', label: 'Distributed Traces', icon: GitBranch },
                    { id: 'service-map', label: 'Service Map', icon: Globe },
                ]
            },
            {
                category: "Metrics",
                items: [
                    { id: 'metrics', label: 'Metrics Explorer', icon: BarChart2 },
                    { id: 'resources', label: 'Resource Usage', icon: Cpu },
                ]
            },
            {
                category: "Explore",
                items: [
                    { id: 'discover', label: 'Discover', icon: Compass },
                    { id: 'dashboards', label: 'Dashboards', icon: LayoutDashboard },
                ]
            },
            {
                category: "Administration",
                items: [
                    { id: 'indices', label: 'Index Overview', icon: Database },
                    { id: 'tenants', label: 'Tenant Management', icon: Server },
                ]
            }
        ]
    }
};
