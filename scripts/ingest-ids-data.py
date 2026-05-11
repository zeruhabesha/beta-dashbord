import json
import random
import time
import requests
import uuid
from datetime import datetime, timedelta

# OpenSearch Configuration
OS_HOST = "http://localhost:9200"
HEADERS = {'Content-Type': 'application/json'}

def generate_suricata_alert(tenant_id, timestamp):
    return {
        "timestamp": timestamp,
        "event_type": "alert",
        "tenant_id": tenant_id,
        "src_ip": f"192.168.1.{random.randint(2, 254)}",
        "dest_ip": f"10.0.0.{random.randint(2, 254)}",
        "dest_port": random.choice([80, 443, 22, 3389]),
        "proto": "TCP",
        "app_proto": "http",
        "alert": {
            "action": "allowed",
            "gid": 1,
            "signature_id": random.randint(2000000, 2999999),
            "signature": random.choice([
                "ET EXPLOIT Possible SQL Injection", 
                "ET MALWARE Cobalt Strike Beacon", 
                "ET SCAN Nmap OS Detection",
                "ET POLICY Tor Onion Domain Request"
            ]),
            "category": "Network Anomaly",
            "severity": random.randint(1, 3)
        },
        "source_type": "suricata"
    }

def generate_zeek_conn(tenant_id, timestamp):
    return {
        "timestamp": timestamp,
        "event_type": "conn",
        "tenant_id": tenant_id,
        "src_ip": f"192.168.1.{random.randint(2, 254)}",
        "dest_ip": f"10.0.0.{random.randint(2, 254)}",
        "proto": "TCP",
        "service": random.choice(["http", "ssl", "dns"]),
        "duration": random.uniform(0.1, 5.0),
        "orig_bytes": random.randint(100, 10000),
        "resp_bytes": random.randint(100, 10000),
        "source_type": "zeek"
    }

def generate_suricata_flow(tenant_id, timestamp):
    return {
        "timestamp": timestamp,
        "event_type": "flow",
        "tenant_id": tenant_id,
        "src_ip": f"192.168.1.{random.randint(2, 254)}",
        "dest_ip": f"10.0.0.{random.randint(2, 254)}",
        "proto": "TCP",
        "app_proto": "http",
        "flow": {
            "pkts_toserver": random.randint(1, 100),
            "pkts_toclient": random.randint(1, 100),
            "bytes_toserver": random.randint(64, 10000),
            "bytes_toclient": random.randint(64, 10000)
        },
        "source_type": "suricata"
    }

def send_to_opensearch(index, document):
    try:
        url = f"{OS_HOST}/{index}/_doc"
        requests.post(url, headers=HEADERS, json=document)
    except Exception as e:
        print(f"Error: {e}")

def main():
    tenant = "tenant-01"
    print(f"Generating sample data for {tenant} compatible with React Dashboard...")
    
    # Generate historical data for the last 15 minutes
    now = datetime.utcnow()
    for i in range(50):
        past_time = (now - timedelta(minutes=random.randint(0, 15))).isoformat()
        
        # Ingest into multiple suricata-related indices as expected by opensearchViews.js
        indices_suricata = [
            f"logs-{tenant}-suricata-alert",
            f"logs-{tenant}-suricata-dns",
            f"logs-{tenant}-suricata-http",
            f"logs-{tenant}-suricata-flow"
        ]
        
        for idx in indices_suricata:
            if "alert" in idx:
                send_to_opensearch(idx, generate_suricata_alert(tenant, past_time))
            elif "flow" in idx:
                send_to_opensearch(idx, generate_suricata_flow(tenant, past_time))
            else:
                send_to_opensearch(idx, generate_suricata_alert(tenant, past_time))
        
        send_to_opensearch(f"logs-{tenant}-zeek-conn", generate_zeek_conn(tenant, past_time))
        
        if i % 10 == 0:
            print(f"Indexed {i*3} events...")

    print("Done! Data should now appear in the dashboard.")

if __name__ == "__main__":
    main()
