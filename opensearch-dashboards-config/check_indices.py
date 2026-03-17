import requests
import base64
import json

BASE_URL = "http://localhost:5601/api/saved_objects"
AUTH = base64.b64encode(b"admin:admin").decode('utf-8')
HEADERS = {
    "Authorization": f"Basic {AUTH}",
    "osd-xsrf": "true"
}

def list_index_patterns():
    url = f"{BASE_URL}/_find?type=index-pattern"
    res = requests.get(url, headers=HEADERS)
    if res.status_code == 200:
        data = res.json()
        print("Found Index Patterns:")
        for obj in data.get('saved_objects', []):
            print(f"  - {obj['attributes']['title']} (ID: {obj['id']})")
    else:
        print(f"Error: {res.status_code} {res.text}")

if __name__ == "__main__":
    list_index_patterns()
