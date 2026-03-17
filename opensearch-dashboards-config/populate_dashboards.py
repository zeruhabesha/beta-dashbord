import requests
import json
import os
import base64

# Configuration
BASE_URI = "http://localhost:5601/api/saved_objects"
AUTH = ("admin", "admin")
HEADERS = {
    "osd-xsrf": "true",
    "Content-Type": "application/json"
}
JSON_DIR = r"c:\opensearch-standalone\opensearch-dashboards-config\json"

def deploy_object(obj_type, obj_id, json_data):
    url = f"{BASE_URI}/{obj_type}/{obj_id}?overwrite=true"
    try:
        response = requests.post(url, json=json_data, auth=AUTH, headers=HEADERS)
        if response.status_code in [200, 201]:
            print(f"  \u2713 Success: {obj_id}")
        else:
            print(f"  \u2717 Fail: {obj_id} - {response.status_code} {response.text}")
    except Exception as e:
        print(f"  \u2717 Error: {obj_id} - {str(e)}")

def main():
    print("Creating visualizations...")
    
    vis_files = [
        ("visualization", "vis-total-events", "vis-total-events.json"),
        ("visualization", "vis-events-timeline", "vis-events-timeline.json"),
        ("visualization", "vis-top-hosts", "vis-top-hosts.json")
    ]
    
    for obj_type, obj_id, filename in vis_files:
        path = os.path.join(JSON_DIR, filename)
        with open(path, 'r') as f:
            data = json.load(f)
            deploy_object(obj_type, obj_id, data)

    print("\nUpdating dashboards...")
    
    # Load SIEM as base
    siem_path = os.path.join(JSON_DIR, "siem-dashboard.json")
    with open(siem_path, 'r') as f:
        siem_data = json.load(f)

    # 1. SIEM
    deploy_object("dashboard", "siem-overview", siem_data)

    # 2. IDS
    ids_data = json.loads(json.dumps(siem_data).replace("SIEM - overview", "IDS - traffic").replace("SIEM team", "IDS team"))
    deploy_object("dashboard", "ids-traffic", ids_data)

    # 3. EDR
    edr_data = json.loads(json.dumps(siem_data).replace("SIEM - overview", "EDR - endpoints").replace("SIEM team", "EDR team"))
    deploy_object("dashboard", "edr-endpoints", edr_data)

    print("\nDone! Dashboards are fully populated.")

if __name__ == "__main__":
    main()
