const OS_API = '/api/opensearch';
const WAZUH_INDICES = 'wazuh-alerts-4.x-*,wazuh-alerts-*';
const WAZUH_DATA_VIEW_TITLES = ['wazuh-alerts-4.x-*', 'wazuh-alerts-*', 'wazuh-*'];
const WAZUH_FOCUS_COLUMNS = ['@timestamp', 'agent.name', 'agent.id', 'agent.ip', 'rule.level', 'rule.description', 'rule.groups', 'rule.id', 'rule.mitre.id', 'decoder.name', 'location', 'full_log', '_index'];
const EDR_DATA_VIEW_TITLES = ['edr*', 'edr-detections-*', 'edr-response-actions-*', 'edr-response-results-*', 'edr-audit-events-*'];
const GLOBAL_INDICES = `${WAZUH_INDICES},tenant-01-siem*,tenant-*-siem*,edr*,logs-tenant-*`;
const EDR_INDICES = 'edr*';
const IDS_INDICES = 'logs-tenant-*';
const SIEM_INDICES = WAZUH_INDICES;
const READ_ALERTS_STORAGE_KEY = 'dashboard-read-alerts-v1';
const READ_ALERT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export const ALERT_READ_STATE_EVENT = 'dashboard-alert-read-state-changed';

const MALWARE_TYPES = ['process_execution', 'malware', 'ransomware', 'trojan', 'rootkit', 'spyware', 'adware'];
const HIGH_SEVERITIES = ['Critical', 'High'];
const HIGH_EDR_SEVERITY_THRESHOLD = 70;
const CRITICAL_EDR_SEVERITY_THRESHOLD = 90;
const RESPONSE_SUCCESS_STATUSES = ['success'];
const WAZUH_CONFIG_GROUPS = ['sca', 'rootcheck', 'cis'];
const WAZUH_MALWARE_GROUPS = ['malware', 'virus'];
const WAZUH_HYGIENE_GROUPS = ['syscollector', 'sca', 'rootcheck'];

function canUseAlertStorage() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function parseTimeRangeMs(timeRange = '24h') {
    const match = /^(\d+)([mhd])$/i.exec(String(timeRange).trim());

    if (!match) {
        return 24 * 60 * 60 * 1000;
    }

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
        case 'm':
            return amount * 60 * 1000;
        case 'h':
            return amount * 60 * 60 * 1000;
        case 'd':
            return amount * 24 * 60 * 60 * 1000;
        default:
            return 24 * 60 * 60 * 1000;
    }
}

function isTimestampInsideRange(timestamp, timeRange = '24h') {
    const value = new Date(timestamp).getTime();

    if (Number.isNaN(value)) {
        return false;
    }

    return value >= Date.now() - parseTimeRangeMs(timeRange);
}

function buildAlertScopeKey(moduleId, viewId) {
    return `${moduleId || 'global'}:${viewId || 'home'}`;
}

function pruneReadAlertStore(store = {}) {
    const cutoff = Date.now() - READ_ALERT_RETENTION_MS;
    const nextStore = {};

    Object.entries(store || {}).forEach(([scopeKey, entries]) => {
        const nextEntries = Object.fromEntries(
            Object.entries(entries || {}).filter(([, entry]) => {
                const timestamp = new Date(entry?.timestamp || entry?.readAt || 0).getTime();
                return !Number.isNaN(timestamp) && timestamp >= cutoff;
            })
        );

        if (Object.keys(nextEntries).length) {
            nextStore[scopeKey] = nextEntries;
        }
    });

    return nextStore;
}

function readAlertStore() {
    if (!canUseAlertStorage()) {
        return {};
    }

    try {
        const raw = window.localStorage.getItem(READ_ALERTS_STORAGE_KEY);

        if (!raw) {
            return {};
        }

        return pruneReadAlertStore(JSON.parse(raw));
    } catch (error) {
        return {};
    }
}

function writeAlertStore(store = {}) {
    if (!canUseAlertStorage()) {
        return;
    }

    try {
        window.localStorage.setItem(READ_ALERTS_STORAGE_KEY, JSON.stringify(pruneReadAlertStore(store)));
    } catch (error) {
        // Ignore localStorage quota or serialization errors.
    }
}

function dispatchReadStateChanged() {
    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(new CustomEvent(ALERT_READ_STATE_EVENT));
}

function getReadEntriesForScope({ moduleId, viewId, timeRange = '24h' } = {}) {
    const scopeEntries = readAlertStore()[buildAlertScopeKey(moduleId, viewId)] || {};

    return Object.entries(scopeEntries).filter(([, entry]) => isTimestampInsideRange(entry?.timestamp, timeRange));
}

function getReadCountForScope({ moduleId, viewId, timeRange = '24h' } = {}) {
    return getReadEntriesForScope({ moduleId, viewId, timeRange }).length;
}

function isAlertReadForScope(alertId, { moduleId, viewId, timeRange = '24h' } = {}) {
    if (!alertId) {
        return false;
    }

    return getReadEntriesForScope({ moduleId, viewId, timeRange }).some(([storedId]) => storedId === alertId);
}

function existsClause(field) {
    return { exists: { field } };
}

function termsClause(field, values) {
    return {
        terms: {
            [field]: values
        }
    };
}

function rangeClause(field, params) {
    return {
        range: {
            [field]: params
        }
    };
}

function anyOf(clauses) {
    return {
        bool: {
            should: clauses,
            minimum_should_match: 1
        }
    };
}

function actionableResponseClause() {
    return anyOf([
        existsClause('action_name'),
        existsClause('policy_name'),
        existsClause('artifact_name'),
        existsClause('message'),
        existsClause('threat_event_id')
    ]);
}

function isWazuhAlert(source = {}) {
    return Boolean(source.rule?.id || source.rule?.level !== undefined || source.rule?.description || source.decoder?.name);
}

function hasAnyWazuhGroup(source = {}, groups = []) {
    const sourceGroups = Array.isArray(source.rule?.groups) ? source.rule.groups : [source.rule?.groups].filter(Boolean);
    return sourceGroups.some((group) => groups.includes(group));
}

function normalizeEdrSeverityLabel(severity) {
    const numericSeverity = Number(severity);

    if (!Number.isNaN(numericSeverity)) {
        if (numericSeverity >= CRITICAL_EDR_SEVERITY_THRESHOLD) {
            return 'Critical';
        }

        if (numericSeverity >= HIGH_EDR_SEVERITY_THRESHOLD) {
            return 'High';
        }

        if (numericSeverity >= 40) {
            return 'Medium';
        }

        return 'Low';
    }

    if (!severity) {
        return '';
    }

    const normalized = String(severity).trim().toLowerCase();

    if (normalized === 'critical') {
        return 'Critical';
    }

    if (normalized === 'high') {
        return 'High';
    }

    if (normalized === 'medium') {
        return 'Medium';
    }

    if (normalized === 'low') {
        return 'Low';
    }

    return String(severity);
}

function isHighEdrSeverity(source = {}) {
    const numericSeverity = Number(source.severity);

    if (!Number.isNaN(numericSeverity)) {
        return numericSeverity >= HIGH_EDR_SEVERITY_THRESHOLD;
    }

    return HIGH_SEVERITIES.includes(normalizeEdrSeverityLabel(source.severity));
}

function isEdrDetection(source = {}) {
    return Boolean(source.event_kind || source.threat_type || source.detected_at || source.winning_stage || source.winning_method || source.recommended_action);
}

function isEdrResponseAction(source = {}) {
    return Boolean(source.created_at && source.action_name && (source.artifact_name || source.execution_mode || source.policy_id || source.risk_tier || source.threat_event_id));
}

function isEdrResponseResult(source = {}) {
    return Boolean(source.finished_at || source.flow_id || source.action_id || (source.message && source.action_name));
}

function isEdrAuditEvent(source = {}) {
    return Boolean(source.stage || source.entity_type || source.entity_id || source.action);
}

function isEdrGovernanceEvent(source = {}) {
    return Boolean(
        source.approval_id ||
        source.approval_request_id ||
        source.approval_status ||
        source.safety_check ||
        source.safety_violation ||
        source.whitelist_match ||
        source.cooldown ||
        source.rate_limit ||
        source.queued_reason ||
        source.override_id ||
        source.override_action ||
        source.rollback_id ||
        source.rollback_action
    );
}

function isEdrPlaybookEvent(source = {}) {
    return Boolean(source.playbook_id || source.playbook_name || source.playbook_execution_id || source.step_id || source.template_id || source.template_name || source.template_version);
}

function isEdrForensicEvent(source = {}) {
    return Boolean(source.forensic_path || source.evidence_path || source.storage_bucket || source.retention_until || source.artifact_name || source.action_name === 'collect_forensics');
}

function isEdrControlEvent(source = {}) {
    return Boolean(source.control_action || source.manual_action || source.manual_execution || source.pause_requested || source.resume_requested || source.parameter_update || source.cancellation_event || source.elevated_privilege);
}

function isEdrMetricEvent(source = {}) {
    return Boolean(source.mttr_ms !== undefined || source.response_duration_ms !== undefined || source.containment_duration_ms !== undefined || source.success_rate !== undefined);
}

