# Unified Security - SOC Dashboard

A comprehensive, multi-page cybersecurity Security Operations Center (SOC) dashboard with unified security monitoring across SIEM, IDS/IPS, and EDR data sources.

![Dashboard Preview](../uploaded_image_1766990335297.png)

## 🎯 Features

### Multi-Page Dashboard
- **Unified Security Dashboard** - Single-pane-of-glass view combining all data sources
- **SIEM Alerts** - Security Information and Event Management monitoring
- **IDS/IPS Analysis** - Intrusion Detection and Prevention System analysis
- **EDR Analysis** - Endpoint Detection and Response monitoring
- **Unified Timeline** - Comprehensive event timeline across all sources
- **Host/IP Correlation** - Interactive graph visualization for threat hunting

### Core Capabilities
- ✅ **Multi-Tenant Support** - Switch between different tenants
- ✅ **Time Range Filtering** - 15m, 1h, 24h, 7d views
- ✅ **Global Search** - Search across alerts, hosts, and IPs
- ✅ **Real-time Notifications** - Alert badge with count
- ✅ **Interactive Charts** - Line, bar, and doughnut charts with Chart.js
- ✅ **Graph Visualization** - D3.js force-directed graph for correlation
- ✅ **Collapsible Sidebar** - Space-efficient navigation
- ✅ **Dark Theme** - Professional SOC-style dark interface

## 🎨 Design System

### Color Palette
- **Primary Background**: `#0f1419` (Deep Navy)
- **Secondary Background**: `#1a1d29` (Charcoal)
- **Brand Primary**: `#3b82f6` (Blue)
- **Text Primary**: `#ffffff` (White)

### Severity Colors
- **Critical**: `#ef4444` (Red)
- **High**: `#f97316` (Orange)
- **Medium**: `#eab308` (Yellow)
- **Low**: `#22c55e` (Green)

### Typography
- **Font Family**: Inter (Google Fonts)
- **Monospace**: Fira Code (for IPs, timestamps)

## 📁 Project Structure

```
soc-dashboard/
├── index.html              # Main entry point
├── css/
│   ├── main.css           # Core styles and design tokens
│   ├── components.css     # Reusable components (navbar, sidebar, cards, tables)
│   └── pages.css          # Page-specific layouts
├── js/
│   ├── app.js             # Main application logic
│   ├── navigation.js      # Navbar and sidebar functionality
│   ├── charts.js          # Chart.js rendering
│   ├── data.js            # Mock data generator
│   └── correlation.js     # D3.js graph visualization
└── README.md              # This file
```

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Edge, Safari)
- A local web server (Python, Node.js, or any HTTP server)

### Installation

1. **Navigate to the project directory**
   ```bash
   cd c:\opensearch-standalone\soc-dashboard
   ```

2. **Start a local web server**

   **Option 1: Python**
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   ```

   **Option 2: Node.js (with http-server)**
   ```bash
   npx http-server -p 8000
   ```

   **Option 3: PHP**
   ```bash
   php -S localhost:8000
   ```

3. **Open in browser**
   ```
   http://localhost:8000
   ```

## 🎮 Usage

### Navigation
- Use the **sidebar** to navigate between different dashboard pages
- Click the **hamburger icon** to collapse/expand the sidebar
- The **active page** is highlighted in the sidebar

### Filtering
- **Tenant Selector**: Switch between different tenants (Tenant_01, Tenant_02, etc.)
- **Time Range**: Select time range (Last 15m, 1h, 24h, 7d)
- **Global Search**: Search for alerts, hosts, or IP addresses

### Interactions
- **KPI Cards**: Click to navigate to detailed views
- **Charts**: Hover to see detailed values
- **Tables**: Click column headers to sort
- **Graph Nodes**: Click and drag nodes in the correlation graph
- **Graph Zoom**: Scroll to zoom in/out on the correlation graph

## 📊 Dashboard Pages

### 1. Unified Security Dashboard
- **KPIs**: Total Events, Critical Alerts, Active Hosts, Data Sources
- **Charts**: Event Timeline, Severity Distribution, Top Triggered Rules
- **Table**: Recent Alerts from all sources

### 2. SIEM Alerts
- **KPIs**: Total Alerts, Critical, High Priority, Investigated
- **Charts**: Alert Trend, Severity Distribution
- **Table**: Detailed SIEM alerts

### 3. IDS/IPS Analysis
- **KPIs**: Total Events, Blocked Attempts, Unique IPs, Top Signature
- **Charts**: Traffic Analysis, Top Blocked IPs
- **Table**: Intrusion Attempts

### 4. EDR Analysis
- **KPIs**: Total Endpoints, Threats Detected, Quarantined Files, Active Threats
- **Charts**: Threat Timeline, Top Affected Hosts
- **Table**: EDR Events

### 5. Unified Timeline
- **Visualization**: Combined timeline chart
- **Events**: Chronological list of all events with filtering

### 6. Host/IP Correlation
- **Graph**: Interactive force-directed graph showing relationships
- **Sidebar**: Top Communicating IPs, Suspicious Patterns
- **Table**: Correlated Events

## 🔧 Customization

### Modifying Mock Data
Edit `js/data.js` to customize:
- Tenant names
- Hostnames
- IP addresses
- Alert rules and signatures
- Event frequencies

### Changing Colors
Edit CSS custom properties in `css/main.css`:
```css
:root {
  --color-brand-primary: #3b82f6;  /* Change brand color */
  --color-bg-primary: #0f1419;     /* Change background */
  /* ... */
}
```

### Adding New Pages
1. Add navigation item in `js/navigation.js`
2. Create page loader in `js/app.js`
3. Add page-specific styles in `css/pages.css`

## 🌐 Browser Support
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## 📦 Dependencies
- **Chart.js** v4.4.0 - Chart rendering
- **D3.js** v7 - Graph visualization
- **Inter Font** - Typography
- **No build tools required** - Pure HTML/CSS/JavaScript

## 🎯 Performance
- Lazy loading of charts
- Efficient data rendering
- Optimized animations
- Responsive design for large displays

## 🔐 Security Note
This is a **demonstration dashboard** with **mock data**. For production use:
- Replace mock data with real API calls
- Implement authentication and authorization
- Add HTTPS/TLS encryption
- Implement rate limiting
- Add input validation and sanitization

## 📝 License
This project is provided as-is for demonstration purposes.

## 🤝 Contributing
This is a demonstration project. Feel free to fork and customize for your needs.

## 📧 Support
For questions or issues, please refer to the documentation or create an issue.

---

**Built with ❤️ for Security Operations Centers**
