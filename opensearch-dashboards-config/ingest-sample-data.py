#!/usr/bin/env python3
"""
Sample Data Ingestion Script for BETA OpenSearch Security Dashboard
Generates realistic security events for SIEM, IDS/IPS, and EDR
"""

import json
import random
from datetime import datetime, timedelta
from opensearchpy import OpenSearch, helpers

# OpenSearch connection
# Update these credentials to match your Wazuh OpenSearch
client = OpenSearch(
    hosts=[{'host': 'localhost', 'port': 9200}],
    http_auth=('admin', 'admin'),  # Change if your Wazuh uses different credentials
    use_ssl=False,
    verify_certs=False,
    ssl_show_warn=False
)

# Configuration
TENANTS = ['Tenant_01', 'Tenant_02', 'Tenant_03']
SEVERITIES = ['Critical', 'High', 'Medium', 'Low']
HOSTS = [
    'web-server-01', 'web-server-02', 'db-server-01', 'db-server-02',
    'app-server-01', 'app-server-02', 'mail-server-01', 'file-server-01',
    'workstation-01', 'workstation-02', 'workstation-03', 'workstation-04'
]
INTERNAL_IPS = [
    '192.168.1.10', '192.168.1.11', '192.168.1.20', '192.168.1.21',
    '10.0.0.50', '10.0.0.51', '10.0.0.100', '10.0.0.101'
]
EXTERNAL_IPS = [
    '203.0.113.45', '198.51.100.23', '192.0.2.156', '203.0.113.89',
    '198.51.100.67', '192.0.2.234', '203.0.113.12', '198.51.100.145'
]

# SIEM Rules
SIEM_RULES = [
    'Multiple Failed Login Attempts',
    'Suspicious PowerShell Execution',
    'Unauthorized Access Attempt',
    'Privilege Escalation Detected',
    'Data Exfiltration Attempt',
    'Brute Force Attack Detected',
    'Malware Signature Match',
    'Suspicious Network Traffic'
]

# IDS/IPS Signatures
IDS_SIGNATURES = [
    'SQL Injection Attempt',
    'Cross-Site Scripting (XSS)',
    'Port Scan Detected',
    'DDoS Attack Pattern',
    'Malicious Payload Detected',
    'Command Injection Attempt',
    'Buffer Overflow Attempt',
    'Suspicious File Upload'
]

# EDR Events
EDR_EVENTS = [
    'Ransomware Behavior Detected',
    'Suspicious Process Creation',
    'Registry Modification',
    'Credential Dumping Attempt',
    'Lateral Movement Detected',
    'Persistence Mechanism Created',
    'Suspicious DLL Injection',
    'File Encryption Activity'
]

def generate_siem_event(tenant, timestamp):
    """Generate a SIEM event"""
    return {
        '@timestamp': timestamp.isoformat(),
        'tenant': tenant,
        'data_source': 'SIEM',
        'severity': random.choice(SEVERITIES),
        'host': random.choice(HOSTS),
        'rule_name': random.choice(SIEM_RULES),
        'source_ip': random.choice(INTERNAL_IPS),
        'dest_ip': random.choice(EXTERNAL_IPS) if random.random() > 0.3 else random.choice(INTERNAL_IPS),
        'user': f'user{random.randint(1, 20)}',
        'action': random.choice(['blocked', 'allowed', 'logged']),
        'event_count': random.randint(1, 100)
    }

def generate_ids_event(tenant, timestamp):
    """Generate an IDS/IPS event"""
    return {
        '@timestamp': timestamp.isoformat(),
        'tenant': tenant,
        'data_source': 'IDS',
        'severity': random.choice(SEVERITIES),
        'host': random.choice(HOSTS),
        'signature': random.choice(IDS_SIGNATURES),
        'rule_name': random.choice(IDS_SIGNATURES),
        'source_ip': random.choice(EXTERNAL_IPS),
        'dest_ip': random.choice(INTERNAL_IPS),
        'source_port': random.randint(1024, 65535),
        'dest_port': random.choice([80, 443, 22, 3389, 3306, 5432]),
        'protocol': random.choice(['TCP', 'UDP', 'ICMP']),
        'action': 'blocked',
        'bytes_in': random.randint(100, 10000),
        'bytes_out': random.randint(100, 10000)
    }

def generate_edr_event(tenant, timestamp):
    """Generate an EDR event"""
    return {
        '@timestamp': timestamp.isoformat(),
        'tenant': tenant,
        'data_source': 'EDR',
        'severity': random.choice(SEVERITIES),
        'host': random.choice(HOSTS),
        'event_type': random.choice(EDR_EVENTS),
        'rule_name': random.choice(EDR_EVENTS),
        'process_name': random.choice(['powershell.exe', 'cmd.exe', 'rundll32.exe', 'svchost.exe']),
        'process_id': random.randint(1000, 9999),
        'parent_process': random.choice(['explorer.exe', 'services.exe', 'winlogon.exe']),
        'file_path': f'C:\\\\Windows\\\\System32\\\\{random.choice(["temp", "logs", "config"])}\\\\file{random.randint(1, 100)}.exe',
        'hash_md5': ''.join(random.choices('0123456789abcdef', k=32)),
        'action': random.choice(['quarantined', 'blocked', 'logged'])
    }

