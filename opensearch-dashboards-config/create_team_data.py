import requests
from datetime import datetime, timedelta
import random
import json

print("Creating team-specific data in OpenSearch...")

date_str = datetime.now().strftime("%Y.%m.%d")
base_url = "http://localhost:9200"

# SIEM Team Data
print("\nCreating SIEM team data...")
siem_bulk = []
event_types = ["malware_detection", "file_integrity_violation", "config_change", "compliance_alert"]
severities = ["low", "medium", "high", "critical"]
frameworks = ["PCI-DSS", "GDPR", "HIPAA", "NIST"]

for i in range(100):
    timestamp = (datetime.now() - timedelta(minutes=i)).isoformat()
    event = {
        "@timestamp": timestamp,
        "team": "siem",
        "event_type": random.choice(event_types),
        "severity": random.choice(severities),
        "source_ip": f"192.168.1.{random.randint(1, 254)}",
        "user": f"user{random.randint(1, 50)}",
        "description": f"SIEM security event #{i+1}",
        "compliance_framework": random.choice(frameworks)
    }
    siem_bulk.append(json.dumps({"index": {"_index": f"siem-events-{date_str}"}}))
    siem_bulk.append(json.dumps(event))

siem_data = "\n".join(siem_bulk) + "\n"
response = requests.post(f"{base_url}/_bulk", data=siem_data, headers={"Content-Type": "application/x-ndjson"})
print(f"  ✓ Created 100 SIEM events in siem-events-{date_str}")

# IDS Team Data
print("\nCreating IDS team data...")
ids_bulk = []
ids_event_types = ["intrusion_attempt", "port_scan", "ddos_attack", "blocked_connection"]
protocols = ["TCP", "UDP", "ICMP"]

for i in range(100):
    timestamp = (datetime.now() - timedelta(minutes=i)).isoformat()
    event = {
        "@timestamp": timestamp,
        "team": "ids",
        "event_type": random.choice(ids_event_types),
        "severity": random.choice(severities),
        "source_ip": f"10.0.0.{random.randint(1, 254)}",
        "dest_ip": f"10.0.1.{random.randint(1, 254)}",
        "port": random.randint(1, 65535),
        "protocol": random.choice(protocols),
        "description": f"IDS network event #{i+1}",
        "signature_id": random.randint(1000, 9999)
    }
    ids_bulk.append(json.dumps({"index": {"_index": f"ids-traffic-{date_str}"}}))
    ids_bulk.append(json.dumps(event))

ids_data = "\n".join(ids_bulk) + "\n"
response = requests.post(f"{base_url}/_bulk", data=ids_data, headers={"Content-Type": "application/x-ndjson"})
print(f"  ✓ Created 100 IDS events in ids-traffic-{date_str}")

# EDR Team Data
print("\nCreating EDR team data...")
edr_bulk = []
edr_event_types = ["process_execution", "file_modification", "registry_change", "network_connection"]
processes = ["chrome.exe", "powershell.exe", "cmd.exe", "explorer.exe", "svchost.exe"]

for i in range(100):
    timestamp = (datetime.now() - timedelta(minutes=i)).isoformat()
    event = {
        "@timestamp": timestamp,
        "team": "edr",
        "event_type": random.choice(edr_event_types),
        "severity": random.choice(severities),
        "hostname": f"endpoint-{random.randint(1, 100)}",
        "process_name": random.choice(processes),
        "user": f"user{random.randint(1, 50)}",
        "description": f"EDR endpoint event #{i+1}",
        "threat_score": random.randint(0, 100)
    }
    edr_bulk.append(json.dumps({"index": {"_index": f"edr-endpoints-{date_str}"}}))
    edr_bulk.append(json.dumps(event))

edr_data = "\n".join(edr_bulk) + "\n"
response = requests.post(f"{base_url}/_bulk", data=edr_data, headers={"Content-Type": "application/x-ndjson"})
print(f"  ✓ Created 100 EDR events in edr-endpoints-{date_str}")

# Create Index Patterns
print("\nCreating index patterns...")
dashboards_url = "http://localhost:5601/api/saved_objects/index-pattern"
headers = {
    "osd-xsrf": "true",
    "Content-Type": "application/json",
    "Authorization": "Basic YWRtaW46YWRtaW4="  # admin:admin
}

patterns = [
    ("siem-events-*", "SIEM Events"),
    ("ids-traffic-*", "IDS Traffic"),
    ("edr-endpoints-*", "EDR Endpoints")
]

for pattern_id, title in patterns:
    try:
        data = {"attributes": {"title": pattern_id, "timeFieldName": "@timestamp"}}
        response = requests.post(f"{dashboards_url}/{pattern_id}", json=data, headers=headers)
        print(f"  ✓ Created {pattern_id} index pattern")
    except:
        print(f"  {pattern_id} pattern already exists")

print("\nDone! Each team has separate data:")
print("  - SIEM: siem-events-* (100 events)")
print("  - IDS: ids-traffic-* (100 events)")
print("  - EDR: edr-endpoints-* (100 events)")
