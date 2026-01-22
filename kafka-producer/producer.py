"""
Kafka Producer for Security Events
Generates realistic SIEM, IDS, and EDR events and sends them to Kafka topics
"""

import json
import random
import time
from datetime import datetime, timedelta
from kafka import KafkaProducer
from faker import Faker
import uuid

fake = Faker()

import os

# Kafka configuration
# Use KAFKA_BOOTSTRAP_SERVER env var if set, otherwise default to localhost:29092
KAFKA_BOOTSTRAP_SERVERS = [os.getenv('KAFKA_BOOTSTRAP_SERVER', 'localhost:29092')]
TOPICS = {
    'siem': 'siem-events',
    'ids': 'ids-events',
    'edr': 'edr-events'
}

# Event generation parameters
EVENTS_PER_SECOND = 5
BATCH_SIZE = 10

def create_producer():
    """Create and return a Kafka producer"""
    return KafkaProducer(
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        value_serializer=lambda v: json.dumps(v).encode('utf-8'),
        acks='all',
        retries=3
    )

def generate_siem_event():
    """Generate a realistic SIEM event"""
    severities = ['critical', 'high', 'medium', 'low', 'info']
    event_types = ['login_failure', 'privilege_escalation', 'unauthorized_access', 
                   'data_exfiltration', 'policy_violation', 'configuration_change']
    
    return {
        'event_id': str(uuid.uuid4()),
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'event_type': random.choice(event_types),
        'severity': random.choice(severities),
        'source_ip': fake.ipv4(),
        'destination_ip': fake.ipv4(),
        'user': fake.user_name(),
        'host': fake.hostname(),
        'description': fake.sentence(),
        'rule_id': f"SIEM-{random.randint(1000, 9999)}",
        'rule_name': f"Security Rule {random.randint(1, 100)}",
        'category': random.choice(['authentication', 'authorization', 'network', 'system']),
        'tags': random.sample(['suspicious', 'anomaly', 'compliance', 'audit'], k=random.randint(1, 3))
    }

def generate_ids_event():
    """Generate a realistic IDS/IPS event"""
    attack_types = ['SQL Injection', 'XSS Attack', 'Port Scan', 'DDoS Attack', 
                    'Brute Force', 'Malware Download', 'Command Injection']
    protocols = ['TCP', 'UDP', 'HTTP', 'HTTPS', 'SSH', 'FTP']
    
    return {
        'alert_id': str(uuid.uuid4()),
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'attack_type': random.choice(attack_types),
        'signature_id': random.randint(1000000, 9999999),
        'signature_name': f"ET {random.choice(['EXPLOIT', 'MALWARE', 'SCAN', 'POLICY'])} {fake.word()}",
        'source_ip': fake.ipv4(),
        'source_port': random.randint(1024, 65535),
        'destination_ip': fake.ipv4(),
        'destination_port': random.choice([80, 443, 22, 21, 3389, 8080]),
        'protocol': random.choice(protocols),
        'severity': random.choice(['critical', 'high', 'medium', 'low']),
        'action': random.choice(['blocked', 'allowed', 'logged']),
        'payload': fake.text(max_nb_chars=100),
        'bytes_in': random.randint(100, 100000),
        'bytes_out': random.randint(100, 100000)
    }

def generate_edr_event():
    """Generate a realistic EDR event"""
    threat_types = ['Malware', 'Ransomware', 'Suspicious Activity', 'Trojan', 
                    'Rootkit', 'Spyware', 'Adware']
    actions = ['file_created', 'file_modified', 'file_deleted', 'process_started', 
               'process_terminated', 'registry_modified', 'network_connection']
    
    return {
        'detection_id': str(uuid.uuid4()),
        'timestamp': datetime.utcnow().isoformat() + 'Z',
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
        'severity': random.choice(['critical', 'high', 'medium', 'low']),
        'status': random.choice(['quarantined', 'blocked', 'allowed', 'investigating']),
        'mitre_technique': f"T{random.randint(1000, 1999)}.{random.randint(1, 9):03d}",
        'command_line': fake.sentence()
    }

def produce_events(producer, event_type, count=1):
    """Produce events to Kafka topic"""
    topic = TOPICS[event_type]
    
    for _ in range(count):
        if event_type == 'siem':
            event = generate_siem_event()
        elif event_type == 'ids':
            event = generate_ids_event()
        elif event_type == 'edr':
            event = generate_edr_event()
        else:
            continue
        
        try:
            future = producer.send(topic, value=event)
            future.get(timeout=10)  # Wait for confirmation
            print(f"✓ Sent {event_type.upper()} event to {topic}: {event.get('event_id', event.get('alert_id', event.get('detection_id')))}")
        except Exception as e:
            print(f"✗ Error sending {event_type} event: {e}")

def main():
    """Main producer loop"""
    print("=" * 80)
    print("Kafka Security Events Producer")
    print("=" * 80)
    print(f"Kafka Brokers: {KAFKA_BOOTSTRAP_SERVERS}")
    print(f"Topics: {list(TOPICS.values())}")
    print(f"Events per second: {EVENTS_PER_SECOND}")
    print("=" * 80)
    print("\nStarting event production... (Press Ctrl+C to stop)\n")
    
    producer = create_producer()
    
    try:
        while True:
            # Randomly distribute events across all three types
            event_types = ['siem', 'ids', 'edr']
            
            for _ in range(EVENTS_PER_SECOND):
                event_type = random.choice(event_types)
                produce_events(producer, event_type, count=1)
            
            time.sleep(1)  # Wait 1 second before next batch
            
    except KeyboardInterrupt:
        print("\n\nStopping producer...")
    finally:
        producer.flush()
        producer.close()
        print("Producer closed. Goodbye!")

if __name__ == "__main__":
    main()
