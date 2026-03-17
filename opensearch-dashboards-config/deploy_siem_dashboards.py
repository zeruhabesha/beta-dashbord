import requests
import json
import base64

BASE_URL = "http://localhost:5601/api/saved_objects"
AUTH = base64.b64encode(b"admin:admin").decode('utf-8')
HEADERS = {
    "Authorization": f"Basic {AUTH}",
    "osd-xsrf": "true",
    "Content-Type": "application/json"
}

# --- Configuration ---
SIEM_INDEX_PATTERN_ID = "tenant-01-siem-*" 
IDX_ID = "tenant-01-siem-*"

# --- Helper Functions ---

def upsert_vis(vis_id, title, vis_state, description="SIEM Visualization"):
    url = f"{BASE_URL}/visualization/{vis_id}?overwrite=true"
    body = {
        "attributes": {
            "title": title,
            "visState": json.dumps(vis_state),
            "uiStateJSON": "{}",
            "description": description,
            "version": 1,
            "kibanaSavedObjectMeta": {
                "searchSourceJSON": json.dumps({
                    "query": {"query": "", "language": "kuery"},
                    "filter": [],
                    "index": IDX_ID
                })
            }
        },
        "references": [
            {"name": "kibanaSavedObjectMeta.searchSourceJSON.index", "type": "index-pattern", "id": IDX_ID}
        ]
    }
    r = requests.post(url, headers=HEADERS, json=body)
    r.raise_for_status()
    print(f"  ✓ Visualization: {vis_id}")

def upsert_dash(dash_id, title, panels):
    # panels: list of tuples (vis_id, x, y, w, h)
    url = f"{BASE_URL}/dashboard/{dash_id}?overwrite=true"
    
    panels_json = []
    references = []
    
    for i, (vis_id, x, y, w, h) in enumerate(panels):
        idx = i + 1
        ref_name = f"panel_{idx}"
        panels_json.append({
            "gridData": {"x": x, "y": y, "w": w, "h": h, "i": str(idx)},
            "panelIndex": str(idx),
            "panelRefName": ref_name
        })
        references.append({"name": ref_name, "type": "visualization", "id": vis_id})
        
    body = {
        "attributes": {
            "title": title,
            "description": f"SIEM Dashboard for {title}",
            "panelsJSON": json.dumps(panels_json),
            "optionsJSON": json.dumps({"useMargins": True, "hidePanelTitles": False}),
            "timeRestore": False,
            "kibanaSavedObjectMeta": {"searchSourceJSON": json.dumps({"query": {"query": "", "language": "kuery"}, "filter": []})}
        },
        "references": references
    }
    r = requests.post(url, headers=HEADERS, json=body)
    r.raise_for_status()
    print(f"  ✓ Dashboard: {dash_id}")

# --- Visualizations ---

def deploy_visualizations():
    # 1. Metric: Total Events
    upsert_vis("vis-siem-total", "Total SIEM Events", {
        "title": "Total Events", "type": "metric",
        "aggs": [{"id": "1", "enabled": True, "type": "count", "schema": "metric"}],
        "params": {"metric": {"labels": {"show": True}, "style": {"fontSize": 60}}}
    })
    
    # 2. Timeline: Events Over Time
    upsert_vis("vis-siem-timeline", "SIEM Event Timeline", {
        "title": "Events Over Time", "type": "histogram",
        "aggs": [
            {"id": "1", "enabled": True, "type": "count", "schema": "metric"},
            {"id": "2", "enabled": True, "type": "date_histogram", "schema": "segment", "params": {"field": "@timestamp", "interval": "auto"}}
        ]
    })
    
    # 3. Pie: Top Hosts
    upsert_vis("vis-siem-hosts", "Top Affected Hosts", {
        "title": "Top Hosts", "type": "pie",
        "aggs": [
            {"id": "1", "enabled": True, "type": "count", "schema": "metric"},
            {"id": "2", "enabled": True, "type": "terms", "schema": "segment", "params": {"field": "audit_node_name.keyword", "size": 10}}
        ]
    })
    
    # 4. Table: Recent Alerts
    upsert_vis("vis-siem-alerts-table", "Recent SIEM Alerts", {
        "title": "Recent Alerts", "type": "table",
        "aggs": [
            {"id": "1", "enabled": True, "type": "count", "schema": "metric"},
            {"id": "2", "enabled": True, "type": "terms", "schema": "bucket", "params": {"field": "rule.description.keyword", "size": 20}}
        ]
    })

    # 5. Bar: Severity
    upsert_vis("vis-siem-severity", "Alert Severity Distribution", {
        "title": "Severity", "type": "horizontal_bar",
        "aggs": [
            {"id": "1", "enabled": True, "type": "count", "schema": "metric"},
            {"id": "2", "enabled": True, "type": "terms", "schema": "segment", "params": {"field": "rule.level", "size": 10}}
        ]
    })

# --- Dashboards ---

def deploy_dashboards():
    # 1. SIEM Overview (The requested one)
    upsert_dash("siem-overview", "SIEM - Overview", [
        ("vis-siem-total", 0, 0, 12, 8),
        ("vis-siem-hosts", 12, 0, 12, 8),
        ("vis-siem-severity", 24, 0, 24, 8),
        ("vis-siem-timeline", 0, 8, 48, 15),
        ("vis-siem-alerts-table", 0, 23, 48, 20)
    ])

    # 2. Placeholder SIEM modules
    modules = [
        ("siem-malware", "SIEM - Malware Detection"),
        ("siem-fim", "SIEM - File Integrity Monitoring"),
        ("siem-config-assessment", "SIEM - Configuration Assessment"),
        ("siem-hunting", "SIEM - Threat Hunting"),
        ("siem-vuln-detect", "SIEM - Vulnerability Detection"),
        ("siem-mitre", "SIEM - MITRE ATT&CK"),
        ("siem-hygiene", "SIEM - IT Hygiene"),
        ("siem-pci", "SIEM - PCI DSS Compliance"),
        ("siem-gdpr", "SIEM - GDPR Compliance"),
        ("siem-hipaa", "SIEM - HIPAA Compliance"),
        ("siem-nist", "SIEM - NIST 800-53"),
        ("siem-docker", "SIEM - Docker Security"),
        ("siem-aws", "SIEM - AWS Security"),
        ("siem-gcp", "SIEM - Google Cloud security"),
        ("siem-azure", "SIEM - Azure / M365 Security"),
        ("siem-rules", "SIEM - Ruleset Management"),
        ("siem-decoders", "SIEM - Decoders"),
        ("siem-logs", "SIEM - System Logs")
    ]
    
    for dash_id, title in modules:
        # For modules, we use a standard layout for now
        upsert_dash(dash_id, title, [
            ("vis-siem-total", 0, 0, 24, 10),
            ("vis-siem-timeline", 24, 0, 24, 10),
            ("vis-siem-alerts-table", 0, 10, 48, 30)
        ])

if __name__ == "__main__":
    deploy_visualizations()
    deploy_dashboards()
    print("SIEM Dashboards Deployment Complete!")
