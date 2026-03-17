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

# --- Index Patterns ---
PATTERNS = {
    "siem": "security-auditlog-*",
    "ids": "*_ips-*",
    "edr": "*_edr-*"
}

def ensure_index_pattern(id, title):
    url = f"{BASE_URL}/index-pattern/{id}?overwrite=true"
    body = {
        "attributes": {
            "title": title,
            "timeFieldName": "@timestamp"
        }
    }
    r = requests.post(url, headers=HEADERS, json=body)
    if r.status_code == 200:
        print(f"  ✓ Index Pattern: {id}")
    else:
        print(f"  ✗ Error Index Pattern {id}: {r.status_code} {r.text}")

# --- Helper Functions ---

def upsert_vis(vis_id, title, type, index_id, vis_state_extra={}):
    url = f"{BASE_URL}/visualization/{vis_id}?overwrite=true"
    
    vis_state = {
        "title": title,
        "type": type,
        "aggs": [{"id": "1", "enabled": True, "type": "count", "schema": "metric"}],
        "params": {}
    }
    vis_state.update(vis_state_extra)
    
    body = {
        "attributes": {
            "title": title,
            "visState": json.dumps(vis_state),
            "uiStateJSON": "{}",
            "description": "Master Visualization",
            "version": 1,
            "kibanaSavedObjectMeta": {
                "searchSourceJSON": json.dumps({
                    "query": {"query": "", "language": "kuery"},
                    "filter": [],
                    "index": index_id
                })
            }
        },
        "references": [
            {"name": "kibanaSavedObjectMeta.searchSourceJSON.index", "type": "index-pattern", "id": index_id}
        ]
    }
    
    if vis_id == "nav-vis": # Special case for navigation markdown
         body['attributes']['kibanaSavedObjectMeta']['searchSourceJSON'] = "{}"
         body['references'] = []

    r = requests.post(url, headers=HEADERS, json=body)
    if r.status_code == 200:
        print(f"  ✓ Visualization: {vis_id}")
    else:
        print(f"  ✗ Error Visualization {vis_id}: {r.status_code} {r.text}")

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
            "description": f"Master Dashboard for {title}",
            "panelsJSON": json.dumps(panels_json),
            "optionsJSON": json.dumps({"useMargins": True, "hidePanelTitles": False}),
            "timeRestore": False,
            "kibanaSavedObjectMeta": {"searchSourceJSON": json.dumps({"query": {"query": "", "language": "kuery"}, "filter": []})}
        },
        "references": references
    }
    r = requests.post(url, headers=HEADERS, json=body)
    if r.status_code == 200:
        print(f"  ✓ Dashboard: {dash_id}")
    else:
        print(f"  ✗ Error Dashboard {dash_id}: {r.status_code} {r.text}")

# --- Deployment ---

