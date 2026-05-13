import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Bell, RefreshCw, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';
import { ALERT_READ_STATE_EVENT, fetchScopedAlerts, markAlertAsRead } from '../../api/notifications';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

function formatRelativeTime(value) {
    if (!value) {
        return 'Unknown time';
    }

    const timestamp = new Date(value).getTime();

    if (Number.isNaN(timestamp)) {
        return 'Unknown time';
    }

    const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

    if (seconds < 60) {
        return `${seconds}s ago`;
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function severityTone(severity = '') {
    switch (String(severity).toLowerCase()) {
        case 'critical':
            return 'text-destructive bg-destructive/10 border-destructive/30';
        case 'high':
            return 'text-destructive bg-destructive/10 border-destructive/25';
        case 'medium':
            return 'text-neutral-700 bg-neutral-700/10 border-neutral-700/25 dark:text-neutral-300 dark:bg-white/10 dark:border-white/20';
        default:
            return 'text-neutral-600 bg-neutral-600/10 border-neutral-600/25 dark:text-neutral-400 dark:bg-white/5 dark:border-white/15';
    }
}

function sourceTone(source = '') {
    switch (source) {
        case 'EDR':
            return 'bg-black/10 text-black dark:bg-white/10 dark:text-white';
        case 'IDS':
            return 'bg-neutral-800/10 text-neutral-800 dark:bg-white/10 dark:text-neutral-100';
        case 'Response':
            return 'bg-neutral-700/10 text-neutral-700 dark:bg-white/10 dark:text-neutral-200';
        default:
            return 'bg-neutral-600/10 text-neutral-600 dark:bg-white/10 dark:text-neutral-300';
    }
}

function buildScopeLabel({ moduleId, moduleTitle, viewLabel }) {
    if (moduleId === 'unified') {
        return ['Home', 'Unified Dashboard', 'Security Overview', 'Dashboard List'].includes(viewLabel)
            ? 'All Teams'
            : `Unified / ${viewLabel}`;
    }

    if (!viewLabel || viewLabel === 'Home') {
        return moduleTitle || 'Current Team';
    }

    return `${moduleTitle || 'Current Team'} / ${viewLabel}`;
}

export function AlertCenter({ activeTimeRange, moduleId, viewId, moduleTitle, viewLabel, onNavigate }) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [alerts, setAlerts] = React.useState([]);
    const [totalAlerts, setTotalAlerts] = React.useState(0);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [panelStyle, setPanelStyle] = React.useState({ top: 72, left: 16, width: 380 });
    const triggerRef = React.useRef(null);
    const panelRef = React.useRef(null);

    const scopeLabel = buildScopeLabel({ moduleId, moduleTitle, viewLabel });

    const updatePanelPosition = React.useCallback(() => {
        if (!triggerRef.current || typeof window === 'undefined') {
            return;
        }

        const rect = triggerRef.current.getBoundingClientRect();
        const width = Math.min(380, window.innerWidth - 32);
        const left = Math.min(
            Math.max(16, rect.right - width),
            Math.max(16, window.innerWidth - width - 16)
        );

        setPanelStyle({
            top: rect.bottom + 12,
            left,
            width
        });
    }, []);

    const loadAlerts = React.useCallback(async () => {
        try {
            setIsLoading(true);
            setError('');
            const payload = await fetchScopedAlerts({
                timeRange: activeTimeRange,
                size: 8,
                moduleId,
                viewId
            });
            setAlerts(payload.items);
            setTotalAlerts(payload.total);
        } catch (loadError) {
            setError(loadError.message || 'Failed to load alerts');
        } finally {
            setIsLoading(false);
        }
    }, [activeTimeRange, moduleId, viewId]);

    React.useEffect(() => {
        loadAlerts();

        const intervalId = window.setInterval(() => {
            loadAlerts();
        }, 60000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [loadAlerts]);

    React.useEffect(() => {
        const handleReadStateChange = () => {
            loadAlerts();
        };

        window.addEventListener(ALERT_READ_STATE_EVENT, handleReadStateChange);

        return () => {
            window.removeEventListener(ALERT_READ_STATE_EVENT, handleReadStateChange);
        };
    }, [loadAlerts]);

    React.useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        updatePanelPosition();

        const handleWindowChange = () => {
            updatePanelPosition();
        };

        const handleClickOutside = (event) => {
            if (triggerRef.current?.contains(event.target) || panelRef.current?.contains(event.target)) {
                return;
            }

            setIsOpen(false);
        };

        window.addEventListener('resize', handleWindowChange);
        window.addEventListener('scroll', handleWindowChange, true);
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            window.removeEventListener('resize', handleWindowChange);
            window.removeEventListener('scroll', handleWindowChange, true);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, updatePanelPosition]);

    const panel = isOpen ? createPortal(
        <Card
            ref={panelRef}
            className="fixed z-50 overflow-hidden rounded-xl"
            style={panelStyle}
        >
            <div className="flex items-start justify-between border-b bg-background px-4 py-3">
                <div>
                    <div className="text-sm font-semibold text-foreground">Alert Center</div>
                    <div className="text-xs text-muted-foreground">
                        {totalAlerts} notifications for {scopeLabel} in the last {activeTimeRange}
                    </div>
                </div>

                <Button
                    type="button"
                    onClick={loadAlerts}
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    title="Refresh alerts"
                >
                    <RefreshCw size={16} className={clsx(isLoading && 'animate-spin')} />
                </Button>
            </div>

            <div className="max-h-[420px] overflow-y-auto bg-background">
                {error && (
                    <div className="px-4 py-6 text-sm text-destructive flex items-center gap-2">
                        <AlertTriangle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                {!error && !isLoading && alerts.length === 0 && (
                    <div className="flex items-center gap-2 px-4 py-8 text-sm text-muted-foreground">
                        <ShieldAlert size={16} />
                        <span>No unread notifications in this scope.</span>
                    </div>
                )}

                {!error && alerts.map((alert) => (
                    <button
                        key={alert.id}
                        onClick={() => {
                            markAlertAsRead(alert, [{ moduleId, viewId }]);
                            setAlerts((current) => current.filter((item) => item.id !== alert.id));
                            setTotalAlerts((current) => Math.max(0, current - 1));
                            setIsOpen(false);
                            onNavigate?.(alert);
                        }}
                        className="w-full border-b bg-background px-4 py-3 text-left transition-colors hover:bg-muted"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="secondary" className={clsx('text-[10px] uppercase tracking-wide', sourceTone(alert.source))}>
                                        {alert.source}
                                    </Badge>
                                    <Badge variant={['critical', 'high'].includes(String(alert.severity).toLowerCase()) ? 'destructive' : 'outline'} className={clsx('text-[10px] uppercase tracking-wide', severityTone(alert.severity))}>
                                        {alert.severity}
                                    </Badge>
                                </div>
                                <div className="truncate text-sm font-semibold text-foreground">
                                    {alert.title}
                                </div>
                                <div className="mt-1 max-h-10 overflow-hidden text-xs text-muted-foreground">
                                    {alert.summary}
                                </div>
                            </div>

                            <div className="whitespace-nowrap pt-0.5 text-[11px] text-muted-foreground">
                                {formatRelativeTime(alert.timestamp)}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </Card>,
        document.body
    ) : null;

    return (
        <>
            <Button
                type="button"
                ref={triggerRef}
                onClick={() => setIsOpen((current) => !current)}
                variant="ghost"
                size="icon"
                className="relative rounded-full text-muted-foreground"
                title={`Alert Center - ${scopeLabel}`}
            >
                <Bell size={18} />
                {totalAlerts > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-background bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                        {totalAlerts > 99 ? '99+' : totalAlerts}
                    </span>
                )}
            </Button>
            {panel}
        </>
    );
}
