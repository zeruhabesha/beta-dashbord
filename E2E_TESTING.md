# End-to-End Testing Guide for Multi-Tenant IDS Platform

This document provides comprehensive instructions for testing the multi-tenant IDS platform locally using Kind (Kubernetes in Docker).

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Keycloak      │    │   RBAC Service  │    │   Kafka 4.0     │
│   (Docker:8081) │    │   (Docker:8091) │    │   (Kind/KRaft)  │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         └──────────────────────┼──────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │     API Gateway       │
                    │     (Kind:30080)      │
                    └───────────┬───────────┘
                                │ K8s API
                    ┌───────────┴───────────┐
                    │  TenantIDS Operator   │
                    │  (Kind Deployment)    │
                    └───────────┬───────────┘
                                │ Creates
            ┌───────────────────┼───────────────────┐
            │                   │                   │
    ┌───────┴───────┐   ┌───────┴───────┐   ┌───────┴───────┐
    │   Namespace   │   │  ConfigMaps   │   │ Kafka Topics  │
    │tenant-{name}  │   │ suricata/zeek │   │ {tenant}-logs │
    └───────────────┘   └───────────────┘   └───────────────┘
```

## Prerequisites

- Docker
- kubectl
- kind
- jq
- curl

## Quick Start

### Step 1: Create Kind Cluster

```bash
kind create cluster --name beta-idps-test
kubectl cluster-info
```

### Step 2: Install TenantIDS CRDs

```bash
cd /home/gura/Documents/Projects/beta/git/tenant-ids-operator
make install
```

### Step 3: Deploy Kafka (Strimzi with KRaft mode)

```bash
# Install Strimzi operator
kubectl create namespace kafka
kubectl apply -f 'https://strimzi.io/install/latest?namespace=kafka' -n kafka
kubectl wait --for=condition=ready pod -l name=strimzi-cluster-operator -n kafka --timeout=120s

# Deploy Kafka cluster (KRaft mode - no Zookeeper)
cat <<EOF | kubectl apply -n kafka -f -
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaNodePool
metadata:
  name: controller
  labels:
    strimzi.io/cluster: kafka
spec:
  replicas: 1
  roles:
    - controller
  storage:
    type: ephemeral
---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaNodePool
metadata:
  name: broker
  labels:
    strimzi.io/cluster: kafka
spec:
  replicas: 1
  roles:
    - broker
  storage:
    type: ephemeral
---
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: kafka
  annotations:
    strimzi.io/kraft: enabled
    strimzi.io/node-pools: enabled
spec:
  kafka:
    version: 4.0.0
    listeners:
      - name: plain
        port: 9092
        type: internal
        tls: false
    config:
      offsets.topic.replication.factor: 1
      transaction.state.log.replication.factor: 1
      transaction.state.log.min.isr: 1
  entityOperator:
    topicOperator: {}
    userOperator: {}
EOF

# Wait for Kafka to be ready
kubectl wait --for=condition=Ready pod -l strimzi.io/cluster=kafka -n kafka --timeout=300s
```

### Step 4: Deploy TenantIDS Operator

```bash
cd /home/gura/Documents/Projects/beta/git/tenant-ids-operator

# Build and load image
docker build -t tenant-ids-operator:local .
kind load docker-image tenant-ids-operator:local --name beta-idps-test

# Deploy operator
kubectl apply -f config/manager/manager.yaml
# OR use the manual deployment shown below
```

### Step 5: Start Docker Compose Services

```bash
cd /home/gura/Documents/Projects/beta/git/beta-idps
docker-compose up -d zookeeper kafka keycloak-db keycloak mysql-rbac rbac-service
```

### Step 6: Build and Deploy Gateway to Kind

```bash
cd /home/gura/Documents/Projects/beta/git/beta-idps

# Build gateway image
docker build -t beta-idps-gateway:local -f infra/docker/Dockerfile.gateway .

# Load into Kind
kind load docker-image beta-idps-gateway:local --name beta-idps-test

# Deploy gateway (use provided manifests or create deployment)
kubectl apply -f infra/k8s/gateway-deployment.yaml
```

### Step 7: Run E2E Test

```bash
# Port forward gateway
kubectl port-forward -n beta-idps svc/gateway 30080:8080 &

# Get Keycloak token (use host IP for docker network access)
HOST_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.Gateway}}{{end}}' beta-idps-test-control-plane | head -1)

TOKEN=$(curl -s -X POST http://${HOST_IP}:8081/realms/enterprise-realm/protocol/openid-connect/token \
  -d "client_id=gateway" \
  -d "client_secret=gateway-client-secret" \
  -d "username=admin" \
  -d "password=admin" \
  -d "grant_type=password" | jq -r '.access_token')

# Create tenant
curl -s -X POST -b "kc_access_token=$TOKEN" http://localhost:30080/api/v1/tenants/ \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "test-tenant",
    "orgId": "test-org",
    "suricata": {"replicas": 1},
    "zeek": {"replicas": 1},
    "logging": {
      "kafkaBootstrapServers": "kafka-kafka-bootstrap.kafka.svc.cluster.local:9092",
      "kafkaTopic": "test-tenant-logs"
    }
  }' | jq .

