# Week 1: TenantIDS CRD Schema

## Overview
The `TenantIDS` Custom Resource Definition (CRD) is the core API for our system. It represents a single tenant's Intrusion Detection System (IDS) environment. By creating a `TenantIDS` resource, users declare their intent to provision a dedicated, isolated environment containing Suricata and Zeek instances, along with necessary networking and logging infrastructure.

## Schema Breakdown

### Spec (Desired State)
The `Spec` defines the configuration requested by the user. It allows customization of IDS/IPS engines, resource allocation, and integration settings.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| **`tenantId`** | `string` | **Yes** | A unique identifier for the tenant (e.g., `client-a`). This ID is used to generate resource names (e.g., namespace `tenant-client-a`) and label resources. |
| **`suricata`** | `object` | No | Configuration for the Suricata IDS engine, including replica count, rulesets, and resource limits. |
| **`zeek`** | `object` | No | Configuration for the Zeek network analysis engine, including policy scripts and replica count. |
| **`logging`** | `object` | No | Defines where logs are shipped, primarily integrating with Kafka topics for centralized analysis. |
| **`network`** | `object` | No | Controls network isolation policies, utilizing Ingress/Egress CIDR blocks to define allowed traffic. |
| **`storage`** | `object` | No | specific persistent storage requirements for the tenant's data. |

### Status (Observed State)
The `Status` functions as the system's reporting mechanism. The operator updates these fields to reflect the actual state of the infrastructure compared to the `Spec`.

| Field | Type | Description |
| :--- | :--- | :--- |
| **`phase`** | `string` | High-level lifecycle state of the tenant (e.g., `Creating`, `Ready`, `Failed`). |
| **`conditions`** | `list` | Detailed history of transitions and errors (e.g., `NamespaceReady`, `KafkaConnected`). Adheres to standard Kubernetes condition patterns. |
| **`namespaceName`** | `string` | The actual name of the Kubernetes Namespace created for this tenant. |
| **`suricataStatus`** | `object` | Real-time status of Suricata pods (e.g., `ReadyReplicas` vs `DesiredReplicas`). |
| **`zeekStatus`** | `object` | Real-time status of Zeek pods. |
| **`kafkaStatus`** | `object` | Connectivity checks for the logging pipeline (e.g., `Connected: true`). |
| **`resourceInventory`** | `list` | A complete list of all Kubernetes resources (Deployments, Services, ConfigMaps) created and managed by the operator for this tenant. |

## Detailed Field Definitions

### Component Configuration (`suricata` & `zeek`)
Both Suricata and Zeek share similar configuration structures:

*   **`replicas`** (`int`): Number of pods to run for high availability.
*   **`image`** (`string`): Docker image to use (allows version overrides).
*   **`resources`** (`object`): CPU and Memory requests/limits to ensure performance and prevent resource starvation.
*   **`autoScaling`** (`object`): Settings to enable Horizontal Pod Autoscaling based on load.

### Logging Configuration (`logging`)
*   **`kafkaTopic`** (`string`): The specific topic to write alerts and logs to. Defaults to `tenant-{tenantId}-logs`.
*   **`kafkaBootstrapServers`** (`string`): Address of the Kafka cluster.
*   **`retentionDays`** (`int`): Local log retention policy before rotation.

### Network Configuration (`network`)
*   **`ingressCIDR`** (`string`): IP range allowed to send traffic to the IDS sensors.
*   **`egressCIDR`** (`string`): IP range the sensors are allowed to connect to.
*   **`isolationMode`** (`string`): `Strict` (default) or `Moderate`, governing default deny rules.
