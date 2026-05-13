import React, { useState, useEffect } from 'react';
import {
    Shield, Activity, Lock, Globe, Server, AlertTriangle,
    CheckCircle, BarChart2, Zap, Wifi
} from 'lucide-react';
import { fetchAggregatedCounts, fetchVolumeOverTime } from '../../api/opensearch';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';

// Reusable Card Component
const StatCard = ({ title, value, subtext, icon: Icon, color, trend }) => (
    <div className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 transition-colors duration-300 hover:border-neutral-950/20 dark:border-white/10 dark:bg-black">
        <div className="absolute top-0 right-0 p-3 text-neutral-950 opacity-5 transition-opacity group-hover:opacity-10 dark:text-white">
            <Icon size={80} />
        </div>
        <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-4">
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-neutral-950 dark:border-white/10 dark:bg-white/10 dark:text-white">
                    <Icon size={24} />
                </div>
                {trend && (
                    <span className="rounded-full border border-neutral-200 bg-white px-2 py-1 text-xs font-semibold text-neutral-950 dark:border-white/10 dark:bg-black dark:text-white">
                        {trend > 0 ? '+' : ''}{trend}%
                    </span>
                )}
            </div>
            <div>
                <h3 className="text-neutral-500 dark:text-neutral-400 text-sm font-medium uppercase tracking-wider mb-1">{title}</h3>
                <div className="text-3xl font-bold text-neutral-950 dark:text-white mb-2">{value}</div>
                {subtext && <p className="text-xs text-neutral-400 dark:text-neutral-500">{subtext}</p>}
            </div>
        </div>
    </div>
);

