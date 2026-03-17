import requests
import base64
import json

BASE_URL = "http://localhost:5601/api/saved_objects"
AUTH = base64.b64encode(b"admin:admin").decode('utf-8')
HEADERS = {
    "Authorization": f"Basic {AUTH}",
    "osd-xsrf": "true",
    "Content-Type": "application/json"
}

def ensure_index_pattern(pattern):
    # Check if exists
    url_find = f"{BASE_URL}/_find?type=index-pattern&search={pattern}&search_fields=title"
    res = requests.get(url_find, headers=HEADERS)
    if res.status_code == 200:
        objects = res.json().get('saved_objects', [])
        if objects:
            print(f"Index pattern {pattern} already exists with ID: {objects[0]['id']}")
            return objects[0]['id']
    
    # Create it
    url_create = f"{BASE_URL}/index-pattern/{pattern}"
    body = {
        "attributes": {
            "title": pattern,
            "timeFieldName": "@timestamp"
        }
    }
    res = requests.post(url_create, headers=HEADERS, json=body)
    if res.status_code == 200:
        print(f"Created index pattern: {pattern}")
        return pattern
    else:
        print(f"Error creating index pattern: {res.status_code} {res.text}")
        return None

if __name__ == "__main__":
    ensure_index_pattern("security-auditlog-*")
