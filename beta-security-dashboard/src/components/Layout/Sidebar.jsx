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
            "h-full bg-white dark:bg-black border-r border-gray-200 dark:border-neutral-800 flex flex-col flex-shrink-0 text-sm select-none transition-all duration-300 ease-in-out relative group/sidebar z-20",
            isCollapsed ? "w-16" : "w-64"
        )}>
            {/* Collapse Toggle Button */}
            <button
                onClick={onToggleCollapse}
                className="absolute -right-3 top-6 z-50 bg-white dark:bg-black border border-gray-200 dark:border-neutral-700 rounded-full p-1 shadow-sm text-gray-500 hover:text-black dark:hover:text-white opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200"
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>


            {/* Header (Simplified for Admin Console look) */}
            <div className={clsx(
                "h-16 flex items-center border-b border-gray-200 dark:border-neutral-800 px-6",
                isCollapsed && "justify-center px-0"
            )}>
                {!isCollapsed ? (
                    <div className="flex flex-col">
                        <span className="font-semibold text-black dark:text-white text-lg tracking-tight">
                            Account Console
                        </span>
                        <span className="text-[11px] text-gray-500 dark:text-neutral-400 tracking-wide uppercase">Beta</span>
                    </div>
                ) : (
                    <span className="font-bold text-black dark:text-white text-xl">AC</span>
                )}
            </div>

            {/* Navigation Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar py-6">
                {menuStructure.map((group, idx) => (
                    <div key={idx} className="mb-6">
                        {/* Category Header */}
                        {!group.hideLabel && !isCollapsed && (
                            <div className="px-6 mb-2 flex items-center justify-between">
                                <h3 className="text-[11px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">
                                    {group.category}
                                </h3>
                            </div>
                        )}

                        {/* Separator when collapsed */}
                        {isCollapsed && !group.hideLabel && (
                            <div className="mx-auto w-8 h-px bg-gray-200 dark:bg-neutral-800 my-4" />
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
                                                ? "justify-center w-full py-3 hover:bg-gray-100 dark:hover:bg-neutral-900"
                                                : "justify-start px-6 py-2.5 hover:bg-gray-100 dark:hover:bg-neutral-900",
                                            activeView === item.id
                                                ? "text-black dark:text-white bg-gray-100 dark:bg-white/10"
                                                : "text-gray-600 dark:text-neutral-300"
                                        )}
                                    >
                                        {/* Active Indicator Line (Left) - The defining Admin Console feature */}
                                        {activeView === item.id && (
                                            <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-black dark:bg-white" />
                                        )}

                                        <item.icon
                                            size={isCollapsed ? 20 : 18}
                                            className={clsx(
                                                "shrink-0",
                                                !isCollapsed && "mr-3",
                                                activeView === item.id ? "text-black dark:text-white" : "text-gray-400 dark:text-neutral-500 group-hover/item:text-gray-600 dark:group-hover/item:text-neutral-300"
                                            )}
                                        />

                                        {!isCollapsed && (
                                            <>
                                                <span className={clsx(
                                                    "font-medium truncate",
                                                    activeView === item.id ? "text-black dark:text-white" : ""
                                                )}>
                                                    {item.label}
                                                </span>

                                                {count > 0 && (
                                                    <span className="ml-auto inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[11px] font-semibold leading-none text-destructive-foreground shadow-sm">
                                                        {formatAlertCount(count)}
                                                    </span>
                                                )}
                                            </>
                                        )}

                                        {isCollapsed && count > 0 && (
                                            <span className="absolute right-2 top-2 inline-flex min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground shadow-sm">
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
            <div className="p-4 border-t border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950">
                <button
                    className={clsx(
                        "w-full flex items-center justify-center transition-colors duration-200 rounded-md hover:bg-gray-200 dark:hover:bg-neutral-900 text-gray-500 dark:text-neutral-400",
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
