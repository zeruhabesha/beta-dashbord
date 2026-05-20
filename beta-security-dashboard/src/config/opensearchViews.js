const EDR_PRIMARY_DATA_VIEW_TITLE = 'edr*,edr-detections-*,edr-response-actions-*,edr-response-results-*,edr-audit-events-*,tenant-*-edr*,tenant_*_edr*,tenant-01-edr*';
const EDR_DATA_VIEW_TITLES = [EDR_PRIMARY_DATA_VIEW_TITLE, 'edr*', 'edr-detections-*', 'edr-response-actions-*', 'edr-response-results-*', 'edr-audit-events-*', 'tenant-*-edr*', 'tenant_*_edr*', 'tenant-01-edr*'];
const EDR_BASE_QUERY = '(event_kind:* or threat_type:* or action_name:* or policy_name:* or stage:* or status:* or client_id:* or artifact_name:* or process_name:* or file_hash:* or remote_ip:* or source_ip:*)';
const EDR_DETECTIONS_QUERY = '(event_kind:* or threat_type:* or detected_at:* or recommended_action:* or winning_stage:*)';
const EDR_RESPONSE_CENTER_QUERY = '(action_name:* or status:* or policy_name:* or message:* or threat_event_id:*)';
const EDR_PLAYBOOK_QUERY = '(stage:"playbook" or policy_name:* or policy_id:*)';
const EDR_DETECTION_PIPELINE_QUERY = '(event_kind:* or winning_stage:* or winning_method:* or recommended_action:*)';
const EDR_COLLECTED_ARTIFACTS_QUERY = '(artifact_name:* or flow_id:* or action_name:collect_forensics)';
const EDR_CLIENT_EVENTS_QUERY = '(client_id:* and (threat_type:* or event_kind:* or process_name:* or file_path:*))';
const EDR_SERVER_EVENTS_QUERY = '(stage:* or status:* or message:* or policy_name:*)';
const EDR_PLAYBOOK_ORCHESTRATION_QUERY = '(playbook_id:* or playbook_name:* or playbook_execution_id:* or step_id:* or stage:(playbook or response) or action_name:* or policy_name:*)';
const EDR_PLAYBOOK_TEMPLATES_QUERY = '(template_id:* or template_name:* or template_version:* or policy_name:* or policy_id:* or action_name:*)';
const EDR_APPROVAL_QUEUE_QUERY = '(approval_id:* or approval_request_id:* or approval_status:* or execution_mode:approval or status:(pending or approved or rejected or expired))';
const EDR_SAFETY_CHECKS_QUERY = '(safety_check:* or safety_violation:* or whitelist_match:* or guardrail:* or skipped_reason:* or status:(safety_blocked or skipped))';
const EDR_RATE_LIMITS_QUERY = '(cooldown:* or cooldown_until:* or rate_limit:* or queued_reason:* or max_executions:* or status:(queued or cooldown or rate_limited))';
const EDR_GRADUATED_RESPONSE_QUERY = '(execution_mode:* or risk_tier:* or severity:* or policy_name:* or action_name:*)';
const EDR_SOC_OVERRIDE_QUERY = '(override_id:* or override_action:* or soc_override:* or manual_action:* or status:(stopped or modified or approved or rejected))';
const EDR_ROLLBACK_QUERY = '(rollback_action:* or rollback_id:* or action_name:(restore_file or unblock_ip or reenable_network) or status:(rollback_started or rollback_success or rollback_failed))';
const EDR_FORENSIC_STORAGE_QUERY = '(artifact_name:* or forensic_path:* or evidence_path:* or storage_bucket:* or retention_until:* or action_name:collect_forensics)';
const EDR_AUDIT_TRAIL_QUERY = '(stage:* or action:* or status:* or policy_name:* or entity_type:* or entity_id:* or decision_id:* or threat_event_id:*)';
const EDR_RESPONSE_DASHBOARD_QUERY = '(playbook_execution_id:* or action_id:* or approval_id:* or action_name:* or status:* or mttr_ms:* or response_duration_ms:* or containment_duration_ms:*)';
const EDR_EXECUTION_CONTROL_QUERY = '(playbook_execution_id:* or control_action:* or manual_action:* or cancellation_event:* or pause_requested:* or resume_requested:* or parameter_update:* or status:(running or in_progress or paused or cancelled or stopped))';
const EDR_AUDIT_COMPLIANCE_QUERY = '(audit_event_type:* or event_id:* or operator_id:* or reason:* or export_format:* or forwarding_destination:* or splunk_hec:* or syslog_server:* or retention_days:* or action_name:* or policy_name:*)';
const EDR_FORENSIC_RETENTION_QUERY = '(forensic_path:* or evidence_path:* or storage_bucket:* or retention_until:* or sha256:* or checksum:* or encryption_algorithm:* or access_operation:* or export_target:*)';
const EDR_RESPONSE_METRICS_QUERY = '(mttr_ms:* or response_duration_ms:* or containment_duration_ms:* or success_rate:* or action_name:* or policy_name:* or threat_type:* or status:*)';
const EDR_ENHANCED_FORENSICS_QUERY = '(action_name:(collect_memory_dump or collect_process_tree or collect_network_pcap or collect_system_logs or collect_file_timeline) or collection_scope:* or archive_path:* or archive_sha256:* or size_bytes:* or size_limit_bytes:*)';
const EDR_THREAT_HUNTING_QUERY = '(hunt_id:* or campaign_id:* or ioc_type:* or ioc_value:* or file_hash:* or domain:* or process_name:* or registry_key:* or cti_feed:* or baseline_score:* or matched_endpoints:*)';
const EDR_ENTERPRISE_INTEGRATIONS_QUERY = '(integration_type:* or jira_ticket:* or servicenow_incident:* or slack_channel:* or email_recipient:* or pagerduty_incident:* or webhook_url:* or splunk_hec:* or syslog_server:* or forwarding_destination:*)';
const EDR_PLATFORM_PERFORMANCE_QUERY = '(service_name:* or instance_id:* or consumer_group:* or events_processed:* or actions_generated:* or policy_evaluation_duration_ms:* or health_status:* or circuit_breaker_state:* or liveness:* or readiness:*)';
const EDR_RELIABILITY_QUERY = '(error_type:* or retry_count:* or dlq_topic:* or dead_letter:* or timeout_event:* or kafka_status:* or velociraptor_api_status:* or replay_status:* or panic_recovered:* or status:(failed or timeout or retrying or dlq))';
const EDR_CONFIGURATION_QUERY = '(config_version:* or config_change_id:* or validation_status:* or git_commit:* or environment:* or operator_id:* or secret_provider:* or hot_reload:* or policy_directory:*)';
const EDR_TEST_VALIDATION_QUERY = '(dry_run:* or simulation_id:* or validation_status:* or artifact_validation:* or test_playbook:* or sample_event_id:* or policy_simulation:* or really_do_it:false or parameters.ReallyDoIt:false)';
const EDR_RESPONSE_GOVERNANCE_QUERY = `(${EDR_APPROVAL_QUEUE_QUERY} or ${EDR_SAFETY_CHECKS_QUERY} or ${EDR_RATE_LIMITS_QUERY} or ${EDR_GRADUATED_RESPONSE_QUERY})`;
const EDR_RESPONSE_ACTION_COLUMNS = ['indexed_at', 'created_at', 'finished_at', 'org_id', 'client_id', 'policy_name', 'policy_id', 'execution_mode', 'risk_tier', 'action_name', 'status', 'artifact_name', 'decision_id', 'threat_event_id', 'message', '_index'];
const EDR_PLAYBOOK_COLUMNS = ['indexed_at', 'created_at', 'playbook_id', 'playbook_name', 'playbook_execution_id', 'template_name', 'template_version', 'step_id', 'stage', 'status', 'policy_name', 'action_name', 'client_id', 'decision_id', '_index'];
const EDR_GOVERNANCE_COLUMNS = ['indexed_at', 'created_at', 'org_id', 'policy_name', 'policy_id', 'execution_mode', 'risk_tier', 'approval_status', 'safety_check', 'cooldown_until', 'rate_limit', 'status', 'action_name', 'client_id', '_index'];
const EDR_AUDIT_COLUMNS = ['indexed_at', 'created_at', 'audit_event_type', 'event_id', 'stage', 'status', 'action', 'action_name', 'policy_name', 'execution_mode', 'operator_id', 'reason', 'entity_type', 'entity_id', 'client_id', 'decision_id', 'threat_event_id', 'message', '_index'];
const EDR_FORENSIC_COLUMNS = ['indexed_at', 'created_at', 'finished_at', 'org_id', 'client_id', 'artifact_name', 'action_name', 'status', 'forensic_path', 'evidence_path', 'storage_bucket', 'retention_until', 'sha256', 'checksum', 'encryption_algorithm', 'access_operation', 'export_target', 'collection_scope', 'archive_path', 'archive_sha256', 'size_bytes', 'size_limit_bytes', 'flow_id', 'message', '_index'];
const EDR_CONTROL_COLUMNS = ['indexed_at', 'created_at', 'playbook_execution_id', 'control_action', 'manual_action', 'operator_id', 'status', 'reason', 'dry_run', 'elevated_privilege', 'parameter_update', 'cancellation_event', 'action_name', 'client_id', 'policy_name', '_index'];
const EDR_METRIC_COLUMNS = ['indexed_at', 'detected_at', 'finished_at', 'org_id', 'client_id', 'threat_type', 'severity', 'policy_name', 'action_name', 'status', 'mttr_ms', 'response_duration_ms', 'containment_duration_ms', 'success_rate', '_index'];
const EDR_HUNTING_COLUMNS = ['indexed_at', 'created_at', 'finished_at', 'org_id', 'hunt_id', 'campaign_id', 'ioc_type', 'ioc_value', 'file_hash', 'domain', 'process_name', 'registry_key', 'matched_endpoints', 'status', 'cti_feed', 'baseline_score', 'client_id', '_index'];
const EDR_INTEGRATION_COLUMNS = ['indexed_at', 'created_at', 'org_id', 'integration_type', 'status', 'jira_ticket', 'servicenow_incident', 'slack_channel', 'email_recipient', 'pagerduty_incident', 'webhook_url', 'splunk_hec', 'syslog_server', 'forwarding_destination', 'policy_name', '_index'];
const EDR_PLATFORM_COLUMNS = ['indexed_at', 'service_name', 'instance_id', 'consumer_group', 'health_status', 'events_processed', 'actions_generated', 'policy_evaluation_duration_ms', 'retry_count', 'error_type', 'dlq_topic', 'dead_letter', 'timeout_event', 'kafka_status', 'velociraptor_api_status', 'replay_status', 'panic_recovered', 'circuit_breaker_state', 'status', '_index'];
const EDR_CONFIG_TEST_COLUMNS = ['indexed_at', 'created_at', 'operator_id', 'config_version', 'config_change_id', 'validation_status', 'git_commit', 'environment', 'secret_provider', 'hot_reload', 'policy_directory', 'dry_run', 'simulation_id', 'artifact_validation', 'policy_simulation', 'test_playbook', 'status', '_index'];
const WAZUH_DATA_VIEW_TITLES = ['wazuh-alerts-4.x-*', 'wazuh-alerts-*', 'wazuh-*', 'edr*'];
const WAZUH_BASE_QUERY = 'rule.level:* or rule.id:* or rule.description:*';
const WAZUH_ALERT_COLUMNS = ['@timestamp', 'agent.name', 'agent.id', 'agent.ip', 'rule.level', 'rule.description', 'rule.groups', 'rule.id', 'decoder.name', 'location', '_index'];
const WAZUH_THREAT_COLUMNS = ['@timestamp', 'agent.name', 'rule.level', 'rule.description', 'rule.groups', 'rule.mitre.id', 'rule.mitre.tactic', 'rule.mitre.technique', 'decoder.name', 'data.srcip', 'data.dstip', '_index'];
const WAZUH_FIM_COLUMNS = ['@timestamp', 'agent.name', 'rule.level', 'rule.description', 'syscheck.event', 'syscheck.path', 'syscheck.sha256_after', 'syscheck.audit.user.name', 'rule.groups', '_index'];
const WAZUH_COMPLIANCE_COLUMNS = ['@timestamp', 'agent.name', 'rule.level', 'rule.description', 'rule.pci_dss', 'rule.gdpr', 'rule.hipaa', 'rule.nist_800_53', 'rule.id', '_index'];
const WAZUH_CLOUD_COLUMNS = ['@timestamp', 'agent.name', 'rule.level', 'rule.description', 'decoder.name', 'rule.groups', 'data.aws.source', 'data.aws.region', 'data.srcip', 'data.dstip', '_index'];
const OPENSEARCH_ROUTE_REVISION = 'edr-data-view-repair-v2';
const OPENSEARCH_EMBED_TIMEZONE = 'UTC';

