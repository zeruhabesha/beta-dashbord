// ============================================
// SOC DASHBOARD - NAVIGATION COMPONENTS
// Navbar and Sidebar functionality
// ============================================

/**
 * Navigation Manager
 * Handles navbar and sidebar interactions
 */
class NavigationManager {
    constructor() {
        this.sidebarCollapsed = false;
        this.currentPage = 'unified-dashboard';
        this.tenantDropdownOpen = false;

        this.init();
    }

    /**
     * Initialize navigation
     */
    init() {
        this.createNavbar();
        this.createSidebar();
        this.attachEventListeners();
        this.updateActiveNavItem();
    }

    /**
     * Create navbar HTML
     */
    createNavbar() {
        const navbar = document.createElement('nav');
        navbar.className = 'navbar';
        navbar.innerHTML = `
      <div class="navbar-brand">
        <div class="navbar-logo">BETA</div>
        <span>OpenSearch Security</span>
      </div>
      
      <div class="navbar-controls">
        <!-- Tenant Selector -->
        <div class="tenant-selector">
          <button class="tenant-selector-button" id="tenantSelectorBtn">
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
            </svg>
            <span id="selectedTenant">Tenant_01</span>
            <svg class="icon icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
          <div class="tenant-selector-dropdown" id="tenantDropdown">
            <div class="tenant-option active" data-tenant="Tenant_01">
              <svg class="icon icon-sm" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
              </svg>
              Tenant_01
            </div>
            <div class="tenant-option" data-tenant="Tenant_02">Tenant_02</div>
            <div class="tenant-option" data-tenant="Tenant_03">Tenant_03</div>
            <div class="tenant-option" data-tenant="Tenant_04">Tenant_04</div>
          </div>
        </div>
        
        <!-- Time Range Selector -->
        <div class="time-range-selector">
          <button class="time-range-option" data-range="15m">Last 15m</button>
          <button class="time-range-option" data-range="1h">1h</button>
          <button class="time-range-option active" data-range="24h">24h</button>
          <button class="time-range-option" data-range="7d">7d</button>
        </div>
        
        <!-- Global Search -->
        <div class="global-search">
          <svg class="global-search-icon icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <input 
            type="text" 
            class="global-search-input" 
            placeholder="Search alerts, hosts, IPs..."
            id="globalSearch"
          />
        </div>
      </div>
      
      <div class="navbar-actions">
        <!-- Notification Bell -->
        <button class="notification-bell" id="notificationBell">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
          </svg>
          <span class="notification-badge" id="notificationCount">12</span>
        </button>
        
        <!-- User Profile -->
        <div class="user-profile">
          <div class="user-avatar">SA</div>
          <div class="user-info">
            <div class="user-name">SOC Analyst</div>
            <div class="user-role">Admin</div>
          </div>
        </div>
      </div>
    `;

        document.body.appendChild(navbar);
    }

