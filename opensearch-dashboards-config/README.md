# BETA - OpenSearch Dashboards Configuration Guide

Complete guide for setting up OpenSearch Dashboards with BETA branding for SOC monitoring.

## 📋 Prerequisites

- OpenSearch cluster running (localhost:9200)
- OpenSearch Dashboards running (localhost:5601)
- Security indices created: `tenant_*_siem-*`, `tenant_*_ips-*`, `tenant_*_edr-*`

## 🚀 Quick Start

### Step 1: Import Saved Objects

1. Open OpenSearch Dashboards: http://localhost:5601
2. Navigate to **Stack Management** → **Saved Objects**
3. Click **Import**
4. Select `saved-objects-export.ndjson`
5. Click **Import**
6. Resolve any conflicts (choose "Overwrite" if updating)

### Step 2: Configure BETA Branding

Edit `opensearch_dashboards.yml`:

```yaml
# BETA Branding
opensearchDashboards.branding:
  applicationTitle: "BETA - OpenSearch Security"
  
# Dark theme by default
uiSettings.overrides:
  "theme:darkMode": true
```

Restart OpenSearch Dashboards:
```bash
# Linux/Mac
systemctl restart opensearch-dashboards

# Docker
docker restart opensearch-dashboards

# Windows
Restart-Service opensearch-dashboards
```

### Step 3: Access Dashboards

Navigate to **Dashboards** → **BETA - Unified Security Dashboard**

## 📊 Included Components

### Index Patterns
- `tenant_*_siem-*` - SIEM alerts
- `tenant_*_ips-*` - IDS/IPS events
- `tenant_*_edr-*` - EDR events
- `tenant_*` - Unified view

### Visualizations
- **Total Events** - Metric count
- **Critical Alerts** - Metric with color coding
- **Active Hosts** - Unique cardinality
- **Event Timeline** - Multi-line chart by data source
- **Severity Distribution** - Donut chart
- **Top Triggered Rules** - Horizontal bar chart

### Dashboards
- **BETA - Unified Security Dashboard** - Main overview

## 🎨 Custom Branding (Advanced)

### Add Custom Logo

1. Create logo files:
   - `beta-logo.svg` (full logo)
   - `beta-mark.svg` (icon only)
   - `beta-favicon.ico` (favicon)

2. Place in OpenSearch Dashboards assets:
```bash
cp beta-logo.svg /usr/share/opensearch-dashboards/src/core/server/core_app/assets/
cp beta-mark.svg /usr/share/opensearch-dashboards/src/core/server/core_app/assets/
cp beta-favicon.ico /usr/share/opensearch-dashboards/src/core/server/core_app/assets/
```

3. Update `opensearch_dashboards.yml`:
```yaml
opensearchDashboards.branding:
  logo:
    defaultUrl: "/ui/beta-logo.svg"
  mark:
    defaultUrl: "/ui/beta-mark.svg"
  faviconUrl: "/ui/beta-favicon.ico"
  applicationTitle: "BETA - OpenSearch Security"
```

### Custom Dark Theme CSS

Create `custom.css`:
```css
/* BETA Dark Theme */
body {
  --osd-global-background-color: #0f1419;
  --osd-global-text-color: #ffffff;
}

.euiHeader {
  background-color: rgba(26, 29, 41, 0.7) !important;
  backdrop-filter: blur(12px);
}

.euiButton--primary {
  background-color: #3b82f6 !important;
}

/* Severity colors */
.severity-critical { color: #ef4444 !important; }
.severity-high { color: #f97316 !important; }
.severity-medium { color: #eab308 !important; }
.severity-low { color: #22c55e !important; }
```

## 🔧 Multi-Tenancy Setup

### Enable Multi-Tenancy

Edit `opensearch_dashboards.yml`:
```yaml
opensearch_security.multitenancy.enabled: true
opensearch_security.multitenancy.tenants.preferred: ["Global", "Private"]
opensearch_security.multitenancy.tenants.enable_global: true
opensearch_security.multitenancy.tenants.enable_private: true
```

