# Kafka-OpenSearch Integration Setup Guide

Complete guide for the Kafka-OpenSearch integration for real-time security event streaming.

## Architecture Overview

```
┌─────────────────────┐
│ Security Data       │
│ Sources/Producers   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Apache Kafka      │
│  (Message Broker)   │
│                     │
│ Topics:             │
│ • siem-events       │
│ • ids-events        │
│ • edr-events        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│    Logstash         │
│ (Data Pipeline)     │
│                     │
│ • Parse events      │
│ • Enrich data       │
│ • Transform fields  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   OpenSearch        │
│ (Search & Analytics)│
│                     │
│ Indices:            │
│ • tenant_01_siem-*  │
│ • tenant_01_ids-*   │
│ • tenant_01_edr-*   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────┐
│  OpenSearch Dashboards          │
│  React Security Dashboard       │
└─────────────────────────────────┘
```

## Services & Ports

| Service | Port | Description |
|---------|------|-------------|
| OpenSearch | 9200 | REST API |
| OpenSearch Dashboards | 5601 | Web UI |
| Kafka | 9092 | Internal broker |
| Kafka | 29092 | External broker (localhost) |
| Kafka UI | 9090 | Web management interface |
| Zookeeper | 2181 | Kafka coordination |
| Logstash | 5044 | Beats input |

## Quick Start

### 1. Start All Services

```bash
# Stop existing services first
docker-compose down

# Start all services (including Kafka)
docker-compose up -d

# Check all services are running
docker-compose ps
```

Expected output:
```
NAME                    STATUS
opensearch-node1        Up
opensearch-dashboards   Up
zookeeper              Up
kafka                  Up
kafka-ui               Up
logstash               Up
```

### 2. Wait for Services to Initialize

Kafka and Logstash need a few moments to fully start:

```bash
# Watch Kafka logs
docker logs -f kafka

# Wait for: "Kafka Server started"

# Watch Logstash logs
docker logs -f logstash

# Wait for: "Pipelines running"
```

### 3. Verify Kafka Topics

Topics are auto-created by Logstash when it starts. Verify them:

```bash
# List all topics
docker exec kafka kafka-topics --list --bootstrap-server localhost:9092
```

You should see:
- `siem-events`
- `ids-events`
- `edr-events`

### 4. Access Kafka UI

Open your browser to: **http://localhost:8080**

You can:
- View topics and their configurations
- Monitor message rates
- Inspect individual messages
- Check consumer group lag

### 5. Start Producing Events

```bash
cd kafka-producer
pip install -r requirements.txt
python producer.py
```

You'll see events being produced:
```
✓ Sent SIEM event to siem-events: abc-123
✓ Sent IDS event to ids-events: def-456
✓ Sent EDR event to edr-events: ghi-789
```

### 6. Verify Data in OpenSearch

```bash
# Check SIEM indices
curl "http://localhost:9200/_cat/indices/tenant_01_siem-*?v"

# View recent SIEM events
curl "http://localhost:9200/tenant_01_siem-*/_search?size=5&pretty"

# Check IDS indices
curl "http://localhost:9200/_cat/indices/tenant_01_ids-*?v"

# Check EDR indices
curl "http://localhost:9200/_cat/indices/tenant_01_edr-*?v"
```

## Kafka Topics Configuration

### Topic: siem-events

**Purpose**: Security Information and Event Management events

**Event Schema**:
```json
{
  "event_id": "uuid",
  "timestamp": "ISO8601",
  "event_type": "string",
  "severity": "critical|high|medium|low|info",
  "source_ip": "string",
  "destination_ip": "string",
  "user": "string",
  "host": "string",
  "rule_id": "string",
  "category": "string"
}
```

### Topic: ids-events

**Purpose**: Intrusion Detection System alerts

**Event Schema**:
```json
{
  "alert_id": "uuid",
  "timestamp": "ISO8601",
  "attack_type": "string",
  "signature_id": "integer",
  "source_ip": "string",
  "destination_ip": "string",
  "protocol": "string",
  "severity": "critical|high|medium|low",
  "action": "blocked|allowed|logged"
}
```

### Topic: edr-events

**Purpose**: Endpoint Detection and Response events

**Event Schema**:
```json
{
  "detection_id": "uuid",
  "timestamp": "ISO8601",
  "threat_type": "string",
  "endpoint": "string",
  "process_name": "string",
  "file_hash": "string",
  "severity": "critical|high|medium|low",
  "status": "quarantined|blocked|allowed"
}
```

## Logstash Pipelines

Three separate pipelines process events from each topic:

### SIEM Pipeline
- **File**: `logstash-pipeline/siem-pipeline.conf`
- **Input**: Kafka topic `siem-events`
- **Output**: `tenant_01_siem-YYYY.MM.dd` indices
- **Features**: Severity parsing, timestamp normalization, metadata enrichment