function isEdrHuntEvent(source = {}) {
    return Boolean(source.hunt_id || source.campaign_id || source.ioc_type || source.ioc_value || source.registry_key || source.cti_feed || source.baseline_score !== undefined || source.matched_endpoints);
}

function isEdrIntegrationEvent(source = {}) {
    return Boolean(source.integration_type || source.jira_ticket || source.servicenow_incident || source.slack_channel || source.email_recipient || source.pagerduty_incident || source.webhook_url || source.forwarding_destination);
}

function isEdrPlatformEvent(source = {}) {
    return Boolean(source.service_name || source.instance_id || source.consumer_group || source.events_processed !== undefined || source.actions_generated !== undefined || source.policy_evaluation_duration_ms !== undefined || source.health_status || source.error_type || source.retry_count !== undefined || source.dlq_topic || source.circuit_breaker_state || source.kafka_status || source.velociraptor_api_status || source.replay_status || source.panic_recovered);
}

function isEdrConfigTestEvent(source = {}) {
    return Boolean(source.config_version || source.config_change_id || source.validation_status || source.git_commit || source.environment || source.secret_provider || source.hot_reload || source.policy_directory || source.dry_run !== undefined || source.simulation_id || source.artifact_validation || source.policy_simulation);
}

function isEdrRecord(source = {}) {
    return isEdrDetection(source) || isEdrResponseAction(source) || isEdrResponseResult(source) || isEdrAuditEvent(source) || isEdrGovernanceEvent(source) || isEdrPlaybookEvent(source) || isEdrForensicEvent(source) || isEdrControlEvent(source) || isEdrMetricEvent(source) || isEdrHuntEvent(source) || isEdrIntegrationEvent(source) || isEdrPlatformEvent(source) || isEdrConfigTestEvent(source);
}

function resolvePrimaryTimestampField(source = {}) {
    if (source.indexed_at) {
        return 'indexed_at';
    }

    if (source.detected_at) {
        return 'detected_at';
    }

    if (source.created_at) {
        return 'created_at';
    }

    if (source.finished_at) {
        return 'finished_at';
    }

    if (source['@timestamp']) {
        return '@timestamp';
    }

    return 'timestamp';
}

function buildTimeRangeFilter(timeRange = '24h') {
    return anyOf([
        {
            range: {
                indexed_at: {
                    gte: `now-${timeRange}`,
                    lte: 'now'
                }
            }
        },
        {
            range: {
                detected_at: {
                    gte: `now-${timeRange}`,
                    lte: 'now'
                }
            }
        },
        {
            range: {
                created_at: {
                    gte: `now-${timeRange}`,
                    lte: 'now'
                }
            }
        },
        {
            range: {
                finished_at: {
                    gte: `now-${timeRange}`,
                    lte: 'now'
                }
            }
        },
        {
            range: {
                '@timestamp': {
                    gte: `now-${timeRange}`,
                    lte: 'now'
                }
            }
        },
        {
            range: {
                timestamp: {
                    gte: `now-${timeRange}`,
                    lte: 'now'
                }
            }
        }
    ]);
}

function buildGlobalScope() {
    return {
        indices: GLOBAL_INDICES,
        filter: [],
        should: [
            existsClause('rule.id'),
            existsClause('rule.description'),
            existsClause('rule.mitre.id'),
            existsClause('rule.pci_dss'),
            existsClause('rule.gdpr'),
            rangeClause('rule.level', { gte: 7 }),
            existsClause('threat_type'),
            existsClause('action_name'),
            existsClause('policy_name'),
            existsClause('artifact_name'),
            existsClause('stage'),
            actionableResponseClause(),
            existsClause('alert.signature'),
            { term: { 'event_type.keyword': 'alert' } },
            { term: { 'flow.alerted': true } },
            existsClause('severity')
        ]
    };
}