export function SecurityOverview() {
    const [stats, setStats] = useState({
        scanned: 0,
        threats: 0,
        blocked: 0,
        active_agents: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mock data loading or fetch from API
        const loadData = async () => {
            // simulating fetch
            await new Promise(r => setTimeout(r, 1000));
            setStats({
                scanned: '2.4M',
                threats: 142,
                blocked: '99.9%',
                active_agents: 485
            });
            setLoading(false);
        };
        loadData();
    }, []);

    if (loading) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center bg-neutral-50 dark:bg-black">
                <div className="relative">
                    {/* Animated rings */}
                    <div className="absolute inset-0 animate-ping rounded-full border-4 border-neutral-950/10 dark:border-white/10"></div>
                    <div className="absolute inset-0 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-950 dark:border-neutral-800 dark:border-t-white"></div>

                    {/* BETA Logo/Text */}
                    <div className="relative w-20 h-20 flex items-center justify-center">
                        <div className="text-2xl font-black text-neutral-950 dark:text-white">
                            BETA
                        </div>
                    </div>
                </div>

                {/* Loading text */}
                <div className="mt-6 text-center">
                    <p className="text-neutral-600 dark:text-neutral-400 font-semibold text-sm mb-1">
                        Loading Security Dashboard
                    </p>
                    <div className="flex items-center justify-center gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-950 dark:bg-white" style={{ animationDelay: '0ms' }}></span>
                        <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-500" style={{ animationDelay: '150ms' }}></span>
                        <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-300 dark:bg-neutral-700" style={{ animationDelay: '300ms' }}></span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full overflow-y-auto bg-neutral-50 p-8 font-sans text-neutral-950 custom-scrollbar dark:bg-black dark:text-white">

            {/* Header Section */}
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-950 dark:text-white">
                        Security Posture Overview
                    </h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-2">
                        Real-time visualization of your security infrastructure and active threats.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-1.5 text-sm font-medium text-success">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
                        System Healthy
                    </span>
                    <Button variant="outline">
                        Download Report
                    </Button>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Events Scanned"
                    value={stats.scanned}
                    subtext="Last 24 hours"
                    icon={Activity}
                    color="text-neutral-950"
                    trend={12}
                />
                <StatCard
                    title="Active Threats"
                    value={stats.threats}
                    subtext="Requires attention"
                    icon={AlertTriangle}
                    color="text-neutral-950"
                    trend={-5}
                />
                <StatCard
                    title="Threats Blocked"
                    value={stats.blocked}
                    subtext="Auto-mitigation rate"
                    icon={Shield}
                    color="text-neutral-950"
                    trend={0.2}
                />
                <StatCard
                    title="Active Agents"
                    value={stats.active_agents}
                    subtext="98% coverage"
                    icon={Server}
                    color="text-neutral-950"
                    trend={2}
                />
            </div>

            {/* Dashboard Content - Two Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

                {/* Main Chart Area */}
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-white/10 dark:bg-black lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <BarChart2 size={20} className="text-neutral-950 dark:text-white" />
                            Threat Detection Volume
                        </h2>
                        <Select defaultValue="24h">
                            <SelectTrigger className="w-[150px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem value="24h">Last 24 Hours</SelectItem>
                                    <SelectItem value="7d">Last 7 Days</SelectItem>
                                    <SelectItem value="30d">Last 30 Days</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                    {/* Placeholder for Chart - In a real app use Recharts/Victory */}
                    <div className="h-64 flex items-end justify-between gap-2 px-2">
                        {[40, 65, 45, 80, 55, 70, 40, 60, 85, 50, 45, 75].map((h, i) => (
                            <div key={i} className="group relative w-full rounded-t-sm bg-neutral-100 transition-all duration-300 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800" style={{ height: `${h}%` }}>
                                <div className="absolute bottom-0 w-full rounded-t-sm bg-neutral-950 transition-all duration-500 dark:bg-white" style={{ height: `${h * 0.4}%` }}></div>
                                <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 rounded bg-black px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-white dark:text-black">
                                    {Math.floor(h * 12)} events
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Status List */}
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-white/10 dark:bg-black">
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
                        <Wifi size={20} className="text-neutral-950 dark:text-white" />
                        System Health
                    </h2>
                    <div className="space-y-4">
                        {[
                            { name: 'SIEM Engine', status: 'Optimal', color: 'bg-success' },
                            { name: 'IDS Sensors', status: 'Optimal', color: 'bg-success' },
                            { name: 'EDR Agents', status: 'Warning', color: 'bg-destructive', sub: '3 agents offline' },
                            { name: 'Log Ingestion', status: 'Optimal', color: 'bg-success' },
                            { name: 'Threat Intel Feed', status: 'Syncing', color: 'bg-neutral-400', animate: true },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-white/5 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2.5 h-2.5 rounded-full ${item.color} ${item.animate ? 'animate-pulse' : ''}`} />
                                    <div>
                                        <div className="text-sm font-medium">{item.name}</div>
                                        {item.sub && <div className="text-xs text-neutral-400">{item.sub}</div>}
                                    </div>
                                </div>
                                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{item.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Alerts Table styled as Cards */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-white/10 dark:bg-black">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Zap size={20} className="text-neutral-950 dark:text-white" />
                        Recent Critical Alerts
                    </h2>
                    <a href="#" className="text-sm font-medium text-neutral-950 underline-offset-4 hover:underline dark:text-white">View All</a>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-xs text-neutral-400 uppercase tracking-wider border-b border-neutral-100 dark:border-white/5">
                                <th className="pb-3 pl-2 font-medium">Severity</th>
                                <th className="pb-3 font-medium">Alert Name</th>
                                <th className="pb-3 font-medium">Source</th>
                                <th className="pb-3 font-medium">Time</th>
                                <th className="pb-3 font-medium text-right pr-2">Action</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {[
                                { severity: 'Critical', name: 'Brute Force Attempt detected', source: '192.168.1.45', time: '2 mins ago', action: 'Blocked' },
                                { severity: 'High', name: 'Malware signature match (Trojan.Win32)', source: 'Workstation-04', time: '15 mins ago', action: 'Quarantined' },
                                { severity: 'Medium', name: 'Unusual outbound traffic volume', source: 'DB-Server-01', time: '1 hour ago', action: 'Investigating' },
                                { severity: 'Critical', name: 'Root privileges escalation', source: 'Web-Server-Prod', time: '3 hours ago', action: 'Alerted' },
                            ].map((alert, i) => (
                                <tr key={i} className="group border-b border-neutral-100/50 dark:border-white/5 last:border-0 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors">
                                    <td className="py-4 pl-2">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${alert.severity === 'Critical' ? 'bg-destructive text-destructive-foreground' :
                                            alert.severity === 'High' ? 'border border-destructive/30 bg-destructive/10 text-destructive' :
                                                'border border-neutral-300 bg-neutral-100 text-neutral-950 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white'
                                            }`}>
                                            {alert.severity}
                                        </span>
                                    </td>
                                    <td className="py-4 font-medium">{alert.name}</td>
                                    <td className="py-4 text-neutral-500 dark:text-neutral-400 font-mono text-xs">{alert.source}</td>
                                    <td className="py-4 text-neutral-500 dark:text-neutral-400">{alert.time}</td>
                                    <td className="py-4 text-right pr-2">
                                        <button className="text-xs font-medium text-neutral-950 underline-offset-4 hover:underline dark:text-white">
                                            Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