    /**
     * Create sidebar HTML
     */
    createSidebar() {
        const sidebar = document.createElement('aside');
        sidebar.className = 'sidebar';
        sidebar.id = 'sidebar';
        sidebar.innerHTML = `
      <button class="sidebar-toggle" id="sidebarToggle">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
        </svg>
      </button>
      
      <ul class="sidebar-nav">
        <li class="sidebar-nav-item">
          <a href="#" class="sidebar-nav-link" data-page="unified-dashboard">
            <svg class="sidebar-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
            </svg>
            <span class="sidebar-nav-text">Unified Dashboard</span>
          </a>
        </li>
        
        <li class="sidebar-nav-item">
          <a href="#" class="sidebar-nav-link" data-page="siem-alerts">
            <svg class="sidebar-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <span class="sidebar-nav-text">SIEM Alerts</span>
          </a>
        </li>
        
        <li class="sidebar-nav-item">
          <a href="#" class="sidebar-nav-link" data-page="ids-ips-analysis">
            <svg class="sidebar-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
            </svg>
            <span class="sidebar-nav-text">IDS / IPS Analysis</span>
          </a>
        </li>
        
        <li class="sidebar-nav-item">
          <a href="#" class="sidebar-nav-link" data-page="edr-analysis">
            <svg class="sidebar-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
            <span class="sidebar-nav-text">EDR Analysis</span>
          </a>
        </li>
        
        <li class="sidebar-nav-item">
          <a href="#" class="sidebar-nav-link" data-page="unified-timeline">
            <svg class="sidebar-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="sidebar-nav-text">Unified Timeline</span>
          </a>
        </li>
        
        <li class="sidebar-nav-item">
          <a href="#" class="sidebar-nav-link" data-page="host-ip-correlation">
            <svg class="sidebar-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
            </svg>
            <span class="sidebar-nav-text">Host / IP Correlation</span>
          </a>
        </li>
        
        <li class="sidebar-nav-item">
          <a href="#" class="sidebar-nav-link" data-page="reports">
            <svg class="sidebar-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <span class="sidebar-nav-text">Reports</span>
          </a>
        </li>
        
        <li class="sidebar-nav-item">
          <a href="#" class="sidebar-nav-link" data-page="settings">
            <svg class="sidebar-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            <span class="sidebar-nav-text">Settings</span>
          </a>
        </li>
      </ul>
    `;

        document.body.appendChild(sidebar);
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Sidebar toggle
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            this.toggleSidebar();
        });

        // Sidebar navigation
        document.querySelectorAll('.sidebar-nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                this.navigateToPage(page);
            });
        });

        // Tenant selector
        document.getElementById('tenantSelectorBtn').addEventListener('click', () => {
            this.toggleTenantDropdown();
        });

        document.querySelectorAll('.tenant-option').forEach(option => {
            option.addEventListener('click', () => {
                this.selectTenant(option.dataset.tenant);
            });
        });

        // Time range selector
        document.querySelectorAll('.time-range-option').forEach(option => {
            option.addEventListener('click', () => {
                this.selectTimeRange(option.dataset.range);
            });
        });

        // Global search
        document.getElementById('globalSearch').addEventListener('input', (e) => {
            this.handleGlobalSearch(e.target.value);
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.tenant-selector')) {
                this.closeTenantDropdown();
            }
        });
    }

    /**
     * Toggle sidebar collapse
     */
    toggleSidebar() {
        this.sidebarCollapsed = !this.sidebarCollapsed;
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.querySelector('.main-content');

        if (this.sidebarCollapsed) {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('sidebar-collapsed');
        } else {
            sidebar.classList.remove('collapsed');
            mainContent.classList.remove('sidebar-collapsed');
        }
    }

    /**
     * Navigate to page
     */
    navigateToPage(page) {
        this.currentPage = page;
        this.updateActiveNavItem();

        // Trigger page load event
        window.dispatchEvent(new CustomEvent('pageChange', { detail: { page } }));
    }

    /**
     * Update active navigation item
     */
    updateActiveNavItem() {
        document.querySelectorAll('.sidebar-nav-link').forEach(link => {
            if (link.dataset.page === this.currentPage) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    /**
     * Toggle tenant dropdown
     */
    toggleTenantDropdown() {
        this.tenantDropdownOpen = !this.tenantDropdownOpen;
        const dropdown = document.getElementById('tenantDropdown');

        if (this.tenantDropdownOpen) {
            dropdown.classList.add('active');
        } else {
            dropdown.classList.remove('active');
        }
    }

    /**
     * Close tenant dropdown
     */
    closeTenantDropdown() {
        this.tenantDropdownOpen = false;
        document.getElementById('tenantDropdown').classList.remove('active');
    }

    /**
     * Select tenant
     */
    selectTenant(tenant) {
        document.getElementById('selectedTenant').textContent = tenant;
        mockData.setTenant(tenant);

        // Update active state
        document.querySelectorAll('.tenant-option').forEach(option => {
            if (option.dataset.tenant === tenant) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });

        this.closeTenantDropdown();

        // Trigger data refresh
        window.dispatchEvent(new CustomEvent('tenantChange', { detail: { tenant } }));
    }

    /**
     * Select time range
     */
    selectTimeRange(range) {
        mockData.setTimeRange(range);

        // Update active state
        document.querySelectorAll('.time-range-option').forEach(option => {
            if (option.dataset.range === range) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });

        // Trigger data refresh
        window.dispatchEvent(new CustomEvent('timeRangeChange', { detail: { range } }));
    }

    /**
     * Handle global search
     */
    handleGlobalSearch(query) {
        if (query.length < 2) return;

        console.log('Searching for:', query);
        // Implement search functionality here
        window.dispatchEvent(new CustomEvent('globalSearch', { detail: { query } }));
    }
}

// Initialize navigation when DOM is ready
let navigationManager;
document.addEventListener('DOMContentLoaded', () => {
    navigationManager = new NavigationManager();
});
