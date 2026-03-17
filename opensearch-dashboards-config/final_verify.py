import requests
import base64

BASE_URL = "http://localhost:5601/api/saved_objects"
AUTH = base64.b64encode(b"admin:admin").decode('utf-8')
HEADERS = {
    "Authorization": f"Basic {AUTH}",
    "osd-xsrf": "true"
}

def verify(dash_ids):
    for d in dash_ids:
        r = requests.get(f"{BASE_URL}/dashboard/{d}", headers=HEADERS)
        if r.status_code == 200:
            print(f"VERIFIED: {d}")
        else:
            print(f"FAILED: {d} ({r.status_code})")

if __name__ == "__main__":
    verify(['edr-home', 'unified-home', 'siem-overview', 'ids-traffic'])
