import requests
import base64

BASE_URL = "http://localhost:5601/api/saved_objects"
AUTH = base64.b64encode(b"admin:admin").decode('utf-8')
HEADERS = {
    "Authorization": f"Basic {AUTH}",
    "osd-xsrf": "true"
}

def check_objects():
    objects = [
        ("dashboard", "siem-home"),
        ("dashboard", "ids-home"),
        ("dashboard", "edr-home"),
        ("visualization", "siem-nav-vis"),
        ("visualization", "ids-nav-vis"),
        ("visualization", "edr-nav-vis")
    ]
    
    for obj_type, obj_id in objects:
        url = f"{BASE_URL}/{obj_type}/{obj_id}"
        res = requests.get(url, headers=HEADERS)
        if res.status_code == 200:
            print(f"  ✓ {obj_type}/{obj_id} exists")
        else:
            print(f"  ✗ {obj_type}/{obj_id} missing (Status: {res.status_code})")

if __name__ == "__main__":
    check_objects()