function buildEdrScope(viewId = 'home') {
    switch (viewId) {
        case 'active-threats':
            return {
                indices: EDR_INDICES,
                filter: [rangeClause('severity', { gte: HIGH_EDR_SEVERITY_THRESHOLD })]
            };
        case 'isolation':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        { term: { 'stage.keyword': 'response' } },
                        existsClause('action_name'),
                        termsClause('status.keyword', ['started', 'success'])
                    ])
                ]
            };
        case 'contained-threats':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        termsClause('status.keyword', RESPONSE_SUCCESS_STATUSES),
                        {
                            bool: {
                                filter: [
                                    { term: { 'stage.keyword': 'response' } },
                                    existsClause('status')
                                ]
                            }
                        }
                    ])
                ]
            };
        case 'response-center':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        actionableResponseClause(),
                        {
                            bool: {
                                filter: [
                                    existsClause('action_name'),
                                    anyOf([
                                        existsClause('artifact_name'),
                                        existsClause('message'),
                                        existsClause('status')
                                    ])
                                ]
                            }
                        },
                        {
                            bool: {
                                filter: [
                                    existsClause('policy_name'),
                                    anyOf([
                                        existsClause('stage'),
                                        existsClause('status'),
                                        existsClause('threat_event_id')
                                    ])
                                ]
                            }
                        }
                    ])
                ]
            };
        case 'response-dashboard':
        case 'response-metrics':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        existsClause('playbook_execution_id'),
                        existsClause('action_id'),
                        existsClause('approval_id'),
                        existsClause('action_name'),
                        existsClause('policy_name'),
                        existsClause('mttr_ms'),
                        existsClause('response_duration_ms'),
                        existsClause('containment_duration_ms'),
                        existsClause('success_rate')
                    ])
                ]
            };
        case 'execution-control':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        existsClause('playbook_execution_id'),
                        existsClause('control_action'),
                        existsClause('manual_action'),
                        existsClause('cancellation_event'),
                        existsClause('pause_requested'),
                        existsClause('resume_requested'),
                        existsClause('parameter_update'),
                        termsClause('status.keyword', ['running', 'in_progress', 'paused', 'cancelled', 'stopped'])
                    ])
                ]
            };
        case 'manual-operations':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        existsClause('manual_action'),
                        existsClause('manual_execution'),
                        existsClause('elevated_privilege'),
                        { term: { dry_run: false } },
                        {
                            bool: {
                                filter: [
                                    existsClause('operator_id'),
                                    anyOf([
                                        existsClause('manual_action'),
                                        existsClause('manual_execution'),
                                        existsClause('control_action')
                                    ])
                                ]
                            }
                        },
                        termsClause('control_action.keyword', ['stop_execution', 'pause_execution', 'resume_execution', 'modify_parameters'])
                    ])
                ]
            };
        case 'approvals':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        existsClause('approval_id'),
                        existsClause('approval_request_id'),
                        existsClause('approval_status'),
                        { term: { 'execution_mode.keyword': 'approval' } },
                        termsClause('status.keyword', ['pending', 'approved', 'rejected', 'expired'])
                    ])
                ]
            };
        case 'graduated-response':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        existsClause('execution_mode'),
                        existsClause('risk_tier'),
                        existsClause('severity'),
                        existsClause('policy_name'),
                        existsClause('action_name')
                    ])
                ]
            };
        case 'safety-checks':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        existsClause('safety_check'),
                        existsClause('safety_violation'),
                        existsClause('whitelist_match'),
                        existsClause('guardrail'),
                        existsClause('skipped_reason'),
                        termsClause('status.keyword', ['safety_blocked', 'skipped'])
                    ])
                ]
            };
        case 'rate-limits':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        existsClause('cooldown'),
                        existsClause('cooldown_until'),
                        existsClause('rate_limit'),
                        existsClause('queued_reason'),
                        existsClause('max_executions'),
                        termsClause('status.keyword', ['queued', 'cooldown', 'rate_limited'])
                    ])
                ]
            };
        case 'soc-override':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        existsClause('override_id'),
                        existsClause('override_action'),
                        existsClause('soc_override'),
                        existsClause('manual_action'),
                        termsClause('status.keyword', ['stopped', 'modified', 'approved', 'rejected'])
                    ])
                ]
            };
        case 'rollback':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        existsClause('rollback_action'),
                        existsClause('rollback_id'),
                        termsClause('action_name.keyword', ['restore_file', 'unblock_ip', 'reenable_network']),
                        termsClause('status.keyword', ['rollback_started', 'rollback_success', 'rollback_failed'])
                    ])
                ]
            };
        case 'playbook-automation':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        { term: { 'stage.keyword': 'playbook' } },
                        existsClause('policy_name'),
                        existsClause('policy_id')
                    ])
                ]
            };
        case 'playbook-orchestration':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        existsClause('playbook_id'),
                        existsClause('playbook_name'),
                        existsClause('playbook_execution_id'),
                        existsClause('step_id'),
                        { term: { 'stage.keyword': 'playbook' } },
                        { term: { 'stage.keyword': 'response' } }
                    ])
                ]
            };
        case 'playbook-templates':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        existsClause('template_id'),
                        existsClause('template_name'),
                        existsClause('template_version'),
                        existsClause('policy_name'),
                        existsClause('policy_id'),
                        existsClause('action_name')
                    ])
                ]
            };
        case 'detection-pipeline':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        existsClause('event_kind'),
                        existsClause('winning_stage'),
                        existsClause('winning_method'),
                        existsClause('recommended_action')
                    ])
                ]
            };
        case 'collected-artifacts':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        existsClause('artifact_name'),
                        existsClause('flow_id'),
                        { term: { 'action_name.keyword': 'collect_forensics' } }
                    ])
                ]
            };
        case 'forensic-storage':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        existsClause('artifact_name'),
                        existsClause('forensic_path'),
                        existsClause('evidence_path'),
                        existsClause('storage_bucket'),
                        existsClause('retention_until'),
                        { term: { 'action_name.keyword': 'collect_forensics' } }
                    ])
                ]
            };
        case 'forensic-retention':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        existsClause('forensic_path'),
                        existsClause('evidence_path'),
                        existsClause('storage_bucket'),
                        existsClause('retention_until'),
                        existsClause('sha256'),
                        existsClause('checksum'),
                        existsClause('encryption_algorithm'),
                        existsClause('access_operation'),
                        existsClause('export_target')
                    ])
                ]
            };
        case 'enhanced-forensics':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        termsClause('action_name.keyword', ['collect_memory_dump', 'collect_process_tree', 'collect_network_pcap', 'collect_system_logs', 'collect_file_timeline']),
                        existsClause('collection_scope'),
                        existsClause('archive_path'),
                        existsClause('archive_sha256'),
                        existsClause('size_bytes'),
                        existsClause('size_limit_bytes')
                    ])
                ]
            };
        case 'client-events':
            return {
                indices: EDR_INDICES,
                filter: [
                    existsClause('client_id'),
                    anyOf([
                        existsClause('event_kind'),
                        existsClause('threat_type'),
                        existsClause('process_name'),
                        existsClause('file_path')
                    ])
                ]
            };
        case 'server-events':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        existsClause('stage'),
                        existsClause('status'),
                        existsClause('message'),
                        existsClause('policy_name')
                    ])
                ]
            };
        case 'audit-trail':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        existsClause('stage'),
                        existsClause('action'),
                        existsClause('status'),
                        existsClause('policy_name'),
                        existsClause('entity_type'),
                        existsClause('entity_id'),
                        existsClause('decision_id'),
                        existsClause('threat_event_id')
                    ])
                ]
            };
        case 'audit-compliance':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        existsClause('audit_event_type'),
                        existsClause('event_id'),
                        existsClause('operator_id'),
                        existsClause('reason'),
                        existsClause('export_format'),
                        existsClause('forwarding_destination'),
                        existsClause('splunk_hec'),
                        existsClause('syslog_server'),
                        existsClause('retention_days'),
                        existsClause('action_name'),
                        existsClause('policy_name')
                    ])
                ]
            };
        case 'malware':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        termsClause('threat_type', MALWARE_TYPES),
                        existsClause('file_hash'),
                        existsClause('file_path')
                    ])
                ]
            };
        case 'process-tree':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        existsClause('process_name'),
                        existsClause('command_line'),
                        existsClause('file_path')
                    ])
                ]
            };
        case 'hash-intelligence':
            return {
                indices: EDR_INDICES,
                filter: [existsClause('file_hash')]
            };
        case 'file-integrity':
            return {
                indices: EDR_INDICES,
                filter: [anyOf([existsClause('file_path'), existsClause('file_hash')])]
            };
        case 'hunting':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        existsClause('threat_type'),
                        existsClause('process_name'),
                        existsClause('command_line'),
                        existsClause('remote_ip'),
                        existsClause('source_ip')
                    ])
                ]
            };
        case 'threat-hunting':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        existsClause('hunt_id'),
                        existsClause('campaign_id'),
                        existsClause('ioc_type'),
                        existsClause('ioc_value'),
                        existsClause('file_hash'),
                        existsClause('domain'),
                        existsClause('process_name'),
                        existsClause('registry_key'),
                        existsClause('cti_feed'),
                        existsClause('baseline_score'),
                        existsClause('matched_endpoints')
                    ])
                ]
            };
        case 'integrations':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        existsClause('integration_type'),
                        existsClause('jira_ticket'),
                        existsClause('servicenow_incident'),
                        existsClause('slack_channel'),
                        existsClause('email_recipient'),
                        existsClause('pagerduty_incident'),
                        existsClause('webhook_url'),
                        existsClause('splunk_hec'),
                        existsClause('syslog_server'),
                        existsClause('forwarding_destination')
                    ])
                ]
            };
        case 'performance':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        existsClause('service_name'),
                        existsClause('instance_id'),
                        existsClause('consumer_group'),
                        existsClause('events_processed'),
                        existsClause('actions_generated'),
                        existsClause('policy_evaluation_duration_ms'),
                        existsClause('health_status'),
                        existsClause('circuit_breaker_state'),
                        existsClause('liveness'),
                        existsClause('readiness')
                    ])
                ]
            };
        case 'reliability':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        existsClause('error_type'),
                        existsClause('retry_count'),
                        existsClause('dlq_topic'),
                        existsClause('dead_letter'),
                        existsClause('timeout_event'),
                        existsClause('kafka_status'),
                        existsClause('velociraptor_api_status'),
                        existsClause('replay_status'),
                        existsClause('panic_recovered'),
                        termsClause('status.keyword', ['failed', 'timeout', 'retrying', 'dlq'])
                    ])
                ]
            };
        case 'config-management':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        existsClause('config_version'),
                        existsClause('config_change_id'),
                        existsClause('validation_status'),
                        existsClause('git_commit'),
                        existsClause('environment'),
                        existsClause('operator_id'),
                        existsClause('secret_provider'),
                        existsClause('hot_reload'),
                        existsClause('policy_directory')
                    ])
                ]
            };
        case 'testing-validation':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        existsClause('dry_run'),
                        existsClause('simulation_id'),
                        existsClause('validation_status'),
                        existsClause('artifact_validation'),
                        existsClause('test_playbook'),
                        existsClause('sample_event_id'),
                        existsClause('policy_simulation'),
                        { term: { really_do_it: false } },
                        { term: { 'parameters.ReallyDoIt': false } }
                    ])
                ]
            };
        case 'endpoints':
            return {
                indices: EDR_INDICES,
                filter: [existsClause('client_id')]
            };
        case 'home':
        default:
            return {
                indices: EDR_INDICES,
                filter: [],
                should: [
                    existsClause('threat_type'),
                    existsClause('action_name'),
                    existsClause('policy_name'),
                    existsClause('stage'),
                    actionableResponseClause(),
                    rangeClause('severity', { gte: HIGH_EDR_SEVERITY_THRESHOLD })
                ]
            };
    }
}

function buildIdsAlertScope() {
    return {
        indices: IDS_INDICES,
        filter: [],
        should: [
            existsClause('alert.signature'),
            { term: { 'event_type.keyword': 'alert' } },
            { term: { 'flow.alerted': true } }
        ]
    };
}

function buildIdsScope(viewId = 'home') {
    switch (viewId) {
        case 'traffic':
            return {
                indices: IDS_INDICES,
                filter: [
                    anyOf([
                        existsClause('src_ip'),
                        existsClause('source_ip'),
                        existsClause('id.orig_h')
                    ])
                ]
            };
        case 'signatures':
            return {
                indices: IDS_INDICES,
                filter: [
                    anyOf([
                        existsClause('alert.signature'),
                        existsClause('dns.rrname'),
                        existsClause('http.url')
                    ])
                ]
            };
        case 'maps':
            return {
                indices: IDS_INDICES,
                filter: [
                    anyOf([
                        existsClause('src_ip'),
                        existsClause('source_ip'),
                        existsClause('id.orig_h')
                    ])
                ]
            };
        case 'flows':
            return {
                indices: IDS_INDICES,
                filter: [
                    anyOf([
                        existsClause('src_ip'),
                        existsClause('dest_ip'),
                        existsClause('id.orig_h'),
                        existsClause('id.resp_h')
                    ])
                ]
            };
        case 'discover':
            return {
                indices: IDS_INDICES,
                filter: [existsClause('source_type')]
            };
        case 'blocked':
        case 'ids-alerts':
            return buildIdsAlertScope();
        case 'home':
        default:
            return {
                indices: IDS_INDICES,
                filter: [],
                should: [
                    existsClause('alert.signature'),
                    { term: { 'event_type.keyword': 'alert' } },
                    { term: { 'flow.alerted': true } },
                    existsClause('source_type')
                ]
            };
    }
}

