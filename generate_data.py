
import json
import random
import time
import requests
import uuid
import urllib3
from datetime import datetime, timedelta
from faker import Faker

# Suppress insecure request warnings if using HTTPS with self-signed certs (not used here but good practice)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

fake = Faker()

# OpenSearch Configuration
OS_HOST = "http://localhost:9200"
HEADERS = {'Content-Type': 'application/json'}
# Auth: If using basic auth, uncomment and set
# AUTH = ('admin', 'admin') 
AUTH = None 

INDICES = {
    'unified': 'tenant-01-logs',
    'siem': 'tenant-01-siem',
    'ids': 'tenant-01-ids',
    'edr': 'tenant-01-edr',
    'vuln': 'tenant-01-vuln',
    'netflow': 'tenant-01-netflow'
}

def generate_siem_event(timestamp=None):
    severities = ['Critical', 'High', 'Medium', 'Low', 'Info']
    event_types = ['Login Failure', 'Privilege Escalation', 'Unauthorized Access', 
                   'Data Exfiltration', 'Policy Violation', 'Configuration Change']
    
    if not timestamp:
        timestamp = datetime.utcnow().isoformat()
    
    return {
        'event_id': str(uuid.uuid4()),
        '@timestamp': timestamp,
        'event_type': random.choice(event_types),
        'severity': random.choice(severities),
        'source_ip': fake.ipv4(),
        'destination_ip': fake.ipv4(),
        'user': fake.user_name(),
        'host': fake.hostname(),
        'description': fake.sentence(),
        'rule_id': f"SIEM-{random.randint(1000, 9999)}",
        'rule_name': f"Security Rule {random.randint(1, 100)}",
        'category': random.choice(['Authentication', 'Authorization', 'Network', 'System']),
        'tags': random.sample(['Suspicious', 'Anomaly', 'Compliance', 'Audit'], k=random.randint(1, 3)),
        'data_source': 'SIEM'
    }

def generate_ids_event(timestamp=None):
    # Mimics Suricata Alert format
    signatures = [
        "ET EXPLOIT Possible SQL Injection", 
        "ET MALWARE Cobalt Strike Beacon", 
        "ET SCAN Nmap OS Detection",
        "ET POLICY Tor Onion Domain Request",
        "GPL ATTACK_RESPONSE Forbidden File Access"
    ]
    
    if not timestamp:
        timestamp = datetime.utcnow().isoformat()

    return {
        '@timestamp': timestamp,
        'event_type': 'alert',
        'proto': random.choice(['TCP', 'UDP', 'HTTP']),
        'src_ip': fake.ipv4(),
        'src_port': random.randint(1024, 65535),
        'dest_ip': fake.ipv4(),
        'dest_port': random.choice([80, 443, 8080]),
        'alert': {
            'action': 'allowed',
            'gid': 1,
            'signature_id': random.randint(2000000, 2999999),
            'signature': random.choice(signatures),
            'category': 'Network Anomaly',
            'severity': random.randint(1, 3) # Suricata uses 1=High, 3=Low usually
        },
        'tenant_id': 'tenant-01',
        'data_source': 'suricata'
    }

def generate_zeek_event(timestamp=None):
    # Mimics Zeek Conn/DNS/HTTP logs
    if not timestamp:
        timestamp = datetime.utcnow().isoformat()
    
    event_type = random.choice(['conn', 'dns', 'http', 'ssl'])
    
    return {
        '@timestamp': timestamp,
        'event_type': event_type,
        'proto': 'TCP' if event_type != 'dns' else 'UDP',
        'src_ip': fake.ipv4(),
        'dest_ip': fake.ipv4(),
        'dest_port': 53 if event_type == 'dns' else 443,
        'zeek': {
            'uid': str(uuid.uuid4())[:18],
            'service': event_type,
            'duration': random.uniform(0.1, 5.0)
        },
        'tenant_id': 'tenant-01',
        'data_source': 'zeek'
    }

