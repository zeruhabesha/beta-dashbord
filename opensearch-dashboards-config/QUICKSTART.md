# BETA OpenSearch Dashboards - Quick Start Guide

## ✅ What's Complete

All configuration files for your BETA-branded OpenSearch Dashboards are ready:

```
c:\opensearch-standalone\opensearch-dashboards-config\
├── saved-objects-export.ndjson          ← Import this into OpenSearch Dashboards
├── opensearch_dashboards.yml            ← BETA branding configuration
├── ingest-sample-data.py                ← Sample data generator (15,000 events)
├── README.md                             ← Detailed documentation
└── setup-guide.html                      ← Visual guide
```

## 🚀 Next Steps (Choose One)

### Option 1: Start Docker & Run Full Setup (Recommended)

**Step 1: Start Docker Desktop**
- Open Docker Desktop application
- Wait for it to fully start (whale icon in system tray)

**Step 2: Start OpenSearch**
```powershell
cd c:\opensearch-standalone\opensearch-soc
docker-compose down -v
docker pull opensearchproject/opensearch:2.13.0
docker pull opensearchproject/opensearch-dashboards:2.13.0
docker-compose up -d
```

**Step 3: Wait for OpenSearch to Start** (2-3 minutes)
```powershell
# Check if running
docker ps
```

**Step 4: Ingest Sample Data**
```powershell
cd c:\opensearch-standalone\opensearch-dashboards-config
py ingest-sample-data.py
```

**Step 5: Import Dashboards**
1. Open: http://localhost:5601
2. Login: `admin` / `S0c!Dash#2025_OpN`
3. Go to: **Stack Management → Saved Objects → Import**
4. Select: `saved-objects-export.ndjson`
5. Click: **Import**

**Step 6: View Your BETA Dashboard**
- Navigate to: **Dashboards**
- Open: **BETA - Unified Security Dashboard**

---

### Option 2: Use Existing OpenSearch Instance

If you already have OpenSearch running:

**Step 1: Update Connection in ingest-sample-data.py**
Edit line 18 with your credentials:
```python
http_auth=('your-username', 'your-password'),
```

**Step 2: Run Sample Data Script**
```powershell
cd c:\opensearch-standalone\opensearch-dashboards-config
py ingest-sample-data.py
```

**Step 3: Import Dashboards**
1. Open your OpenSearch Dashboards URL
2. Go to: **Stack Management → Saved Objects → Import**
3. Select: `saved-objects-export.ndjson`

---

### Option 3: Skip Sample Data (Use Real Data)

If you already have security data in OpenSearch:

**Step 1: Verify Index Patterns Match**
Your indices should match these patterns:
- `tenant_*_siem-*`
- `tenant_*_ips-*`
- `tenant_*_edr-*`

**Step 2: Import Dashboards**
1. Open OpenSearch Dashboards
2. Go to: **Stack Management → Saved Objects → Import**
3. Select: `saved-objects-export.ndjson`

**Step 3: Update Index Patterns (if needed)**
If your indices have different names:
1. Go to: **Stack Management → Index Patterns**
2. Edit each pattern to match your indices

---

## 📊 What You'll Get

### BETA - Unified Security Dashboard
- **4 KPI Cards**: Total Events, Critical Alerts, Active Hosts, Data Sources
- **Event Timeline**: Multi-line chart showing SIEM/IDS/EDR events over time
- **Severity Distribution**: Donut chart of Critical/High/Medium/Low alerts
- **Top Triggered Rules**: Bar chart of most frequent security rules
- **Recent Alerts Table**: Sortable table with latest security events

### Features
- ✅ BETA branding ("BETA - OpenSearch Security")
- ✅ Dark theme optimized for SOC monitoring
- ✅ Multi-tenant support
- ✅ Handles millions of events efficiently
- ✅ Server-side aggregations for fast queries

---

## 🐛 Troubleshooting

### Docker Not Starting
**Error**: `error during connect`
**Solution**: Start Docker Desktop application

### Port Already in Use
**Error**: `port is already allocated`
**Solution**:
```powershell
# Find process using port 9200
netstat -ano | findstr :9200

# Kill the process (replace PID with actual number)
taskkill /F /PID <PID>
```

### Authentication Failed
**Error**: `401 Unauthorized`
**Solution**: Check credentials in docker-compose.yml:
- Username: `admin`
- Password: `S0c!Dash#2025_OpN`

### No Data in Dashboards
**Solution**:
1. Check if sample data script ran successfully
2. Verify indices exist: `GET /_cat/indices/tenant_*`
3. Expand time range in dashboard to "Last 7 days"

---

## 📝 Summary

**Created**: 5 configuration files for BETA OpenSearch Dashboards
**Sample Data**: 15,000 security events (SIEM, IDS/IPS, EDR)
**Dashboards**: 1 unified dashboard with 7 visualizations
**Capacity**: Handles millions of events with server-side aggregations

**Current Status**: ⏸️ Waiting for Docker Desktop to start

**Next Action**: Start Docker Desktop, then run the commands in Option 1

---

**Questions?** See `README.md` for detailed documentation.
