import json
import requests
import time

# Base URL (internal network)
BASE_URL = "http://opensearch-dashboards:5601/api/saved_objects"
HEADERS = {
    "osd-xsrf": "true",
    "Content-Type": "application/json"
}

# --- Visualization Definitions ---

def get_metric_vis(title, index_pattern, field=None, label="Count", color_mode="None"):
    # Basic metric count or unique count
    aggs = [{"id": "1", "enabled": True, "type": "count", "schema": "metric", "params": {}}]
    if field:
        aggs = [{"id": "1", "enabled": True, "type": "cardinality", "schema": "metric", "params": {"field": field}}]
    
    vis_state = {
        "title": title,
        "type": "metric",
        "params": {
            "addTooltip": True, "addLegend": False, "type": "metric",
            "metric": {
                "percentageMode": False, "useRanges": False, "colorSchema": "Green to Red", "metricColorMode": color_mode,
                "colorsRange": [{"from": 0, "to": 1000}], "labels": {"show": True},
                "style": {"bgFill": False, "bgColor": False, "labelColor": False, "subText": "", "fontSize": 60}
            }
        },
        "aggs": aggs
    }
    return json.dumps(vis_state)

def get_pie_vis(title, index_pattern, field):
    vis_state = {
        "title": title,
        "type": "pie",
        "params": {
            "type": "pie", "addTooltip": True, "addLegend": True, "isDonut": True, "labels": {"show": False, "values": True, "last_level": True, "truncate": 100}
        },
        "aggs": [
            {"id": "1", "enabled": True, "type": "count", "schema": "metric", "params": {}},
            {"id": "2", "enabled": True, "type": "terms", "schema": "segment", "params": {"field": field, "size": 5, "order": "desc", "orderBy": "1"}}
        ]
    }
    return json.dumps(vis_state)

def get_bar_vis(title, index_pattern, field):
    vis_state = {
        "title": title,
        "type": "horizontal_bar",
        "params": {
            "type": "histogram", "grid": {"categoryLines": False}, "categoryAxes": [{"id": "CategoryAxis-1", "type": "category", "position": "left", "show": True, "style": {}, "scale": {"type": "linear"}, "labels": {"show": True, "truncate": 100}}], "valueAxes": [{"id": "ValueAxis-1", "name": "LeftAxis-1", "type": "value", "position": "bottom", "show": True, "style": {}, "scale": {"type": "linear", "mode": "normal"}, "labels": {"show": True, "rotate": 0, "filter": False, "truncate": 100}}], "seriesParams": [{"show": "true", "type": "histogram", "mode": "normal", "data": {"label": "Count", "id": "1"}, "valueAxis": "ValueAxis-1", "drawLinesBetweenPoints": True, "showCircles": True}], "addTooltip": True, "addLegend": True, "legendPosition": "right", "times": [], "addTimeMarker": False
        },
        "aggs": [
            {"id": "1", "enabled": True, "type": "count", "schema": "metric", "params": {}},
            {"id": "2", "enabled": True, "type": "terms", "schema": "segment", "params": {"field": field, "size": 10, "order": "desc", "orderBy": "1"}}
        ]
    }
    return json.dumps(vis_state)

def get_table_vis(title, index_pattern, fields):
    # fields is list of field objects e.g. [{"field": "source_ip", "title": "Source IP"}]
    # Simplified table logic
    vis_state = {
        "title": title,
        "type": "table",
        "params": {
            "perPage": 10, "showPartialRows": False, "showMeticsAtAllLevels": False, "sort": {"columnIndex": None, "direction": None}, "showTotal": False, "totalFunc": "sum"
        },
        "aggs": [
            {"id": "1", "enabled": True, "type": "count", "schema": "metric", "params": {}},
             # Simplified: just showing terms for the first field for now as a basic table
            {"id": "2", "enabled": True, "type": "terms", "schema": "bucket", "params": {"field": fields[0], "size": 10, "order": "desc", "orderBy": "1"}} 
        ]
    }
    return json.dumps(vis_state)

# --- Creation Functions ---

def create_object(obj_type, obj_id, attributes):
    try:
        url = f"{BASE_URL}/{obj_type}/{obj_id}?overwrite=true"
        r = requests.post(url, headers=HEADERS, json={"attributes": attributes})
        if r.status_code in [200, 409]:
            print(f"[OK] Created {obj_type}: {obj_id}")
        else:
            print(f"[ERR] Failed to create {obj_type} {obj_id}: {r.status_code} {r.text}")
    except Exception as e:
        print(f"[EXC] Error creating {obj_id}: {e}")

