import json
import requests
import uuid

# Base URL (internal network)
BASE_URL = "http://opensearch-dashboards:5601/api/saved_objects"
HEADERS = {
    "osd-xsrf": "true",
    "Content-Type": "application/json"
}

def create_vis():
    # proper JSON structure for visState
    vis_state = {
        "title": "Total Security Events",
        "type": "metric",
        "params": {
            "addTooltip": True,
            "addLegend": False,
            "type": "metric",
            "metric": {
                "percentageMode": False,
                "useRanges": False,
                "colorSchema": "Green to Red",
                "metricColorMode": "None",
                "colorsRange": [{"from": 0, "to": 10000}],
                "labels": {"show": True},
                "style": {"bgFill": False, "bgColor": False, "labelColor": False, "subText": "", "fontSize": 60}
            }
        },
        "aggs": [
            {"id": "1", "enabled": True, "type": "count", "schema": "metric", "params": {}}
        ]
    }
    
    payload = {
        "attributes": {
            "title": "Total Security Events",
            "visState": json.dumps(vis_state),
            "uiStateJSON": "{}",
            "description": "Count of all security events",
            "version": 1,
            "kibanaSavedObjectMeta": {
                "searchSourceJSON": json.dumps({
                    "query": {"query": "", "language": "kuery"},
                    "filter": [],
                    "index": "tenant_01_unified" # We need the ID of the index pattern usually, but name might work if it's the ID.
                    # Actually, index pattern ID is tenant_01_unified from my earlier script
                })
            }
        }
    }
    
    try:
        # Use overwrite=true
        r = requests.post(f"{BASE_URL}/visualization/unified-total-events?overwrite=true", headers=HEADERS, json=payload)
        print(f"Vis Creation: {r.status_code} - {r.text}")
    except Exception as e:
        print(f"Vis Error: {e}")

def update_dashboard():
    # Update dashboard to include the panel
    panels = [
        {
            "version": "7.10.0",
            "gridData": {"x": 0, "y": 0, "w": 24, "h": 15, "i": "1"},
            "panelIndex": "1",
            "embeddableConfig": {},
            "panelRefName": "panel_1", 
            "type": "visualization",
            "id": "unified-total-events"
        }
    ]
    
    payload = {
        "attributes": {
            "title": "Unified Security Operations Center",
            "description": "Unified view of SIEM, IDS, and EDR data",
            "hits": 0,
            "optionsJSON": json.dumps({"useMargins": True, "hidePanelTitles": False}),
            "panelsJSON": json.dumps(panels),
            "timeRestore": False,
            "kibanaSavedObjectMeta": {
                "searchSourceJSON": json.dumps({"query": {"query": "", "language": "kuery"}, "filter": []})
            }
        }
    }
    
    try:
        r = requests.post(f"{BASE_URL}/dashboard/unified-home?overwrite=true", headers=HEADERS, json=payload)
        print(f"Dashboard Update: {r.status_code} - {r.text}")
    except Exception as e:
        print(f"Dashboard Error: {e}")

if __name__ == "__main__":
    create_vis()
    update_dashboard()