function buildSiemScope(viewId = 'home') {
    switch (viewId) {
        case 'config-assessment':
            return {
                indices: SIEM_INDICES,
                filter: [termsClause('rule.groups', WAZUH_CONFIG_GROUPS)]
            };
        case 'malware':
            return {
                indices: SIEM_INDICES,
                filter: [
                    anyOf([
                        termsClause('rule.groups', WAZUH_MALWARE_GROUPS),
                        existsClause('data.YARA.rule_name')
                    ])
                ]
            };
        case 'fim':
            return {
                indices: SIEM_INDICES,
                filter: [
                    anyOf([
                        { term: { 'rule.groups': 'syscheck' } },
                        existsClause('syscheck.path')
                    ])
                ]
            };
        case 'vuln-detect':
            return {
                indices: SIEM_INDICES,
                filter: [
                    anyOf([
                        { term: { 'rule.groups': 'vulnerability-detector' } },
                        existsClause('rule.cve')
                    ])
                ]
            };
        case 'mitre':
        case 'hunting':
            return {
                indices: SIEM_INDICES,
                filter: [
                    anyOf([
                        existsClause('rule.mitre.id'),
                        rangeClause('rule.level', { gte: 10 })
                    ])
                ]
            };
        case 'hygiene':
            return {
                indices: SIEM_INDICES,
                filter: [termsClause('rule.groups', WAZUH_HYGIENE_GROUPS)]
            };
        case 'pci':
            return {
                indices: SIEM_INDICES,
                filter: [existsClause('rule.pci_dss')]
            };
        case 'gdpr':
            return {
                indices: SIEM_INDICES,
                filter: [existsClause('rule.gdpr')]
            };
        case 'hipaa':
            return {
                indices: SIEM_INDICES,
                filter: [existsClause('rule.hipaa')]
            };
        case 'nist':
            return {
                indices: SIEM_INDICES,
                filter: [
                    anyOf([
                        existsClause('rule.nist_800_53'),
                        existsClause('rule.nist_800-53'),
                        existsClause('rule.nist_sp_800-53')
                    ])
                ]
            };
        case 'docker':
            return {
                indices: SIEM_INDICES,
                filter: [
                    anyOf([
                        { term: { 'decoder.name': 'docker' } },
                        { term: { 'rule.groups': 'docker' } }
                    ])
                ]
            };
        case 'aws':
            return {
                indices: SIEM_INDICES,
                filter: [
                    anyOf([
                        { term: { 'decoder.name': 'aws-cloudtrail' } },
                        { term: { 'rule.groups': 'aws' } },
                        existsClause('data.aws.source')
                    ])
                ]
            };
        case 'gcp':
            return {
                indices: SIEM_INDICES,
                filter: [
                    anyOf([
                        { term: { 'decoder.name': 'gcp' } },
                        { term: { 'rule.groups': 'gcp' } }
                    ])
                ]
            };
        case 'azure':
            return {
                indices: SIEM_INDICES,
                filter: [
                    anyOf([
                        { term: { 'decoder.name': 'azure' } },
                        { term: { 'rule.groups': 'azure' } },
                        { term: { 'rule.groups': 'office365' } }
                    ])
                ]
            };
        case 'rules':
            return {
                indices: SIEM_INDICES,
                filter: [existsClause('rule.id')]
            };
        case 'decoders':
            return {
                indices: SIEM_INDICES,
                filter: [existsClause('decoder.name')]
            };
        case 'logs':
            return {
                indices: SIEM_INDICES,
                filter: [
                    anyOf([
                        existsClause('full_log'),
                        existsClause('message')
                    ])
                ]
            };
        case 'overview':
            return {
                indices: SIEM_INDICES,
                filter: [],
                should: [
                    rangeClause('rule.level', { gte: 7 }),
                    existsClause('rule.mitre.id'),
                    existsClause('rule.pci_dss'),
                    existsClause('rule.gdpr')
                ]
            };
        case 'home':
        default:
            return {
                indices: SIEM_INDICES,
                filter: [existsClause('rule.id')],
                should: [rangeClause('rule.level', { gte: 7 })]
            };
    }
}

function buildUnifiedScope(viewId = 'home') {
    switch (viewId) {
        case 'siem-events':
            return buildSiemScope('home');
        case 'malware':
            return buildEdrScope('malware');
        case 'mitre':
            return buildSiemScope('mitre');
        case 'ids-alerts':
        case 'blocked':
            return buildIdsAlertScope();
        case 'maps':
            return buildIdsScope('maps');
        case 'endpoints':
            return buildEdrScope('endpoints');
        case 'active-threats':
            return buildEdrScope('active-threats');
        case 'isolation':
            return buildEdrScope('isolation');
        case 'containment-response':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        actionableResponseClause(),
                        {
                            bool: {
                                filter: [
                                    { term: { 'stage.keyword': 'response' } },
                                    existsClause('status')
                                ]
                            }
                        },
                        termsClause('status.keyword', RESPONSE_SUCCESS_STATUSES)
                    ])
                ]
            };
        case 'response-dashboard':
        case 'execution-control':
        case 'manual-operations':
        case 'response-metrics':
        case 'forensic-retention':
        case 'enhanced-forensics':
        case 'threat-hunting':
        case 'audit-compliance':
        case 'integrations':
        case 'performance':
        case 'reliability':
        case 'config-management':
        case 'testing-validation':
            return buildEdrScope(viewId);
        case 'response-governance':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        existsClause('approval_id'),
                        existsClause('approval_status'),
                        existsClause('execution_mode'),
                        existsClause('risk_tier'),
                        existsClause('safety_check'),
                        existsClause('cooldown'),
                        existsClause('rate_limit'),
                        existsClause('policy_name'),
                        existsClause('action_name')
                    ])
                ]
            };
        case 'approvals':
            return buildEdrScope('approvals');
        case 'graduated-response':
            return buildEdrScope('graduated-response');
        case 'safety-checks':
            return buildEdrScope('safety-checks');
        case 'rate-limits':
            return buildEdrScope('rate-limits');
        case 'soc-override':
            return buildEdrScope('soc-override');
        case 'rollback':
            return buildEdrScope('rollback');
        case 'automation-ops':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        { term: { 'stage.keyword': 'playbook' } },
                        existsClause('policy_name'),
                        existsClause('action_name')
                    ])
                ]
            };
        case 'playbook-ops':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        existsClause('playbook_id'),
                        existsClause('playbook_name'),
                        existsClause('playbook_execution_id'),
                        existsClause('step_id'),
                        existsClause('template_id'),
                        existsClause('template_name'),
                        existsClause('policy_name'),
                        existsClause('action_name')
                    ])
                ]
            };
        case 'detection-health':
            return {
                indices: EDR_INDICES,
                filter: [
                    anyOf([
                        existsClause('event_kind'),
                        existsClause('winning_stage'),
                        existsClause('winning_method'),
                        existsClause('recommended_action')
                    ])
                ]
            };
        case 'collected-artifacts':
            return buildEdrScope('collected-artifacts');
        case 'forensic-storage':
            return buildEdrScope('forensic-storage');
        case 'client-events':
            return buildEdrScope('client-events');
        case 'server-events':
            return buildEdrScope('server-events');
        case 'incident-timeline':
            return {
                indices: GLOBAL_INDICES,
                filter: [],
                should: [
                    existsClause('rule.id'),
                    existsClause('rule.description'),
                    existsClause('threat_event_id'),
                    existsClause('action_id'),
                    existsClause('threat_type'),
                    existsClause('policy_name'),
                    existsClause('alert.signature'),
                    existsClause('event_type')
                ]
            };
        case 'hunting':
            return buildEdrScope('hunting');
        case 'audit-trail':
            return buildEdrScope('audit-trail');
        case 'pci':
            return buildSiemScope('pci');
        case 'gdpr':
            return buildSiemScope('gdpr');
        case 'overview':
            return buildGlobalScope();
        case 'home':
        default:
            return buildGlobalScope();
    }
}

function resolveScope(moduleId, viewId) {
    switch (moduleId) {
        case 'edr':
            return buildEdrScope(viewId);
        case 'ids':
            return buildIdsScope(viewId);
        case 'siem':
            return buildSiemScope(viewId);
        case 'unified':
            return buildUnifiedScope(viewId);
        default:
            return buildGlobalScope();
    }
}

function buildScopedQuery({ timeRange = '24h', moduleId, viewId } = {}) {
    const scope = resolveScope(moduleId, viewId);
    const bool = {
        filter: [buildTimeRangeFilter(timeRange), ...(scope.filter || [])]
    };

    if (scope.should?.length) {
        bool.should = scope.should;
        bool.minimum_should_match = scope.minimum_should_match || 1;
    }

    if (scope.must?.length) {
        bool.must = scope.must;
    }

    if (scope.mustNot?.length) {
        bool.must_not = scope.mustNot;
    }

    return {
        indices: scope.indices,
        query: { bool }
    };
}

function normalizeSeverity(source = {}) {
    const severity = normalizeEdrSeverityLabel(source.severity) || source.alert?.severity || source.alert?.category || '';

    if (!severity && (source.alert?.signature || source.event_type === 'alert' || source.flow?.alerted)) {
        return 'High';
    }

    if (!severity && source.rule?.level !== undefined) {
        const level = Number(source.rule.level);

        if (level >= 12) {
            return 'Critical';
        }

        if (level >= 7) {
            return 'High';
        }

        if (level >= 4) {
            return 'Medium';
        }

        return 'Low';
    }

    return severity || 'Medium';
}

function buildWazuhTarget(source = {}, moduleId = 'siem') {
    if (source.rule?.pci_dss) {
        return { moduleId, viewId: 'pci' };
    }

    if (source.rule?.gdpr) {
        return { moduleId, viewId: 'gdpr' };
    }

    if (source.rule?.hipaa && moduleId === 'siem') {
        return { moduleId, viewId: 'hipaa' };
    }

    if ((source.rule?.nist_800_53 || source.rule?.['nist_800-53'] || source.rule?.['nist_sp_800-53']) && moduleId === 'siem') {
        return { moduleId, viewId: 'nist' };
    }

    if (source.rule?.mitre?.id || source.rule?.mitre?.technique || source.rule?.mitre?.tactic) {
        return { moduleId, viewId: 'mitre' };
    }

    if (hasAnyWazuhGroup(source, WAZUH_MALWARE_GROUPS)) {
        return { moduleId, viewId: 'malware' };
    }

    if (hasAnyWazuhGroup(source, ['syscheck']) || source.syscheck?.path) {
        return { moduleId, viewId: moduleId === 'siem' ? 'fim' : 'incident-timeline' };
    }

    if (Number(source.rule?.level || 0) >= 10) {
        return { moduleId, viewId: moduleId === 'siem' ? 'hunting' : 'siem-events' };
    }

    return { moduleId, viewId: moduleId === 'siem' ? 'overview' : 'siem-events' };
}

