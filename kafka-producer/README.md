# Kafka Security Events Producer

Python-based producer that generates realistic security events for testing the Kafka-OpenSearch pipeline.

## Features

- **SIEM Events**: Login failures, privilege escalation, unauthorized access, data exfiltration
- **IDS Events**: SQL injection, XSS attacks, port scans, DDoS attacks, brute force attempts
- **EDR Events**: Malware detection, ransomware, suspicious processes, file operations

## Installation

```bash
cd kafka-producer
pip install -r requirements.txt
```

## Usage

### Basic Usage

```bash
python producer.py
```

This will start producing events at a rate of 5 events per second, randomly distributed across SIEM, IDS, and EDR topics.

### Configuration

Edit `producer.py` to customize:

- `KAFKA_BOOTSTRAP_SERVERS`: Kafka broker address (default: `localhost:29092`)
- `EVENTS_PER_SECOND`: Rate of event generation (default: 5)
- Event field values and distributions

## Topics

The producer sends events to these Kafka topics:

- `siem-events` - Security Information and Event Management events
- `ids-events` - Intrusion Detection System alerts
- `edr-events` - Endpoint Detection and Response events

## Event Examples

### SIEM Event
```json
{
  "event_id": "123e4567-e89b-12d3-a456-426614174000",
  "timestamp": "2026-01-12T09:30:00.000Z",
  "event_type": "login_failure",
  "severity": "high",
  "source_ip": "192.168.1.100",
  "user": "admin",
  "host": "web-server-01"
}
```

### IDS Event
```json
{
  "alert_id": "223e4567-e89b-12d3-a456-426614174001",
  "timestamp": "2026-01-12T09:30:00.000Z",
  "attack_type": "SQL Injection",
  "source_ip": "10.0.0.50",
  "destination_port": 443,
  "severity": "critical"
}
```

### EDR Event
```json
{
  "detection_id": "323e4567-e89b-12d3-a456-426614174002",
  "timestamp": "2026-01-12T09:30:00.000Z",
  "threat_type": "Ransomware",
  "endpoint": "laptop-01",
  "process_name": "suspicious.exe",
  "status": "quarantined"
}
```

## Monitoring

Watch the console output to see events being produced in real-time:

```
✓ Sent SIEM event to siem-events: 123e4567-e89b-12d3-a456-426614174000
✓ Sent IDS event to ids-events: 223e4567-e89b-12d3-a456-426614174001
✓ Sent EDR event to edr-events: 323e4567-e89b-12d3-a456-426614174002
```

## Stopping

Press `Ctrl+C` to gracefully stop the producer.
