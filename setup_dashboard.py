import requests
import json
import uuid

BASE_URL = "http://localhost:5601/api/saved_objects"
HEADERS = {
    "osd-xsrf": "true",
    "Content-Type": "application/json"
}

def create_index_pattern():
    patterns = [
        ("unified-index-pattern", "logs-tenant-*"),
        ("tenant-01-logs", "tenant-01-logs-*"),
        ("tenant-01-siem", "tenant-01-siem-*"),
        ("tenant-01-ids", "tenant-01-ids-*"),
        ("tenant-01-edr", "tenant-01-edr-*")
    ]
    
    for pattern_id, title in patterns:
        payload = {
            "attributes": {
                "title": title,
                "timeFieldName": "@timestamp"
            }
        }
        
        try:
            response = requests.post(
                f"{BASE_URL}/index-pattern/{pattern_id}",
                headers=HEADERS,
                json=payload
            )
            if response.status_code == 200:
                print(f"Successfully created index pattern: {pattern_id}")
            elif response.status_code == 409:
                print(f"Index pattern {pattern_id} already exists")
            else:
                print(f"Failed to create index pattern {pattern_id}: {response.text}")
        except Exception as e:
            print(f"Error creating index pattern {pattern_id}: {e}")
            
    return "unified-index-pattern"

def create_dashboard(index_pattern_id):
    dashboard_id = "unified-home"
    
    # Simple dashboard with one visualization (Metrics) for now
    # We'll just define the dashboard structure
    dashboard_payload = {
        "attributes": {
            "title": "Unified Security Operations Center",
            "description": "Unified view of SIEM, IDS, and EDR data",
            "hits": 0,
            "optionsJSON": json.dumps({
                "useMargins": True,
                "hidePanelTitles": False
            }),
            "panelsJSON": "[]", # Empty initially
            "timeRestore": False,
            "kibanaSavedObjectMeta": {
                "searchSourceJSON": json.dumps({
                    "query": {
                        "query": "",
                        "language": "kuery"
                    },
                    "filter": []
                })
            }
        }
    }

    try:
        response = requests.post(
            f"{BASE_URL}/dashboard/{dashboard_id}",
            headers=HEADERS,
            json=dashboard_payload
        )
        if response.status_code == 200:
            print(f"Successfully created dashboard: {dashboard_id}")
        elif response.status_code == 409:
            print(f"Dashboard {dashboard_id} already exists. Updating...")
            # If exists, we could update, but for now just acknowledge
        else:
            print(f"Failed to create dashboard: {response.text}")
    except Exception as e:
        print(f"Error creating dashboard: {e}")

if __name__ == "__main__":
    print("Setting up Unified Dashboard...")
    idx_id = create_index_pattern()
    create_dashboard(idx_id)
    print("Done!")