def deploy_all():
    print("Initializing Index Patterns...")
    for key, pattern in PATTERNS.items():
        ensure_index_pattern(pattern, pattern)

    print("\nDeploying Visualizations...")
    # SIEM Visuals
    upsert_vis("vis-siem-total", "SIEM Total Events", "metric", PATTERNS['siem'])
    upsert_vis("vis-siem-timeline", "SIEM Events Timeline", "histogram", PATTERNS['siem'], {
        "aggs": [
            {"id":"1","type":"count","schema":"metric"},
            {"id":"2","type":"date_histogram","schema":"segment","params":{"field":"@timestamp","interval":"auto"}}
        ]
    })
    
    # IDS Visuals
    upsert_vis("vis-ids-total", "IDS Total Events", "metric", PATTERNS['ids'])
    upsert_vis("vis-ids-traffic", "IDS Traffic Throughput", "line", PATTERNS['ids'], {
        "aggs": [
            {"id":"1","type":"sum","schema":"metric","params":{"field":"bytes_in"}},
            {"id":"2","type":"sum","schema":"metric","params":{"field":"bytes_out"}},
            {"id":"3","type":"date_histogram","schema":"segment","params":{"field":"@timestamp","interval":"auto"}}
        ]
    })
    
    # EDR Visuals
    upsert_vis("vis-edr-total", "EDR Total Alerts", "metric", PATTERNS['edr'])
    upsert_vis("vis-edr-endpoints", "EDR Active Endpoints", "pie", PATTERNS['edr'], {
        "aggs": [
            {"id":"1","type":"count","schema":"metric"},
            {"id":"2","type":"terms","schema":"segment","params":{"field":"host.name.keyword"}}
        ]
    })

    # Navigation
    upsert_vis("nav-vis", "Navigation Menu", "markdown", "none", {
        "params": {"markdown": "# Security Portal\nUse the sidebar to navigate between modules."}
    })

    print("\nDeploying Master Dashboards (TypeError-Safe)...")
    
    # Define Dashboard mappings based on moduleConfig.js
    dashboard_registry = {
        # SIEM
        "siem-home": ("SIEM - Home", [("nav-vis", 0, 0, 48, 10)]),
        "siem-overview": ("SIEM - Overview", [("vis-siem-total", 0, 0, 24, 10), ("vis-siem-timeline", 24, 0, 24, 10)]),
        
        # IDS
        "ids-home": ("IDS - Home", [("nav-vis", 0, 0, 48, 10)]),
        "ids-traffic": ("IDS - Traffic Overview", [("vis-ids-traffic", 0, 0, 48, 20)]),
        
        # EDR
        "edr-home": ("EDR - Home", [("nav-vis", 0, 0, 48, 10)]),
        "edr-endpoints": ("EDR - Endpoints", [("vis-edr-endpoints", 0, 0, 48, 20)]),
        
        # Unified
        "unified-home": ("Unified SOC - Home", [("nav-vis", 0, 0, 48, 10), ("vis-siem-total", 0, 10, 16, 10), ("vis-ids-total", 16, 10, 16, 10), ("vis-edr-total", 32, 10, 16, 10)])
    }
    
    # Add dynamic placeholders for all other views in SIEM
    siem_views = ['config-assessment', 'malware', 'fim', 'hunting', 'vuln-detect', 'mitre', 'hygiene', 'pci', 'gdpr', 'hipaa', 'nist', 'docker', 'aws', 'gcp', 'azure', 'rules', 'decoders', 'logs']
    for v in siem_views:
        dashboard_registry[f"siem-{v}"] = (f"SIEM - {v.replace('-', ' ').title()}", [("vis-siem-total", 0, 0, 48, 20)])

    # IDS
    ids_views = ['blocked', 'ids-alerts', 'signatures', 'flows']
    for v in ids_views:
        dashboard_registry[f"ids-{v}"] = (f"IDS - {v.replace('-', ' ').title()}", [("vis-ids-total", 0, 0, 48, 20)])

    # EDR
    edr_views = ['active-threats', 'isolation', 'malware', 'process-tree', 'file-integrity', 'hunting']
    for v in edr_views:
        dashboard_registry[f"edr-{v}"] = (f"EDR - {v.replace('-', ' ').title()}", [("vis-edr-total", 0, 0, 48, 20)])

    # Unified
    unified_views = ['dashboards', 'overview', 'siem-events', 'malware', 'mitre', 'ids-alerts', 'blocked', 'maps', 'endpoints', 'active-threats', 'isolation', 'hunting', 'pci', 'gdpr']
    for v in unified_views:
        dashboard_registry[f"unified-{v}"] = (f"Unified - {v.replace('-', ' ').title()}", [("vis-siem-total", 0, 0, 24, 10), ("vis-ids-total", 24, 0, 24, 10)])

    # Execute Deployment
    for did, (title, panels) in dashboard_registry.items():
        upsert_dash(did, title, panels)

if __name__ == "__main__":
    deploy_all()
    print("\nMaster Dashboard Deployment Complete.")