const OPENSEARCH_MODULE_VIEWS = {
    siem: {
        dataViewTitles: WAZUH_DATA_VIEW_TITLES,
        views: {
            home: {
                title: 'SIEM Operations Home',
                dashboardId: 'siem-home',
                query: WAZUH_BASE_QUERY,
                sortField: '@timestamp',
                columns: WAZUH_ALERT_COLUMNS
            },
            overview: {
                title: 'SIEM Overview',
                dashboardId: 'siem-overview',
                query: WAZUH_BASE_QUERY,
                sortField: '@timestamp',
                columns: WAZUH_ALERT_COLUMNS
            },
            'config-assessment': {
                title: 'Config Assessment',
                dashboardId: 'siem-config-assessment',
                query: 'rule.groups:sca or rule.groups:rootcheck or rule.cis:*',
                sortField: '@timestamp',
                columns: ['@timestamp', 'agent.name', 'rule.level', 'rule.description', 'rule.groups', 'rule.cis', 'rule.pci_dss', 'rule.nist_800_53', '_index']
            },
            malware: {
                title: 'Malware Detection',
                dashboardId: 'siem-malware',
                query: 'rule.groups:malware or rule.groups:virus or data.YARA.rule_name:*',
                sortField: '@timestamp',
                columns: ['@timestamp', 'agent.name', 'rule.level', 'rule.description', 'rule.groups', 'data.YARA.rule_name', 'data.YARA.scanned_file', 'decoder.name', '_index']
            },
            fim: {
                title: 'File Integrity',
                dashboardId: 'siem-fim',
                query: 'rule.groups:syscheck or syscheck.path:*',
                sortField: '@timestamp',
                columns: WAZUH_FIM_COLUMNS
            },
            hunting: {
                title: 'Threat Hunting',
                dashboardId: 'siem-hunting',
                query: 'rule.level >= 10 or rule.mitre.id:* or data.srcip:* or data.dstip:*',
                sortField: '@timestamp',
                columns: WAZUH_THREAT_COLUMNS
            },
            'vuln-detect': {
                title: 'Vuln Detection',
                dashboardId: 'siem-vuln-detect',
                query: 'rule.groups:"vulnerability-detector" or rule.cve:*',
                sortField: '@timestamp',
                columns: ['@timestamp', 'agent.name', 'rule.level', 'rule.description', 'rule.cve', 'rule.groups', 'decoder.name', '_index']
            },
            mitre: {
                title: 'MITRE ATT&CK',
                dashboardId: 'siem-mitre',
                query: 'rule.mitre.id:* or rule.mitre.tactic:* or rule.mitre.technique:*',
                sortField: '@timestamp',
                columns: WAZUH_THREAT_COLUMNS
            },
            hygiene: {
                title: 'IT Hygiene',
                dashboardId: 'siem-hygiene',
                query: 'rule.groups:sca or rule.groups:rootcheck or rule.groups:syscollector',
                sortField: '@timestamp',
                columns: ['@timestamp', 'agent.name', 'rule.level', 'rule.description', 'rule.groups', 'rule.cis', 'decoder.name', '_index']
            },
            pci: {
                title: 'PCI DSS',
                dashboardId: 'siem-pci',
                query: 'rule.pci_dss:*',
                sortField: '@timestamp',
                columns: WAZUH_COMPLIANCE_COLUMNS
            },
            gdpr: {
                title: 'GDPR',
                dashboardId: 'siem-gdpr',
                query: 'rule.gdpr:*',
                sortField: '@timestamp',
                columns: WAZUH_COMPLIANCE_COLUMNS
            },
            hipaa: {
                title: 'HIPAA',
                dashboardId: 'siem-hipaa',
                query: 'rule.hipaa:*',
                sortField: '@timestamp',
                columns: WAZUH_COMPLIANCE_COLUMNS
            },
            nist: {
                title: 'NIST 800-53',
                dashboardId: 'siem-nist',
                query: 'rule.nist_800_53:*',
                sortField: '@timestamp',
                columns: WAZUH_COMPLIANCE_COLUMNS
            },
            docker: {
                title: 'Docker Security',
                dashboardId: 'siem-docker',
                query: 'decoder.name:docker or rule.groups:docker',
                sortField: '@timestamp',
                columns: ['@timestamp', 'agent.name', 'rule.level', 'rule.description', 'decoder.name', 'rule.groups', 'full_log', '_index']
            },
            aws: {
                title: 'AWS Security',
                dashboardId: 'siem-aws',
                query: 'decoder.name:"aws-cloudtrail" or rule.groups:aws or data.aws.source:*',
                sortField: '@timestamp',
                columns: WAZUH_CLOUD_COLUMNS
            },
            gcp: {
                title: 'Google Cloud',
                dashboardId: 'siem-gcp',
                query: 'decoder.name:gcp or rule.groups:gcp',
                sortField: '@timestamp',
                columns: WAZUH_CLOUD_COLUMNS
            },
            azure: {
                title: 'Azure / M365',
                dashboardId: 'siem-azure',
                query: 'decoder.name:azure or rule.groups:azure or rule.groups:office365',
                sortField: '@timestamp',
                columns: WAZUH_CLOUD_COLUMNS
            },
            rules: {
                title: 'Ruleset',
                dashboardId: 'siem-rules',
                query: 'rule.id:*',
                sortField: '@timestamp',
                columns: ['@timestamp', 'rule.id', 'rule.level', 'rule.description', 'rule.groups', 'rule.firedtimes', 'rule.frequency', '_index']
            },
            decoders: {
                title: 'Decoders',
                dashboardId: 'siem-decoders',
                query: 'decoder.name:*',
                sortField: '@timestamp',
                columns: ['@timestamp', 'decoder.name', 'decoder.parent', 'location', 'rule.level', 'rule.description', 'agent.name', '_index']
            },
            logs: {
                title: 'System Logs',
                dashboardId: 'siem-logs',
                query: 'full_log:* or message:*',
                sortField: '@timestamp',
                columns: ['@timestamp', 'agent.name', 'rule.level', 'rule.description', 'full_log', 'location', 'decoder.name', '_index']
            }
        }
    },
    ids: {
        dataViewTitles: ['edr*', 'logs-tenant-*', 'logs-*', 'wazuh-*'],
        views: {
            home: {
                title: 'Operations Home',
                dashboardId: 'ids-home',
                query: 'source_type:*',
                columns: ['timestamp', 'tenant_id', 'source_type', 'event_type', 'proto', 'src_ip', 'dest_ip', '_index']
            },
            traffic: {
                title: 'Traffic Overview',
                dashboardId: 'ids-traffic',
                query: 'source_type:* and (event_type:* or source:*)',
                columns: ['timestamp', 'tenant_id', 'source_type', 'event_type', 'app_proto', 'proto', 'src_ip', 'src_port', 'dest_ip', 'dest_port']
            },
            blocked: {
                title: 'Blocked Threats',
                dashboardId: 'ids-blocked-threats',
                query: 'event_type:"alert" or flow.alerted:true or alert.signature:*',
                columns: ['timestamp', 'tenant_id', 'source_type', 'event_type', 'src_ip', 'dest_ip', 'dest_port', 'app_proto', '_index']
            },
            'ids-alerts': {
                title: 'Intrusion Alerts',
                dashboardId: 'ids-intrusion-alerts',
                query: '(_index:"logs-*-suricata-*") and (event_type:"alert" or flow.alerted:true or alert.signature:*)',
                columns: ['timestamp', 'tenant_id', 'event_type', 'app_proto', 'src_ip', 'dest_ip', 'dest_port', '_index']
            },
            signatures: {
                title: 'Signatures',
                dashboardId: 'ids-signatures',
                query: '(_index:"logs-*-suricata-dns" or _index:"logs-*-suricata-http" or _index:"logs-*-suricata-fileinfo")',
                columns: ['timestamp', 'tenant_id', 'event_type', 'dns.rrname', 'http.hostname', 'http.url', 'src_ip', 'dest_ip', '_index']
            },
            discover: {
                title: 'Packet Check',
                query: '',
                sortField: 'indexed_at',
                columns: ['indexed_at', 'event_kind', 'severity', 'threat_type', 'source_ip', 'remote_ip', 'status', '_index']
            },
            maps: {
                title: 'Geo Attack Map',
                app: 'maps',
                query: 'src_ip:* or id.orig_h:*',
                columns: ['timestamp', 'tenant_id', 'source_type', 'src_ip', 'dest_ip', 'id.orig_h', 'id.resp_h', 'proto', 'app_proto', '_index']
            },
            flows: {
                title: 'Network Flows',
                dashboardId: 'ids-flows',
                query: '(_index:"logs-*-suricata-flow" or _index:"logs-*-zeek-conn")',
                columns: ['timestamp', 'tenant_id', 'source_type', 'event_type', 'proto', 'app_proto', 'src_ip', 'dest_ip', 'id.orig_h', 'id.resp_h', '_index']
            }
        }
    },
    edr: {
        dataViewTitles: EDR_DATA_VIEW_TITLES,
        views: {
            home: {
                title: 'EDR Analysis',
                dashboardId: 'edr-home',
                query: EDR_BASE_QUERY,
                sortField: 'indexed_at',
                columns: ['indexed_at', 'detected_at', 'client_id', 'threat_type', 'severity', 'process_name', 'username', 'file_path', '_index']
            },
            endpoints: {
                title: 'Endpoint Status',
                dashboardId: 'edr-endpoints',
                query: 'client_id:*',
                sortField: 'indexed_at',
                columns: ['indexed_at', 'client_id', 'threat_type', 'severity', 'process_name', 'username', 'status', 'policy_name', '_index']
            },
            'active-threats': {
                title: 'Active Threats',
                dashboardId: 'edr-active-threats',
                query: 'severity >= 70',
                sortField: 'indexed_at',
                columns: ['indexed_at', 'client_id', 'severity', 'threat_type', 'winning_stage', 'recommended_action', 'process_name', 'file_hash', '_index']
            },
            isolation: {
                title: 'Host Isolation',
                dashboardId: 'edr-isolation',
                query: '(stage:"response" or action_name:* or status:(started or success))',
                sortField: 'indexed_at',
                columns: ['indexed_at', 'created_at', 'client_id', 'action_name', 'status', 'policy_name', 'artifact_name', 'message', 'threat_event_id', '_index']
            },
            'contained-threats': {
                title: 'Contained Threats',
                dashboardId: 'edr-contained-threats',
                query: '(status:"success" or (stage:"response" and status:*))',
                sortField: 'indexed_at',
                columns: ['indexed_at', 'finished_at', 'client_id', 'action_name', 'status', 'policy_name', 'message', 'artifact_name', 'threat_event_id', '_index']
            },
            malware: {
                title: 'Malware Analysis',
                dashboardId: 'edr-malware',
                query: '(file_hash:* or file_path:* or threat_type:process_execution)',
                sortField: 'indexed_at',
                columns: ['indexed_at', 'detected_at', 'client_id', 'threat_type', 'severity', 'process_name', 'file_path', 'file_hash', 'mitre_techniques', '_index']
            },
            'hash-intelligence': {
                title: 'Hash Intelligence',
                dashboardId: 'edr-hash-intelligence',
                query: 'file_hash:*',
                sortField: 'indexed_at',
                columns: ['indexed_at', 'detected_at', 'file_hash', 'file_path', 'process_name', 'client_id', 'threat_type', 'severity', '_index']
            },
            'process-tree': {
                title: 'Process Tree',
                dashboardId: 'edr-process-tree',
                query: '(process_name:* or command_line:* or file_path:*)',
                sortField: 'indexed_at',
                columns: ['indexed_at', 'detected_at', 'client_id', 'process_name', 'command_line', 'file_path', 'threat_type', 'severity', 'winning_method', '_index']
            },
            'file-integrity': {
                title: 'File Integrity',
                dashboardId: 'edr-file-integrity',
                query: '(file_path:* or file_hash:*)',
                sortField: 'indexed_at',
                columns: ['indexed_at', 'detected_at', 'client_id', 'file_path', 'file_hash', 'process_name', 'threat_type', 'recommended_action', '_index']
            },
            hunting: {
                title: 'Threat Hunting',
                dashboardId: 'edr-hunting',
                query: '(threat_type:* or process_name:* or command_line:* or remote_ip:* or source_ip:*)',
                sortField: 'indexed_at',
                columns: ['indexed_at', 'detected_at', 'client_id', 'threat_type', 'severity', 'process_name', 'command_line', 'remote_ip', 'source_ip', 'file_hash', '_index']
            },
            'response-center': {
                title: 'Response Center',
                dashboardId: 'edr-response-center',
                query: EDR_RESPONSE_CENTER_QUERY,
                sortField: 'indexed_at',
                columns: EDR_RESPONSE_ACTION_COLUMNS
            },
            'response-dashboard': {
                title: 'Response Dashboard',
                dashboardId: 'edr-response-dashboard',
                query: EDR_RESPONSE_DASHBOARD_QUERY,
                sortField: 'indexed_at',
                columns: EDR_METRIC_COLUMNS
            },
            'execution-control': {
                title: 'Execution Control',
                dashboardId: 'edr-execution-control',
                query: EDR_EXECUTION_CONTROL_QUERY,
                sortField: 'indexed_at',
                columns: EDR_CONTROL_COLUMNS
            },
            'manual-operations': {
                title: 'Manual Operations',
                dashboardId: 'edr-manual-operations',
                query: '(manual_action:* or manual_execution:* or dry_run:false or elevated_privilege:* or control_action:(stop_execution or pause_execution or resume_execution or modify_parameters))',
                sortField: 'indexed_at',
                columns: EDR_CONTROL_COLUMNS
            },
            approvals: {
                title: 'Approval Queue',
                dashboardId: 'edr-approval-queue',
                query: EDR_APPROVAL_QUEUE_QUERY,
                sortField: 'indexed_at',
                columns: EDR_GOVERNANCE_COLUMNS
            },
            'graduated-response': {
                title: 'Graduated Response',
                dashboardId: 'edr-graduated-response',
                query: EDR_GRADUATED_RESPONSE_QUERY,
                sortField: 'indexed_at',
                columns: EDR_GOVERNANCE_COLUMNS
            },
            'safety-checks': {
                title: 'Safety Checks',
                dashboardId: 'edr-safety-checks',
                query: EDR_SAFETY_CHECKS_QUERY,
                sortField: 'indexed_at',
                columns: EDR_GOVERNANCE_COLUMNS
            },
            'rate-limits': {
                title: 'Rate Limits',
                dashboardId: 'edr-rate-limits',
                query: EDR_RATE_LIMITS_QUERY,
                sortField: 'indexed_at',
                columns: EDR_GOVERNANCE_COLUMNS
            },
            'soc-override': {
                title: 'SOC Override',
                dashboardId: 'edr-soc-override',
                query: EDR_SOC_OVERRIDE_QUERY,
                sortField: 'indexed_at',
                columns: EDR_AUDIT_COLUMNS
            },
            rollback: {
                title: 'Rollback Actions',
                dashboardId: 'edr-rollback',
                query: EDR_ROLLBACK_QUERY,
                sortField: 'indexed_at',
                columns: EDR_RESPONSE_ACTION_COLUMNS
            },
            'response-metrics': {
                title: 'Response Metrics',
                dashboardId: 'edr-response-metrics',
                query: EDR_RESPONSE_METRICS_QUERY,
                sortField: 'indexed_at',
                columns: EDR_METRIC_COLUMNS
            },
            'playbook-automation': {
                title: 'Playbook Automation',
                dashboardId: 'edr-playbook-automation',
                query: EDR_PLAYBOOK_QUERY,
                sortField: 'indexed_at',
                columns: ['indexed_at', 'created_at', 'stage', 'status', 'policy_name', 'action', 'entity_type', 'entity_id', 'threat_event_id', '_index']
            },
            'playbook-orchestration': {
                title: 'Playbook Orchestration',
                dashboardId: 'edr-playbook-orchestration',
                query: EDR_PLAYBOOK_ORCHESTRATION_QUERY,
                sortField: 'indexed_at',
                columns: EDR_PLAYBOOK_COLUMNS
            },
            'playbook-templates': {
                title: 'Playbook Templates',
                dashboardId: 'edr-playbook-templates',
                query: EDR_PLAYBOOK_TEMPLATES_QUERY,
                sortField: 'indexed_at',
                columns: EDR_PLAYBOOK_COLUMNS
            },
            'detection-pipeline': {
                title: 'Detection Pipeline',
                dashboardId: 'edr-detection-pipeline',
                query: EDR_DETECTION_PIPELINE_QUERY,
                sortField: 'indexed_at',
                columns: ['indexed_at', 'detected_at', 'event_kind', 'winning_stage', 'winning_method', 'recommended_action', 'threat_type', 'severity', 'client_id', '_index']
            },
            'collected-artifacts': {
                title: 'Collected Artifacts',
                dashboardId: 'edr-collected-artifacts',
                query: EDR_COLLECTED_ARTIFACTS_QUERY,
                sortField: 'indexed_at',
                columns: ['indexed_at', 'created_at', 'finished_at', 'client_id', 'artifact_name', 'action_name', 'status', 'policy_name', 'flow_id', 'message', '_index']
            },
            'forensic-storage': {
                title: 'Forensic Storage',
                dashboardId: 'edr-forensic-storage',
                query: EDR_FORENSIC_STORAGE_QUERY,
                sortField: 'indexed_at',
                columns: EDR_FORENSIC_COLUMNS
            },
            'forensic-retention': {
                title: 'Forensic Retention',
                dashboardId: 'edr-forensic-retention',
                query: EDR_FORENSIC_RETENTION_QUERY,
                sortField: 'indexed_at',
                columns: EDR_FORENSIC_COLUMNS
            },
            'enhanced-forensics': {
                title: 'Enhanced Forensics',
                dashboardId: 'edr-enhanced-forensics',
                query: EDR_ENHANCED_FORENSICS_QUERY,
                sortField: 'indexed_at',
                columns: EDR_FORENSIC_COLUMNS
            },
            'threat-hunting': {
                title: 'Threat Hunting Campaigns',
                dashboardId: 'edr-threat-hunting-campaigns',
                query: EDR_THREAT_HUNTING_QUERY,
                sortField: 'indexed_at',
                columns: EDR_HUNTING_COLUMNS
            },
            'client-events': {
                title: 'Client Events',
                dashboardId: 'edr-client-events',
                query: EDR_CLIENT_EVENTS_QUERY,
                sortField: 'indexed_at',
                columns: ['indexed_at', 'detected_at', 'client_id', 'threat_type', 'severity', 'process_name', 'username', 'command_line', 'file_path', 'file_hash', 'remote_ip', 'source_ip', '_index']
            },
            'server-events': {
                title: 'Server Events',
                dashboardId: 'edr-server-events',
                query: EDR_SERVER_EVENTS_QUERY,
                sortField: 'indexed_at',
                columns: ['indexed_at', 'created_at', 'stage', 'status', 'policy_name', 'action_name', 'message', 'client_id', 'flow_id', 'entity_type', 'entity_id', '_index']
            },
            'audit-trail': {
                title: 'Response Audit Trail',
                dashboardId: 'edr-audit-trail',
                query: EDR_AUDIT_TRAIL_QUERY,
                sortField: 'indexed_at',
                columns: EDR_AUDIT_COLUMNS
            },
            'audit-compliance': {
                title: 'Audit Compliance',
                dashboardId: 'edr-audit-compliance',
                query: EDR_AUDIT_COMPLIANCE_QUERY,
                sortField: 'indexed_at',
                columns: EDR_AUDIT_COLUMNS
            },
            integrations: {
                title: 'Enterprise Integrations',
                dashboardId: 'edr-enterprise-integrations',
                query: EDR_ENTERPRISE_INTEGRATIONS_QUERY,
                sortField: 'indexed_at',
                columns: EDR_INTEGRATION_COLUMNS
            },
            performance: {
                title: 'Platform Performance',
                dashboardId: 'edr-platform-performance',
                query: EDR_PLATFORM_PERFORMANCE_QUERY,
                sortField: 'indexed_at',
                columns: EDR_PLATFORM_COLUMNS
            },
            reliability: {
                title: 'Reliability and Errors',
                dashboardId: 'edr-reliability',
                query: EDR_RELIABILITY_QUERY,
                sortField: 'indexed_at',
                columns: EDR_PLATFORM_COLUMNS
            },
            'config-management': {
                title: 'Configuration Management',
                dashboardId: 'edr-config-management',
                query: EDR_CONFIGURATION_QUERY,
                sortField: 'indexed_at',
                columns: EDR_CONFIG_TEST_COLUMNS
            },
            'testing-validation': {
                title: 'Testing and Validation',
                dashboardId: 'edr-testing-validation',
                query: EDR_TEST_VALIDATION_QUERY,
                sortField: 'indexed_at',
                columns: EDR_CONFIG_TEST_COLUMNS
            }
        }
    },
    unified: {
        dataViewTitles: ['wazuh-alerts-4.x-*', 'wazuh-alerts-*', 'wazuh-*', ...EDR_DATA_VIEW_TITLES, 'tenant-01-siem*', 'tenant-*-siem*', 'logs-tenant-*', 'logs-*'],
        views: {
            home: {
                title: 'Unified Security Operations Center',
                dashboardId: 'unified-home',
                query: WAZUH_BASE_QUERY,
                sortField: '@timestamp',
                columns: WAZUH_ALERT_COLUMNS
            },
            overview: {
                title: 'Security Overview',
                dashboardId: 'unified-overview',
                query: WAZUH_BASE_QUERY,
                sortField: '@timestamp',
                columns: WAZUH_COMPLIANCE_COLUMNS
            },
            'siem-events': {
                title: 'Security Events',
                dashboardId: 'unified-siem-events',
                query: WAZUH_BASE_QUERY,
                sortField: '@timestamp',
                columns: WAZUH_ALERT_COLUMNS
            },
            malware: {
                title: 'Malware Detection',
                dashboardId: 'edr-malware',
                query: '(file_hash:* or file_path:* or threat_type:process_execution)',
                sortField: 'indexed_at',
                columns: ['indexed_at', 'detected_at', 'client_id', 'threat_type', 'severity', 'process_name', 'file_path', 'file_hash', 'mitre_techniques']
            },
            mitre: {
                title: 'MITRE ATT&CK',
                dashboardId: 'unified-mitre',
                query: 'rule.mitre.id:* or rule.mitre.tactic:* or rule.mitre.technique:*',
                sortField: '@timestamp',
                columns: WAZUH_THREAT_COLUMNS
            },
            'ids-alerts': {
                title: 'Intrusion Alerts',
                dashboardId: 'unified-ids-alerts',
                query: 'event_type:"alert" or flow.alerted:true or alert.signature:*',
                columns: ['timestamp', 'tenant_id', 'event_type', 'alert.signature', 'src_ip', 'dest_ip', 'proto', '_index']
            },
            blocked: {
                title: 'Blocked Threats',
                dashboardId: 'unified-blocked-threats',
                query: 'event_type:"alert" or flow.alerted:true or alert.signature:*',
                columns: ['timestamp', 'tenant_id', 'event_type', 'alert.signature', 'src_ip', 'dest_ip', 'dest_port', '_index']
            },
            maps: {
                title: 'Geo Attack Map',
                app: 'maps',
                query: 'src_ip:* or source_ip:*',
                columns: ['timestamp', 'tenant_id', 'src_ip', 'dest_ip', 'source_ip', 'destination_ip', '_index']
            },
            endpoints: {
                title: 'Endpoint Status',
                dashboardId: 'edr-endpoints',
                query: 'client_id:*',
                sortField: 'indexed_at',
                columns: ['indexed_at', 'client_id', 'threat_type', 'severity', 'process_name', 'username', 'status', 'policy_name']
            },
            'active-threats': {
                title: 'Active Threats',
                dashboardId: 'edr-active-threats',
                query: 'severity >= 70',
                sortField: 'indexed_at',
                columns: ['indexed_at', 'client_id', 'threat_type', 'severity', 'winning_stage', 'recommended_action', 'process_name']
            },
            isolation: {
                title: 'Host Isolation',
                dashboardId: 'edr-isolation',
                query: '(stage:"response" or action_name:* or status:(started or success))',
                sortField: 'indexed_at',
                columns: ['indexed_at', 'created_at', 'client_id', 'action_name', 'status', 'policy_name', 'artifact_name', 'message']
            },
            'containment-response': {
                title: 'Containment & Response',
                dashboardId: 'unified-containment-response',
                query: '(action_name:* or (stage:"response" and status:*) or status:"success")',
                sortField: 'indexed_at',
                columns: ['indexed_at', 'created_at', 'finished_at', 'client_id', 'action_name', 'status', 'policy_name', 'artifact_name', 'message']
            },
            'response-dashboard': {
                title: 'Response Dashboard',
                dashboardId: 'unified-response-dashboard',
                query: EDR_RESPONSE_DASHBOARD_QUERY,
                sortField: 'indexed_at',
                columns: EDR_METRIC_COLUMNS
            },
            'execution-control': {
                title: 'Execution Control',
                dashboardId: 'unified-execution-control',
                query: EDR_EXECUTION_CONTROL_QUERY,
                sortField: 'indexed_at',
                columns: EDR_CONTROL_COLUMNS
            },
            'manual-operations': {
                title: 'Manual Operations',
                dashboardId: 'unified-manual-operations',
                query: '(manual_action:* or manual_execution:* or dry_run:false or elevated_privilege:* or control_action:(stop_execution or pause_execution or resume_execution or modify_parameters))',
                sortField: 'indexed_at',
                columns: EDR_CONTROL_COLUMNS
            },
            'response-governance': {
                title: 'Response Governance',
                dashboardId: 'unified-response-governance',
                query: EDR_RESPONSE_GOVERNANCE_QUERY,
                sortField: 'indexed_at',
                columns: EDR_GOVERNANCE_COLUMNS
            },
            approvals: {
                title: 'Approval Queue',
                dashboardId: 'unified-approval-queue',
                query: EDR_APPROVAL_QUEUE_QUERY,
                sortField: 'indexed_at',
                columns: EDR_GOVERNANCE_COLUMNS
            },
            'graduated-response': {
                title: 'Graduated Response',
                dashboardId: 'unified-graduated-response',
                query: EDR_GRADUATED_RESPONSE_QUERY,
                sortField: 'indexed_at',
                columns: EDR_GOVERNANCE_COLUMNS
            },
            'safety-checks': {
                title: 'Safety Checks',
                dashboardId: 'unified-safety-checks',
                query: EDR_SAFETY_CHECKS_QUERY,
                sortField: 'indexed_at',
                columns: EDR_GOVERNANCE_COLUMNS
            },
            'rate-limits': {
                title: 'Rate Limits',
                dashboardId: 'unified-rate-limits',
                query: EDR_RATE_LIMITS_QUERY,
                sortField: 'indexed_at',
                columns: EDR_GOVERNANCE_COLUMNS
            },
            'soc-override': {
                title: 'SOC Override',
                dashboardId: 'unified-soc-override',
                query: EDR_SOC_OVERRIDE_QUERY,
                sortField: 'indexed_at',
                columns: EDR_AUDIT_COLUMNS
            },
            rollback: {
                title: 'Rollback Actions',
                dashboardId: 'unified-rollback',
                query: EDR_ROLLBACK_QUERY,
                sortField: 'indexed_at',
                columns: EDR_RESPONSE_ACTION_COLUMNS
            },
            'response-metrics': {
                title: 'Response Metrics',
                dashboardId: 'unified-response-metrics',
                query: EDR_RESPONSE_METRICS_QUERY,
                sortField: 'indexed_at',
                columns: EDR_METRIC_COLUMNS
            },
            'automation-ops': {
                title: 'Automation Ops',
                dashboardId: 'unified-automation-ops',
                query: '(stage:"playbook" or policy_name:* or action_name:*)',
                sortField: 'indexed_at',
                columns: ['indexed_at', 'created_at', 'stage', 'status', 'policy_name', 'action_name', 'client_id', 'artifact_name', 'message']
            },
            'playbook-ops': {
                title: 'Playbook Ops',
                dashboardId: 'unified-playbook-ops',
                query: `(${EDR_PLAYBOOK_ORCHESTRATION_QUERY} or ${EDR_PLAYBOOK_TEMPLATES_QUERY})`,
                sortField: 'indexed_at',
                columns: EDR_PLAYBOOK_COLUMNS
            },
            'detection-health': {
                title: 'Detection Health',
                dashboardId: 'unified-detection-health',
                query: '(event_kind:* or winning_stage:* or winning_method:* or recommended_action:*)',
                sortField: 'indexed_at',
                columns: ['indexed_at', 'detected_at', 'event_kind', 'winning_stage', 'winning_method', 'recommended_action', 'threat_type', 'severity', 'client_id']
            },
            'collected-artifacts': {
                title: 'Collected Artifacts',
                dashboardId: 'unified-collected-artifacts',
                query: EDR_COLLECTED_ARTIFACTS_QUERY,
                sortField: 'indexed_at',
                columns: ['indexed_at', 'created_at', 'finished_at', 'client_id', 'artifact_name', 'action_name', 'status', 'policy_name', 'flow_id', 'message']
            },
            'forensic-storage': {
                title: 'Forensic Storage',
                dashboardId: 'unified-forensic-storage',
                query: EDR_FORENSIC_STORAGE_QUERY,
                sortField: 'indexed_at',
                columns: EDR_FORENSIC_COLUMNS
            },
            'forensic-retention': {
                title: 'Forensic Retention',
                dashboardId: 'unified-forensic-retention',
                query: EDR_FORENSIC_RETENTION_QUERY,
                sortField: 'indexed_at',
                columns: EDR_FORENSIC_COLUMNS
            },
            'enhanced-forensics': {
                title: 'Enhanced Forensics',
                dashboardId: 'unified-enhanced-forensics',
                query: EDR_ENHANCED_FORENSICS_QUERY,
                sortField: 'indexed_at',
                columns: EDR_FORENSIC_COLUMNS
            },
            'threat-hunting': {
                title: 'Threat Hunting Campaigns',
                dashboardId: 'unified-threat-hunting-campaigns',
                query: EDR_THREAT_HUNTING_QUERY,
                sortField: 'indexed_at',
                columns: EDR_HUNTING_COLUMNS
            },
            'client-events': {
                title: 'Client Events',
                dashboardId: 'unified-client-events',
                query: EDR_CLIENT_EVENTS_QUERY,
                sortField: 'indexed_at',
                columns: ['indexed_at', 'detected_at', 'client_id', 'threat_type', 'severity', 'process_name', 'username', 'command_line', 'file_path', 'file_hash', 'remote_ip', 'source_ip']
            },
            'server-events': {
                title: 'Server Events',
                dashboardId: 'unified-server-events',
                query: EDR_SERVER_EVENTS_QUERY,
                sortField: 'indexed_at',
                columns: ['indexed_at', 'created_at', 'stage', 'status', 'policy_name', 'action_name', 'message', 'client_id', 'flow_id', 'entity_type', 'entity_id']
            },
            'incident-timeline': {
                title: 'Incident Timeline',
                dashboardId: 'unified-incident-timeline',
                query: 'rule.id:* or id:* or rule.description:*',
                sortField: '@timestamp',
                columns: WAZUH_ALERT_COLUMNS
            },
            hunting: {
                title: 'Threat Hunting',
                dashboardId: 'edr-hunting',
                query: '(threat_type:* or process_name:* or command_line:* or remote_ip:* or source_ip:*)',
                sortField: 'indexed_at',
                columns: ['indexed_at', 'detected_at', 'client_id', 'threat_type', 'severity', 'process_name', 'command_line', 'remote_ip', 'source_ip']
            },
            'audit-trail': {
                title: 'Response Audit Trail',
                dashboardId: 'unified-audit-trail',
                query: EDR_AUDIT_TRAIL_QUERY,
                sortField: 'indexed_at',
                columns: EDR_AUDIT_COLUMNS
            },
            'audit-compliance': {
                title: 'Audit Compliance',
                dashboardId: 'unified-audit-compliance',
                query: EDR_AUDIT_COMPLIANCE_QUERY,
                sortField: 'indexed_at',
                columns: EDR_AUDIT_COLUMNS
            },
            integrations: {
                title: 'Enterprise Integrations',
                dashboardId: 'unified-enterprise-integrations',
                query: EDR_ENTERPRISE_INTEGRATIONS_QUERY,
                sortField: 'indexed_at',
                columns: EDR_INTEGRATION_COLUMNS
            },
            performance: {
                title: 'Platform Performance',
                dashboardId: 'unified-platform-performance',
                query: EDR_PLATFORM_PERFORMANCE_QUERY,
                sortField: 'indexed_at',
                columns: EDR_PLATFORM_COLUMNS
            },
            reliability: {
                title: 'Reliability and Errors',
                dashboardId: 'unified-reliability',
                query: EDR_RELIABILITY_QUERY,
                sortField: 'indexed_at',
                columns: EDR_PLATFORM_COLUMNS
            },
            'config-management': {
                title: 'Configuration Management',
                dashboardId: 'unified-config-management',
                query: EDR_CONFIGURATION_QUERY,
                sortField: 'indexed_at',
                columns: EDR_CONFIG_TEST_COLUMNS
            },
            'testing-validation': {
                title: 'Testing and Validation',
                dashboardId: 'unified-testing-validation',
                query: EDR_TEST_VALIDATION_QUERY,
                sortField: 'indexed_at',
                columns: EDR_CONFIG_TEST_COLUMNS
            },
            pci: {
                title: 'PCI DSS',
                dashboardId: 'unified-pci',
                query: 'rule.pci_dss:*',
                sortField: '@timestamp',
                columns: WAZUH_COMPLIANCE_COLUMNS
            },
            gdpr: {
                title: 'GDPR',
                dashboardId: 'unified-gdpr',
                query: 'rule.gdpr:*',
                sortField: '@timestamp',
                columns: WAZUH_COMPLIANCE_COLUMNS
            }
        }
    },
    observability: {
        dataViewTitles: ['opensearch_dashboards_sample_data_otel_logs', 'opensearch_dashboards_sample_data_otel_spans', 'ss4o_metrics-otel-opensearch_dashboards-sample'],
        views: {
            home: {
                title: 'Observability Overview',
                dashboardId: 'otel-overview-dashboard',
                query: '',
                sortField: 'time',
                columns: ['time', 'severityText', 'serviceName', 'body', 'traceId']
            },
            'cluster-health': {
                title: 'Cluster Health',
                dashboardId: 'otel-overview-dashboard',
                query: '',
                columns: []
            },
            logs: {
                title: 'OTel Logs',
                dashboardId: 'otel-logs-dashboard',
                query: 'severityText:*',
                sortField: 'time',
                columns: ['time', 'severityText', 'serviceName', 'body', 'traceId', 'spanId']
            },
            traces: {
                title: 'Distributed Traces',
                dashboardId: 'otel-traces-dashboard',
                query: 'traceId:*',
                sortField: 'startTime',
                columns: ['startTime', 'serviceName', 'name', 'durationInNanos', 'status.code', 'span.attributes.http@status_code']
            },
            'service-map': {
                title: 'Service Map',
                dashboardId: 'otel-overview-dashboard',
                query: '',
                columns: []
            },
            metrics: {
                title: 'Metrics Explorer',
                dashboardId: 'otel-overview-dashboard',
                query: 'name:*',
                sortField: '@timestamp',
                columns: ['@timestamp', 'name', 'kind', 'unit', 'description']
            },
            discover: {
                title: 'Discover',
                query: '',
                sortField: 'time',
                columns: ['time', 'severityText', 'serviceName', 'body']
            },
            dashboards: {
                title: 'Dashboards',
                dashboardId: 'otel-overview-dashboard',
                query: '',
                columns: []
            },
            indices: {
                title: 'Index Overview',
                query: '',
                columns: []
            }
        }
    }
};

