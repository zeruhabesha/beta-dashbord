import requests
import base64
import json

BASE_URL = "http://localhost:5601/api/saved_objects"
AUTH = base64.b64encode(b"admin:admin").decode('utf-8')
HEADERS = {
    "Authorization": f"Basic {AUTH}",
    "osd-xsrf": "true"
}

def inspect_dashboard(dash_id):
    url = f"{BASE_URL}/dashboard/{dash_id}"
    res = requests.get(url, headers=HEADERS)
    if res.status_code == 200:
        data = res.json()
        print(f"Dashboard: {dash_id}")
        print(json.dumps(data, indent=2))
    else:
        print(f"Error fetching dashboard {dash_id}: {res.status_code} {res.text}")

if __name__ == "__main__":
    inspect_dashboard("siem-overview")
