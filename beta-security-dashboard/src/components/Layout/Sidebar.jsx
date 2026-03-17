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
            // Expand "Main" and "Explore" by default, or all if preferred for Admin style
            initial[group.category] = true;
        });
        return initial;
    });

    const toggle = (cat) => {
        setExpanded(prev => ({ ...prev, [cat]: !prev[cat] }));
    };

    return (
        <aside className={clsx(
            "h-full bg-white dark:bg-[#1f2937] border-r border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0 text-sm select-none transition-all duration-300 ease-in-out relative group/sidebar z-20",
            isCollapsed ? "w-16" : "w-64"
        )}>
            {/* Collapse Toggle Button */}
            <button
                onClick={onToggleCollapse}
                className="absolute -right-3 top-6 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-1 shadow-sm text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200"
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>


            {/* Header (Simplified for Admin Console look) */}
            <div className={clsx(
                "h-16 flex items-center border-b border-gray-200 dark:border-gray-700 px-6",
                isCollapsed && "justify-center px-0"
            )}>
                {!isCollapsed ? (
                    <div className="flex flex-col">
                        <span className="font-semibold text-gray-800 dark:text-gray-100 text-lg tracking-tight">
                            Account Console
                        </span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 tracking-wide uppercase">Beta</span>
                    </div>
                ) : (
                    <span className="font-bold text-blue-600 text-xl">AC</span>
                )}
            </div>

            {/* Navigation Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar py-6">
                {menuStructure.map((group, idx) => (
                    <div key={idx} className="mb-6">
                        {/* Category Header */}
                        {!group.hideLabel && !isCollapsed && (
                            <div className="px-6 mb-2 flex items-center justify-between">
                                <h3 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                    {group.category}
                                </h3>
                            </div>
                        )}

                        {/* Separator when collapsed */}
                        {isCollapsed && !group.hideLabel && (
                            <div className="mx-auto w-8 h-px bg-gray-200 dark:bg-gray-700 my-4" />
                        )}

                        {/* Items */}
                        <div className="flex flex-col">
                            {group.items.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => onViewChange && onViewChange(item.id)}
                                    title={isCollapsed ? item.label : undefined}
                                    className={clsx(
                                        "relative flex items-center transition-colors duration-150 outline-none group/item",
                                        isCollapsed
                                            ? "justify-center w-full py-3 hover:bg-gray-100 dark:hover:bg-gray-800"
                                            : "justify-start px-6 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800", // Increased padding for admin feel
                                        activeView === item.id
                                            ? "text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10"
                                            : "text-gray-600 dark:text-gray-300"
                                    )}
                                >
                                    {/* Active Indicator Line (Left) - The defining Admin Console feature */}
                                    {activeView === item.id && (
                                        <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-blue-600 dark:bg-blue-500" />
                                    )}

                                    <item.icon
                                        size={isCollapsed ? 20 : 18}
                                        className={clsx(
                                            "shrink-0",
                                            !isCollapsed && "mr-3",
                                            activeView === item.id ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500 group-hover/item:text-gray-600 dark:group-hover/item:text-gray-300"
                                        )}
                                    />

                                    {!isCollapsed && (
                                        <span className={clsx(
                                            "font-medium truncate",
                                            activeView === item.id ? "text-blue-800 dark:text-blue-100" : ""
                                        )}>
                                            {item.label}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <button
                    className={clsx(
                        "w-full flex items-center justify-center transition-colors duration-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400",
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
