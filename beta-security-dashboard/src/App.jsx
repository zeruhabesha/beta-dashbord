import React, { useState } from 'react';
import { Sidebar } from './components/Layout/Sidebar';
import { Navbar } from './components/Layout/Navbar';
import { Login } from './components/Auth/Login';
import { TeamSelector } from './components/Onboarding/TeamSelector';

import {
    ShieldAlert, LayoutDashboard, Search, FileText,
    Activity, Monitor, Network, Lock, Zap, Server
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

    // Get current module config
    const activeModuleConfig = MODULE_CONFIG[activeModuleId] || MODULE_CONFIG.siem;

    // Construct iframe URL for OpenSearch views
    const getDashboardUrl = () => {
        const baseUrl = 'http://localhost:5601';
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
                        setActiveModuleId(moduleId);
                        setActiveView(MODULE_CONFIG[moduleId]?.defaultView || 'overview');
                    }}
                    onLogout={() => {
                        setAppState('login');
                        setUser(null);
                    }}
                    isDarkMode={isDarkMode}
                    onToggleTheme={toggleTheme}
                />

                {/* Dashboard Content */}
                <main className="flex-1 flex overflow-hidden relative">

                    {/* OpenSearch Frame Container */}
                    <div className="flex-1 overflow-hidden relative p-4 bg-[#f3f4f6]">
                        {/* We use a slight padding to create a 'framed' look inside the dashboard area */}
                        <div className="w-full h-full relative overflow-hidden bg-slate-950 rounded-xl shadow-2xl">
                            {/* Loading / Placeholder state could go here */}

                            <iframe
                                key={`${activeModuleId}-${activeView}`}
                                src={getDashboardUrl()}
                                className="absolute w-[calc(100%+20px)] h-[calc(100%+80px)] -top-[100px] -left-[10px] border-0 block opacity-100 transition-opacity duration-500"
                                title={`OpenSearch Dashboard - ${activeView}`}
                            />
                        </div>
                    </div>

                </main>
            </div>
        </div>
    );
}


export default App;
