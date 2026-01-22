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
# (Pattern Name, Time Field)
INDEX_PATTERNS = [
    ("siem-events-*", "@timestamp"),
    ("ids-traffic-*", "@timestamp"),
    ("edr-endpoints-*", "@timestamp"),
    ("vuln-scans-*", "@timestamp"),
    ("netflow-traffic-*", "@timestamp")
]

def create_index_pattern(pattern, time_field):
    # Using the pattern itself as the ID for easier reference
    url = f"{DASHBOARDS_URL}/api/saved_objects/index-pattern/{pattern}"
    data = {
        "attributes": {
            "title": pattern,
            "timeFieldName": time_field
        }
    }
    
    try:
        response = requests.post(url, headers=HEADERS, json=data)
        
        if response.status_code == 200:
            print(f"[SUCCESS] Created index pattern: {pattern}")
        elif response.status_code == 409:
             print(f"[INFO] Index pattern already exists: {pattern}")
        else:
            print(f"[ERROR] Failed to create {pattern}. Status: {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        print(f"[ERROR] Exception creating {pattern}: {e}")

def main():
    print("Registering Index Patterns...")
    for pattern, time_field in INDEX_PATTERNS:
        create_index_pattern(pattern, time_field)
        
    print("Done.")

if __name__ == "__main__":
    main()
