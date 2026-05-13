import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Home, Compass, Shield, Activity, Cloud, Database,
    Settings, ChevronDown, ChevronRight, FileText,
    Map as MapIcon, Bell, Target, Lock, Server,
    Code, CreditCard, Eye, LayoutDashboard, ChevronLeft,
    Cpu, MemoryStick
} from 'lucide-react';

import clsx from 'clsx';
import { ALERT_READ_STATE_EVENT, fetchSidebarAlertCounts } from '../../api/notifications';

function formatAlertCount(count) {
    if (count > 99) {
        return '99+';
    }

    return String(count);
}

export const Sidebar = ({ activeView, onViewChange, menuStructure = [], moduleId, activeTimeRange, isCollapsed, onToggleCollapse }) => {
    // Track expanded categories - dynamically initialize based on menuStructure
    const [expanded, setExpanded] = useState(() => {
        const initial = {};
        menuStructure.forEach(group => {
            // Expand "Main" and "Explore" by default, or all if preferred for Admin style
            initial[group.category] = true;
        });
        return initial;
    });
    const [alertCounts, setAlertCounts] = useState({});

    const sidebarViewIds = useMemo(
        () => menuStructure.flatMap((group) => (group.items || []).map((item) => item.id)),
        [menuStructure]
    );

    const loadAlertCounts = useCallback(async (isActive = () => true) => {
        fetchSidebarAlertCounts({
            timeRange: activeTimeRange,
            moduleId,
            viewIds: sidebarViewIds
        })
            .then((counts) => {
                if (isActive()) {
                    setAlertCounts(counts);
                }
            })
            .catch(() => {
                if (isActive()) {
                    setAlertCounts({});
                }
            });
    }, [activeTimeRange, moduleId, sidebarViewIds]);

    useEffect(() => {
        let cancelled = false;
        const isActive = () => !cancelled;

        loadAlertCounts(isActive);

        return () => {
            cancelled = true;
        };
    }, [loadAlertCounts]);

    useEffect(() => {
        const handleReadStateChange = () => {
            loadAlertCounts();
        };

        window.addEventListener(ALERT_READ_STATE_EVENT, handleReadStateChange);

        return () => {
            window.removeEventListener(ALERT_READ_STATE_EVENT, handleReadStateChange);
        };
    }, [loadAlertCounts]);

    const toggle = (cat) => {
        setExpanded(prev => ({ ...prev, [cat]: !prev[cat] }));
    };

    return (
        <aside className={clsx(
            "relative z-20 flex h-full flex-shrink-0 select-none flex-col border-r bg-background text-sm transition-all duration-300 ease-in-out group/sidebar",
            isCollapsed ? "w-16" : "w-64"
        )}>
            {/* Collapse Toggle Button */}
            <button
                onClick={onToggleCollapse}
                className="absolute -right-3 top-6 z-50 rounded-full border bg-background p-1 text-muted-foreground opacity-0 transition-opacity duration-200 hover:text-foreground group-hover/sidebar:opacity-100"
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>


            {/* Header (Simplified for Admin Console look) */}
            <div className={clsx(
                "flex h-16 items-center border-b px-6",
                isCollapsed && "justify-center px-0"
            )}>
                {!isCollapsed ? (
                    <div className="flex flex-col">
                        <span className="text-lg font-semibold tracking-tight text-foreground">
                            Account Console
                        </span>
                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Beta</span>
                    </div>
                ) : (
                    <span className="text-xl font-bold text-foreground">AC</span>
                )}
            </div>

            {/* Navigation Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar py-6">
                {menuStructure.map((group, idx) => (
                    <div key={idx} className="mb-6">
                        {/* Category Header */}
                        {!group.hideLabel && !isCollapsed && (
                            <div className="px-6 mb-2 flex items-center justify-between">
                                <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                                    {group.category}
                                </h3>
                            </div>
                        )}

                        {/* Separator when collapsed */}
                        {isCollapsed && !group.hideLabel && (
                            <div className="mx-auto my-4 h-px w-8 bg-border" />
                        )}

                        {/* Items */}
                        <div className="flex flex-col">
                            {group.items.map(item => {
                                const count = alertCounts[item.id] || 0;

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => onViewChange && onViewChange(item.id)}
                                        title={isCollapsed ? item.label : undefined}
                                        className={clsx(
                                            "relative flex items-center transition-colors duration-150 outline-none group/item",
                                            isCollapsed
                                                ? "w-full justify-center py-3 hover:bg-muted"
                                                : "justify-start px-6 py-2.5 hover:bg-muted",
                                            activeView === item.id
                                                ? "bg-muted text-foreground"
                                                : "text-muted-foreground"
                                        )}
                                    >
                                        {/* Active Indicator Line (Left) - The defining Admin Console feature */}
                                        {activeView === item.id && (
                                            <div className="absolute bottom-0 left-0 top-0 w-1 bg-primary" />
                                        )}

                                        <item.icon
                                            size={isCollapsed ? 20 : 18}
                                            className={clsx(
                                                "shrink-0",
                                                !isCollapsed && "mr-3",
                                                activeView === item.id ? "text-foreground" : "text-muted-foreground group-hover/item:text-foreground"
                                            )}
                                        />

                                        {!isCollapsed && (
                                            <>
                                                <span className={clsx(
                                                    "font-medium truncate",
                                                    activeView === item.id ? "text-foreground" : ""
                                                )}>
                                                    {item.label}
                                                </span>

                                                {count > 0 && (
                                                    <span className="ml-auto inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[11px] font-semibold leading-none text-destructive-foreground">
                                                        {formatAlertCount(count)}
                                                    </span>
                                                )}
                                            </>
                                        )}

                                        {isCollapsed && count > 0 && (
                                            <span className="absolute right-2 top-2 inline-flex min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
                                                {formatAlertCount(count)}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom Actions */}
            <div className="border-t bg-muted/40 p-4">
                <button
                    className={clsx(
                        "flex w-full items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 hover:bg-background hover:text-foreground",
                        isCollapsed ? "py-2" : "py-2 gap-2"
                    )}
                >
                    <Settings size={18} />
                    {!isCollapsed && <span>Settings</span>}
                </button>
            </div>
        </aside>
    );
};
