import React, { useState } from 'react';
import { Sidebar } from './components/Layout/Sidebar';
import { Navbar } from './components/Layout/Navbar';
import { Login } from './components/Auth/Login';
import { TeamSelector } from './components/Onboarding/TeamSelector';
import { Tenants } from './components/Pages/Tenants';
import { IndexOverview } from './components/Dashboard/IndexOverview';

import {
    ShieldAlert, LayoutDashboard, Search, FileText,
    Activity, Monitor, Network, Lock, Zap, Server, LogOut
} from 'lucide-react';

import { MODULE_CONFIG } from './config/moduleConfig';

function App() {
    const [appState, setAppState] = useState('login'); // 'login' | 'team-select' | 'dashboard'
    const [activeModuleId, setActiveModuleId] = useState('siem');
    // activeView is now local to the module, assume default to start
    const [activeView, setActiveView] = useState('overview');

    // Theme State (Default to Dark)
    const [isDarkMode, setIsDarkMode] = useState(true);

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
        if (isDarkMode) {
            document.documentElement.classList.remove('dark');
        } else {
            document.documentElement.classList.add('dark');
        }
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
    const [user, setUser] = useState(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

    // Get current module config
    const activeModuleConfig = MODULE_CONFIG[activeModuleId] || MODULE_CONFIG.siem;

    const handleLogout = () => {
        // Clear Browser Storage and Sessions
        localStorage.clear();
        sessionStorage.clear();
        
        // Reset App State
        setAppState('login');
        setUser(null);
        setActiveModuleId('siem');
        setSearchQuery('');
        setIsLogoutDialogOpen(false);
    };

    // Construct iframe URL for OpenSearch views
    const getDashboardUrl = () => {
        const baseUrl = window._env_?.OPENSEARCH_URL || 'http://localhost:5601';
        // Pass theme param to OpenSearch Dashboards
        const themeParam = isDarkMode ? 'dark' : 'light';

        // Global state for time range
        const globalState = `_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:now-${timeRange},to:now))`;

        // App state for search query
        const appState = searchQuery ? `&_a=(query:(language:kuery,query:'${encodeURIComponent(searchQuery)}'))` : '';

        // Map views to OpenSearch Dashboard apps/pages
        const viewRoutes = {
            // Explore section - Use OpenSearch Dashboard apps
            // Note: embed=true usually comes before hash. We explicitly add theme.
            'discover': `${baseUrl}/app/discover?embed=true&theme=${themeParam}#/?${globalState}${appState}`,
            'dashboards': `${baseUrl}/app/dashboards?embed=true&theme=${themeParam}#/list`,
            'visualize': `${baseUrl}/app/visualize?embed=true&theme=${themeParam}#/?${globalState}${appState}`,
            'reporting': `${baseUrl}/app/reports-dashboards?embed=true&theme=${themeParam}#/`,
            'alerting': `${baseUrl}/app/alerting?embed=true&theme=${themeParam}#/`,
            'anomaly': `${baseUrl}/app/anomaly-detection-dashboards?embed=true&theme=${themeParam}#/`,
            'maps': `${baseUrl}/app/maps-dashboards?embed=true&theme=${themeParam}#/`,

            // For all other views, use team-specific dashboard pages
            'default': `${baseUrl}/app/dashboards?embed=true&theme=${themeParam}#/view/${activeModuleId}-${activeView}?${globalState}${appState}`
        };

        // Return the specific route or default to dashboard page
        return viewRoutes[activeView] || viewRoutes['default'];
    };

    // --- Authentication Flow ---
    if (appState === 'login') {
        return (
            <Login onLoginSuccess={(username) => {
                setUser(username);
                setAppState('team-select');
            }} />
        );
    }

    // --- Team Selection Flow ---
    if (appState === 'team-select') {
        return (
            <TeamSelector onSelectTeam={(teamId) => {
                // Team ID maps to Module ID in our new config
                setActiveModuleId(teamId);
                setActiveView(MODULE_CONFIG[teamId]?.defaultView || 'overview');
                setAppState('dashboard');
            }} />
        );
    }



    // --- Main Dashboard ---
    return (
        <div className="flex bg-bg-body text-text-main h-screen w-screen overflow-hidden font-sans transition-colors duration-300">
            {/* Left Sidebar */}
            <Sidebar
                menuStructure={activeModuleConfig.menuStructure}
                activeView={activeView}
                onViewChange={setActiveView}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-0">
                <Navbar
                    activeTimeRange={timeRange}
                    onTimeChange={setTimeRange}
                    onSearch={setSearchQuery}
                    user={user}
                    activeModuleConfig={activeModuleConfig}
                    onModuleChange={(moduleId) => {
                        if (moduleId !== activeModuleId) {
                            setActiveModuleId(moduleId);
                            setActiveView(MODULE_CONFIG[moduleId]?.defaultView || 'overview');
                        }
                    }}
                    onRequestLogout={() => setIsLogoutDialogOpen(true)}
                    isDarkMode={isDarkMode}
                    onToggleTheme={toggleTheme}
                />

                {/* Centered Logout Confirmation Dialog */}
                {isLogoutDialogOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <div 
                            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300" 
                            onClick={() => setIsLogoutDialogOpen(false)}
                        />
                        <div className="relative w-full max-w-sm bg-bg-sidebar border border-border-subtle rounded-2xl shadow-xl p-6 animate-in zoom-in duration-200">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-full bg-status-critical/10 flex items-center justify-center text-status-critical">
                                    <LogOut size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-text-main">Sign Out?</h3>
                                    <p className="text-sm text-text-muted">You will be logged out of your session.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsLogoutDialogOpen(false)}
                                    className="flex-1 px-4 py-2 rounded-xl border border-border-subtle text-sm font-semibold text-text-main hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="flex-1 px-4 py-2 rounded-xl bg-status-critical text-white text-sm font-semibold hover:bg-status-critical/90 transition-colors"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Dashboard Content */}
                <main className="flex-1 flex overflow-hidden relative">

                    {activeView === 'tenants' ? (
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-900/50">
                            <Tenants />
                        </div>
                    ) : activeView === 'indices' ? (
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-900/50">
                            <IndexOverview />
                        </div>
                    ) : (
                        /* OpenSearch Dashboards Frame */
                        <div className="flex-1 overflow-hidden relative p-4 bg-[#f3f4f6]">
                            <div className="w-full h-full relative overflow-hidden bg-slate-950 rounded-xl shadow-2xl">
                                <iframe
                                    key={`${activeModuleId}-${activeView}`}
                                    src={getDashboardUrl()}
                                    className="absolute w-[calc(100%+20px)] h-[calc(100%+80px)] -top-[100px] -left-[10px] border-0 block opacity-100 transition-opacity duration-500"
                                    title={`OpenSearch Dashboard - ${activeView}`}
                                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
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
