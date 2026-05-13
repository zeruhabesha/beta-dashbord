import React from 'react';
import { Search, LogOut, ShieldAlert, SlidersHorizontal } from 'lucide-react';
import clsx from 'clsx';
import { AlertCenter } from './AlertCenter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function Navbar({ activeTimeRange, onTimeChange, onSearch, user, onRequestLogout, activeModuleConfig, activeView, onModuleChange, isDarkMode, onToggleTheme, onAlertNavigate, canUseManualResponse, onManualResponse, onSocOperations }) {

    const ranges = ['15m', '1h', '24h', '7d'];
    const displayName = user || "Admin User";
    const initials = displayName.substring(0, 2).toUpperCase();
    const activeViewLabel = activeModuleConfig?.menuStructure
        ?.flatMap((group) => group.items || [])
        ?.find((item) => item.id === activeView)
        ?.label || activeModuleConfig?.title || 'Current View';

    return (
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-6 border-b bg-background px-6 transition-colors duration-300">

            <div className="h-6 w-px bg-border-subtle/50" />

            {/* Module Selector / Title - Now Static */}
            <div className="flex items-center gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2 px-1">
                        <span className="text-text-main font-bold text-lg leading-none">
                            {activeModuleConfig?.title || 'Security Dashboard'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Global Search */}
            <div className="flex-1 max-w-xl relative mx-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground" />
                <Input
                    type="text"
                    placeholder="Search IPs, hosts, threats..."
                    className="h-10 rounded-full pl-10"
                    onKeyDown={(e) => e.key === 'Enter' && onSearch(e.currentTarget.value)}
                />
            </div>

            {/* Time Picker */}
            <div className="flex items-center gap-1 rounded-md border bg-muted p-1">
                {ranges.map(range => (
                    <Button
                        type="button"
                        key={range}
                        onClick={() => onTimeChange(range)}
                        variant={activeTimeRange === range ? 'info' : 'ghost'}
                        size="sm"
                        className={clsx(
                            "h-8 rounded-md px-3 text-xs",
                            activeTimeRange === range
                                ? ""
                                : "text-muted-foreground hover:bg-background hover:text-foreground"
                        )}
                    >
                        {range}
                    </Button>
                ))}
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-4 border-l border-border-subtle pl-4">
                {/* Theme Toggle */}
                <Button
                    type="button"
                    onClick={onToggleTheme}
                    variant="ghost"
                    size="icon"
                    className="rounded-full text-muted-foreground"
                    title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                    {isDarkMode ? (
                        <svg data-icon="inline-start" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" /></svg>
                    ) : (
                        <svg data-icon="inline-start" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                    )}
                </Button>

                <AlertCenter
                    activeTimeRange={activeTimeRange}
                    moduleId={activeModuleConfig?.id}
                    viewId={activeView}
                    moduleTitle={activeModuleConfig?.title}
                    viewLabel={activeViewLabel}
                    onNavigate={onAlertNavigate}
                />

                {canUseManualResponse && (
                    <>
                        <Button
                            type="button"
                            onClick={onSocOperations}
                            variant="info"
                            size="sm"
                            className="rounded-full text-xs"
                            title="SOC service controls"
                        >
                            <SlidersHorizontal data-icon="inline-start" />
                            <span className="hidden 2xl:inline">SOC Controls</span>
                        </Button>
                        <Button
                            type="button"
                            onClick={onManualResponse}
                            variant="destructive"
                            size="sm"
                            className="rounded-full text-xs"
                            title="Manual analyst response"
                        >
                            <ShieldAlert data-icon="inline-start" />
                            <span className="hidden 2xl:inline">Manual Action</span>
                        </Button>
                    </>
                )}

                <div className="flex items-center gap-3">
                    <div className="text-right hidden md:block">
                        <div className="text-sm font-semibold text-text-main leading-tight">{displayName}</div>
                    </div>

                    <div className="relative group cursor-pointer">
                        <div className="flex size-9 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xs font-bold text-primary transition-colors group-hover:border-primary">
                            {initials}
                        </div>
                        <div className="absolute inset-0 rounded-full border border-accent-primary opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" />
                    </div>

                    {/* Logout Button */}
                    <Button
                        type="button"
                        onClick={onRequestLogout}
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-muted-foreground hover:text-destructive"
                        title="Sign Out"
                    >
                        <LogOut data-icon="inline-start" />
                    </Button>
                </div>
            </div>
        </header>
    );
}
