import React, { useState, useEffect } from 'react';
import {
    Home, Compass, Shield, Activity, Cloud, Database,
    Settings, ChevronDown, ChevronRight, FileText,
    Map as MapIcon, Bell, Target, Lock, Server,
    Code, CreditCard, Eye, LayoutDashboard, ChevronLeft,
    Cpu, MemoryStick
} from 'lucide-react';

import clsx from 'clsx';

export const Sidebar = ({ activeView, onViewChange, menuStructure = [], isCollapsed, onToggleCollapse }) => {
    // Track expanded categories - dynamically initialize based on menuStructure
    const [expanded, setExpanded] = useState(() => {
        const initial = {};
        menuStructure.forEach(group => {
            // Expand "Main" and "Explore" by default
            initial[group.category] = group.category === "Main" || group.category === "Explore";
        });
        return initial;
    });

    // Mock System Stats with smoother transitions
    const [systemStats, setSystemStats] = useState({ cpu: 45, ram: 60 });
    useEffect(() => {
        const interval = setInterval(() => {
            setSystemStats(prev => {
                // Fluctuate by -5 to +5
                let newCpu = prev.cpu + (Math.floor(Math.random() * 11) - 5);
                let newRam = prev.ram + (Math.floor(Math.random() * 7) - 3);

                // Clamp values
                if (newCpu > 90) newCpu = 90;
                if (newCpu < 10) newCpu = 10;
                if (newRam > 95) newRam = 95;
                if (newRam < 20) newRam = 20;

                return { cpu: newCpu, ram: newRam };
            });
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const toggle = (cat) => {
        setExpanded(prev => ({ ...prev, [cat]: !prev[cat] }));
    };

    return (
        <aside className={clsx(
            "h-full bg-bg-sidebar border-r border-border-subtle flex flex-col flex-shrink-0 text-sm select-none transition-all duration-300 ease-in-out relative group/sidebar shadow-[4px_0_24px_rgba(0,0,0,0.2)] z-20",
            isCollapsed ? "w-20" : "w-64"
        )}>
            {/* Collapse Toggle Button */}
            <button
                onClick={onToggleCollapse}
                className="absolute -right-3 top-8 z-50 bg-bg-card border border-border-subtle rounded-full p-1 shadow-md text-text-muted hover:text-accent-primary opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200"
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>


            {/* Header with Pulse Animation */}
            <div className={clsx(
                "h-16 flex items-center border-b border-border-subtle group cursor-pointer hover:bg-bg-card/50 transition-all duration-300",
                isCollapsed ? "justify-center px-0" : "px-6"
            )}>
                <div className="relative">
                    <div className="w-9 h-9 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-lg flex items-center justify-center text-white font-bold text-2xl pb-1 shadow-[0_0_15px_rgba(6,182,212,0.4)] group-hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] transition-all duration-300 shrink-0">
                        b
                    </div>
                </div>
                {!isCollapsed && (
                    <div className="ml-3 flex flex-col justify-center">
                        <span className="font-bold text-text-main text-lg tracking-tight leading-none group-hover:text-accent-primary transition-colors">
                            BETA
                        </span>
                        <span className="text-[10px] text-text-muted font-mono tracking-widest uppercase mt-0.5">Security</span>
                    </div>
                )}
            </div>

            {/* Navigation Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar py-4">
                {menuStructure.map((group, idx) => (
                    <div key={idx} className="mb-2">
                        {/* Category Header */}
                        {!group.hideLabel && !isCollapsed && (
                            <button
                                onClick={() => toggle(group.category)}
                                className="w-full flex items-center justify-between px-6 py-2 text-[11px] font-bold text-text-muted uppercase tracking-wider hover:text-accent-primary transition-colors group mb-1"
                            >
                                <span>{group.category}</span>
                                <ChevronDown
                                    size={12}
                                    className={`transition-transform duration-300 ${expanded[group.category] ? 'rotate-0' : '-rotate-90'}`}
                                />
                            </button>
                        )}

                        {/* Separator when collapsed */}
                        {isCollapsed && !group.hideLabel && (
                            <div className="mx-auto w-10 h-px bg-border-subtle my-3 opacity-50" />
                        )}

                        {/* Items */}
                        <div
                            className={clsx(
                                "overflow-hidden transition-all duration-300 ease-in-out",
                                (group.hideLabel || expanded[group.category] || isCollapsed)
                                    ? "max-h-[1000px] opacity-100"
                                    : "max-h-0 opacity-0"
                            )}
                        >
                            <div className="space-y-1 px-3">
                                {group.items.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => onViewChange && onViewChange(item.id)}
                                        title={isCollapsed ? item.label : undefined}
                                        className={clsx(
                                            "w-full flex items-center transition-all duration-200 outline-none rounded-md group/item relative overflow-hidden",
                                            isCollapsed
                                                ? "justify-center h-10 w-10 mx-auto rounded-lg"
                                                : "justify-start gap-3 px-3 py-2",
                                            activeView === item.id
                                                ? "bg-accent-primary/10 text-accent-primary"
                                                : "text-text-muted hover:text-text-main hover:bg-white/5"
                                        )}
                                    >
                                        <item.icon
                                            size={isCollapsed ? 20 : 18}
                                            className={clsx(
                                                "transition-all duration-300",
                                                activeView === item.id && "drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                                            )}
                                        />

                                        {!isCollapsed && (
                                            <span className={clsx(
                                                "font-medium transition-all duration-200",
                                                activeView === item.id ? "text-accent-primary" : "text-text-muted group-hover/item:text-text-main"
                                            )}>
                                                {item.label}
                                            </span>
                                        )}

                                        {/* Active Indicator Line (Left) */}
                                        {activeView === item.id && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-full w-[2px] bg-accent-primary shadow-[0_0_10px_#06b6d4]" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* System Status Section (Bottom) */}
            {!isCollapsed && (
                <div className="p-4 border-t border-border-subtle bg-bg-card/30 backdrop-blur-sm mx-4 mb-4 rounded-lg border border-white/5">
                    <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Activity size={12} /> System Status
                    </h4>

                    <div className="space-y-3">
                        {/* CPU */}
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-text-muted flex items-center gap-1"><Cpu size={10} /> CPU</span>
                                <span className="text-accent-primary font-mono">{systemStats.cpu}%</span>
                            </div>
                            <div className="h-1.5 bg-bg-body rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-accent-primary shadow-[0_0_8px_#06b6d4] transition-all duration-500 rounded-full"
                                    style={{ width: `${systemStats.cpu}%` }}
                                />
                            </div>
                        </div>

                        {/* Memory */}
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-text-muted flex items-center gap-1"><MemoryStick size={10} /> RAM</span>
                                <span className="text-accent-secondary font-mono">{systemStats.ram}%</span>
                            </div>
                            <div className="h-1.5 bg-bg-body rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-accent-secondary shadow-[0_0_8px_#8b5cf6] transition-all duration-500 rounded-full"
                                    style={{ width: `${systemStats.ram}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* User Profile / Bottom Actions */}
            <div className="p-3 border-t border-border-subtle bg-bg-card/50">
                <button
                    className={clsx(
                        "w-full flex items-center transition-all duration-200 rounded-md group hover:bg-white/5",
                        isCollapsed ? "justify-center py-3" : "gap-3 px-3 py-2 text-text-muted hover:text-text-main"
                    )}
                >
                    <Settings size={18} className="group-hover:rotate-90 transition-transform duration-500 shrink-0" />
                    {!isCollapsed && (
                        <span>Settings</span>
                    )}
                </button>
            </div>
        </aside>
    );
};
