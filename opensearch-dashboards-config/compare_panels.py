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
        panels_str = res.json()['attributes']['panelsJSON']
        panels = json.loads(panels_str)
        return panels
    return None

if __name__ == "__main__":
    working = get_panels("siem-home")
    broken = get_panels("siem-overview")
    
    with open("panel_diff.txt", "w") as f:
        f.write("--- WORKING (siem-home) ---\n")
        f.write(json.dumps(working, indent=2))
        f.write("\n\n--- BROKEN (siem-overview) ---\n")
        f.write(json.dumps(broken, indent=2))
