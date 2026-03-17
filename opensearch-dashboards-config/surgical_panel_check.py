import requests
import base64
import json

BASE_URL = "http://localhost:5601/api/saved_objects"
AUTH = base64.b64encode(b"admin:admin").decode('utf-8')
HEADERS = {
    "Authorization": f"Basic {AUTH}",
    "osd-xsrf": "true"
}

def get_panels(dash_id):
    url = f"{BASE_URL}/dashboard/{dash_id}"
    res = requests.get(url, headers=HEADERS)
    if res.status_code == 200:
        return json.loads(res.json()['attributes']['panelsJSON'])
    return None

if __name__ == "__main__":
    home_panels = get_panels("siem-home")
    overview_panels = get_panels("siem-overview")
    
    print("--- FIRST PANEL OF SIEM-HOME (WORKING) ---")
    print(json.dumps(home_panels[0], indent=2))
    
    print("\n--- FIRST PANEL OF SIEM-OVERVIEW (BROKEN) ---")
    print(json.dumps(overview_panels[0], indent=2))