# Verify
kubectl get tenantids
kubectl get ns | grep tenant
kubectl get configmaps -n tenant-test-tenant
```

---

## Common Issues and Solutions

### Issue 1: "unauthorized" error on API calls

**Symptom:**
```json
{"success":false,"error":{"code":500,"message":"Internal Server Error","detail":"unauthorized"}}
```

**Cause:** Token issuer mismatch. Token was obtained from `localhost:8081` but gateway validates against `172.x.x.x:8081`.

**Solution:** Get token from the same IP the gateway uses:
```bash
HOST_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.Gateway}}{{end}}' beta-idps-test-control-plane | head -1)
TOKEN=$(curl -s -X POST http://${HOST_IP}:8081/realms/enterprise-realm/protocol/openid-connect/token ...)
```

---

### Issue 2: "tenantids.ids.betatech.com is forbidden"

**Symptom:**
```json
{"detail":"Failed to create tenant: tenantids.ids.betatech.com is forbidden: User \"system:serviceaccount:beta-idps:gateway\" cannot create resource \"tenantids\""}
```

**Cause 1:** Wrong resource name in GVR. K8s uses `tenantidses` (plural) not `tenantids`.

**Solution:** Check `gateway/internal/controller/tenant.go` line 26:
```go
var TenantIDSGVR = schema.GroupVersionResource{
    Resource: "tenantidses",  // Must be plural
}
```

**Cause 2:** Missing ClusterRoleBinding.

**Solution:**
```bash
kubectl create clusterrolebinding gateway-tenantids \
  --clusterrole=gateway-tenantids-manager \
  --serviceaccount=beta-idps:gateway
```

---

### Issue 3: Operator can't connect to Kafka (DNS resolution)

**Symptom:**
```
dial tcp: lookup kafka-kafka-bootstrap.kafka.svc.cluster.local: no such host
```

**Cause:** Operator running locally cannot resolve K8s cluster DNS.

**Solution:** Deploy operator inside the K8s cluster:
```bash
docker build -t tenant-ids-operator:local .
kind load docker-image tenant-ids-operator:local --name beta-idps-test
kubectl apply -f config/manager/manager.yaml
```

---

### Issue 4: RBAC Service migration fails

**Symptom:**
```
Error 1091 (42000): Can't DROP 'uni_policies_name'; check that column/key exists
```

**Cause:** Database schema inconsistency from previous migrations.

**Solution:** Reset the database:
```bash
docker exec beta-idps-mysql-rbac-1 mysql -u root -prootpassword -e "DROP DATABASE rbac_db; CREATE DATABASE rbac_db;"
docker-compose restart rbac-service
```

---

### Issue 5: Kafka version not supported

**Symptom:**
```
Unsupported Kafka.spec.kafka.version: 3.6.0. Supported versions are: [4.0.0, 4.0.1, 4.1.0, 4.1.1]
```

**Cause:** Strimzi 0.46+ only supports Kafka 4.x with KRaft mode (no Zookeeper).

**Solution:** Use Kafka 4.0.0 with KRaft mode and KafkaNodePools (see Step 3 above).

---

### Issue 6: "non-positive interval for NewTicker" panic

**Symptom:**
```
panic: non-positive interval for NewTicker
```

**Cause:** Missing `RBAC_CACHE_TTL` environment variable.

**Solution:** Add to deployment:
```yaml
env:
- name: RBAC_CACHE_TTL
  value: "300"
```

---

### Issue 7: Port conflict on 8081

**Symptom:**
```
error listening on :8081: listen tcp :8081: bind: address already in use
```

**Cause:** Both Keycloak (Docker) and operator health probe use port 8081.

**Solution:** When running operator locally, use different port:
```bash
go run ./cmd/main.go --health-probe-bind-address=:9081
```

---

### Issue 8: Docker build fails - assets not found

**Symptom:**
```
internal/controller/configmaps.go:21:12: pattern assets/suricata/*: no matching files found
```

**Cause:** `.dockerignore` excludes everything except `*.go` files.

**Solution:** Add to `.dockerignore`:
```
!internal/controller/assets/**
```

---

## Verification Commands

```bash
# Check all components
kubectl get pods -n tenant-ids-system  # Operator
kubectl get pods -n beta-idps          # Gateway
kubectl get pods -n kafka              # Kafka

# Check tenant status
kubectl get tenantids
kubectl describe tenantids <name>
kubectl get tenantids <name> -o jsonpath='{.status}' | jq .

# Check created resources
kubectl get ns | grep tenant
kubectl get configmaps -n tenant-<name>

# Check operator logs
kubectl logs -n tenant-ids-system deployment/tenant-ids-operator

# Check gateway logs
kubectl logs -n beta-idps deployment/gateway
```

## Cleanup

```bash
# Delete tenants
kubectl delete tenantids --all

# Delete cluster
kind delete cluster --name beta-idps-test

# Stop docker services
docker-compose down
```
