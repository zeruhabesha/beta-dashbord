import requests
import base64
import json

BASE_URL = "http://localhost:5601/api/saved_objects"
AUTH = base64.b64encode(b"admin:admin").decode('utf-8')
HEADERS = {
    "Authorization": f"Basic {AUTH}",
    "osd-xsrf": "true"
}

def get_mv(dash_id):
    url = f"{BASE_URL}/dashboard/{dash_id}"
    res = requests.get(url, headers=HEADERS)
    if res.status_code == 200:
        mv = res.json().get('migrationVersion')
        print(f"MigrationVersion for {dash_id}: {json.dumps(mv)}")
    else:
        print(f"Error {res.status_code} for {dash_id}")

if __name__ == "__main__":
    get_mv("siem-home")
    get_mv("siem-overview")
