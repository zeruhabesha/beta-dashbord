import React from 'react';
import { Search, Bell, ChevronDown, LogOut, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';

export function Navbar({ activeTimeRange, onTimeChange, onSearch, user, onLogout, activeModuleConfig, onModuleChange, isDarkMode, onToggleTheme }) {

    const ranges = ['15m', '1h', '24h', '7d'];
    const displayName = user || "Admin User";
    const initials = displayName.substring(0, 2).toUpperCase();

    // Mock Global Threat Level
    const threatLevel = "High"; // can be dynamic

    return (
        <header className="h-16 bg-bg-sidebar/80 backdrop-blur-md border-b border-border-subtle flex items-center px-6 gap-6 shrink-0 transition-colors duration-300 z-10 sticky top-0">
            {/* Global Threat Level - NEW FEATURE */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-bg-input border border-border-subtle shadow-inner">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Threat Level:</span>
                <div className="flex items-center gap-1.5">
                    <ShieldAlert size={14} className="text-status-high animate-pulse" />
                    <span className="text-sm font-bold text-status-high">{threatLevel}</span>
                </div>
            </div>

            <div className="h-6 w-px bg-border-subtle/50" />

            {/* Module Selector / Title */}
            <div className="flex items-center gap-4">
                <div className="flex flex-col relative group">
                    <span className="text-[10px] text-text-muted font-mono uppercase tracking-widest pb-0.5">Active Module</span>
                    <div className="flex items-center gap-2 cursor-pointer">
                        <span className="text-text-main font-bold text-lg leading-none group-hover:text-accent-primary transition-colors">
                            {activeModuleConfig?.title || 'Security Dashboard'}
                        </span>
                        <ChevronDown size={14} className="text-text-muted group-hover:text-accent-primary transition-colors" />

                        {/* Quick Module Switcher Dropdown */}
                        <select
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => onModuleChange(e.target.value)}
                            value={activeModuleConfig?.id || 'siem'}
                        >
                            <option value="siem">SIEM Operations</option>
                            <option value="ids">IDS / IPS Analysis</option>
                            <option value="edr">EDR Analysis</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Global Search */}
            <div className="flex-1 max-w-xl relative mx-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors group-focus-within:text-accent-primary" size={16} />
                <input
                    type="text"
                    placeholder="Search IPs, hosts, threats..."
                    className="w-full bg-bg-input border border-border-subtle rounded-full py-2 pl-10 pr-4 text-sm text-text-main focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 transition-all duration-300 placeholder:text-text-muted/50"
                    onKeyDown={(e) => e.key === 'Enter' && onSearch(e.currentTarget.value)}
                />
            </div>

            {/* Time Picker */}
            <div className="flex items-center gap-1 bg-bg-input p-1 border border-border-subtle rounded-lg">
                {ranges.map(range => (
                    <button
                        key={range}
                        onClick={() => onTimeChange(range)}
                        className={clsx(
                            "px-3 py-1 text-xs font-medium rounded-md transition-all duration-200",
                            activeTimeRange === range
                                ? "bg-bg-card shadow-sm text-accent-primary border border-border-subtle"
                                : "text-text-muted hover:text-text-main hover:bg-white/5"
                        )}
                    >
                        {range}
                    </button>
                ))}
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-4 border-l border-border-subtle pl-4">
                {/* Theme Toggle */}
                <button
                    onClick={onToggleTheme}
                    className="text-text-muted hover:text-accent-primary transition-colors p-1.5 hover:bg-bg-input rounded-full"
                    title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                    {isDarkMode ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" /></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                    )}
                </button>

                <button className="relative text-text-muted hover:text-accent-primary transition-colors">
                    <Bell size={18} />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-status-critical rounded-full animate-ping" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-status-critical rounded-full" />
                </button>

                <div className="flex items-center gap-3">
                    <div className="text-right hidden md:block">
                        <div className="text-sm font-semibold text-text-main leading-tight">{displayName}</div>
                        <div className="text-[10px] text-text-muted font-mono uppercase">SOC Analyst L1</div>
                    </div>

                    <div className="relative group cursor-pointer">
                        <div className="w-9 h-9 bg-bg-card rounded-full border border-border-subtle flex items-center justify-center text-xs font-bold text-accent-primary shadow-sm group-hover:border-accent-primary transition-colors">
                            {initials}
                        </div>
                        <div className="absolute inset-0 rounded-full border border-accent-primary opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" />
                    </div>

                    {/* Logout Button */}
                    <button
                        onClick={onLogout}
                        className="p-2 text-text-muted hover:text-status-critical hover:bg-status-critical/10 rounded-full transition-colors"
                        title="Sign Out"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </header>
    );
}