function toRisonString(value) {
    const escaped = String(value ?? '')
        .replace(/!/g, '!!')
        .replace(/'/g, "!'");
    return `'${escaped}'`;
}

function toRisonArray(values) {
    return `!(${(values || []).map((value) => toRisonString(value)).join(',')})`;
}

function buildGlobalState(timeRange) {
    return `_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:now-${timeRange},to:now))`;
}

function buildEmbedParams(theme = 'dark') {
    return `embed=true&security_tenant=global&theme=${theme}&timezone=${OPENSEARCH_EMBED_TIMEZONE}&betaRoute=${OPENSEARCH_ROUTE_REVISION}`;
}

function buildDiscoverAppState(viewConfig, dataViewId, alertFocus) {
    const sortField = alertFocus?.sortField || viewConfig.sortField || 'indexed_at';
    const columns = alertFocus?.columns?.length ? alertFocus.columns : viewConfig.columns;

    return `_a=(discover:(columns:${toRisonArray(columns)},interval:auto,sort:!(!(${toRisonString(sortField)},desc))),metadata:(indexPattern:${toRisonString(dataViewId)},view:discover))`;
}

function buildQueryState(viewConfig, searchQuery, alertFocus) {
    const queryParts = alertFocus?.query
        ? [alertFocus.query, searchQuery?.trim()].filter(Boolean)
        : [viewConfig.query, searchQuery?.trim()].filter(Boolean);
    const combinedQuery = queryParts.join(queryParts.length > 1 ? ' and ' : '');
    const queryValue = combinedQuery || '';

    return `_q=(query:(language:kuery,query:${toRisonString(queryValue)}))`;
}

export function getModuleOpenSearchView(moduleId, viewId) {
    return OPENSEARCH_MODULE_VIEWS[moduleId]?.views?.[viewId] || null;
}

export function getModuleDataViewTitles(moduleId) {
    return OPENSEARCH_MODULE_VIEWS[moduleId]?.dataViewTitles || [];
}

export function buildModuleKibanaUrl({ moduleId, baseUrl, timeRange, searchQuery, viewId }) {
    const viewConfig = getModuleOpenSearchView(moduleId, viewId);
    const embedParam = 'embed=true';

    if (!viewConfig) {
        return `${baseUrl}/app/discover?${embedParam}#/?${buildGlobalState(timeRange)}`;
    }

    if (viewConfig.app === 'maps') {
        return `${baseUrl}/app/maps?${embedParam}#/`;
    }

    if (viewConfig.dashboardId) {
        const queryPart = searchQuery?.trim()
            ? `&_a=(query:(language:kuery,query:${toRisonString(searchQuery.trim())}))`
            : '';
        return `${baseUrl}/app/dashboards?${embedParam}#/view/${viewConfig.dashboardId}?${buildGlobalState(timeRange)}${queryPart}`;
    }

    // Discover-like view (no dashboardId)
    const query = viewConfig.query || '';
    const queryPart = query ? `&_a=(query:(language:kuery,query:${toRisonString(query)}))` : '';
    return `${baseUrl}/app/discover?${embedParam}#/?${buildGlobalState(timeRange)}${queryPart}`;
}

export function buildModuleOpenSearchUrl({ moduleId, baseUrl, theme, timeRange, searchQuery, dataViewId, viewId, alertFocus }) {
    const viewConfig = getModuleOpenSearchView(moduleId, viewId);
    const embedParams = buildEmbedParams(theme);

    if (!viewConfig) {
        return `${baseUrl}/app/data-explorer/discover?${embedParams}`;
    }

    if (viewConfig.app === 'maps') {
        return `${baseUrl}/app/maps-dashboards?${embedParams}#/`;
    }

    if (alertFocus?.query && dataViewId) {
        return `${baseUrl}/app/data-explorer/discover?${embedParams}#?${buildDiscoverAppState(viewConfig, dataViewId, alertFocus)}&${buildQueryState(viewConfig, searchQuery, alertFocus)}&${buildGlobalState(timeRange)}`;
    }

    if (viewConfig.dashboardId) {
        const queryPart = searchQuery?.trim()
            ? `&_a=(query:(language:kuery,query:${toRisonString(searchQuery.trim())}))`
            : '';
        return `${baseUrl}/app/dashboards?${embedParams}#/view/${viewConfig.dashboardId}?${buildGlobalState(timeRange)}${queryPart}`;
    }

    if (!dataViewId) {
        return `${baseUrl}/app/data-explorer/discover?${embedParams}`;
    }

    return `${baseUrl}/app/data-explorer/discover?${embedParams}#?${buildDiscoverAppState(viewConfig, dataViewId, alertFocus)}&${buildQueryState(viewConfig, searchQuery, alertFocus)}&${buildGlobalState(timeRange)}`;
}