function buildAdvancedEdrTarget(source = {}, moduleId = 'edr') {
    const runningStatuses = ['running', 'in_progress', 'paused'];
    const failureStatuses = ['failed', 'timeout', 'retrying', 'dlq'];
    const enhancedForensicsActions = ['collect_memory_dump', 'collect_process_tree', 'collect_network_pcap', 'collect_system_logs', 'collect_file_timeline'];

    if (source.manual_action || source.manual_execution || source.elevated_privilege || source.dry_run === false) {
        return { moduleId, viewId: 'manual-operations' };
    }

    if (isEdrControlEvent(source)) {
        return { moduleId, viewId: 'execution-control' };
    }

    if (source.playbook_execution_id && runningStatuses.includes(String(source.status || '').toLowerCase())) {
        return { moduleId, viewId: 'response-dashboard' };
    }

    if (isEdrMetricEvent(source)) {
        return { moduleId, viewId: 'response-metrics' };
    }

    if (isEdrHuntEvent(source)) {
        return { moduleId, viewId: 'threat-hunting' };
    }

    if (isEdrIntegrationEvent(source)) {
        return { moduleId, viewId: 'integrations' };
    }

    if (isEdrPlatformEvent(source)) {
        const status = String(source.status || '').toLowerCase();
        const isReliabilityEvent = source.error_type || source.dlq_topic || source.dead_letter || source.timeout_event || source.panic_recovered || failureStatuses.includes(status);
        return { moduleId, viewId: isReliabilityEvent ? 'reliability' : 'performance' };
    }

    if (isEdrConfigTestEvent(source)) {
        const isTestEvent = source.dry_run !== undefined || source.simulation_id || source.artifact_validation || source.policy_simulation || source.test_playbook || source.sample_event_id;
        return { moduleId, viewId: isTestEvent ? 'testing-validation' : 'config-management' };
    }

    if (enhancedForensicsActions.includes(source.action_name)) {
        return { moduleId, viewId: 'enhanced-forensics' };
    }

    if (source.retention_until || source.sha256 || source.checksum || source.encryption_algorithm || source.access_operation || source.export_target) {
        return { moduleId, viewId: 'forensic-retention' };
    }

    if (source.audit_event_type || source.event_id || source.export_format || source.forwarding_destination || source.splunk_hec || source.syslog_server || source.retention_days) {
        return { moduleId, viewId: 'audit-compliance' };
    }

    return null;
}

function buildNotificationTarget(source = {}, context = {}) {
    const preferredModuleId = context.moduleId;

    if (preferredModuleId === 'unified') {
        if (isWazuhAlert(source)) {
            return buildWazuhTarget(source, 'unified');
        }

        if (source.alert?.signature || source.event_type === 'alert' || source.flow?.alerted || source.source_type) {
            return { moduleId: 'unified', viewId: 'ids-alerts' };
        }

        if (source.approval_id || source.approval_request_id || source.approval_status || source.execution_mode === 'approval') {
            return { moduleId: 'unified', viewId: 'approvals' };
        }

        if (source.safety_check || source.safety_violation || source.whitelist_match || source.guardrail || source.skipped_reason) {
            return { moduleId: 'unified', viewId: 'safety-checks' };
        }

        if (source.cooldown || source.cooldown_until || source.rate_limit || source.queued_reason || source.max_executions) {
            return { moduleId: 'unified', viewId: 'rate-limits' };
        }

        if (source.override_id || source.override_action || source.soc_override || source.manual_action) {
            return { moduleId: 'unified', viewId: 'soc-override' };
        }

        if (source.rollback_id || source.rollback_action) {
            return { moduleId: 'unified', viewId: 'rollback' };
        }

        const advancedTarget = buildAdvancedEdrTarget(source, 'unified');
        if (advancedTarget) {
            return advancedTarget;
        }

        if (isEdrPlaybookEvent(source)) {
            return { moduleId: 'unified', viewId: 'playbook-ops' };
        }

        if (isEdrForensicEvent(source)) {
            return { moduleId: 'unified', viewId: 'forensic-storage' };
        }

        if (isEdrAuditEvent(source)) {
            if (source.stage === 'playbook') {
                return { moduleId: 'unified', viewId: 'automation-ops' };
            }

            return { moduleId: 'unified', viewId: 'containment-response' };
        }

        if (isEdrResponseAction(source) || isEdrResponseResult(source)) {
            return { moduleId: 'unified', viewId: 'containment-response' };
        }

        if (isEdrDetection(source)) {
            if (MALWARE_TYPES.includes(source.threat_type) || source.file_hash) {
                return { moduleId: 'unified', viewId: 'malware' };
            }

            if (isHighEdrSeverity(source)) {
                return { moduleId: 'unified', viewId: 'active-threats' };
            }

            if (source.client_id) {
                return { moduleId: 'unified', viewId: 'endpoints' };
            }

            return { moduleId: 'unified', viewId: 'hunting' };
        }

        if (source.file_hash) {
            return { moduleId: 'unified', viewId: 'incident-timeline' };
        }

        return { moduleId: 'unified', viewId: 'siem-events' };
    }

    if (preferredModuleId === 'siem' && isWazuhAlert(source)) {
        return buildWazuhTarget(source, 'siem');
    }

    if (source.approval_id || source.approval_request_id || source.approval_status || source.execution_mode === 'approval') {
        return { moduleId: 'edr', viewId: 'approvals' };
    }

    if (source.safety_check || source.safety_violation || source.whitelist_match || source.guardrail || source.skipped_reason) {
        return { moduleId: 'edr', viewId: 'safety-checks' };
    }

    if (source.cooldown || source.cooldown_until || source.rate_limit || source.queued_reason || source.max_executions) {
        return { moduleId: 'edr', viewId: 'rate-limits' };
    }

    if (source.override_id || source.override_action || source.soc_override || source.manual_action) {
        return { moduleId: 'edr', viewId: 'soc-override' };
    }

    if (source.rollback_id || source.rollback_action) {
        return { moduleId: 'edr', viewId: 'rollback' };
    }

    const advancedTarget = buildAdvancedEdrTarget(source, 'edr');
    if (advancedTarget) {
        return advancedTarget;
    }

    if (isEdrPlaybookEvent(source)) {
        return { moduleId: 'edr', viewId: 'playbook-orchestration' };
    }

    if (isEdrForensicEvent(source)) {
        return { moduleId: 'edr', viewId: 'forensic-storage' };
    }

    if (isEdrAuditEvent(source)) {
        if (source.stage === 'playbook') {
            return { moduleId: 'edr', viewId: 'playbook-automation' };
        }

        if (source.stage === 'response' && source.status === 'success') {
            return { moduleId: 'edr', viewId: 'contained-threats' };
        }

        return { moduleId: 'edr', viewId: 'response-center' };
    }

    if (isEdrResponseAction(source) || isEdrResponseResult(source)) {
        if (source.status === 'success') {
            return { moduleId: 'edr', viewId: 'contained-threats' };
        }

        return { moduleId: 'edr', viewId: 'response-center' };
    }

    if (isEdrDetection(source)) {
        if (MALWARE_TYPES.includes(source.threat_type) || source.file_hash) {
            return { moduleId: 'edr', viewId: 'malware' };
        }

        if (isHighEdrSeverity(source)) {
            return { moduleId: 'edr', viewId: 'active-threats' };
        }

        if (source.process_name || source.command_line) {
            return { moduleId: 'edr', viewId: 'process-tree' };
        }

        return { moduleId: 'edr', viewId: 'endpoints' };
    }

    if (source.file_hash) {
        return { moduleId: 'edr', viewId: 'hash-intelligence' };
    }

    if (source.alert?.signature || source.event_type === 'alert' || source.flow?.alerted || source.source_type) {
        return { moduleId: 'ids', viewId: 'ids-alerts' };
    }

    if (isWazuhAlert(source)) {
        return buildWazuhTarget(source, 'siem');
    }

    return { moduleId: 'unified', viewId: 'siem-events' };
}

function detectSource(source = {}) {
    if (isWazuhAlert(source)) {
        return 'SIEM';
    }

    if (isEdrResponseAction(source) || isEdrResponseResult(source)) {
        return 'Response';
    }

    if (isEdrRecord(source)) {
        return 'EDR';
    }

    if (source.alert?.signature || source.event_type === 'alert' || source.flow?.alerted || source.source_type) {
        return 'IDS';
    }

    return 'SIEM';
}

