import os
import re
import time

import deploy_remote_dashboards as deploy


EDR_INDEX_PATTERN = (
    "edr*,edr-detections-*,edr-response-actions-*,edr-response-results-*,"
    "edr-audit-events-*,tenant-*-edr*,tenant_*_edr*,tenant-01-edr*"
)

EDR_FIELD_NAMES = [
    "indexed_at",
    "created_at",
    "updated_at",
    "detected_at",
    "finished_at",
    "requested_at",
    "expiration_time",
    "retention_until",
    "org_id",
    "client_id",
    "agent_id",
    "hostname",
    "username",
    "event_kind",
    "threat_type",
    "severity",
    "risk_tier",
    "stage",
    "status",
    "message",
    "reason",
    "policy_name",
    "policy_id",
    "policy_revision",
    "decision_id",
    "execution_mode",
    "playbook_id",
    "playbook_name",
    "playbook_execution_id",
    "step_id",
    "template_id",
    "template_name",
    "template_version",
    "approval_id",
    "approval_request_id",
    "approval_status",
    "operator_id",
    "action_id",
    "action_name",
    "artifact_name",
    "flow_id",
    "threat_event_id",
    "process_name",
    "process_pid",
    "command_line",
    "file_path",
    "file_hash",
    "sha256",
    "checksum",
    "remote_ip",
    "source_ip",
    "destination_ip",
    "source_port",
    "destination_port",
    "safety_check",
    "safety_violation",
    "whitelist_match",
    "guardrail",
    "skipped_reason",
    "cooldown_until",
    "rate_limit",
    "control_action",
    "manual_action",
    "cancellation_event",
    "pause_requested",
    "resume_requested",
    "parameter_update",
    "rollback_action",
    "rollback_id",
    "forensic_path",
    "evidence_path",
    "storage_bucket",
    "storage_uri",
    "content_type",
    "collection_scope",
    "archive_path",
    "archive_sha256",
    "size_bytes",
    "size_limit_bytes",
    "mttr_ms",
    "response_duration_ms",
    "containment_duration_ms",
    "success_rate",
    "hunt_id",
    "campaign_id",
    "ioc_type",
    "ioc_value",
    "domain",
    "registry_key",
    "matched_endpoints",
    "cti_feed",
    "baseline_score",
    "integration_type",
    "jira_ticket",
    "servicenow_incident",
    "slack_channel",
    "email_recipient",
    "pagerduty_incident",
    "webhook_url",
    "splunk_hec",
    "syslog_server",
    "forwarding_destination",
    "service_name",
    "instance_id",
    "consumer_group",
    "health_status",
    "events_processed",
    "actions_generated",
    "policy_evaluation_duration_ms",
    "retry_count",
    "error_type",
    "dlq_topic",
    "dead_letter",
    "timeout_event",
    "kafka_status",
    "velociraptor_api_status",
    "replay_status",
    "panic_recovered",
    "circuit_breaker_state",
    "config_version",
    "config_change_id",
    "validation_status",
    "git_commit",
    "environment",
    "secret_provider",
    "hot_reload",
    "policy_directory",
    "dry_run",
    "simulation_id",
    "artifact_validation",
    "policy_simulation",
    "test_playbook",
]

EDR_DATE_FIELDS = {
    "indexed_at",
    "created_at",
    "updated_at",
    "detected_at",
    "finished_at",
    "requested_at",
    "expiration_time",
    "retention_until",
}
EDR_TEXT_FIELDS = {"message", "reason", "command_line"}
EDR_BOOLEAN_FIELDS = {
    "dry_run",
    "pause_requested",
    "resume_requested",
    "dead_letter",
    "panic_recovered",
    "hot_reload",
}


def infer_edr_type(field_name):
    if field_name in EDR_DATE_FIELDS:
        return "date"
    if field_name in EDR_BOOLEAN_FIELDS:
        return "boolean"
    if field_name in EDR_TEXT_FIELDS:
        return "text"
    if re.search(r"(_count|count|_ms|duration|size|bytes|score|level|severity|risk|rate|retry_count|matched_endpoints)$", field_name):
        return "long"
    return "keyword"


def edr_data_view_fields():
    fields = [
        deploy.make_data_view_field("_id", "_id", searchable=True, aggregatable=True),
        deploy.make_data_view_field("_index", "_index", searchable=True, aggregatable=True),
        deploy.make_data_view_field("_score", "float", searchable=False, aggregatable=False),
        deploy.make_data_view_field("_source", "_source", searchable=False, aggregatable=False),
    ]
    seen = {field["name"] for field in fields}

    for field_name in EDR_FIELD_NAMES:
        if field_name in seen:
            continue
        seen.add(field_name)
        es_type = infer_edr_type(field_name)
        fields.append(deploy.make_data_view_field(field_name, es_type, searchable=True, aggregatable=es_type != "text"))

    return fields


def wait_for_services(timeout_seconds):
    deadline = time.time() + timeout_seconds
    last_error = None

    while time.time() < deadline:
        try:
            deploy.request_opensearch_json("GET", "/_cluster/health")
            deploy.request_json("GET", "/api/status")
            return
        except Exception as exc:
            last_error = exc
            time.sleep(2)

    raise RuntimeError(f"OpenSearch or OpenSearch Dashboards was not ready after {timeout_seconds}s: {last_error}")


def repair_data_views():
    timeout = int(os.getenv("BETA_DASHBOARDS_REPAIR_TIMEOUT", "180"))
    default_data_view_id = os.getenv("BETA_DEFAULT_DATA_VIEW_ID", "beta-edr-events")

    wait_for_services(timeout)
    deploy.ensure_saved_objects_index_mapping()
    deploy.ensure_wazuh_bootstrap_index()

    existing_data_views = {
        item.get("attributes", {}).get("title"): item
        for item in deploy.find_saved_objects("index-pattern")
        if item.get("attributes", {}).get("title")
    }

    edr_id = deploy.upsert_data_view_id("beta-edr-events", EDR_INDEX_PATTERN, "indexed_at", edr_data_view_fields())
    wazuh_fields = deploy.wazuh_fields_from_field_caps()
    wazuh_id = deploy.upsert_data_view_id(deploy.DEFAULT_DATA_VIEW_ID, deploy.WAZUH_INDEX_PATTERN, "@timestamp", wazuh_fields)
    deploy.ensure_data_view(existing_data_views, "beta-wazuh-alerts", deploy.WAZUH_INDEX_PATTERN, "@timestamp", wazuh_fields)
    deploy.ensure_data_view(existing_data_views, "beta-wazuh-events", "wazuh-*", "@timestamp", wazuh_fields)

    deploy.ensure_default_index(default_data_view_id if default_data_view_id in {edr_id, wazuh_id} else edr_id)
    print("data view repair complete")


if __name__ == "__main__":
    repair_data_views()