def create_dashboard(dash_id, title, panels_list):
    # Convert simplified panel list to JSON
    panels_json = []
    for i, p in enumerate(panels_list):
        panels_json.append({
            "version": "7.10.0",
            "gridData": {"x": (i % 2) * 24, "y": (i // 2) * 15, "w": 24, "h": 15, "i": str(i+1)}, # Full width stack for simplicity or 2-col
             # Let's do 2 columns: x=0 or x=24 (width 24, 48 total). Max width is 48 usually.
             # Wait, usually width is 48. Let's assume w=24 is half width.
            "panelIndex": str(i+1),
            "embeddableConfig": {},
            "panelRefName": f"panel_{i+1}",
            "type": "visualization",
            "id": p
        })
        # Modify grid for 2 columns
        panels_json[-1]["gridData"]["x"] = (i % 2) * 24
        panels_json[-1]["gridData"]["y"] = (i // 2) * 15
    
    attributes = {
        "title": title,
        "description": f"Dashboard for {title}",
        "hits": 0,
        "optionsJSON": json.dumps({"useMargins": True, "hidePanelTitles": False}),
        "panelsJSON": json.dumps(panels_json),
        "timeRestore": False,
        "kibanaSavedObjectMeta": {"searchSourceJSON": json.dumps({"query": {"query": "", "language": "kuery"}, "filter": []})}
    }
    create_object("dashboard", dash_id, attributes)

# --- Main Script ---

def main():
    print("Starting Dashboard Population...")
    
    # 1. Define Visualizations (ID, Config) to create
    visualizations = [
        # Unified
        ("unified-total", get_metric_vis("Total Events", "tenant_01_*")),
        ("unified-severity", get_pie_vis("Severity Distribution", "tenant_01_*", "severity.keyword")),
        ("unified-sources", get_bar_vis("Top Data Sources", "tenant_01_*", "data_source.keyword")),
        
        # SIEM
        ("siem-count", get_metric_vis("Total SIEM Events", "tenant_01_siem*")),
        ("siem-types", get_bar_vis("Event Types", "tenant_01_siem*", "event_type.keyword")),
        ("siem-severity", get_pie_vis("SIEM Severity", "tenant_01_siem*", "severity.keyword")),
        
        # IDS
        ("ids-count", get_metric_vis("IDS Alerts", "tenant_01_ids*")),
        ("ids-attacks", get_bar_vis("Top Attack Types", "tenant_01_ids*", "attack_type.keyword")),
        ("ids-action", get_pie_vis("Action Taken", "tenant_01_ids*", "action.keyword")),
        
        # EDR
        ("edr-count", get_metric_vis("EDR Detections", "tenant_01_edr*")),
        ("edr-threats", get_bar_vis("Threat Types", "tenant_01_edr*", "threat_type.keyword")),
        ("edr-status", get_pie_vis("Remediation Status", "tenant_01_edr*", "status.keyword")),
    ]
    
    # Create all visualizations
    for vis_id, vis_state in visualizations:
        attributes = {
            "title": vis_id.replace("-", " ").title(),
            "visState": vis_state,
            "uiStateJSON": "{}",
            "description": "Generated via script",
            "version": 1,
            "kibanaSavedObjectMeta": {
                "searchSourceJSON": json.dumps({
                    "query": {"query": "", "language": "kuery"},
                    "filter": [],
                    # We reference tenant_01_* for simplicity, usually needs ID but names often work if ID matches name
                    "index": "tenant_01_unified" if "unified" in vis_id else f"tenant_01_{vis_id.split('-')[0]}" 
                })
            }
        }
        create_object("visualization", vis_id, attributes)

    # 2. Create/Update Dashboards
    dashboards = [
        ("unified-home", "Unified Security Operations Center", ["unified-total", "unified-severity", "unified-sources"]),
        ("siem-home", "SIEM Operations", ["siem-count", "siem-types", "siem-severity"]),
        ("ids-home", "IDS / IPS Analysis", ["ids-count", "ids-attacks", "ids-action"]),
        ("edr-home", "EDR Analysis", ["edr-count", "edr-threats", "edr-status"]),
    ]
    
    for dash_id, title, panels in dashboards:
        create_dashboard(dash_id, title, panels)

    print("Done!")

if __name__ == "__main__":
    main()