def generate_edr_event(timestamp=None):
    threat_types = ['Malware', 'Ransomware', 'Suspicious Activity', 'Trojan', 
                    'Rootkit', 'Spyware', 'Adware']
    actions = ['File Created', 'File Modified', 'File Deleted', 'Process Started', 
               'Process Terminated', 'Registry Modified', 'Network Connection']
    
    if not timestamp:
        timestamp = datetime.utcnow().isoformat()

    return {
        'detection_id': str(uuid.uuid4()),
        '@timestamp': timestamp,
        'threat_type': random.choice(threat_types),
        'endpoint': fake.hostname(),
        'user': fake.user_name(),
        'process_name': random.choice(['chrome.exe', 'powershell.exe', 'cmd.exe', 
                                       'svchost.exe', 'explorer.exe', 'unknown.exe']),
        'process_id': random.randint(1000, 99999),
        'parent_process': random.choice(['explorer.exe', 'services.exe', 'winlogon.exe']),
        'file_path': f"C:\\{random.choice(['Windows', 'Users', 'Program Files'])}\\{fake.file_name()}",
        'file_hash': fake.sha256(),
        'action': random.choice(actions),
        'severity': random.choice(['Critical', 'High', 'Medium', 'Low']),
        'status': random.choice(['Quarantined', 'Blocked', 'Allowed', 'Investigating']),
        'mitre_technique': f"T{random.randint(1000, 1999)}.{random.randint(1, 9):03d}",
        'command_line': fake.sentence(),
        'data_source': 'EDR'
    }

def generate_vuln_event(timestamp=None):
    if not timestamp:
        timestamp = datetime.utcnow().isoformat()
    
    return {
        'scan_id': str(uuid.uuid4()),
        '@timestamp': timestamp,
        'vulnerability': f"CVE-{random.randint(2020, 2025)}-{random.randint(1000, 9999)}",
        'severity': random.choice(['Critical', 'High', 'Medium', 'Low']),
        'host': fake.hostname(),
        'ip': fake.ipv4(),
        'cvss_score': round(random.uniform(1.0, 10.0), 1),
        'scanner': 'Nessus',
        'status': random.choice(['Open', 'Patched', 'False Positive']),
        'data_source': 'Vulnerability Scan'
    }

def generate_netflow_event(timestamp=None):
    if not timestamp:
        timestamp = datetime.utcnow().isoformat()
        
    return {
        'flow_id': str(uuid.uuid4()),
        '@timestamp': timestamp,
        'source_ip': fake.ipv4(),
        'dest_ip': fake.ipv4(),
        'source_port': random.randint(1024, 65535),
        'dest_port': random.choice([80, 443, 22, 53, 3389]),
        'protocol': random.choice(['TCP', 'UDP']),
        'bytes': random.randint(64, 10000000),
        'packets': random.randint(1, 10000),
        'interface': f"eth{random.randint(0, 3)}",
        'action': random.choice(['ACCEPT', 'DROP', 'REJECT']),
        'data_source': 'Netflow'
    }

def send_to_opensearch(index, document):
    try:
        url = f"{OS_HOST}/{index}/_doc"
        response = requests.post(url, headers=HEADERS, json=document, auth=AUTH)
        if response.status_code not in [200, 201]:
            print(f"Failed to index doc: {response.text}")
    except Exception as e:
        print(f"Error sending to OpenSearch: {e}")

def main():
    print("Generating historical data (last 24 hours)...")
    
    # Generate historical data
    now = datetime.utcnow()
    for i in range(100): # 100 historical events
        past_time = (now - timedelta(minutes=random.randint(1, 1440))).isoformat()
        
        # SIEM
        send_to_opensearch(INDICES['siem'], generate_siem_event(past_time))
        # IDS (Suricata)
        send_to_opensearch(INDICES['ids'], generate_ids_event(past_time))
        # Zeek
        send_to_opensearch(INDICES['ids'], generate_zeek_event(past_time))
        # EDR
        send_to_opensearch(INDICES['edr'], generate_edr_event(past_time))
        
        if i % 10 == 0:
            print(f"Generated {i} historical events...")

    print("Historical data generation complete.")
    print("Starting continuous live data generation (Press Ctrl+C to stop)...")

    try:
        while True:
            # Generate one of each per cycle
            send_to_opensearch(INDICES['siem'], generate_siem_event())
            send_to_opensearch(INDICES['ids'], generate_ids_event())
            send_to_opensearch(INDICES['ids'], generate_zeek_event())
            send_to_opensearch(INDICES['edr'], generate_edr_event())
            
            print(".", end="", flush=True)
            time.sleep(1) # 1 second delay
            
    except KeyboardInterrupt:
        print("\nStopped.")

if __name__ == "__main__":
    main()
