Great question. Based on your exact use case — **multi-tenant Kafka topics → OpenSearch with dynamic routing** — here's an honest comparison:

---

## Vector vs Logstash for Your Setup

### Core Architecture Fit

| Feature | **Logstash** | **Vector** |
|---|---|---|
| Kafka topic pattern (`.*-log$`) | ✅ Native `topics_pattern` | ✅ Via `kafka` source with regex |
| Dynamic index from topic name | ✅ Ruby filter (flexible) | ✅ VRL (concise, fast) |
| OpenSearch output | ✅ Official plugin | ✅ Built-in native support |
| Multi-tenant routing | ✅ Works (what you have) | ✅ Works (simpler config) |

---

### Performance (Critical for your case)

| | **Logstash** | **Vector** |
|---|---|---|
| Language | JVM / Java | Rust |
| Memory per instance | **~500MB–1.5GB** (you just hit OOM at 512m!) | **~20–50MB** |
| Throughput | ~30k events/sec | **~1M+ events/sec** |
| Startup time | 30–60 seconds | < 1 second |
| CPU usage | High | Very low |

> 🔥 **Vector wins heavily here.** You literally just ran into Logstash's JVM memory problem. Vector does the same job in 50MB.

---

### Configuration Comparison

**Logstash** (what you have now — 80 lines):
```ruby
input { kafka { topics_pattern => ".*-log$" ... } }
filter { ruby { code => 'tenant = topic.gsub(/-log$/, "")...' } }
output { opensearch { index => "%{tenant_id}-logs-..." } }
```

**Vector** (equivalent — ~20 lines):
```toml
[sources.kafka_tenants]
type = "kafka"
bootstrap_servers = "your-kafka:9092"
topics = ["^.*-log$"]  # regex pattern
group_id = "vector-consumer"

[transforms.extract_tenant]
type = "remap"
inputs = ["kafka_tenants"]
source = '''
  .tenant_id = replace(string!(.metadata.kafka.topic), r'-log$', "")
'''

[sinks.opensearch]
type = "elasticsearch"  # works with OpenSearch
inputs = ["extract_tenant"]
endpoints = ["http://opensearch-node1:9200"]
index = "{{ tenant_id }}-logs-%Y.%m.%d"
```

---

### Verdict for Your Use Case

| Criteria | Winner |
|---|---|
| **Works right now (no rewrite)** | Logstash ✅ |
| **Memory efficiency** (multi-tenant = many topics) | **Vector** 🏆 |
| **Speed / throughput** | **Vector** 🏆 |
| **Simpler config** | **Vector** 🏆 |
| **Ecosystem / plugins** | Logstash (more mature) |
| **Kubernetes sidecar** (per-tenant agent) | **Vector** 🏆 |

---

### My Recommendation

**Switch to Vector** if you're building this for production/Kubernetes. For your multi-tenant architecture:
- Logstash **per node** is too heavy — 1.5GB× N tenants = expensive
- Vector can run as a **lightweight sidecar** next to each tenant's Suricata/Zeek pod and ship logs directly, or as one central collector — both work great
- Vector's Kubernetes-native integration also makes it easy to auto-discover new tenant pods

**Keep Logstash** only if you already have complex Logstash plugins or your team knows it well and you're not scaling beyond ~10 tenants.

Want me to write the Vector config that replaces your current Logstash setup?