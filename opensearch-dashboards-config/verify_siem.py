import requests
import base64

BASE_URL = "http://localhost:5601/api/saved_objects"
AUTH = base64.b64encode(b"admin:admin").decode('utf-8')
HEADERS = {
    "Authorization": f"Basic {AUTH}",
    "osd-xsrf": "true"
}

def check_siem():
    checks = [
        ("dashboard", "siem-overview"),
        ("dashboard", "siem-malware"),
        ("dashboard", "siem-fim"),
        ("dashboard", "siem-mitre"),
        ("visualization", "vis-siem-total"),
        ("visualization", "vis-siem-timeline")
    ]
    
    print("Verifying SIEM Objects:")
    for obj_type, obj_id in checks:
        url = f"{BASE_URL}/{obj_type}/{obj_id}"
        res = requests.get(url, headers=HEADERS)
        if res.status_code == 200:
            print(f"  ✓ {obj_type}/{obj_id} exists")
        else:
            print(f"  ✗ {obj_type}/{obj_id} missing (Status: {res.status_code})")

if __name__ == "__main__":
    check_siem()