### IDS Pipeline
- **File**: `logstash-pipeline/ids-pipeline.conf`
- **Input**: Kafka topic `ids-events`
- **Output**: `tenant_01_ids-YYYY.MM.dd` indices
- **Features**: Attack type categorization, protocol parsing

### EDR Pipeline
- **File**: `logstash-pipeline/edr-pipeline.conf`
- **Input**: Kafka topic `edr-events`
- **Output**: `tenant_01_edr-YYYY.MM.dd` indices
- **Features**: Threat categorization, file hash normalization

## Monitoring

### Check Kafka Broker Status

```bash
docker exec kafka kafka-broker-api-versions --bootstrap-server localhost:9092
```

### Monitor Consumer Lag

```bash
docker exec kafka kafka-consumer-groups --bootstrap-server localhost:9092 --list

docker exec kafka kafka-consumer-groups --bootstrap-server localhost:9092 \
  --group logstash-siem-consumer --describe
```

### View Logstash Processing Stats

```bash
# Check Logstash metrics
curl http://localhost:9600/_node/stats/pipelines?pretty
```

### Monitor OpenSearch Indexing Rate

```bash
# Check indexing stats
curl "http://localhost:9200/_stats/indexing?pretty"
```

## Troubleshooting

### Issue: Kafka won't start

**Symptoms**: Container exits immediately

**Solution**:
```bash
# Check logs
docker logs kafka

# Ensure Zookeeper is running first
docker-compose up -d zookeeper
sleep 10
docker-compose up -d kafka
```

### Issue: Logstash can't connect to Kafka

**Symptoms**: Connection refused errors in Logstash logs

**Solution**:
```bash
# Verify Kafka is accessible
docker exec logstash ping -c 3 kafka

# Restart Logstash
docker-compose restart logstash
```

### Issue: No data appearing in OpenSearch

**Symptoms**: Indices not created or empty

**Solution**:
```bash
# 1. Check Logstash is consuming from Kafka
docker logs logstash --tail 100

# 2. Verify events are in Kafka topics
docker exec kafka kafka-console-consumer --bootstrap-server localhost:9092 \
  --topic siem-events --from-beginning --max-messages 5

# 3. Check Logstash pipeline status
curl http://localhost:9600/_node/stats/pipelines?pretty

# 4. Restart Logstash
docker-compose restart logstash
```

### Issue: Consumer lag increasing

**Symptoms**: Events piling up in Kafka, not being processed

**Solution**:
```bash
# Increase Logstash consumer threads
# Edit logstash-pipeline/*.conf
# Change: consumer_threads => 5

# Restart Logstash
docker-compose restart logstash
```

## Manual Topic Management

### Create a Topic Manually

```bash
docker exec kafka kafka-topics --create \
  --bootstrap-server localhost:9092 \
  --topic custom-events \
  --partitions 3 \
  --replication-factor 1
```

### Delete a Topic

```bash
docker exec kafka kafka-topics --delete \
  --bootstrap-server localhost:9092 \
  --topic topic-name
```

### Describe Topic Configuration

```bash
docker exec kafka kafka-topics --describe \
  --bootstrap-server localhost:9092 \
  --topic siem-events
```

## Performance Tuning

### Kafka Configuration

Edit `docker-compose.yml` to adjust Kafka settings:

```yaml
environment:
  # Increase retention for longer history
  KAFKA_LOG_RETENTION_HOURS: 336  # 2 weeks

  # Increase segment size for better performance
  KAFKA_LOG_SEGMENT_BYTES: 2147483648  # 2GB
```

### Logstash Configuration

Edit pipeline files to adjust consumer threads:

```conf
input {
  kafka {
    consumer_threads => 5  # Increase for higher throughput
    session_timeout_ms => 30000
    max_poll_records => 500
  }
}
```

## Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v
```

## Next Steps

1. **Integrate with React Dashboard**: Update the React app to show real-time Kafka metrics
2. **Add Alerting**: Configure OpenSearch alerting for critical events
3. **Create Dashboards**: Build visualizations in OpenSearch Dashboards
4. **Add Authentication**: Enable security plugins for production use
5. **Scale Up**: Add more Kafka brokers and Logstash instances for production

## Useful Commands Cheat Sheet

```bash
# View all running containers
docker-compose ps

# View logs for specific service
docker logs -f kafka
docker logs -f logstash

# Restart a service
docker-compose restart kafka

# Execute command in container
docker exec -it kafka bash

# Check Kafka topics
docker exec kafka kafka-topics --list --bootstrap-server localhost:9092

# Consume messages from topic
docker exec kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic siem-events \
  --from-beginning

# Check OpenSearch indices
curl "http://localhost:9200/_cat/indices?v"

# Search OpenSearch
curl "http://localhost:9200/tenant_01_siem-*/_search?pretty"
```

## Resources

- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [OpenSearch Documentation](https://opensearch.org/docs/)
- [Logstash Documentation](https://opensearch.org/docs/latest/tools/logstash/)
- [Kafka UI GitHub](https://github.com/provectus/kafka-ui)
