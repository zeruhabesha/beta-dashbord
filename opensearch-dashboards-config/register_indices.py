import requests
import json
import time

# Configuration
DASHBOARDS_URL = "http://localhost:5601"
# Basic Auth (admin:admin)
HEADERS = {
    "osd-xsrf": "true",
    "Content-Type": "application/json",
    "Authorization": "Basic YWRtaW46YWRtaW4=" 
}

# Index Patterns to Create
# (Saved object ID, title, time field)
INDEX_PATTERNS = [
    ("unified-index-pattern", "logs-tenant-*", "@timestamp"),
    ("siem-events-*", "siem-events-*", "@timestamp"),
    ("ids-traffic-*", "ids-traffic-*", "@timestamp"),
    ("edr-endpoints-*", "edr-endpoints-*", "@timestamp"),
    ("vuln-scans-*", "vuln-scans-*", "@timestamp"),
    ("netflow-traffic-*", "netflow-traffic-*", "@timestamp")
]

def create_index_pattern(pattern_id, title, time_field):
    url = f"{DASHBOARDS_URL}/api/saved_objects/index-pattern/{pattern_id}"
    data = {
        "attributes": {
            "title": title,
            "timeFieldName": time_field
        }
    }
    
    try:
        response = requests.post(url, headers=HEADERS, json=data)
        
        if response.status_code == 200:
            print(f"[SUCCESS] Created index pattern: {pattern_id} -> {title}")
        elif response.status_code == 409:
             print(f"[INFO] Index pattern already exists: {pattern_id}")
        else:
            print(f"[ERROR] Failed to create {pattern_id}. Status: {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        print(f"[ERROR] Exception creating {pattern_id}: {e}")

def main():
    print("Registering Index Patterns...")
    for pattern_id, title, time_field in INDEX_PATTERNS:
        create_index_pattern(pattern_id, title, time_field)
        
    print("Done.")

if __name__ == "__main__":
    main()
