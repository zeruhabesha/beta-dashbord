import React, { useState } from 'react';
import { Sidebar } from './components/Layout/Sidebar';
import { Navbar } from './components/Layout/Navbar';
import { Login } from './components/Auth/Login';
import { TeamSelector } from './components/Onboarding/TeamSelector';
import { Tenants } from './components/Pages/Tenants';
import { SiemAlerts } from './components/Pages/SiemAlerts';
import { IndexOverview } from './components/Dashboard/IndexOverview';
import { ObservabilityDashboard } from './components/Pages/ObservabilityDashboard';
import { SocAutomationPage, isSocAutomationView } from './components/Pages/SocAutomationPage';
import { CmtDashboard, isCmtView, normalizeCmtView } from './components/Pages/CmtDashboard';
import { ManualResponseDialog } from './components/Layout/ManualResponseDialog';
import { SocOperationsDialog } from './components/Layout/SocOperationsDialog';
import { Database, LogOut, RefreshCw, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { MODULE_CONFIG } from './config/moduleConfig';
import { buildModuleOpenSearchUrl, getModuleDataViewTitles, getModuleOpenSearchView } from './config/opensearchViews';
import { ensureDataViewId } from './api/opensearchDashboards';
import { clearKeycloakSession, initializeKeycloakSession, logoutFromKeycloak, startKeycloakLogin } from './auth/keycloak';

const DEFAULT_ROUTE_PATH = '/select';
const MODULE_ROUTE_PATHS = {
    siem: '/siem',
    ids: '/ids',
    edr: '/edr',
    unified: '/unifild',
    observability: '/observability'
};

const APP_ROUTE_CONFIG = {
    '/': { appState: 'team-select', canonicalPath: DEFAULT_ROUTE_PATH },
    '/select': { appState: 'team-select', canonicalPath: '/select' },
    '/siem': { appState: 'dashboard', moduleId: 'siem', canonicalPath: '/siem' },
    '/ids': { appState: 'dashboard', moduleId: 'ids', canonicalPath: '/ids' },
    '/edr': { appState: 'dashboard', moduleId: 'edr', canonicalPath: '/edr' },
    '/unifild': { appState: 'dashboard', moduleId: 'unified', canonicalPath: '/unifild' },
    '/unified': { appState: 'dashboard', moduleId: 'unified', canonicalPath: '/unifild' },
    '/observability': { appState: 'dashboard', moduleId: 'observability', canonicalPath: '/observability' }
};

function normalizePathname(pathname = '/') {
    const normalizedPath = pathname.replace(/\/+$/, '');
    return normalizedPath || '/';
}

function getRouteConfig(pathname) {
    return APP_ROUTE_CONFIG[normalizePathname(pathname)] || APP_ROUTE_CONFIG['/'];
}

function getModuleRoutePath(moduleId) {
    return MODULE_ROUTE_PATHS[moduleId] || DEFAULT_ROUTE_PATH;
}

function getDashboardsBaseUrl() {
    // Keep Dashboards behind the same-origin reverse proxy so the browser never
    // needs the upstream host/IP in DOM state or runtime env.
    return '';
}

function fallbackTimeFieldForModule(moduleId) {
    if (moduleId === 'edr') {
        return 'indexed_at';
    }

    if (moduleId === 'ids' || moduleId === 'observability') {
        return 'timestamp';
    }

    return '@timestamp';
}

function stripHashFromUrl(url) {
    return String(url || '').split('#')[0];
}

function looksLikeOpenSearchDashboardsHtml(html) {
    return /opensearch|dashboards|core\.entry|bootstrap\.js|window\.__osd/i.test(String(html || ''));
}

function OpenSearchDataViewGuard({ dataViewState, moduleTitle, viewTitle, onRetry }) {
    const isLoading = dataViewState.status === 'idle' || dataViewState.status === 'loading';
    const requestedTitles = dataViewState.requestedTitles?.join(', ') || 'module data view';

    return (
        <div className="flex-1 overflow-y-auto p-6 bg-bg-body">
            <div className="mx-auto flex min-h-full max-w-5xl items-center justify-center">
                <Card className="w-full overflow-hidden border-info/25">
                    <CardHeader className="border-b border-border/70 bg-muted/20">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-info/15 text-info ring-1 ring-info/25">
                            {isLoading ? <RefreshCw className="h-7 w-7 animate-spin" /> : <ShieldAlert className="h-7 w-7" />}
                        </div>
                        <CardTitle className="text-3xl font-black tracking-tight text-foreground">
                            Preparing BETA Data View
                        </CardTitle>
                        <CardDescription className="text-base font-semibold text-muted-foreground">
                            {moduleTitle} / {viewTitle} is loading the required data view for the embedded dashboard.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-5 p-6">
                        {isLoading ? (
                            <div className="flex flex-col gap-3">
                                <Skeleton className="h-4 w-2/3 bg-info/20" />
                                <Skeleton className="h-4 w-1/2 bg-info/15" />
                                <Skeleton className="h-24 w-full rounded-2xl bg-muted" />
                            </div>
                        ) : (
                            <Alert variant="warning" className="rounded-2xl">
                                <ShieldAlert className="h-4 w-4" />
                                <AlertTitle>Data view was not ready</AlertTitle>
                                <AlertDescription>
                                    {dataViewState.error || 'The saved object lookup failed.'}
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="rounded-2xl border border-border/70 bg-muted/40 p-5">
                            <p className="text-xs font-black uppercase tracking-[0.22em] text-muted-foreground">
                                Required index expression
                            </p>
                            <p className="mt-2 break-words font-mono text-sm font-semibold text-foreground">
                                {requestedTitles}
                            </p>
                            <p className="mt-3 text-sm font-medium text-muted-foreground">
                                This guard prevents the embedded dashboard from redirecting while the data view is missing or being repaired.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-muted-foreground">
                                BETA will create or repair the saved object through the same-origin API.
                            </p>
                            <Button
                                type="button"
                                variant={isLoading ? 'infoOutline' : 'warning'}
                                onClick={onRetry}
                                disabled={isLoading}
                            >
                                <RefreshCw className="h-4 w-4" />
                                Retry repair
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function OpenSearchFrameGuard({ frameState, dashboardUrl, onRetry }) {
    const isChecking = frameState.status === 'idle' || frameState.status === 'checking';
    const checkedUrl = frameState.checkedUrl || stripHashFromUrl(dashboardUrl);

    return (
        <div className="flex-1 overflow-y-auto p-6 bg-bg-body">
            <div className="mx-auto flex min-h-full max-w-5xl items-center justify-center">
                <Card className="w-full overflow-hidden border-warning/30">
                    <CardHeader className="border-b border-border/70 bg-muted/20">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/15 text-warning ring-1 ring-warning/25">
                            {isChecking ? <RefreshCw className="h-7 w-7 animate-spin" /> : <Database className="h-7 w-7" />}
                        </div>
                        <CardTitle className="text-3xl font-black tracking-tight text-foreground">
                            Checking OpenSearch Proxy
                        </CardTitle>
                        <CardDescription className="text-base font-semibold text-muted-foreground">
                            The embedded dashboard is loaded only after the same-origin proxy returns OpenSearch Dashboards HTML.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-5 p-6">
                        {isChecking ? (
                            <div className="flex flex-col gap-3">
                                <Skeleton className="h-4 w-2/3 bg-warning/20" />
                                <Skeleton className="h-4 w-1/2 bg-warning/15" />
                                <Skeleton className="h-24 w-full rounded-2xl bg-muted" />
                            </div>
                        ) : (
                            <Alert variant="warning" className="rounded-2xl">
                                <ShieldAlert className="h-4 w-4" />
                                <AlertTitle>OpenSearch iframe route is not ready</AlertTitle>
                                <AlertDescription>
                                    {frameState.error || 'The iframe preflight failed before OpenSearch Dashboards could be embedded.'}
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="rounded-2xl border border-border/70 bg-muted/40 p-5">
                            <p className="text-xs font-black uppercase tracking-[0.22em] text-muted-foreground">
                                Checked route
                            </p>
                            <p className="mt-2 break-words font-mono text-sm font-semibold text-foreground">
                                {checkedUrl || 'OpenSearch Dashboards route'}
                            </p>
                            <p className="mt-3 text-sm font-medium text-muted-foreground">
                                This prevents Chrome from rendering an internal error frame when `/app`, `/api`, or OpenSearch Dashboards is unreachable.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-muted-foreground">
                                If this repeats, run `npm run opensearch:repair` and restart `npm run dev`.
                            </p>
                            <Button
                                type="button"
                                variant={isChecking ? 'infoOutline' : 'warning'}
                                onClick={onRetry}
                                disabled={isChecking}
                            >
                                <RefreshCw className="h-4 w-4" />
                                Retry iframe check
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function App() {
    const [appState, setAppState] = useState('login'); // 'login' | 'team-select' | 'dashboard'
    const [activeModuleId, setActiveModuleId] = useState('siem');
    // activeView is now local to the module, assume default to start
    const [activeView, setActiveView] = useState(MODULE_CONFIG.siem?.defaultView || 'home');
    const [currentPath, setCurrentPath] = useState(() => {
        if (typeof window === 'undefined') {
            return DEFAULT_ROUTE_PATH;
        }

        return normalizePathname(window.location.pathname);
    });

    // Theme State (Default to Light)
    const [isDarkMode, setIsDarkMode] = useState(false);

    const toggleTheme = () => {
        setIsDarkMode((prevIsDarkMode) => {
            if (prevIsDarkMode) {
                document.documentElement.classList.remove('dark');
            } else {
                document.documentElement.classList.add('dark');
            }

            return !prevIsDarkMode;
        });
    };

    // Initialize Theme
    React.useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    const [timeRange, setTimeRange] = useState('24h');
    const [searchQuery, setSearchQuery] = useState('');
    const [alertFocus, setAlertFocus] = useState(null);
    const [user, setUser] = useState(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
    const [activeDataViewId, setActiveDataViewId] = useState('');
    const [dataViewState, setDataViewState] = useState({
        status: 'idle',
        id: '',
        title: '',
        error: '',
        requestKey: '',
        requestedTitles: []
    });
    const [dataViewRetryKey, setDataViewRetryKey] = useState(0);
    const [dashboardsProxyState, setDashboardsProxyState] = useState({
        status: 'idle',
        error: '',
        checkedUrl: ''
    });
    const [authStatus, setAuthStatus] = useState('loading');
    const [authError, setAuthError] = useState('');
    const [isManualResponseOpen, setIsManualResponseOpen] = useState(false);
    const [isSocOperationsOpen, setIsSocOperationsOpen] = useState(false);
    const skipNextRouteStateSyncRef = React.useRef(false);
    const openSearchFrameRef = React.useRef(null);
    const frameRecoveryAttemptsRef = React.useRef(0);
    const [openSearchFrameRecoveryKey, setOpenSearchFrameRecoveryKey] = useState(0);
    const pageShellStyle = isDarkMode
        ? { background: 'var(--bg-body)' }
        : { background: 'var(--bg-body)' };
    const moduleOpenSearchView = getModuleOpenSearchView(activeModuleId, activeView);
    const activeAlertFocus = alertFocus?.moduleId === activeModuleId && alertFocus?.viewId === activeView ? alertFocus : null;
    const activeDataViewTitles = activeAlertFocus?.dataViewTitles?.length
        ? activeAlertFocus.dataViewTitles
        : getModuleDataViewTitles(activeModuleId);
    const activeDataViewTitleKey = activeDataViewTitles.join('|');
    const activeDataViewTimeField = activeAlertFocus?.sortField
        || moduleOpenSearchView?.sortField
        || fallbackTimeFieldForModule(activeModuleId);
    const activeDataViewFields = [
        activeDataViewTimeField,
        ...(activeAlertFocus?.columns || []),
        ...(moduleOpenSearchView?.columns || [])
    ].filter(Boolean);
    const activeDataViewFieldKey = Array.from(new Set(activeDataViewFields)).join('|');
    const canUseManualResponse = ['edr', 'unified'].includes(activeModuleId);
    const shouldRenderSocAutomationPage = isSocAutomationView(activeModuleId, activeView);
    const openSearchFrameKey = `${activeModuleId}-${activeView}-${activeDataViewId}-${timeRange}-${searchQuery}-${activeAlertFocus?.query || 'default'}-${openSearchFrameRecoveryKey}`;
    const isAlertFocusedView = Boolean(activeAlertFocus?.query);
    const isDiscoverLikeView = Boolean((moduleOpenSearchView && !moduleOpenSearchView.dashboardId && moduleOpenSearchView.app !== 'maps') || isAlertFocusedView);
    const isDataViewReady = !activeDataViewTitles.length
        || (dataViewState.status === 'ready' && dataViewState.requestKey === activeDataViewTitleKey && Boolean(activeDataViewId));
    const shouldGuardOpenSearchFrame = Boolean(moduleOpenSearchView && activeDataViewTitles.length && !isDataViewReady);
    const activeRouteConfig = React.useMemo(() => getRouteConfig(currentPath), [currentPath]);
    const iframeClassName = isAlertFocusedView
        ? 'absolute left-0 -top-[110px] w-full h-[calc(100%+110px)] border-0 block opacity-100 transition-opacity duration-500 bg-white'
        : isDiscoverLikeView
            ? 'absolute inset-0 w-full h-full border-0 block opacity-100 transition-opacity duration-500 bg-white'
            : 'absolute w-[calc(100%+20px)] h-[calc(100%+80px)] -top-[100px] -left-[10px] border-0 block opacity-100 transition-opacity duration-500';

    const syncBrowserPath = React.useCallback((nextPath, options = {}) => {
        if (typeof window === 'undefined') {
            return;
        }

        const { replace = false, stateDriven = false } = options;
        const normalizedPath = normalizePathname(nextPath);

        if (window.location.pathname !== normalizedPath) {
            if (stateDriven) {
                skipNextRouteStateSyncRef.current = true;
            }

            window.history[replace ? 'replaceState' : 'pushState']({}, document.title, normalizedPath);
        }

        setCurrentPath(normalizedPath);
    }, []);

    React.useEffect(() => {
        frameRecoveryAttemptsRef.current = 0;
    }, [activeDataViewTitleKey, activeModuleId, activeView]);

    const recoverFromOpenSearchManagementRedirect = React.useCallback(() => {
        let frameHref = '';

        try {
            frameHref = openSearchFrameRef.current?.contentWindow?.location?.href || '';
        } catch (_error) {
            return;
        }

        const landedOnIndexPatternSetup = frameHref.includes('/management/')
            && (frameHref.includes('/indexPatterns') || frameHref.includes('/dataViews'));

        if (!landedOnIndexPatternSetup || frameRecoveryAttemptsRef.current >= 3) {
            return;
        }

        frameRecoveryAttemptsRef.current += 1;
        setDataViewRetryKey((value) => value + 1);
        setOpenSearchFrameRecoveryKey((value) => value + 1);
    }, []);

    React.useEffect(() => {
        let cancelled = false;

        if (!activeDataViewTitles.length) {
            setActiveDataViewId('');
            setDataViewState({
                status: 'ready',
                id: '',
                title: '',
                error: '',
                requestKey: activeDataViewTitleKey,
                requestedTitles: []
            });
            return undefined;
        }

        setActiveDataViewId('');
        setDataViewState({
            status: 'loading',
            id: '',
            title: '',
            error: '',
            requestKey: activeDataViewTitleKey,
            requestedTitles: activeDataViewTitles
        });

        ensureDataViewId(activeDataViewTitles, {
            timeFieldName: activeDataViewTimeField,
            fields: activeDataViewFields,
            force: dataViewRetryKey > 0
        })
            .then((dataView) => {
                if (!cancelled) {
                    setActiveDataViewId(dataView.id);
                    setDataViewState({
                        status: 'ready',
                        id: dataView.id,
                        title: dataView.title,
                        error: '',
                        requestKey: activeDataViewTitleKey,
                        requestedTitles: activeDataViewTitles
                    });
                }
            })
            .catch((error) => {
                if (!cancelled) {
                    setActiveDataViewId('');
                    setDataViewState({
                        status: 'error',
                        id: '',
                        title: '',
                        error: error.message || 'OpenSearch Dashboards data view repair failed.',
                        requestKey: activeDataViewTitleKey,
                        requestedTitles: activeDataViewTitles
                    });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [activeDataViewFieldKey, activeDataViewTitleKey, activeDataViewTimeField, dataViewRetryKey]);

    React.useEffect(() => {
        const handlePopState = () => {
            setCurrentPath(normalizePathname(window.location.pathname));
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    React.useEffect(() => {
        if (activeRouteConfig.canonicalPath !== currentPath) {
            syncBrowserPath(activeRouteConfig.canonicalPath, { replace: true });
        }
    }, [activeRouteConfig.canonicalPath, currentPath, syncBrowserPath]);

    React.useEffect(() => {
        let cancelled = false;

        initializeKeycloakSession()
            .then((session) => {
                if (cancelled) {
                    return;
                }

                if (session?.user) {
                    setUser(session.user.displayName || session.user.username || 'admin');
                    setAuthStatus('authenticated');
                    setAuthError('');
                    return;
                }

                setAppState('login');
                setAuthStatus('unauthenticated');
            })
            .catch((error) => {
                if (cancelled) {
                    return;
                }

                clearKeycloakSession();
                setAppState('login');
                setAuthStatus('unauthenticated');
                setAuthError(error.message || 'Keycloak authentication failed.');
            });

        return () => {
            cancelled = true;
        };
    }, []);

    React.useEffect(() => {
        if (authStatus !== 'authenticated') {
            return;
        }

        if (skipNextRouteStateSyncRef.current) {
            skipNextRouteStateSyncRef.current = false;
            return;
        }

        if (activeRouteConfig.appState === 'team-select') {
            setAlertFocus(null);
            setSearchQuery('');
            setAppState('team-select');
            return;
        }

        const nextModuleId = activeRouteConfig.moduleId || 'siem';

        setAlertFocus(null);
        setSearchQuery('');
        setAppState('dashboard');
        setActiveModuleId(nextModuleId);
        setActiveView(MODULE_CONFIG[nextModuleId]?.defaultView || 'home');
    }, [activeRouteConfig.appState, activeRouteConfig.moduleId, authStatus]);

    React.useEffect(() => {
        if (authStatus !== 'authenticated' || appState === 'login') {
            return;
        }

        const expectedPath = appState === 'team-select'
            ? DEFAULT_ROUTE_PATH
            : getModuleRoutePath(activeModuleId);

        if (expectedPath !== currentPath) {
            syncBrowserPath(expectedPath, { stateDriven: true });
        }
    }, [activeModuleId, appState, authStatus, currentPath, syncBrowserPath]);

    // Get current module config
    const activeModuleConfig = MODULE_CONFIG[activeModuleId] || MODULE_CONFIG.siem;
    const isSiemLiveAlertsView = activeModuleId === 'siem' && activeView === 'live-alerts';
    const shouldRenderCmtDashboard = ['siem', 'unified'].includes(activeModuleId) && isCmtView(activeView);

    const clearAlertFocus = () => {
        setAlertFocus(null);
    };

    const handleAlertNavigate = (alert) => {
        if (!alert) {
            return;
        }

        setSearchQuery('');
        setAlertFocus({
            moduleId: alert.moduleId,
            viewId: alert.viewId,
            query: alert.focusQuery || '',
            columns: alert.focusColumns || [],
            sortField: alert.focusSortField || '',
            dataViewTitles: alert.focusDataViewTitles || [],
            title: alert.title || '',
            summary: alert.summary || '',
            severity: alert.severity || '',
            source: alert.source || '',
            timestamp: alert.timestamp || '',
            documentId: alert.documentId || '',
            documentIndex: alert.documentIndex || ''
        });

        if (alert.moduleId && alert.moduleId !== activeModuleId) {
            setActiveModuleId(alert.moduleId);
        }

        if (alert.viewId) {
            setActiveView(alert.viewId);
        }
    };

    const handleManualResponseSubmitted = () => {
        if (!canUseManualResponse) {
            setActiveModuleId('edr');
        }

        setActiveView('manual-operations');
        setSearchQuery('');
        setAlertFocus(null);
    };

    const handleLogout = () => {
        setIsLogoutDialogOpen(false);
        setUser(null);
        setAlertFocus(null);
        setSearchQuery('');
        setAppState('login');
        setAuthStatus('unauthenticated');

        try {
            logoutFromKeycloak();
        } catch (_error) {
            clearKeycloakSession();
        }
    };

    // Construct iframe URL for OpenSearch views
    const getDashboardUrl = () => {
        const baseUrl = getDashboardsBaseUrl();
        // Pass theme param to OpenSearch Dashboards
        const themeParam = isDarkMode ? 'dark' : 'light';
        const embedParams = `embed=true&theme=${themeParam}&security_tenant=global&timezone=UTC`;

        if (moduleOpenSearchView) {
            return buildModuleOpenSearchUrl({
                moduleId: activeModuleId,
                baseUrl,
                theme: themeParam,
                timeRange,
                searchQuery,
                dataViewId: activeDataViewId,
                viewId: activeView,
                alertFocus: activeAlertFocus
            });
        }

        // Global state for time range
        const globalState = `_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:now-${timeRange},to:now))`;

        // App state for search query
        const appState = searchQuery ? `&_a=(query:(language:kuery,query:'${encodeURIComponent(searchQuery)}'))` : '';

        // Map views to OpenSearch Dashboard apps/pages
        const viewRoutes = {
            // Explore section - Use OpenSearch Dashboard apps
            // Note: embed=true usually comes before hash. We explicitly add theme.
            'discover': `${baseUrl}/app/discover?${embedParams}#/?${globalState}${appState}`,
            'dashboards': `${baseUrl}/app/dashboards?${embedParams}#/list`,
            'visualize': `${baseUrl}/app/visualize?${embedParams}#/?${globalState}${appState}`,
            'reporting': `${baseUrl}/app/reports-dashboards?${embedParams}#/`,
            'alerting': `${baseUrl}/app/alerting?${embedParams}#/`,
            'anomaly': `${baseUrl}/app/anomaly-detection-dashboards?${embedParams}#/`,
            'maps': `${baseUrl}/app/maps-dashboards?${embedParams}#/`,

            // For all other views, use team-specific dashboard pages
            'default': `${baseUrl}/app/dashboards?${embedParams}#/view/${activeModuleId}-${activeView}?${globalState}${appState}`
        };

        // Return the specific route or default to dashboard page
        return viewRoutes[activeView] || viewRoutes['default'];
    };

    const dashboardUrl = getDashboardUrl();

    React.useEffect(() => {
        let cancelled = false;

        if (appState !== 'dashboard' || !moduleOpenSearchView || shouldGuardOpenSearchFrame) {
            setDashboardsProxyState({
                status: 'idle',
                error: '',
                checkedUrl: ''
            });
            return undefined;
        }

        const checkedUrl = stripHashFromUrl(dashboardUrl);

        setDashboardsProxyState({
            status: 'checking',
            error: '',
            checkedUrl
        });

        fetch(checkedUrl, {
            method: 'GET',
            cache: 'no-store',
            credentials: 'same-origin',
            headers: {
                'osd-xsrf': 'true'
            }
        })
            .then(async (response) => {
                const body = await response.text().catch(() => '');

                if (!response.ok) {
                    throw new Error(`OpenSearch proxy returned HTTP ${response.status} for ${checkedUrl}.`);
                }

                if (!looksLikeOpenSearchDashboardsHtml(body)) {
                    throw new Error(
                        `The iframe route ${checkedUrl} did not return OpenSearch Dashboards HTML. ` +
                        'Another dev server or the React fallback may be serving the route.'
                    );
                }
            })
            .then(() => {
                if (!cancelled) {
                    setDashboardsProxyState({
                        status: 'ready',
                        error: '',
                        checkedUrl
                    });
                }
            })
            .catch((error) => {
                if (!cancelled) {
                    setDashboardsProxyState({
                        status: 'error',
                        error: error.message || 'OpenSearch iframe route preflight failed.',
                        checkedUrl
                    });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [appState, dashboardUrl, moduleOpenSearchView, openSearchFrameRecoveryKey, shouldGuardOpenSearchFrame]);

    const shouldGuardOpenSearchProxy = Boolean(
        moduleOpenSearchView
        && !shouldGuardOpenSearchFrame
        && dashboardsProxyState.status !== 'ready'
    );

    // --- Authentication Flow ---
    if (appState === 'login') {
        return (
            <Login
                error={authError}
                isAuthenticating={authStatus === 'loading' || authStatus === 'redirecting'}
                onStartLogin={async () => {
                    if (authStatus === 'redirecting') {
                        return;
                    }

                    try {
                        setAuthError('');
                        setAuthStatus('redirecting');
                        await startKeycloakLogin();
                    } catch (error) {
                        setAuthStatus('unauthenticated');
                        setAuthError(error.message || 'Keycloak redirect failed.');
                    }
                }}
            />
        );
    }

    if (appState === 'team-select') {
        return (
            <TeamSelector
                onSelectTeam={(moduleId) => {
                    clearAlertFocus();
                    setSearchQuery('');
                    setActiveModuleId(moduleId);
                    setActiveView(MODULE_CONFIG[moduleId]?.defaultView || 'home');
                    setAppState('dashboard');
                }}
            />
        );
    }

    // --- Main Dashboard ---
    return (
        <div className="app-viewport-scale flex bg-bg-body text-text-main overflow-hidden font-sans transition-colors duration-300">
            {/* Left Sidebar */}
            <Sidebar
                menuStructure={activeModuleConfig.menuStructure}
                activeView={activeView}
                moduleId={activeModuleId}
                activeTimeRange={timeRange}
                onViewChange={(viewId) => {
                    clearAlertFocus();
                    setActiveView(viewId);
                }}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-0">
                <Navbar
                    activeTimeRange={timeRange}
                    onTimeChange={setTimeRange}
                    onSearch={(value) => {
                        clearAlertFocus();
                        setSearchQuery(value);
                    }}
                    user={user}
                    activeModuleConfig={activeModuleConfig}
                    activeView={activeView}
                    onModuleChange={(moduleId) => {
                        if (moduleId !== activeModuleId) {
                            clearAlertFocus();
                            setActiveModuleId(moduleId);
                            setActiveView(MODULE_CONFIG[moduleId]?.defaultView || 'overview');
                        }
                    }}
                    onRequestLogout={() => setIsLogoutDialogOpen(true)}
                    isDarkMode={isDarkMode}
                    onToggleTheme={toggleTheme}
                    onAlertNavigate={handleAlertNavigate}
                    canUseManualResponse={canUseManualResponse}
                    onManualResponse={() => setIsManualResponseOpen(true)}
                    onSocOperations={() => setIsSocOperationsOpen(true)}
                />

                {/* Centered Logout Confirmation Dialog */}
                {isLogoutDialogOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div 
                            className="absolute inset-0 bg-background/80 animate-in fade-in duration-300" 
                            onClick={() => setIsLogoutDialogOpen(false)}
                        />
                        <div className="relative w-full max-w-sm rounded-xl border bg-background p-6 animate-in zoom-in duration-200">
                            <div className="mb-6 flex items-center gap-4">
                                <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                                    <LogOut size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">Sign Out?</h3>
                                    <p className="text-sm text-muted-foreground">You will be logged out of your session.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsLogoutDialogOpen(false)}
                                    className="flex-1 rounded-md border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="flex-1 rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <ManualResponseDialog
                    isOpen={isManualResponseOpen}
                    onClose={() => setIsManualResponseOpen(false)}
                    onSubmitted={handleManualResponseSubmitted}
                    operatorId={user}
                    moduleId={activeModuleId}
                    viewId={activeView}
                    alertContext={activeAlertFocus}
                />

                <SocOperationsDialog
                    isOpen={isSocOperationsOpen}
                    onClose={() => setIsSocOperationsOpen(false)}
                    operatorId={user}
                    moduleId={activeModuleId}
                    viewId={activeView}
                />

                {/* Dashboard Content */}
                <main className="flex-1 flex overflow-hidden relative">

                    {activeView === 'tenants' ? (
                        <div className="flex-1 overflow-y-auto p-6" style={pageShellStyle}>
                            <Tenants />
                        </div>
                    ) : activeView === 'indices' ? (
                        <div className="flex-1 overflow-y-auto p-6" style={pageShellStyle}>
                            <IndexOverview />
                        </div>
                    ) : activeModuleId === 'observability' && activeView === 'home' ? (
                        <div className="flex-1 overflow-y-auto p-6" style={pageShellStyle}>
                            <ObservabilityDashboard timeRange={timeRange} />
                        </div>
                    ) : isSiemLiveAlertsView ? (
                        <div className="flex-1 overflow-y-auto p-6" style={pageShellStyle}>
                            <SiemAlerts timeRange={timeRange} searchQuery={searchQuery} />
                        </div>
                    ) : shouldRenderCmtDashboard ? (
                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-5 lg:p-6" style={pageShellStyle}>
                            <CmtDashboard view={normalizeCmtView(activeView)} moduleId={activeModuleId} />
                        </div>
                    ) : shouldRenderSocAutomationPage ? (
                        <div className="flex-1 overflow-y-auto p-6" style={pageShellStyle}>
                            <SocAutomationPage
                                activeView={activeView}
                                moduleId={activeModuleId}
                                operatorId={user}
                                timeRange={timeRange}
                            />
                        </div>
                    ) : shouldGuardOpenSearchFrame ? (
                        <div className="flex-1 overflow-hidden relative" style={pageShellStyle}>
                            <OpenSearchDataViewGuard
                                dataViewState={{
                                    ...dataViewState,
                                    requestedTitles: activeDataViewTitles
                                }}
                                moduleTitle={activeModuleConfig.title}
                                viewTitle={moduleOpenSearchView?.title || activeView}
                                onRetry={() => setDataViewRetryKey((value) => value + 1)}
                            />
                        </div>
                    ) : shouldGuardOpenSearchProxy ? (
                        <div className="flex-1 overflow-hidden relative" style={pageShellStyle}>
                            <OpenSearchFrameGuard
                                frameState={dashboardsProxyState}
                                dashboardUrl={dashboardUrl}
                                onRetry={() => setOpenSearchFrameRecoveryKey((value) => value + 1)}
                            />
                        </div>
                    ) : (
                        /* OpenSearch Dashboards Frame */
                        <div className="flex-1 overflow-hidden relative p-4 bg-bg-body">
                            <div className="relative h-full w-full overflow-hidden rounded-xl border bg-black">
                                <iframe
                                    ref={openSearchFrameRef}
                                    key={openSearchFrameKey}
                                    src={dashboardUrl}
                                    className={iframeClassName}
                                    title={`OpenSearch Dashboard - ${activeView}`}
                                    onLoad={recoverFromOpenSearchManagementRedirect}
                                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals allow-pointer-lock allow-top-navigation-by-user-activation"
                                />
                            </div>
                        </div>
                    )}

                </main>
            </div>
        </div>
    );
}


export default App;