### Create Tenant-Specific Dashboards

1. Switch tenant: **Top right menu** → **Switch tenant**
2. Select tenant (e.g., "Tenant_01")
3. Import saved objects for that tenant
4. Dashboards will be isolated per tenant

## 📈 Creating Additional Visualizations

### Example: Top Source IPs Table

1. **Visualize** → **Create visualization** → **Data table**
2. Select index pattern: `tenant_*`
3. Add aggregation:
   - **Bucket**: Terms
   - **Field**: `source_ip.keyword`
   - **Size**: 10
   - **Order by**: Count (Descending)
4. Add metric:
   - **Metric**: Count
5. Save as "Top Source IPs"

### Example: Geographic IP Map

1. **Visualize** → **Create visualization** → **Coordinate Map**
2. Select index pattern: `tenant_*`
3. Add aggregation:
   - **Bucket**: Geohash
   - **Field**: `source_ip_geo.location`
4. Configure map settings
5. Save as "Attack Origins Map"

## 🔍 Useful Queries

### Find Critical Alerts
```
severity: "Critical" AND data_source: "SIEM"
```

### Find Failed Login Attempts
```
rule_name: *"Failed Login"* OR rule_name: *"Brute Force"*
```

### Find External IPs
```
NOT source_ip: (192.168.* OR 10.* OR 172.16.*)
```

### Find Lateral Movement
```
rule_name: *"Lateral Movement"* OR rule_name: *"Privilege Escalation"*
```

## ⚡ Performance Optimization

### For Large Datasets (Millions of Events)

1. **Use Index Lifecycle Management (ILM)**
   - Hot tier: Recent data (last 7 days)
   - Warm tier: Older data (7-30 days)
   - Cold tier: Archive (30+ days)

2. **Enable Query Caching**
```yaml
# opensearch.yml
indices.queries.cache.size: 10%
```

3. **Use Date Math in Index Patterns**
```
tenant_*_siem-<now/d>
```

4. **Limit Time Range**
   - Default: Last 24 hours
   - Use auto-refresh sparingly

5. **Use Aggregations Instead of Raw Data**
   - Aggregations are much faster
   - Avoid "Show all rows" on large datasets

## 🧪 Testing

### Verify Index Patterns

```bash
curl -X GET "localhost:9200/_cat/indices/tenant_*?v"
```

### Test Query Performance

```bash
curl -X GET "localhost:9200/tenant_*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "size": 0,
  "aggs": {
    "by_severity": {
      "terms": { "field": "severity.keyword" }
    }
  }
}
'
```

### Check Dashboard Load Time

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Load dashboard
4. Check total load time (should be <5 seconds)

## 🐛 Troubleshooting

### Index Pattern Not Found
- Verify indices exist: `GET /_cat/indices/tenant_*`
- Check index pattern matches your indices
- Refresh field list in index pattern settings

### Visualizations Not Loading
- Check time range (expand to "Last 7 days")
- Verify data exists in selected time range
- Check browser console for errors

### Slow Dashboard Performance
- Reduce time range
- Disable auto-refresh
- Use aggregations instead of raw data
- Check OpenSearch cluster health

### Multi-Tenancy Not Working
- Verify security plugin is enabled
- Check `opensearch_dashboards.yml` configuration
- Restart OpenSearch Dashboards

## 📚 Additional Resources

- [OpenSearch Dashboards Documentation](https://opensearch.org/docs/latest/dashboards/)
- [Visualization Types](https://opensearch.org/docs/latest/dashboards/visualize/viz-index/)
- [Dashboard Best Practices](https://opensearch.org/docs/latest/dashboards/dashboard/index/)

## 🎯 Next Steps

1. ✅ Import saved objects
2. ✅ Configure BETA branding
3. ✅ Test with sample data
4. 🔄 Create additional visualizations
5. 🔄 Set up alerts and notifications
6. 🔄 Configure user roles and permissions
7. 🔄 Enable audit logging

---

**Need Help?** Check the troubleshooting section or OpenSearch documentation.
