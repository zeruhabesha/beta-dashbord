import {
    Home, Compass, Shield, Activity, Cloud, Database,
    Settings, ChevronDown, ChevronRight, FileText,
    Map as MapIcon, Bell, Target, Lock, Server,
    Code, CreditCard, Eye, LayoutDashboard, Zap, Monitor, Network,
    Globe, AlertTriangle, Terminal, ShieldAlert
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
                    { id: 'malware', label: 'Malware Analysis', icon: ShieldAlert },
                ]
            },
            {
                category: "Forensics",
                items: [
                    { id: 'process-tree', label: 'Process Tree', icon: Activity },
                    { id: 'file-integrity', label: 'File Integrity', icon: FileText },
                    { id: 'hunting', label: 'Threat Hunting', icon: Target },
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
                category: "SIEM Operations",
                items: [
                    { id: 'siem-events', label: 'Security Events', icon: ShieldAlert },
                    { id: 'malware', label: 'Malware Detection', icon: AlertTriangle },
                    { id: 'mitre', label: 'MITRE ATT&CK', icon: Shield },
                ]
            },
            {
                category: "Network Security (IDS/IPS)",
                items: [
                    { id: 'ids-alerts', label: 'Intrusion Alerts', icon: Bell },
                    { id: 'blocked', label: 'Blocked Threats', icon: Lock },
                    { id: 'maps', label: 'Geo Attack Map', icon: MapIcon },
                ]
            },
            {
                category: "Endpoint Security (EDR)",
                items: [
                    { id: 'endpoints', label: 'Endpoint Status', icon: Server },
                    { id: 'active-threats', label: 'Active Threats', icon: Zap },
                    { id: 'isolation', label: 'Host Isolation', icon: Monitor },
                ]
            },
            {
                category: "Compliance & Threat Intel",
                items: [
                    { id: 'hunting', label: 'Threat Hunting', icon: Target },
                    { id: 'pci', label: 'PCI DSS', icon: CreditCard },
                    { id: 'gdpr', label: 'GDPR', icon: Lock },
                ]
            }
        ]
    }
};

import { Search } from 'lucide-react';
