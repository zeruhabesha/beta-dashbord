import requests
import base64
import json

BASE_URL = "http://localhost:5601/api/saved_objects"
AUTH = base64.b64encode(b"admin:admin").decode('utf-8')
HEADERS = {
    "Authorization": f"Basic {AUTH}",
    "osd-xsrf": "true"
}

def get_details(dash_id):
    url = f"{BASE_URL}/dashboard/{dash_id}"
    res = requests.get(url, headers=HEADERS)
    if res.status_code == 200:
        data = res.json()
        print(f"--- Dashboard: {dash_id} ---")
        print(f"Title: {data['attributes']['title']}")
        print(f"Migration Version: {json.dumps(data.get('migrationVersion'))}")
        print("Panels JSON:")
        panels = json.loads(data['attributes']['panelsJSON'])
        print(json.dumps(panels, indent=2))
        print("References:")
        print(json.dumps(data.get('references'), indent=2))
    else:
        print(f"Error {res.status_code}: {res.text}")

if __name__ == "__main__":
    get_details("siem-home")
    print("\n" + "="*40 + "\n")
    get_details("siem-overview")