function buildTitle(source = {}) {
    if (isWazuhAlert(source)) {
        return source.rule?.description || source.title || 'Wazuh alert';
    }

    if (source.approval_id || source.approval_request_id || source.approval_status || source.execution_mode === 'approval') {
        return `${source.approval_status || 'Approval'} for ${source.action_name || source.policy_name || 'response action'}`;
    }

    if (source.safety_check || source.safety_violation || source.whitelist_match || source.guardrail || source.skipped_reason) {
        return `${source.safety_check || source.safety_violation || 'Safety check'} on ${source.client_id || source.action_name || 'target'}`;
    }

    if (source.cooldown || source.cooldown_until || source.rate_limit || source.queued_reason || source.max_executions) {
        return `${source.queued_reason || source.rate_limit || 'Rate limit'} for ${source.action_name || source.policy_name || 'response action'}`;
    }

    if (source.override_id || source.override_action || source.soc_override || source.manual_action) {
        return `${source.override_action || source.manual_action || 'SOC override'} for ${source.action_name || source.policy_name || 'response action'}`;
    }

    if (source.rollback_id || source.rollback_action) {
        return `${source.rollback_action || 'Rollback'} for ${source.action_name || source.client_id || 'target'}`;
    }

    if (isEdrControlEvent(source)) {
        return `${source.control_action || source.manual_action || 'Execution control'} by ${source.operator_id || 'operator'}`;
    }

    if (isEdrMetricEvent(source)) {
        return `${source.threat_type || source.policy_name || 'Response'} MTTR metric`;
    }

    if (isEdrHuntEvent(source)) {
        return `${source.ioc_type || 'IOC'} hunt ${source.hunt_id || source.campaign_id || source.ioc_value || ''}`.trim();
    }

    if (isEdrIntegrationEvent(source)) {
        return `${source.integration_type || 'Integration'} ${source.status || 'event'}`;
    }

    if (isEdrPlatformEvent(source)) {
        return `${source.service_name || 'Response service'} ${source.health_status || source.status || source.error_type || 'telemetry'}`;
    }

    if (isEdrConfigTestEvent(source)) {
        return `${source.config_version || source.simulation_id || 'Playbook'} ${source.validation_status || 'validation'}`;
    }

    if (isEdrPlaybookEvent(source)) {
        return source.playbook_name || source.template_name || source.policy_name || 'Playbook execution';
    }

    if (isEdrForensicEvent(source)) {
        return `${source.artifact_name || source.action_name || 'Forensics'} collected for ${source.client_id || 'endpoint'}`;
    }

    if (isEdrAuditEvent(source)) {
        if (source.policy_name && source.stage) {
            return `${source.policy_name} ${source.stage}`;
        }

        return source.action || source.stage || 'EDR audit event';
    }

    if (isEdrResponseAction(source) || isEdrResponseResult(source)) {
        if (source.action_name) {
            return `${source.action_name} for ${source.client_id || 'endpoint'}`;
        }

        return source.policy_name || 'EDR response event';
    }

    if (isEdrDetection(source)) {
        return `${source.threat_type || 'Threat'} detected on ${source.client_id || 'endpoint'}`;
    }

    if (source.alert?.signature) {
        return source.alert.signature;
    }

    return source.event_type || source.rule_name || 'Security notification';
}

function buildSummary(source = {}) {
    if (isWazuhAlert(source)) {
        const level = source.rule?.level !== undefined ? `Level ${source.rule.level}` : 'Wazuh';
        return `${source.agent?.name || source.manager?.name || 'agent'} | ${level} | ${source.decoder?.name || source.location || 'decoder'}`;
    }

    if (isEdrGovernanceEvent(source)) {
        return `${source.status || source.approval_status || 'tracked'} | ${source.execution_mode || source.risk_tier || source.policy_name || source.action_name || 'governance'}`;
    }

    if (isEdrControlEvent(source)) {
        return `${source.status || 'requested'} | ${source.operator_id || source.reason || source.playbook_execution_id || 'manual control'}`;
    }

    if (isEdrMetricEvent(source)) {
        return `${source.status || 'measured'} | MTTR ${source.mttr_ms ?? '-'} ms | success ${source.success_rate ?? '-'}`;
    }

    if (isEdrHuntEvent(source)) {
        return `${source.status || 'hunt'} | ${source.ioc_type || source.ioc_value || source.cti_feed || 'IOC sweep'}`;
    }

    if (isEdrIntegrationEvent(source)) {
        return `${source.status || 'sent'} | ${source.jira_ticket || source.servicenow_incident || source.pagerduty_incident || source.forwarding_destination || 'enterprise integration'}`;
    }

    if (isEdrPlatformEvent(source)) {
        return `${source.health_status || source.status || 'telemetry'} | ${source.instance_id || source.consumer_group || source.error_type || 'platform'}`;
    }

    if (isEdrConfigTestEvent(source)) {
        return `${source.validation_status || source.status || 'validated'} | ${source.config_change_id || source.git_commit || source.simulation_id || 'configuration'}`;
    }

    if (isEdrPlaybookEvent(source)) {
        return `${source.status || source.stage || 'running'} | ${source.step_id || source.template_version || source.policy_name || 'playbook'}`;
    }

    if (isEdrForensicEvent(source)) {
        return `${source.status || 'collected'} | ${source.forensic_path || source.evidence_path || source.storage_bucket || source.flow_id || 'forensic storage'}`;
    }

    if (isEdrAuditEvent(source)) {
        return `${source.status || 'pending'} | ${source.entity_type || source.policy_name || source.stage || 'audit'}`;
    }

    if (isEdrResponseAction(source) || isEdrResponseResult(source)) {
        return `${source.status || 'queued'} | ${source.policy_name || source.artifact_name || source.message || source.client_id || 'response'}`;
    }

    if (isEdrDetection(source)) {
        return `${source.process_name || source.file_path || 'process'} | ${source.file_hash || source.remote_ip || source.username || 'observed'}`;
    }

    if (source.alert?.signature || source.event_type === 'alert') {
        return `${source.src_ip || source.source_ip || '-'} -> ${source.dest_ip || source.destination_ip || '-'}`;
    }

    return `${source.host || source.endpoint || 'host'} | ${source.user || 'system'}`;
}

function buildTimestamp(source = {}) {
    return source.indexed_at || source.detected_at || source.created_at || source.finished_at || source['@timestamp'] || source.timestamp || '';
}

