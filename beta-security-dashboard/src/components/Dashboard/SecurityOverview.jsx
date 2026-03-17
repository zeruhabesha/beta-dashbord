import React, { useState, useEffect } from 'react';
import {
    Shield, Activity, Lock, Globe, Server, AlertTriangle,
    CheckCircle, BarChart2, Zap, Wifi
} from 'lucide-react';
import { fetchAggregatedCounts, fetchVolumeOverTime } from '../../api/opensearch';

// Reusable Card Component
const StatCard = ({ title, value, subtext, icon: Icon, color, trend }) => (
    <div className="bg-white dark:bg-[#1e1e24] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 relative overflow-hidden group hover:shadow-md transition-all duration-300">
        <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
            <Icon size={80} />
        </div>
        <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-opacity-10 ${color} bg-current`}>
                    <Icon size={24} className={color.replace('text-', '')} />
                </div>
                {trend && (
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trend > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {trend > 0 ? '+' : ''}{trend}%
                    </span>
                )}
            </div>
            <div>
                <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">{title}</h3>
                <div className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{value}</div>
                {subtext && <p className="text-xs text-slate-400 dark:text-slate-500">{subtext}</p>}
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
            <div className="flex flex-col items-center justify-center h-full w-full bg-[#f6f8fa] dark:bg-[#09090b]">
                <div className="relative">
                    {/* Animated rings */}
                    <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-purple-500 border-b-cyan-500 border-l-indigo-500 animate-spin"></div>

                    {/* BETA Logo/Text */}
                    <div className="relative w-20 h-20 flex items-center justify-center">
                        <div className="text-2xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            BETA
                        </div>
                    </div>
                </div>

                {/* Loading text */}
                <div className="mt-6 text-center">
                    <p className="text-slate-600 dark:text-slate-400 font-semibold text-sm mb-1">
                        Loading Security Dashboard
                    </p>
                    <div className="flex items-center justify-center gap-1">
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full overflow-y-auto p-8 bg-[#f6f8fa] dark:bg-[#09090b] text-slate-900 dark:text-slate-100 font-sans custom-scrollbar">

            {/* Header Section */}
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                        Security Posture Overview
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">
                        Real-time visualization of your security infrastructure and active threats.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        System Healthy
                    </span>
                    <button className="px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-white/10 transition-colors">
                        Download Report
                    </button>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Events Scanned"
                    value={stats.scanned}
                    subtext="Last 24 hours"
                    icon={Activity}
                    color="text-blue-500"
                    trend={12}
                />
                <StatCard
                    title="Active Threats"
                    value={stats.threats}
                    subtext="Requires attention"
                    icon={AlertTriangle}
                    color="text-orange-500"
                    trend={-5}
                />
                <StatCard
                    title="Threats Blocked"
                    value={stats.blocked}
                    subtext="Auto-mitigation rate"
                    icon={Shield}
                    color="text-green-500"
                    trend={0.2}
                />
                <StatCard
                    title="Active Agents"
                    value={stats.active_agents}
                    subtext="98% coverage"
                    icon={Server}
                    color="text-purple-500"
                    trend={2}
                />
            </div>

            {/* Dashboard Content - Two Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

                {/* Main Chart Area */}
                <div className="lg:col-span-2 bg-white dark:bg-[#1e1e24] rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-white/5">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <BarChart2 size={20} className="text-blue-500" />
                            Threat Detection Volume
                        </h2>
                        <select className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm px-3 py-1 outline-none">
                            <option>Last 24 Hours</option>
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                        </select>
                    </div>
                    {/* Placeholder for Chart - In a real app use Recharts/Victory */}
                    <div className="h-64 flex items-end justify-between gap-2 px-2">
                        {[40, 65, 45, 80, 55, 70, 40, 60, 85, 50, 45, 75].map((h, i) => (
                            <div key={i} className="w-full bg-blue-500/10 hover:bg-blue-500/20 rounded-t-sm relative group transition-all duration-300" style={{ height: `${h}%` }}>
                                <div className="absolute bottom-0 w-full bg-blue-500 rounded-t-sm transition-all duration-500" style={{ height: `${h * 0.4}%` }}></div>
                                <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs py-1 px-2 rounded pointer-events-none transition-opacity">
                                    {Math.floor(h * 12)} events
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Status List */}
                <div className="bg-white dark:bg-[#1e1e24] rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-white/5">
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
                        <Wifi size={20} className="text-purple-500" />
                        System Health
                    </h2>
                    <div className="space-y-4">
                        {[
                            { name: 'SIEM Engine', status: 'Optimal', color: 'bg-green-500' },
                            { name: 'IDS Sensors', status: 'Optimal', color: 'bg-green-500' },
                            { name: 'EDR Agents', status: 'Warning', color: 'bg-yellow-500', sub: '3 agents offline' },
                            { name: 'Log Ingestion', status: 'Optimal', color: 'bg-green-500' },
                            { name: 'Threat Intel Feed', status: 'Syncing', color: 'bg-blue-500', animate: true },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2.5 h-2.5 rounded-full ${item.color} ${item.animate ? 'animate-pulse' : ''}`} />
                                    <div>
                                        <div className="text-sm font-medium">{item.name}</div>
                                        {item.sub && <div className="text-xs text-slate-400">{item.sub}</div>}
                                    </div>
                                </div>
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{item.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Alerts Table styled as Cards */}
            <div className="bg-white dark:bg-[#1e1e24] rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-white/5">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Zap size={20} className="text-orange-500" />
                        Recent Critical Alerts
                    </h2>
                    <a href="#" className="text-sm text-blue-500 hover:text-blue-400 font-medium">View All</a>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-white/5">
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
                                <tr key={i} className="group border-b border-slate-100/50 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                    <td className="py-4 pl-2">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${alert.severity === 'Critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                            alert.severity === 'High' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                                                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                            }`}>
                                            {alert.severity}
                                        </span>
                                    </td>
                                    <td className="py-4 font-medium">{alert.name}</td>
                                    <td className="py-4 text-slate-500 dark:text-slate-400 font-mono text-xs">{alert.source}</td>
                                    <td className="py-4 text-slate-500 dark:text-slate-400">{alert.time}</td>
                                    <td className="py-4 text-right pr-2">
                                        <button className="text-xs font-medium text-blue-500 hover:text-blue-400 hover:underline">
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