def bulk_index_events(tenant, num_events=1000, days_back=7):
    """Bulk index events for a tenant"""
    actions = []
    now = datetime.utcnow()
    
    for i in range(num_events):
        # Random timestamp within the last N days
        timestamp = now - timedelta(
            days=random.randint(0, days_back),
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59),
            seconds=random.randint(0, 59)
        )
        
        # Generate events for each data source
        event_type = random.choice(['siem', 'ids', 'edr'])
        
        if event_type == 'siem':
            event = generate_siem_event(tenant, timestamp)
            index_name = f"{tenant.lower()}_siem-{timestamp.strftime('%Y.%m.%d')}"
        elif event_type == 'ids':
            event = generate_ids_event(tenant, timestamp)
            index_name = f"{tenant.lower()}_ips-{timestamp.strftime('%Y.%m.%d')}"
        else:
            event = generate_edr_event(tenant, timestamp)
            index_name = f"{tenant.lower()}_edr-{timestamp.strftime('%Y.%m.%d')}"
        
        actions.append({
            '_index': index_name,
            '_source': event
        })
    
    # Bulk index
    success, failed = helpers.bulk(client, actions, raise_on_error=False)
    print(f"✓ {tenant}: Indexed {success} events, {len(failed)} failed")
    return success, failed

def create_index_templates():
    """Create index templates for SIEM, IDS, and EDR"""
    templates = {
        'siem-template': {
            'index_patterns': ['*_siem-*'],
            'template': {
                'settings': {
                    'number_of_shards': 1,
                    'number_of_replicas': 0,
                    'refresh_interval': '5s'
                },
                'mappings': {
                    'properties': {
                        '@timestamp': {'type': 'date'},
                        'tenant': {'type': 'keyword'},
                        'data_source': {'type': 'keyword'},
                        'severity': {'type': 'keyword'},
                        'host': {'type': 'keyword'},
                        'rule_name': {'type': 'keyword'},
                        'source_ip': {'type': 'ip'},
                        'dest_ip': {'type': 'ip'},
                        'user': {'type': 'keyword'},
                        'action': {'type': 'keyword'},
                        'event_count': {'type': 'integer'}
                    }
                }
            }
        },
        'ips-template': {
            'index_patterns': ['*_ips-*'],
            'template': {
                'settings': {
                    'number_of_shards': 1,
                    'number_of_replicas': 0,
                    'refresh_interval': '5s'
                },
                'mappings': {
                    'properties': {
                        '@timestamp': {'type': 'date'},
                        'tenant': {'type': 'keyword'},
                        'data_source': {'type': 'keyword'},
                        'severity': {'type': 'keyword'},
                        'host': {'type': 'keyword'},
                        'signature': {'type': 'keyword'},
                        'rule_name': {'type': 'keyword'},
                        'source_ip': {'type': 'ip'},
                        'dest_ip': {'type': 'ip'},
                        'source_port': {'type': 'integer'},
                        'dest_port': {'type': 'integer'},
                        'protocol': {'type': 'keyword'},
                        'action': {'type': 'keyword'},
                        'bytes_in': {'type': 'long'},
                        'bytes_out': {'type': 'long'}
                    }
                }
            }
        },
        'edr-template': {
            'index_patterns': ['*_edr-*'],
            'template': {
                'settings': {
                    'number_of_shards': 1,
                    'number_of_replicas': 0,
                    'refresh_interval': '5s'
                },
                'mappings': {
                    'properties': {
                        '@timestamp': {'type': 'date'},
                        'tenant': {'type': 'keyword'},
                        'data_source': {'type': 'keyword'},
                        'severity': {'type': 'keyword'},
                        'host': {'type': 'keyword'},
                        'event_type': {'type': 'keyword'},
                        'rule_name': {'type': 'keyword'},
                        'process_name': {'type': 'keyword'},
                        'process_id': {'type': 'integer'},
                        'parent_process': {'type': 'keyword'},
                        'file_path': {'type': 'keyword'},
                        'hash_md5': {'type': 'keyword'},
                        'action': {'type': 'keyword'}
                    }
                }
            }
        }
    }
    
    for template_name, template_body in templates.items():
        try:
            client.indices.put_index_template(name=template_name, body=template_body)
            print(f"✓ Created index template: {template_name}")
        except Exception as e:
            print(f"✗ Failed to create template {template_name}: {e}")

def main():
    """Main function"""
    print("=" * 60)
    print("BETA OpenSearch Security - Sample Data Ingestion")
    print("=" * 60)
    
    # Create index templates
    print("\n1. Creating index templates...")
    create_index_templates()
    
    # Ingest sample data for each tenant
    print("\n2. Ingesting sample data...")
    total_success = 0
    total_failed = 0
    
    for tenant in TENANTS:
        success, failed = bulk_index_events(tenant, num_events=5000, days_back=7)
        total_success += success
        total_failed += len(failed)
    
    print("\n" + "=" * 60)
    print(f"✓ Total indexed: {total_success} events")
    print(f"✗ Total failed: {total_failed} events")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Open OpenSearch Dashboards: http://localhost:5601")
    print("2. Import saved objects from saved-objects-export.ndjson")
    print("3. View dashboards: Dashboards → BETA - Unified Security Dashboard")
    print("=" * 60)

if __name__ == '__main__':
    main()