function escapeKqlValue(value) {
    return String(value ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"');
}

function buildQuotedClause(field, value) {
    if (value === undefined || value === null || value === '') {
        return '';
    }

    return `${field}:"${escapeKqlValue(value)}"`;
}

function uniqueColumns(columns = []) {
    return [...new Set(columns.filter(Boolean))];
}

function buildAndClause(clauses = []) {
    const filtered = clauses.filter(Boolean);

    if (filtered.length === 0) {
        return '';
    }

    if (filtered.length === 1) {
        return filtered[0];
    }

    return `(${filtered.join(' and ')})`;
}

function buildAlertFocusQuery(hit = {}) {
    const source = hit?._source || {};
    const exactGroups = [
        buildQuotedClause('id', source.id),
        buildQuotedClause('event_id', source.event_id),
        buildQuotedClause('detection_id', source.detection_id),
        buildQuotedClause('threat_event_id', source.threat_event_id),
        buildQuotedClause('action_id', source.action_id),
        buildQuotedClause('decision_id', source.decision_id),
        buildQuotedClause('policy_id', source.policy_id),
        buildQuotedClause('approval_id', source.approval_id),
        buildQuotedClause('approval_request_id', source.approval_request_id),
        buildQuotedClause('playbook_execution_id', source.playbook_execution_id),
        buildQuotedClause('rollback_id', source.rollback_id),
        buildQuotedClause('override_id', source.override_id),
        buildQuotedClause('hunt_id', source.hunt_id),
        buildQuotedClause('campaign_id', source.campaign_id),
        buildQuotedClause('config_change_id', source.config_change_id),
        buildQuotedClause('simulation_id', source.simulation_id),
        buildQuotedClause('flow_id', source.flow_id),
        buildQuotedClause('entity_id', source.entity_id)
    ].filter(Boolean);

    const relatedGroups = [];

    if (isWazuhAlert(source)) {
        relatedGroups.push(buildAndClause([
            buildQuotedClause('rule.id', source.rule?.id),
            buildQuotedClause('agent.name', source.agent?.name),
            buildQuotedClause('@timestamp', source['@timestamp'])
        ]));
        relatedGroups.push(buildAndClause([
            buildQuotedClause('rule.description', source.rule?.description),
            buildQuotedClause('decoder.name', source.decoder?.name)
        ]));
    }

    if (isEdrControlEvent(source)) {
        relatedGroups.push(buildAndClause([
            buildQuotedClause('playbook_execution_id', source.playbook_execution_id),
            buildQuotedClause('control_action', source.control_action),
            buildQuotedClause('operator_id', source.operator_id)
        ]));
        relatedGroups.push(buildAndClause([
            buildQuotedClause('manual_action', source.manual_action),
            buildQuotedClause('action_name', source.action_name),
            buildQuotedClause('client_id', source.client_id)
        ]));
    }

    if (isEdrMetricEvent(source)) {
        relatedGroups.push(buildAndClause([
            buildQuotedClause('threat_type', source.threat_type),
            buildQuotedClause('policy_name', source.policy_name),
            buildQuotedClause('action_name', source.action_name)
        ]));
    }

    if (isEdrHuntEvent(source)) {
        relatedGroups.push(buildAndClause([
            buildQuotedClause('hunt_id', source.hunt_id),
            buildQuotedClause('campaign_id', source.campaign_id),
            buildQuotedClause('ioc_type', source.ioc_type)
        ]));
        relatedGroups.push(buildAndClause([
            buildQuotedClause('ioc_value', source.ioc_value),
            buildQuotedClause('cti_feed', source.cti_feed)
        ]));
    }

    if (isEdrIntegrationEvent(source)) {
        relatedGroups.push(buildAndClause([
            buildQuotedClause('integration_type', source.integration_type),
            buildQuotedClause('status', source.status),
            buildQuotedClause('policy_name', source.policy_name)
        ]));
        relatedGroups.push(buildAndClause([
            buildQuotedClause('jira_ticket', source.jira_ticket),
            buildQuotedClause('servicenow_incident', source.servicenow_incident),
            buildQuotedClause('pagerduty_incident', source.pagerduty_incident)
        ]));
    }

    if (isEdrPlatformEvent(source)) {
        relatedGroups.push(buildAndClause([
            buildQuotedClause('service_name', source.service_name),
            buildQuotedClause('instance_id', source.instance_id),
            buildQuotedClause('consumer_group', source.consumer_group)
        ]));
        relatedGroups.push(buildAndClause([
            buildQuotedClause('error_type', source.error_type),
            buildQuotedClause('status', source.status)
        ]));
    }

    if (isEdrConfigTestEvent(source)) {
        relatedGroups.push(buildAndClause([
            buildQuotedClause('config_version', source.config_version),
            buildQuotedClause('config_change_id', source.config_change_id),
            buildQuotedClause('validation_status', source.validation_status)
        ]));
        relatedGroups.push(buildAndClause([
            buildQuotedClause('simulation_id', source.simulation_id),
            buildQuotedClause('artifact_validation', source.artifact_validation),
            buildQuotedClause('operator_id', source.operator_id)
        ]));
    }

    if (isEdrGovernanceEvent(source)) {
        relatedGroups.push(buildAndClause([
            buildQuotedClause('approval_id', source.approval_id),
            buildQuotedClause('policy_name', source.policy_name),
            buildQuotedClause('action_name', source.action_name)
        ]));
        relatedGroups.push(buildAndClause([
            buildQuotedClause('client_id', source.client_id),
            buildQuotedClause('status', source.status || source.approval_status),
            buildQuotedClause('risk_tier', source.risk_tier)
        ]));
    }

    if (isEdrPlaybookEvent(source)) {
        relatedGroups.push(buildAndClause([
            buildQuotedClause('playbook_execution_id', source.playbook_execution_id),
            buildQuotedClause('step_id', source.step_id),
            buildQuotedClause('status', source.status)
        ]));
        relatedGroups.push(buildAndClause([
            buildQuotedClause('template_name', source.template_name),
            buildQuotedClause('policy_name', source.policy_name),
            buildQuotedClause('action_name', source.action_name)
        ]));
    }

    if (isEdrForensicEvent(source)) {
        relatedGroups.push(buildAndClause([
            buildQuotedClause('client_id', source.client_id),
            buildQuotedClause('artifact_name', source.artifact_name),
            buildQuotedClause('flow_id', source.flow_id)
        ]));
    }

    if (isEdrDetection(source)) {
        relatedGroups.push(buildAndClause([
            buildQuotedClause('client_id', source.client_id),
            buildQuotedClause('threat_type', source.threat_type),
            buildQuotedClause('process_name', source.process_name)
        ]));
        relatedGroups.push(buildAndClause([
            buildQuotedClause('client_id', source.client_id),
            buildQuotedClause('file_hash', source.file_hash),
            buildQuotedClause('file_path', source.file_path)
        ]));
        relatedGroups.push(buildAndClause([
            buildQuotedClause('client_id', source.client_id),
            buildQuotedClause('remote_ip', source.remote_ip),
            buildQuotedClause('source_ip', source.source_ip),
            buildQuotedClause('command_line', source.command_line)
        ]));
    }

    if (isEdrResponseAction(source) || isEdrResponseResult(source)) {
        relatedGroups.push(buildAndClause([
            buildQuotedClause('client_id', source.client_id),
            buildQuotedClause('action_name', source.action_name),
            buildQuotedClause('policy_name', source.policy_name)
        ]));
        relatedGroups.push(buildAndClause([
            buildQuotedClause('client_id', source.client_id),
            buildQuotedClause('artifact_name', source.artifact_name),
            buildQuotedClause('status', source.status)
        ]));
    }

    if (isEdrAuditEvent(source)) {
        relatedGroups.push(buildAndClause([
            buildQuotedClause('policy_name', source.policy_name),
            buildQuotedClause('stage', source.stage),
            buildQuotedClause('status', source.status)
        ]));
        relatedGroups.push(buildAndClause([
            buildQuotedClause('client_id', source.client_id),
            buildQuotedClause('entity_type', source.entity_type),
            buildQuotedClause('entity_id', source.entity_id)
        ]));
    }

    if (source.alert?.signature || source.event_type === 'alert' || source.flow?.alerted) {
        relatedGroups.push(buildAndClause([
            buildQuotedClause('alert.signature', source.alert?.signature),
            buildQuotedClause('src_ip', source.src_ip || source.source_ip),
            buildQuotedClause('dest_ip', source.dest_ip || source.destination_ip)
        ]));
    }

    const clauses = [...new Set([...exactGroups, ...relatedGroups].filter(Boolean))];

    if (clauses.length === 0) {
        return '';
    }

    if (clauses.length === 1) {
        return clauses[0];
    }

    return clauses.map((clause) => `(${clause})`).join(' or ');
}

function buildAlertFocusDataViewTitles(source = {}, target = {}) {
    if (isWazuhAlert(source) || target.moduleId === 'siem' || target.viewId === 'siem-events') {
        return WAZUH_DATA_VIEW_TITLES;
    }

    if (source.alert?.signature || source.event_type === 'alert' || source.flow?.alerted || source.source_type || target.viewId === 'ids-alerts' || target.viewId === 'blocked') {
        return ['logs-tenant-*', 'logs-*'];
    }

    if (
        isEdrRecord(source) ||
        [
            'endpoints',
            'active-threats',
            'isolation',
            'containment-response',
            'response-dashboard',
            'execution-control',
            'manual-operations',
            'response-metrics',
            'automation-ops',
            'detection-health',
            'collected-artifacts',
            'forensic-storage',
            'forensic-retention',
            'enhanced-forensics',
            'client-events',
            'server-events',
            'malware',
            'playbook-automation',
            'playbook-orchestration',
            'playbook-ops',
            'response-center',
            'contained-threats',
            'hash-intelligence',
            'process-tree',
            'file-integrity',
            'hunting',
            'threat-hunting',
            'audit-trail',
            'audit-compliance',
            'integrations',
            'performance',
            'reliability',
            'config-management',
            'testing-validation'
        ].includes(target.viewId)
    ) {
        return EDR_DATA_VIEW_TITLES;
    }

    return ['tenant-01-siem*', 'tenant-*-siem*'];
}

function buildAlertFocusColumns(source = {}, target = {}) {
    if (isWazuhAlert(source) || target.moduleId === 'siem' || target.viewId === 'siem-events') {
        return uniqueColumns(WAZUH_FOCUS_COLUMNS);
    }

    if (isEdrControlEvent(source)) {
        return uniqueColumns([
            'indexed_at',
            'created_at',
            'playbook_execution_id',
            'control_action',
            'manual_action',
            'operator_id',
            'status',
            'reason',
            'dry_run',
            'elevated_privilege',
            'action_name',
            'client_id',
            'policy_name',
            '_index'
        ]);
    }

    if (isEdrMetricEvent(source)) {
        return uniqueColumns([
            'indexed_at',
            'detected_at',
            'finished_at',
            'org_id',
            'client_id',
            'threat_type',
            'severity',
            'policy_name',
            'action_name',
            'status',
            'mttr_ms',
            'response_duration_ms',
            'containment_duration_ms',
            'success_rate',
            '_index'
        ]);
    }

    if (isEdrHuntEvent(source)) {
        return uniqueColumns([
            'indexed_at',
            'created_at',
            'finished_at',
            'org_id',
            'hunt_id',
            'campaign_id',
            'ioc_type',
            'ioc_value',
            'matched_endpoints',
            'status',
            'cti_feed',
            'baseline_score',
            'client_id',
            '_index'
        ]);
    }

    if (isEdrIntegrationEvent(source)) {
        return uniqueColumns([
            'indexed_at',
            'created_at',
            'org_id',
            'integration_type',
            'status',
            'jira_ticket',
            'servicenow_incident',
            'slack_channel',
            'email_recipient',
            'pagerduty_incident',
            'webhook_url',
            'forwarding_destination',
            'policy_name',
            '_index'
        ]);
    }

    if (isEdrPlatformEvent(source)) {
        return uniqueColumns([
            'indexed_at',
            'service_name',
            'instance_id',
            'consumer_group',
            'health_status',
            'events_processed',
            'actions_generated',
            'policy_evaluation_duration_ms',
            'retry_count',
            'error_type',
            'dlq_topic',
            'circuit_breaker_state',
            'status',
            '_index'
        ]);
    }

    if (isEdrConfigTestEvent(source)) {
        return uniqueColumns([
            'indexed_at',
            'created_at',
            'operator_id',
            'config_version',
            'config_change_id',
            'validation_status',
            'git_commit',
            'environment',
            'dry_run',
            'simulation_id',
            'artifact_validation',
            'policy_simulation',
            'status',
            '_index'
        ]);
    }

    if (isEdrGovernanceEvent(source)) {
        return uniqueColumns([
            'indexed_at',
            'created_at',
            'org_id',
            'policy_name',
            'policy_id',
            'execution_mode',
            'risk_tier',
            'approval_status',
            'safety_check',
            'safety_violation',
            'cooldown_until',
            'rate_limit',
            'status',
            'action_name',
            'client_id',
            '_index'
        ]);
    }

    if (isEdrPlaybookEvent(source)) {
        return uniqueColumns([
            'indexed_at',
            'created_at',
            'playbook_id',
            'playbook_name',
            'playbook_execution_id',
            'template_name',
            'template_version',
            'step_id',
            'stage',
            'status',
            'policy_name',
            'action_name',
            'client_id',
            'decision_id',
            '_index'
        ]);
    }

    if (isEdrForensicEvent(source)) {
        return uniqueColumns([
            'indexed_at',
            'created_at',
            'finished_at',
            'client_id',
            'artifact_name',
            'action_name',
            'status',
            'forensic_path',
            'evidence_path',
            'storage_bucket',
            'retention_until',
            'sha256',
            'checksum',
            'encryption_algorithm',
            'collection_scope',
            'archive_path',
            'archive_sha256',
            'size_bytes',
            'flow_id',
            'message',
            '_index'
        ]);
    }

    if (isEdrResponseAction(source)) {
        return uniqueColumns([
            'indexed_at',
            'created_at',
            'client_id',
            'action_name',
            'artifact_name',
            'policy_name',
            'risk_tier',
            'execution_mode',
            'decision_id',
            'threat_event_id',
            '_index'
        ]);
    }

    if (isEdrResponseResult(source)) {
        return uniqueColumns([
            'indexed_at',
            'finished_at',
            'client_id',
            'action_name',
            'status',
            'message',
            'policy_name',
            'decision_id',
            'flow_id',
            'action_id',
            '_index'
        ]);
    }

    if (isEdrAuditEvent(source)) {
        return uniqueColumns([
            'indexed_at',
            'created_at',
            'stage',
            'status',
            'action',
            'policy_name',
            'entity_type',
            'entity_id',
            'threat_event_id',
            'client_id',
            '_index'
        ]);
    }

    if (source.alert?.signature || source.event_type === 'alert' || source.flow?.alerted) {
        return uniqueColumns([
            'timestamp',
            'event_type',
            'alert.signature',
            'alert.category',
            'alert.severity',
            'src_ip',
            'src_port',
            'dest_ip',
            'dest_port',
            'proto',
            'app_proto',
            '_index'
        ]);
    }

    if (isEdrDetection(source) || target.moduleId === 'edr') {
        return uniqueColumns([
            'indexed_at',
            'detected_at',
            'client_id',
            'threat_type',
            'severity',
            'process_name',
            'command_line',
            'file_path',
            'file_hash',
            'remote_ip',
            'source_ip',
            'mitre_techniques',
            '_index'
        ]);
    }

    return uniqueColumns([
        'indexed_at',
        'timestamp',
        'event_type',
        'severity',
        'host',
        'user',
        'description',
        '_index'
    ]);
}

function buildNotificationId(hit = {}, source = {}) {
    if (hit?._index && hit?._id) {
        return `doc:${hit._index}:${hit._id}`;
    }

    const stableSourceId =
        source.event_id ||
        source.action_id ||
        source.decision_id ||
        source.approval_id ||
        source.approval_request_id ||
        source.playbook_execution_id ||
        source.rollback_id ||
        source.override_id ||
        source.hunt_id ||
        source.campaign_id ||
        source.config_change_id ||
        source.simulation_id ||
        source.threat_event_id ||
        source.policy_id ||
        source.entity_id ||
        source.detection_id ||
        source.flow_id;

    if (stableSourceId) {
        return `src:${stableSourceId}`;
    }

    return `fallback:${buildTimestamp(source) || 'unknown'}:${source.client_id || source.endpoint || source.host || 'item'}:${source.threat_type || source.action_name || source.stage || source.event_type || 'notification'}`;
}

function normalizeHit(hit, context = {}) {
    const source = hit?._source || {};
    const target = buildNotificationTarget(source, context);
    const timestampField = resolvePrimaryTimestampField(source);
    const id = buildNotificationId(hit, source);

    return {
        id,
        title: buildTitle(source),
        summary: buildSummary(source),
        severity: normalizeSeverity(source),
        source: detectSource(source),
        timestamp: buildTimestamp(source),
        moduleId: target.moduleId,
        viewId: target.viewId,
        documentId: hit?._id || '',
        documentIndex: hit?._index || '',
        focusQuery: buildAlertFocusQuery(hit),
        focusColumns: buildAlertFocusColumns(source, target),
        focusSortField: timestampField,
        focusDataViewTitles: buildAlertFocusDataViewTitles(source, target)
    };
}

export function markAlertAsRead(alert, contexts = []) {
    if (!alert?.id) {
        return;
    }

    const timestamp = alert.timestamp || new Date().toISOString();
    const scopeCandidates = [
        { moduleId: alert.moduleId, viewId: alert.viewId },
        ...contexts
    ].filter(({ moduleId, viewId }) => moduleId && viewId);

    if (!scopeCandidates.length) {
        return;
    }

    const store = readAlertStore();

    scopeCandidates.forEach(({ moduleId, viewId }) => {
        const scopeKey = buildAlertScopeKey(moduleId, viewId);
        const scopeEntries = store[scopeKey] || {};

        store[scopeKey] = {
            ...scopeEntries,
            [alert.id]: {
                timestamp,
                readAt: new Date().toISOString()
            }
        };
    });

    writeAlertStore(store);
    dispatchReadStateChanged();
}

export async function fetchScopedAlerts({ timeRange = '24h', size = 8, from = 0, moduleId, viewId } = {}) {
    const scope = buildScopedQuery({ timeRange, moduleId, viewId });
    const requestedSize = Math.max(1, Number(size) || 8);
    const requestedFrom = Math.max(0, Number(from) || 0);
    const response = await fetch(`${OS_API}/${scope.indices}/_search?ignore_unavailable=true&allow_no_indices=true`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            size: Math.max((requestedFrom + requestedSize) * 4, 32),
            track_total_hits: true,
            sort: [
                {
                    indexed_at: {
                        order: 'desc',
                        missing: '_last',
                        unmapped_type: 'date'
                    }
                },
                {
                    detected_at: {
                        order: 'desc',
                        missing: '_last',
                        unmapped_type: 'date'
                    }
                },
                {
                    created_at: {
                        order: 'desc',
                        missing: '_last',
                        unmapped_type: 'date'
                    }
                },
                {
                    finished_at: {
                        order: 'desc',
                        missing: '_last',
                        unmapped_type: 'date'
                    }
                },
                {
                    '@timestamp': {
                        order: 'desc',
                        missing: '_last',
                        unmapped_type: 'date'
                    }
                },
                {
                    timestamp: {
                        order: 'desc',
                        missing: '_last',
                        unmapped_type: 'date'
                    }
                }
            ],
            query: scope.query
        })
    });

    if (!response.ok) {
        const details = await response.text();
        throw new Error(details || `Scoped alert query failed with ${response.status}`);
    }

    const payload = await response.json();
    const normalizedItems = (payload.hits?.hits || []).map((hit) => normalizeHit(hit, { moduleId, viewId }));
    const unreadItems = normalizedItems
        .filter((item) => !isAlertReadForScope(item.id, { moduleId, viewId, timeRange }))
        .slice(requestedFrom, requestedFrom + requestedSize);
    const rawTotal = typeof payload.hits?.total === 'number' ? payload.hits.total : (payload.hits?.total?.value || 0);
    const unreadTotal = Math.max(0, rawTotal - getReadCountForScope({ moduleId, viewId, timeRange }));

    return {
        total: unreadTotal,
        items: unreadItems
    };
}

export async function fetchSidebarAlertCounts({ timeRange = '24h', moduleId, viewIds = [] } = {}) {
    const uniqueViewIds = [...new Set((viewIds || []).filter(Boolean))];

    if (!uniqueViewIds.length) {
        return {};
    }

    const entries = await Promise.all(
        uniqueViewIds.map(async (viewId) => {
            try {
                const scope = buildScopedQuery({ timeRange, moduleId, viewId });
                const response = await fetch(`${OS_API}/${scope.indices}/_count?ignore_unavailable=true&allow_no_indices=true`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        query: scope.query
                    })
                });

                if (!response.ok) {
                    return [viewId, 0];
                }

                const payload = await response.json();
                const rawCount = payload.count || 0;
                const unreadCount = Math.max(0, rawCount - getReadCountForScope({ moduleId, viewId, timeRange }));
                return [viewId, unreadCount];
            } catch (error) {
                return [viewId, 0];
            }
        })
    );

    return Object.fromEntries(entries);
}
