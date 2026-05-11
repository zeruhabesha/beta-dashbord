const OPENSEARCH_URL = process.env.OPENSEARCH_URL || 'http://localhost:9200';
const DASHBOARDS_URL = process.env.OPENSEARCH_DASHBOARDS_URL || 'http://localhost:5601';
const INDEX_NAME = process.env.EDR_INDEX_NAME || 'tenant-01-edr';
const DATA_VIEW_ID = process.env.EDR_DATA_VIEW_ID || 'edr-index-pattern';
const DATA_VIEW_TITLE = process.env.EDR_DATA_VIEW_TITLE || 'tenant-01-edr*';
const NOW = new Date();

const EDR_BASE_QUERY = '((detection_id:* or threat_type:* or endpoint:* or process_name:* or file_hash:* or mitre_technique:*) and not service_domain:*)';
const EDR_RESPONSE_CENTER_QUERY = `((${EDR_BASE_QUERY} and response_action:* and not response_action:"None") or (service_name:"response-service" and (response_action:* or response_artifact:* or response_flow_id:*)) or (service_name:"playbook-service" and (playbook_result:* or policy_name:* or cti_lookup_status:*)))`;
const EDR_QUERIES = {
    home: EDR_BASE_QUERY,
    endpoints: `${EDR_BASE_QUERY} and endpoint:*`,
    activeThreats: `${EDR_BASE_QUERY} and (severity:"Critical" or severity:"High")`,
    isolation: `${EDR_BASE_QUERY} and (status:"Quarantined" or status:"Blocked" or status:"Investigating")`,
    containedThreats: `${EDR_BASE_QUERY} and (containment_reason:* or xcitium_rating:* or status:"Quarantined" or status:"Blocked")`,
    containedFiles: `${EDR_BASE_QUERY} and file_path:* and (status:"Quarantined" or status:"Blocked" or status:"Investigating")`,
    hashIntel: `${EDR_BASE_QUERY} and file_hash:*`,
    response: EDR_RESPONSE_CENTER_QUERY,
    responseDetections: `${EDR_BASE_QUERY} and response_action:* and not response_action:"None"`,
    malware: `${EDR_BASE_QUERY} and (threat_type:"Malware" or threat_type:"Ransomware" or threat_type:"Trojan" or threat_type:"Rootkit" or threat_type:"Spyware" or threat_type:"Adware")`,
    processTree: `${EDR_BASE_QUERY} and (process_name:* or parent_process:* or process_id:*)`,
    fileIntegrity: `${EDR_BASE_QUERY} and (file_path:* or file_hash:* or action:"File Created" or action:"File Modified" or action:"File Deleted")`,
    hunting: EDR_BASE_QUERY,
    playbookAutomation: 'service_name:"playbook-service"',
    detectionPipeline: 'service_name:"detection-service"',
    responseService: 'service_name:"response-service"',
    publishedActions: 'service_name:"playbook-service" and playbook_result:"Published"',
    cooldownSkips: 'service_name:"playbook-service" and playbook_result:"Cooldown Skipped"',
    ctiFailures: 'cti_lookup_status:"Failed"',
    responseExecuted: 'service_name:"response-service" and service_event:"Action Executed"',
    collectedArtifacts: 'service_domain:"velociraptor" and velociraptor_feature:"collected_artifacts"',
    clientEvents: 'service_domain:"velociraptor" and velociraptor_feature:"client_events"',
    serverEvents: 'service_domain:"velociraptor" and velociraptor_feature:"server_events"'
};

const ENDPOINTS = [
    'laptop-finance-01',
    'workstation-ops-07',
    'server-dc-02',
    'devbox-sec-03',
    'hr-laptop-04',
    'sql-prod-01',
    'qa-win11-02',
    'branch-kisumu-06'
];

const USERS = ['jdoe', 'asmith', 'mwaniki', 'analyst1', 'finance.svc', 'itadmin', 'hruser', 'secops'];
const PROCESSES = ['powershell.exe', 'cmd.exe', 'chrome.exe', 'winword.exe', 'svchost.exe', 'rundll32.exe', 'explorer.exe', 'mshta.exe'];
const PARENTS = ['explorer.exe', 'services.exe', 'winlogon.exe', 'cmd.exe', 'powershell.exe'];
const THREATS = ['Malware', 'Ransomware', 'Suspicious Activity', 'Trojan', 'Rootkit', 'Spyware', 'Adware'];
const ACTIONS = ['File Created', 'File Modified', 'File Deleted', 'Process Started', 'Process Terminated', 'Registry Modified', 'Network Connection'];
const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES = ['Quarantined', 'Blocked', 'Allowed', 'Investigating'];
const MITRE = ['T1486.001', 'T1059.001', 'T1055.012', 'T1027.002', 'T1105.001', 'T1566.001', 'T1547.001'];
const RATINGS = ['Unknown', 'Trusted', 'Malicious'];
const VERDICT_SOURCES = ['Verdict Cloud', 'Behavior Engine', 'Threat Intel Feed', 'Analyst Override'];
const CONTAINMENT_REASONS = ['Unknown executable', 'Untrusted file hash', 'Script behavior anomaly', 'Suspicious child process', 'Office macro activity'];
const RESPONSE_ACTIONS = ['Keep Contained', 'Allow Application', 'Block Hash', 'Block IP', 'Isolate Endpoint', 'Kill Process', 'Delete File'];
const RESPONSE_STATUSES = ['Pending', 'Completed', 'Failed'];
const AGENT_VERSIONS = ['7.1.12', '7.1.14', '7.2.0', '7.2.2'];
const POLICIES = ['Default Containment', 'Finance High Security', 'Server Lockdown', 'Operations Balanced'];
const DEVICE_GROUPS = ['Finance', 'Operations', 'Servers', 'HQ', 'Branches'];
const DOWNLOAD_HOSTS = ['cdn-updates.example.net', 'sharepoint-cdn.example.org', 's3-cache.example.com', 'mail-attachments.example.io'];
const ANALYSTS = ['analyst1', 'analyst2', 'secops-lead', 'automation'];
const SERVICE_CLIENTS = [
    { client_id: 'C.a1be6597a23e6948', endpoint: 'devbox-sec-03', user: 'itadmin' },
    { client_id: 'C.45ca8ebd12fe60aa', endpoint: 'qa-win11-02', user: 'analyst1' },
    { client_id: 'C.9075bbd8814f3321', endpoint: 'sql-prod-01', user: 'secops' },
    { client_id: 'C.4bff8a17e4119d02', endpoint: 'workstation-ops-07', user: 'jdoe' }
];
const PLAYBOOK_POLICIES = ['High-Severity Malware Response', 'Suspicious Connection Block', 'Privilege Abuse Isolation', 'Ransomware Auto-Contain'];
const SERVICE_COMPONENTS = ['bootstrap', 'consumer', 'collector', 'cti-syncer', 'yara', 'monitor', 'pipeline'];
const MONITOR_ARTIFACTS = ['Server.Events.ProcessExecution.Monitor', 'Server.Events.FileIntegrity.Monitor', 'Server.Events.NetworkConnections.Monitor'];
const PLAYBOOK_RESULTS = ['Published', 'Cooldown Skipped', 'No Match'];
const PIPELINE_STAGES = ['Stage 1', 'Stage 2', 'ML'];
const PIPELINE_MODES = ['Stage 1 + Stage 2 + ML'];
const SERVICE_STATUSES = ['Healthy', 'Warning'];
const CTI_ENDPOINTS = ['https://127.0.0.1:8080/api/v1/iocs/check', 'https://127.0.0.1:8082'];
const HASH_INDICATORS = ['789AE53CC6AB83ACA21791678E6A06AC17D4B34C648F16B866B540F36044D3C9', '0FBE913DD8A96A6FB6A84BFB2E919FCE094A55A8DB34DA582F88EA18284A27C1'];
const REMOTE_IPS = ['160.79.104.10', '142.250.102.207', '104.26.14.14', '172.67.73.26'];
const VELOCIRAPTOR_OS = ['linux', 'windows'];
const VELOCIRAPTOR_SERVER_ARTIFACTS = ['Server.Events.ProcessExecution.Monitor', 'Server.Events.FileIntegrity.Monitor', 'Server.Events.NetworkConnections.Monitor'];
const VELOCIRAPTOR_CLIENT_ARTIFACTS = ['Custom.Linux.Events.ProcessExecution/process_execution', 'Custom.Windows.Events.ProcessExecution/process_execution', 'Custom.Linux.Events.NetworkConnections/network_connection'];
const VELOCIRAPTOR_CATEGORIES = ['execution', 'network', 'integrity'];
const VELOCIRAPTOR_DETECTION_METHODS = ['suspicious_exec_path', 'behavior_rule', 'network_anomaly', 'file_tamper'];

function randomItem(values) {
    return values[Math.floor(Math.random() * values.length)];
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isoWithinLastHours(hours) {
    const offsetMinutes = randomInt(0, hours * 60);
    return new Date(NOW.getTime() - offsetMinutes * 60 * 1000).toISOString();
}

function isoOffset(timestamp, offsetMs) {
    return new Date(new Date(timestamp).getTime() + offsetMs).toISOString();
}

function buildFilePath(threat, endpoint) {
    const safeThreat = threat.toLowerCase().replace(/\s+/g, '-');
    return `C:\\Users\\${randomItem(USERS)}\\AppData\\Local\\Temp\\${endpoint}-${safeThreat}-${randomInt(100, 999)}.exe`;
}

function buildCommandLine(processName, threat) {
    return `${processName} --mode ${threat.toLowerCase().replace(/\s+/g, '-')}`;
}

function buildDownloadUrl(threat) {
    const slug = threat.toLowerCase().replace(/\s+/g, '-');
    return `https://${randomItem(DOWNLOAD_HOSTS)}/downloads/${slug}-${randomInt(1000, 9999)}.bin`;
}

function buildHash() {
    const alphabet = 'abcdef0123456789';
    let hash = '';
    for (let index = 0; index < 64; index += 1) {
        hash += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return hash;
}

function buildUuid() {
    const alphabet = 'abcdef0123456789';
    const sections = [8, 4, 4, 4, 12];
    return sections.map((length) => {
        let value = '';
        for (let index = 0; index < length; index += 1) {
            value += alphabet[Math.floor(Math.random() * alphabet.length)];
        }
        return value;
    }).join('-');
}

function buildFlowId() {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let value = 'F.';
    for (let index = 0; index < 12; index += 1) {
        value += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return value;
}

function randomClientProfile() {
    return randomItem(SERVICE_CLIENTS);
}

function generateEdrDocument(index, seedProfile = 'base') {
    const endpoint = randomItem(ENDPOINTS);
    const threatType = randomItem(THREATS);
    const processName = randomItem(PROCESSES);
    const timestamp = isoWithinLastHours(48);
    const severity = randomItem(SEVERITIES);
    const xcitiumRating = severity === 'Critical'
        ? 'Malicious'
        : (Math.random() > 0.52 ? 'Unknown' : randomItem(RATINGS));
    const isContained = xcitiumRating === 'Unknown' || severity === 'Critical' || severity === 'High' || Math.random() > 0.72;
    const status = isContained
        ? randomItem(['Quarantined', 'Blocked', 'Investigating'])
        : (Math.random() > 0.82 ? 'Investigating' : 'Allowed');
    const adminRating = status === 'Allowed' && xcitiumRating !== 'Malicious'
        ? 'Trusted'
        : (xcitiumRating === 'Malicious' || severity === 'Critical' ? 'Malicious' : 'Unknown');
    const containmentReason = isContained ? randomItem(CONTAINMENT_REASONS) : 'Policy allow';
    const verdictSource = adminRating === 'Trusted'
        ? 'Analyst Override'
        : (xcitiumRating === 'Unknown' ? randomItem(['Verdict Cloud', 'Behavior Engine']) : randomItem(VERDICT_SOURCES));
    let responseAction = 'None';

    if (status === 'Quarantined' || status === 'Blocked') {
        responseAction = randomItem(['Keep Contained', 'Block Hash', 'Isolate Endpoint', 'Delete File', 'Kill Process']);
    } else if (adminRating === 'Trusted') {
        responseAction = 'Allow Application';
    } else if (severity === 'High' || severity === 'Critical') {
        responseAction = randomItem(['Kill Process', 'Isolate Endpoint', 'Block Hash']);
    } else if (Math.random() > 0.8) {
        responseAction = randomItem(RESPONSE_ACTIONS);
    }

    const responseStatus = responseAction === 'None'
        ? 'Pending'
        : randomItem(RESPONSE_STATUSES);

    return {
        detection_id: `edr-seed-${index}-${randomInt(1000, 9999)}`,
        incident_id: `INC-${randomInt(10000, 99999)}`,
        '@timestamp': timestamp,
        threat_type: threatType,
        endpoint,
        user: randomItem(USERS),
        process_name: processName,
        process_id: randomInt(2000, 120000),
        parent_process: randomItem(PARENTS),
        parent_process_hash: buildHash(),
        file_path: buildFilePath(threatType, endpoint),
        file_hash: buildHash(),
        action: randomItem(ACTIONS),
        severity,
        status,
        mitre_technique: randomItem(MITRE),
        command_line: buildCommandLine(processName, threatType),
        xcitium_rating: xcitiumRating,
        admin_rating: adminRating,
        verdict: adminRating,
        verdict_source: verdictSource,
        containment_reason: containmentReason,
        response_action: responseAction,
        response_status: responseStatus,
        action_by: responseAction === 'None' ? 'automation' : randomItem(ANALYSTS),
        last_seen: isoWithinLastHours(6),
        agent_version: randomItem(AGENT_VERSIONS),
        policy_name: randomItem(POLICIES),
        device_group: randomItem(DEVICE_GROUPS),
        download_url: buildDownloadUrl(threatType),
        tenant_id: 'tenant-01',
        data_source: 'EDR',
        seed_profile: seedProfile
    };
}

function createServiceLogBase({
    timestamp,
    serviceDomain,
    serviceName,
    serviceComponent,
    serviceEvent,
    logLevel = 'INF',
    endpoint = '',
    clientId = '',
    user = 'automation',
    seedProfile = 'xcitium-services-v1'
} = {}) {
    return {
        '@timestamp': timestamp,
        tenant_id: 'tenant-01',
        data_source: 'EDR',
        seed_profile: seedProfile,
        service_domain: serviceDomain,
        service_name: serviceName,
        service_component: serviceComponent,
        service_event: serviceEvent,
        service_status: logLevel === 'WRN' ? 'Warning' : 'Healthy',
        log_level: logLevel,
        endpoint,
        client_id: clientId,
        user
    };
}

function generateResponseServiceDocs() {
    const docs = [];
    const startupClient = randomClientProfile();

    docs.push({
        ...createServiceLogBase({
            timestamp: isoWithinLastHours(4),
            serviceDomain: 'response',
            serviceName: 'response-service',
            serviceComponent: 'bootstrap',
            serviceEvent: 'Service Started',
            endpoint: startupClient.endpoint,
            clientId: startupClient.client_id,
            user: startupClient.user
        }),
        service_mode: 'Microservices Mode',
        velociraptor_address: '127.0.0.1:8001',
        response_topic: 'response-actions',
        response_consumer_group: 'response-service',
        metrics_addr: ':9093',
        metrics_path: '/metrics'
    });

    docs.push({
        ...createServiceLogBase({
            timestamp: isoWithinLastHours(4),
            serviceDomain: 'response',
            serviceName: 'response-service',
            serviceComponent: 'collector',
            serviceEvent: 'Agent Connected',
            endpoint: startupClient.endpoint,
            clientId: startupClient.client_id,
            user: startupClient.user
        }),
        velociraptor_address: '127.0.0.1:8001'
    });

    const actionTemplates = [
        {
            response_action: 'Kill Process',
            response_action_key: 'kill_process',
            response_artifact: 'Custom.Response.KillProcess',
            threat_type: 'Process Execution',
            severity: 'Critical',
            command_line: '/tmp/edr-selftest 50',
            process_name: 'edr-selftest',
            process_id: 326606,
            remote_ip: '',
            durations: [152, 24, 29, 24, 142]
        },
        {
            response_action: 'Block IP',
            response_action_key: 'block_ip',
            response_artifact: 'Custom.Response.BlockIP',
            threat_type: 'Network Connection',
            severity: 'High',
            command_line: 'curl -fsSL https://claude.ai/install.sh',
            process_name: 'curl',
            process_id: 380067,
            remote_ip: '160.79.104.10',
            durations: [117, 59, 88]
        },
        {
            response_action: 'Block IP',
            response_action_key: 'block_ip',
            response_artifact: 'Custom.Response.BlockIP',
            threat_type: 'Network Connection',
            severity: 'High',
            command_line: 'curl -fsSL -o /home/ed/.claude/downloads/claude-2.1.90-linux-x64 https://storage.googleapis.com/claude-code/linux-x64/claude',
            process_name: 'curl',
            process_id: 380704,
            remote_ip: '142.250.102.207',
            durations: [51, 111, 66]
        }
    ];

    actionTemplates.forEach((template, templateIndex) => {
        template.durations.forEach((duration, durationIndex) => {
            const client = SERVICE_CLIENTS[(templateIndex + durationIndex) % SERVICE_CLIENTS.length];
            const actionId = buildUuid();
            const flowId = buildFlowId();
            const timestamp = isoWithinLastHours(6);
            const params = {
                CommandLine: template.command_line,
                NameRegex: template.process_name,
                ProcessPid: String(template.process_id),
                ReallyDoIt: 'true',
                ...(template.remote_ip ? { RemoteIP: template.remote_ip } : {})
            };

            docs.push({
                ...createServiceLogBase({
                    timestamp,
                    serviceDomain: 'response',
                    serviceName: 'response-service',
                    serviceComponent: 'consumer',
                    serviceEvent: 'Action Received',
                    logLevel: 'DBG',
                    endpoint: client.endpoint,
                    clientId: client.client_id,
                    user: client.user
                }),
                action_id: actionId,
                incident_id: `INC-${randomInt(10000, 99999)}`,
                threat_type: template.threat_type,
                severity: template.severity,
                response_action: template.response_action,
                response_action_key: template.response_action_key,
                response_artifact: template.response_artifact,
                response_status: 'Pending',
                response_topic: 'response-actions',
                response_consumer_group: 'response-service',
                command_line: template.command_line,
                process_name: template.process_name,
                process_id: template.process_id,
                remote_ip: template.remote_ip,
                response_params: JSON.stringify(params),
                status: 'Investigating'
            });

            docs.push({
                ...createServiceLogBase({
                    timestamp,
                    serviceDomain: 'response',
                    serviceName: 'response-service',
                    serviceComponent: 'collector',
                    serviceEvent: 'Action Executed',
                    endpoint: client.endpoint,
                    clientId: client.client_id,
                    user: client.user
                }),
                action_id: actionId,
                incident_id: `INC-${randomInt(10000, 99999)}`,
                threat_type: template.threat_type,
                severity: template.severity,
                response_action: template.response_action,
                response_action_key: template.response_action_key,
                response_artifact: template.response_artifact,
                response_status: 'Completed',
                response_topic: 'response-actions',
                response_consumer_group: 'response-service',
                response_duration_ms: duration * 1000,
                response_flow_id: flowId,
                velociraptor_address: '127.0.0.1:8001',
                command_line: template.command_line,
                process_name: template.process_name,
                process_id: template.process_id,
                remote_ip: template.remote_ip,
                response_params: JSON.stringify(params),
                velociraptor_feature: 'collected_artifacts',
                collected_artifact: template.response_artifact,
                collection_id: flowId,
                collection_created_at: timestamp,
                collection_last_active_at: isoOffset(timestamp, duration),
                collection_creator: 'detection-service',
                collection_bytes: 0,
                collection_rows: 1,
                uploaded_bytes: 0,
                files_uploaded: 0,
                request_count: 1,
                result_count: 1,
                collection_duration_seconds: Number((duration / 1000).toFixed(2)),
                collection_status: 'Completed',
                status: 'Blocked',
                action_by: 'automation'
            });
        });
    });

    return docs;
}

function generatePlaybookServiceDocs() {
    const docs = [];
    const startupClient = randomClientProfile();

    docs.push({
        ...createServiceLogBase({
            timestamp: isoWithinLastHours(5),
            serviceDomain: 'automation',
            serviceName: 'playbook-service',
            serviceComponent: 'bootstrap',
            serviceEvent: 'Service Started',
            endpoint: startupClient.endpoint,
            clientId: startupClient.client_id,
            user: startupClient.user
        }),
        service_mode: 'Policy Engine',
        default_policies: 16,
        org_overrides: 0,
        cti_enrichment_enabled: true,
        input_topic: 'threat-events',
        output_topic: 'response-actions'
    });

    const eventTemplates = [
        {
            threat_type: 'process_execution',
            severity: 'Critical',
            policy_name: 'High-Severity Malware Response',
            response_action: 'Kill Process',
            response_artifact: 'Custom.Response.KillProcess',
            cti_indicator_type: 'hash',
            cti_indicator_value: HASH_INDICATORS[0],
            remote_ip: '',
            published: true
        },
        {
            threat_type: 'network_connection',
            severity: 'High',
            policy_name: 'Suspicious Connection Block',
            response_action: 'Block IP',
            response_artifact: 'Custom.Response.BlockIP',
            cti_indicator_type: 'ip',
            cti_indicator_value: REMOTE_IPS[0],
            remote_ip: REMOTE_IPS[0],
            published: true
        },
        {
            threat_type: 'network_connection',
            severity: 'High',
            policy_name: 'Suspicious Connection Block',
            response_action: 'Block IP',
            response_artifact: 'Custom.Response.BlockIP',
            cti_indicator_type: 'ip',
            cti_indicator_value: REMOTE_IPS[1],
            remote_ip: REMOTE_IPS[1],
            published: true
        }
    ];

    eventTemplates.forEach((template, templateIndex) => {
        const client = SERVICE_CLIENTS[templateIndex % SERVICE_CLIENTS.length];
        const eventId = `${Date.now()}-${templateIndex + 1}-${client.client_id}-${template.threat_type}`;
        const timestamp = isoWithinLastHours(6);

        docs.push({
            ...createServiceLogBase({
                timestamp,
                serviceDomain: 'automation',
                serviceName: 'playbook-service',
                serviceComponent: 'pipeline',
                serviceEvent: 'Threat Event Received',
                logLevel: 'DBG',
                endpoint: client.endpoint,
                clientId: client.client_id,
                user: client.user
            }),
            event_id: eventId,
            threat_type: template.threat_type,
            severity: template.severity,
            severity_score: template.severity === 'Critical' ? 90 : 60,
            input_topic: 'threat-events',
            output_topic: 'response-actions',
            cti_indicator_type: template.cti_indicator_type,
            cti_indicator_value: template.cti_indicator_value
        });

        docs.push({
            ...createServiceLogBase({
                timestamp,
                serviceDomain: 'automation',
                serviceName: 'playbook-service',
                serviceComponent: 'pipeline',
                serviceEvent: 'CTI Lookup Failed',
                logLevel: 'WRN',
                endpoint: client.endpoint,
                clientId: client.client_id,
                user: client.user
            }),
            event_id: eventId,
            threat_type: template.threat_type,
            severity: template.severity,
            policy_name: template.policy_name,
            cti_lookup_status: 'Failed',
            cti_indicator_type: template.cti_indicator_type,
            cti_indicator_value: template.cti_indicator_value,
            cti_url: CTI_ENDPOINTS[0],
            cti_error: `request failed: Get "${CTI_ENDPOINTS[0]}?value=${template.cti_indicator_value}": dial tcp 127.0.0.1:8080: connect: connection refused`
        });

        docs.push({
            ...createServiceLogBase({
                timestamp,
                serviceDomain: 'automation',
                serviceName: 'playbook-service',
                serviceComponent: 'pipeline',
                serviceEvent: 'Action Published',
                endpoint: client.endpoint,
                clientId: client.client_id,
                user: client.user
            }),
            event_id: eventId,
            action_id: buildUuid(),
            threat_type: template.threat_type,
            severity: template.severity,
            policy_name: template.policy_name,
            playbook_result: 'Published',
            response_action: template.response_action,
            response_artifact: template.response_artifact,
            response_status: 'Pending',
            input_topic: 'threat-events',
            output_topic: 'response-actions',
            cti_lookup_status: 'Failed',
            cti_indicator_type: template.cti_indicator_type,
            cti_indicator_value: template.cti_indicator_value,
            remote_ip: template.remote_ip,
            action_by: 'automation'
        });

        docs.push({
            ...createServiceLogBase({
                timestamp,
                serviceDomain: 'automation',
                serviceName: 'playbook-service',
                serviceComponent: 'pipeline',
                serviceEvent: 'Cooldown Skipped',
                logLevel: 'DBG',
                endpoint: client.endpoint,
                clientId: client.client_id,
                user: client.user
            }),
            event_id: `${eventId}-cooldown`,
            threat_type: template.threat_type,
            severity: template.severity,
            policy_name: template.policy_name,
            playbook_result: 'Cooldown Skipped',
            cooldown_applied: true,
            cti_lookup_status: 'Failed',
            cti_indicator_type: template.cti_indicator_type,
            cti_indicator_value: template.cti_indicator_value
        });

        docs.push({
            ...createServiceLogBase({
                timestamp,
                serviceDomain: 'automation',
                serviceName: 'playbook-service',
                serviceComponent: 'pipeline',
                serviceEvent: 'No Matching Policies',
                logLevel: 'DBG',
                endpoint: client.endpoint,
                clientId: client.client_id,
                user: client.user
            }),
            event_id: `${eventId}-nomatch`,
            threat_type: template.threat_type,
            severity: template.severity,
            playbook_result: 'No Match',
            cti_lookup_status: 'Failed',
            cti_indicator_type: template.cti_indicator_type,
            cti_indicator_value: template.cti_indicator_value
        });
    });

    return docs;
}

function generateDetectionPipelineDocs() {
    const docs = [];
    const client = randomClientProfile();
    const startupTimestamp = isoWithinLastHours(3);

    docs.push({
        ...createServiceLogBase({
            timestamp: startupTimestamp,
            serviceDomain: 'pipeline',
            serviceName: 'detection-service',
            serviceComponent: 'pipeline',
            serviceEvent: 'Pipeline Started',
            endpoint: client.endpoint,
            clientId: client.client_id,
            user: client.user
        }),
        pipeline_mode: PIPELINE_MODES[0],
        detection_stage: PIPELINE_STAGES.join(' / '),
        cti_url: CTI_ENDPOINTS[1],
        memory_scan_enabled: true,
        velociraptor_address: '127.0.0.1:8001'
    });

    docs.push({
        ...createServiceLogBase({
            timestamp: startupTimestamp,
            serviceDomain: 'pipeline',
            serviceName: 'detection-service',
            serviceComponent: 'yara',
            serviceEvent: 'YARA Compiled',
            endpoint: client.endpoint,
            clientId: client.client_id,
            user: client.user
        }),
        pipeline_mode: PIPELINE_MODES[0],
        detection_stage: 'Stage 1',
        yara_rule_path: 'signatures/rules/all_rules_combined.yar',
        yara_cache_path: `/tmp/ds-yara-${randomInt(1000000000, 9999999999)}.yarc`
    });

    docs.push({
        ...createServiceLogBase({
            timestamp: startupTimestamp,
            serviceDomain: 'pipeline',
            serviceName: 'detection-service',
            serviceComponent: 'cti-syncer',
            serviceEvent: 'CTI Sync Complete',
            endpoint: client.endpoint,
            clientId: client.client_id,
            user: client.user
        }),
        cti_url: CTI_ENDPOINTS[1],
        pipeline_mode: PIPELINE_MODES[0],
        detection_stage: 'Stage 1',
        bloom_upserted: 500,
        sync_pages: 1,
        sync_interval_ms: 900000,
        bloom_filter_path: 'signatures/db/hashes.bloom'
    });

    for (let step = 1; step <= 4; step += 1) {
        docs.push({
            ...createServiceLogBase({
                timestamp: isoWithinLastHours(3),
                serviceDomain: 'pipeline',
                serviceName: 'detection-service',
                serviceComponent: 'bootstrap',
                serviceEvent: 'Bootstrap Applied',
                endpoint: client.endpoint,
                clientId: client.client_id,
                user: client.user
            }),
            pipeline_mode: PIPELINE_MODES[0],
            detection_stage: 'Stage 1',
            bootstrap_step: step,
            bootstrap_total_steps: 4
        });
    }

    MONITOR_ARTIFACTS.forEach((artifactName, index) => {
        docs.push({
            ...createServiceLogBase({
                timestamp: isoWithinLastHours(2),
                serviceDomain: 'pipeline',
                serviceName: 'detection-service',
                serviceComponent: 'monitor',
                serviceEvent: 'Monitor Polling Started',
                endpoint: SERVICE_CLIENTS[index % SERVICE_CLIENTS.length].endpoint,
                clientId: SERVICE_CLIENTS[index % SERVICE_CLIENTS.length].client_id,
                user: SERVICE_CLIENTS[index % SERVICE_CLIENTS.length].user
            }),
            artifact_name: artifactName,
            monitor_status: 'Polling',
            lookback_window_ms: 900000,
            start_time_unix_ms: Date.now() - 900000,
            pipeline_mode: PIPELINE_MODES[0],
            detection_stage: index === 2 ? 'ML' : PIPELINE_STAGES[index % PIPELINE_STAGES.length],
            cti_url: CTI_ENDPOINTS[1],
            memory_scan_enabled: true,
            velociraptor_address: '127.0.0.1:8001'
        });
    });

    docs.push({
        ...createServiceLogBase({
            timestamp: isoWithinLastHours(1),
            serviceDomain: 'pipeline',
            serviceName: 'detection-service',
            serviceComponent: 'cti-syncer',
            serviceEvent: 'CTI Sync Complete',
            endpoint: client.endpoint,
            clientId: client.client_id,
            user: client.user
        }),
        cti_url: CTI_ENDPOINTS[1],
        pipeline_mode: PIPELINE_MODES[0],
        detection_stage: 'Stage 2',
        bloom_upserted: 500,
        sync_pages: 1,
        sync_interval_ms: 900000,
        bloom_filter_path: 'signatures/db/hashes.bloom'
    });

    return docs;
}

function generateVelociraptorCollectedArtifactDocs() {
    const docs = [];
    const artifactTemplates = [
        { artifact: 'Custom.Response.BlockIP', creator: 'detection-service', durationMs: 70, rows: 1, uploadedBytes: 0, filesUploaded: 0 },
        { artifact: 'Custom.Response.BlockIP', creator: 'detection-service', durationMs: 95, rows: 1, uploadedBytes: 0, filesUploaded: 0 },
        { artifact: 'Custom.Response.KillProcess', creator: 'detection-service', durationMs: 240, rows: 1, uploadedBytes: 0, filesUploaded: 0 },
        { artifact: 'Custom.Response.QuarantineFile', creator: 'detection-service', durationMs: 180, rows: 2, uploadedBytes: 4096, filesUploaded: 1 }
    ];

    artifactTemplates.forEach((template, index) => {
        const client = SERVICE_CLIENTS[index % SERVICE_CLIENTS.length];
        const createdAt = isoWithinLastHours(6);
        const flowId = buildFlowId();

        docs.push({
            ...createServiceLogBase({
                timestamp: createdAt,
                serviceDomain: 'velociraptor',
                serviceName: 'velociraptor',
                serviceComponent: 'collected-artifacts',
                serviceEvent: 'Artifact Collected',
                endpoint: client.endpoint,
                clientId: client.client_id,
                user: client.user,
                seedProfile: 'velociraptor-views-v1'
            }),
            telemetry_source: 'Endpoint Telemetry',
            velociraptor_feature: 'collected_artifacts',
            collected_artifact: template.artifact,
            artifact_name: template.artifact,
            response_flow_id: flowId,
            collection_id: flowId,
            collection_created_at: createdAt,
            collection_last_active_at: isoOffset(createdAt, template.durationMs),
            collection_creator: template.creator,
            collection_bytes: template.uploadedBytes,
            collection_rows: template.rows,
            uploaded_bytes: template.uploadedBytes,
            files_uploaded: template.filesUploaded,
            request_count: 1,
            result_count: template.rows,
            collection_duration_seconds: Number((template.durationMs / 1000).toFixed(2)),
            collection_status: 'Completed'
        });
    });

    return docs;
}

function generateVelociraptorClientEventDocs() {
    const docs = [];
    const templates = [
        {
            clientEventName: 'Custom.Linux.Events.ProcessExecution/process_execution',
            processName: 'edr-selftest',
            exePath: '/tmp/edr-selftest',
            commandLine: '/tmp/edr-selftest 50',
            parentName: 'bash',
            parentCommandLine: '/bin/bash ./edr-selftest',
            threatType: 'process_execution',
            category: 'execution',
            severity: 'HIGH',
            severityNum: 85,
            detectionMethod: 'suspicious_exec_path',
            os: 'linux'
        },
        {
            clientEventName: 'Custom.Linux.Events.NetworkConnections/network_connection',
            processName: 'curl',
            exePath: '/usr/bin/curl',
            commandLine: 'curl -fsSL https://claude.ai/install.sh',
            parentName: 'bash',
            parentCommandLine: '/bin/bash install.sh',
            threatType: 'network_connection',
            category: 'network',
            severity: 'MEDIUM',
            severityNum: 60,
            detectionMethod: 'network_anomaly',
            os: 'linux'
        },
        {
            clientEventName: 'Custom.Windows.Events.ProcessExecution/process_execution',
            processName: 'powershell.exe',
            exePath: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
            commandLine: 'powershell.exe -EncodedCommand ZXZpbA==',
            parentName: 'explorer.exe',
            parentCommandLine: 'C:\\Windows\\explorer.exe',
            threatType: 'process_execution',
            category: 'execution',
            severity: 'HIGH',
            severityNum: 90,
            detectionMethod: 'behavior_rule',
            os: 'windows'
        }
    ];

    for (let index = 0; index < 18; index += 1) {
        const template = templates[index % templates.length];
        const client = SERVICE_CLIENTS[index % SERVICE_CLIENTS.length];
        const timestamp = isoWithinLastHours(8);
        const pid = template.processName === 'curl' ? 380067 : (template.processName === 'powershell.exe' ? 22340 : 326606);
        const ppid = pid - 19;

        docs.push({
            ...createServiceLogBase({
                timestamp,
                serviceDomain: 'velociraptor',
                serviceName: 'velociraptor',
                serviceComponent: 'client-events',
                serviceEvent: 'Client Event',
                endpoint: client.endpoint,
                clientId: client.client_id,
                user: template.os === 'linux' ? 'ed' : client.user,
                seedProfile: 'velociraptor-views-v1'
            }),
            telemetry_source: 'Endpoint Telemetry',
            velociraptor_feature: 'client_events',
            client_event_name: template.clientEventName,
            artifact_name: template.clientEventName.split('/')[0],
            hostname: client.endpoint,
            os: template.os,
            threat_type: template.threatType,
            severity: template.severity,
            severity_num: template.severityNum,
            category: template.category,
            mitre_techniques: 'T1059,T1105,T1027,T1543,T1546,T1574',
            mitre_technique: 'T1059.001',
            process_id: pid,
            parent_process_id: ppid,
            process_name: template.processName,
            exe_path: template.exePath,
            command_line: template.commandLine,
            parent_name: template.parentName,
            parent_command_line: template.parentCommandLine,
            username: template.os === 'linux' ? 'ed' : client.user,
            uid: template.os === 'linux' ? 1000 : 0,
            cwd: template.os === 'linux' ? '/tmp' : 'C:\\Users\\Public',
            detection_method: template.detectionMethod,
            event_timestamp: timestamp
        });
    }

    return docs;
}

function generateVelociraptorServerEventDocs() {
    const docs = [];
    const templates = [
        {
            serverEventName: 'Server.Events.ProcessExecution.Monitor',
            threatType: 'process_execution',
            category: 'execution',
            severity: 'HIGH',
            severityNum: 85,
            processId: 326606,
            artifactName: 'Server.Events.ProcessExecution.Monitor',
            os: 'linux'
        },
        {
            serverEventName: 'Server.Events.FileIntegrity.Monitor',
            threatType: 'file_integrity',
            category: 'integrity',
            severity: 'MEDIUM',
            severityNum: 65,
            processId: 22610,
            artifactName: 'Server.Events.FileIntegrity.Monitor',
            os: 'linux'
        },
        {
            serverEventName: 'Server.Events.NetworkConnections.Monitor',
            threatType: 'network_connection',
            category: 'network',
            severity: 'HIGH',
            severityNum: 75,
            processId: 380067,
            artifactName: 'Server.Events.NetworkConnections.Monitor',
            os: 'linux'
        }
    ];

    for (let index = 0; index < 15; index += 1) {
        const template = templates[index % templates.length];
        const client = SERVICE_CLIENTS[index % SERVICE_CLIENTS.length];
        const timestamp = isoWithinLastHours(8);

        docs.push({
            ...createServiceLogBase({
                timestamp,
                serviceDomain: 'velociraptor',
                serviceName: 'velociraptor',
                serviceComponent: 'server-events',
                serviceEvent: 'Server Event',
                endpoint: client.endpoint,
                clientId: client.client_id,
                user: client.user,
                seedProfile: 'velociraptor-views-v1'
            }),
            telemetry_source: 'Endpoint Telemetry',
            velociraptor_feature: 'server_events',
            server_event_name: template.serverEventName,
            artifact_name: template.artifactName,
            server_time: timestamp,
            event_timestamp: isoOffset(timestamp, -233),
            hostname: client.endpoint,
            os: template.os,
            threat_type: template.threatType,
            severity: template.severity,
            severity_num: template.severityNum,
            category: template.category,
            mitre_techniques: 'T1059,T1105,T1027,T1543,T1546,T1574',
            mitre_technique: 'T1059.001',
            process_id: template.processId,
            detection_method: randomItem(VELOCIRAPTOR_DETECTION_METHODS)
        });
    }

    return docs;
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};

    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}: ${text}`);
    }

    return payload;
}

async function ensureEdrSeedData() {
    const countPayload = await fetchJson(`${OPENSEARCH_URL}/${INDEX_NAME}/_count`, {
        method: 'GET'
    }).catch(() => ({ count: 0 }));

    if ((countPayload.count || 0) > 0) {
        console.log(`EDR index ${INDEX_NAME} already has ${countPayload.count} documents. Skipping seed.`);
        return;
    }

    const lines = [];
    for (let index = 0; index < 180; index += 1) {
        lines.push(JSON.stringify({ index: { _index: INDEX_NAME } }));
        lines.push(JSON.stringify(generateEdrDocument(index)));
    }

    await fetchJson(`${OPENSEARCH_URL}/_bulk?refresh=true`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-ndjson'
        },
        body: `${lines.join('\n')}\n`
    });

    console.log(`Seeded ${lines.length / 2} EDR documents into ${INDEX_NAME}.`);
}

async function ensureXcitiumFeatureSeedData() {
    const countPayload = await fetchJson(`${OPENSEARCH_URL}/${INDEX_NAME}/_count`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            query: {
                term: {
                    'seed_profile.keyword': {
                        value: 'xcitium-v2'
                    }
                }
            }
        })
    }).catch(() => ({ count: 0 }));

    if ((countPayload.count || 0) > 0) {
        console.log(`EDR index ${INDEX_NAME} already has ${countPayload.count} Xcitium-style records. Skipping feature seed.`);
        return;
    }

    const lines = [];
    for (let index = 0; index < 180; index += 1) {
        lines.push(JSON.stringify({ index: { _index: INDEX_NAME } }));
        lines.push(JSON.stringify(generateEdrDocument(index + 1000, 'xcitium-v2')));
    }

    await fetchJson(`${OPENSEARCH_URL}/_bulk?refresh=true`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-ndjson'
        },
        body: `${lines.join('\n')}\n`
    });

    console.log(`Seeded ${lines.length / 2} Xcitium-style EDR documents into ${INDEX_NAME}.`);
}

async function ensureServiceTelemetrySeedData() {
    const countPayload = await fetchJson(`${OPENSEARCH_URL}/${INDEX_NAME}/_count`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            query: {
                term: {
                    'seed_profile.keyword': {
                        value: 'xcitium-services-v1'
                    }
                }
            }
        })
    }).catch(() => ({ count: 0 }));

    if ((countPayload.count || 0) > 0) {
        console.log(`EDR index ${INDEX_NAME} already has ${countPayload.count} service telemetry records. Skipping service seed.`);
        return;
    }

    const documents = [
        ...generateResponseServiceDocs(),
        ...generatePlaybookServiceDocs(),
        ...generateDetectionPipelineDocs()
    ];

    const lines = [];
    documents.forEach((document) => {
        lines.push(JSON.stringify({ index: { _index: INDEX_NAME } }));
        lines.push(JSON.stringify(document));
    });

    await fetchJson(`${OPENSEARCH_URL}/_bulk?refresh=true`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-ndjson'
        },
        body: `${lines.join('\n')}\n`
    });

    console.log(`Seeded ${documents.length} EDR service telemetry documents into ${INDEX_NAME}.`);
}

async function ensureVelociraptorTelemetrySeedData() {
    const countPayload = await fetchJson(`${OPENSEARCH_URL}/${INDEX_NAME}/_count`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            query: {
                term: {
                    'seed_profile.keyword': {
                        value: 'velociraptor-views-v1'
                    }
                }
            }
        })
    }).catch(() => ({ count: 0 }));

    if ((countPayload.count || 0) > 0) {
        console.log(`EDR index ${INDEX_NAME} already has ${countPayload.count} Velociraptor view records. Skipping Velociraptor seed.`);
        return;
    }

    const documents = [
        ...generateVelociraptorCollectedArtifactDocs(),
        ...generateVelociraptorClientEventDocs(),
        ...generateVelociraptorServerEventDocs()
    ];

    const lines = [];
    documents.forEach((document) => {
        lines.push(JSON.stringify({ index: { _index: INDEX_NAME } }));
        lines.push(JSON.stringify(document));
    });

    await fetchJson(`${OPENSEARCH_URL}/_bulk?refresh=true`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-ndjson'
        },
        body: `${lines.join('\n')}\n`
    });

    console.log(`Seeded ${documents.length} Velociraptor telemetry documents into ${INDEX_NAME}.`);
}

async function upsertSavedObject(type, id, attributes, references = []) {
    return fetchJson(`${DASHBOARDS_URL}/api/saved_objects/${type}/${id}?overwrite=true`, {
        method: 'POST',
        headers: {
            'osd-xsrf': 'true',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            attributes,
            references
        })
    });
}

async function ensureDataView() {
    await upsertSavedObject('index-pattern', DATA_VIEW_ID, {
        title: DATA_VIEW_TITLE,
        timeFieldName: '@timestamp'
    });

    console.log(`Ensured data view ${DATA_VIEW_ID} -> ${DATA_VIEW_TITLE}.`);
}

function createMetricVisualization({ title, description, query, subtitle, metricType = 'count', field }) {
    const metricAgg = {
        id: '1',
        enabled: true,
        type: metricType,
        schema: 'metric',
        params: {}
    };

    if (field) {
        metricAgg.params.field = field;
    }

    return {
        attributes: {
            title,
            description,
            visState: JSON.stringify({
                title,
                type: 'metric',
                params: {
                    addTooltip: true,
                    addLegend: false,
                    type: 'metric',
                    metric: {
                        percentageMode: false,
                        useRanges: false,
                        colorSchema: 'Green to Red',
                        metricColorMode: 'None',
                        colorsRange: [{ from: 0, to: 10000 }],
                        labels: { show: true },
                        invertColors: false,
                        style: {
                            bgFill: '#0f172a',
                            bgColor: false,
                            labelColor: false,
                            subText: subtitle,
                            fontSize: 36
                        }
                    }
                },
                aggs: [metricAgg]
            }),
            uiStateJSON: '{}',
            version: 1,
            kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                    query: { language: 'kuery', query },
                    filter: [],
                    indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index'
                })
            }
        },
        references: [
            {
                name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                type: 'index-pattern',
                id: DATA_VIEW_ID
            }
        ]
    };
}

function createPieVisualization({ title, description, query, field, size = 8 }) {
    return {
        attributes: {
            title,
            description,
            visState: JSON.stringify({
                title,
                type: 'pie',
                params: {
                    addTooltip: true,
                    addLegend: true,
                    legendPosition: 'right',
                    isDonut: true,
                    labels: {
                        show: false,
                        values: true,
                        last_level: true,
                        truncate: 100
                    }
                },
                aggs: [
                    {
                        id: '1',
                        enabled: true,
                        type: 'count',
                        schema: 'metric',
                        params: {}
                    },
                    {
                        id: '2',
                        enabled: true,
                        type: 'terms',
                        schema: 'segment',
                        params: {
                            field,
                            size,
                            order: 'desc',
                            orderBy: '1',
                            otherBucket: false,
                            missingBucket: false
                        }
                    }
                ]
            }),
            uiStateJSON: '{}',
            version: 1,
            kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                    query: { language: 'kuery', query },
                    filter: [],
                    indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index'
                })
            }
        },
        references: [
            {
                name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                type: 'index-pattern',
                id: DATA_VIEW_ID
            }
        ]
    };
}

function createLineVisualization({ title, description, query }) {
    return {
        attributes: {
            title,
            description,
            visState: JSON.stringify({
                title,
                type: 'line',
                params: {
                    addTooltip: true,
                    addLegend: false,
                    legendPosition: 'right',
                    categoryAxes: [
                        {
                            id: 'CategoryAxis-1',
                            type: 'category',
                            position: 'bottom',
                            show: true,
                            style: {},
                            scale: { type: 'linear' },
                            labels: {
                                show: true,
                                truncate: 100
                            },
                            title: { text: 'Time' }
                        }
                    ],
                    valueAxes: [
                        {
                            id: 'ValueAxis-1',
                            name: 'LeftAxis-1',
                            type: 'value',
                            position: 'left',
                            show: true,
                            style: {},
                            scale: {
                                type: 'linear',
                                mode: 'normal'
                            },
                            labels: {
                                show: true,
                                rotate: 0,
                                filter: false,
                                truncate: 100
                            },
                            title: { text: 'Events' }
                        }
                    ],
                    seriesParams: [
                        {
                            show: true,
                            type: 'line',
                            mode: 'normal',
                            data: {
                                id: '1',
                                label: 'Events'
                            },
                            valueAxis: 'ValueAxis-1',
                            drawLinesBetweenPoints: true,
                            showCircles: true
                        }
                    ]
                },
                aggs: [
                    {
                        id: '1',
                        enabled: true,
                        type: 'count',
                        schema: 'metric',
                        params: {}
                    },
                    {
                        id: '2',
                        enabled: true,
                        type: 'date_histogram',
                        schema: 'segment',
                        params: {
                            field: '@timestamp',
                            interval: 'auto',
                            customInterval: '2h',
                            min_doc_count: 1,
                            extended_bounds: {}
                        }
                    }
                ]
            }),
            uiStateJSON: '{}',
            version: 1,
            kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                    query: { language: 'kuery', query },
                    filter: [],
                    indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index'
                })
            }
        },
        references: [
            {
                name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                type: 'index-pattern',
                id: DATA_VIEW_ID
            }
        ]
    };
}

function createSavedSearch({ title, description, query, columns }) {
    return {
        attributes: {
            title,
            description,
            columns,
            sort: ['@timestamp', 'desc'],
            kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                    query: { language: 'kuery', query },
                    filter: [],
                    indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index'
                })
            }
        },
        references: [
            {
                name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
                type: 'index-pattern',
                id: DATA_VIEW_ID
            }
        ]
    };
}

function createDashboard({ title, description, panels }) {
    const references = [];
    const panelObjects = panels.map((panel, index) => {
        const panelRefName = `panel_${index}`;
        references.push({
            name: panelRefName,
            type: panel.type,
            id: panel.id
        });

        return {
            version: '7.10.0',
            gridData: {
                x: panel.x,
                y: panel.y,
                w: panel.w,
                h: panel.h,
                i: `${index + 1}`
            },
            panelIndex: `${index + 1}`,
            embeddableConfig: {},
            panelRefName,
            type: panel.type
        };
    });

    return {
        attributes: {
            title,
            description,
            hits: 0,
            optionsJSON: JSON.stringify({
                hidePanelTitles: false,
                useMargins: true
            }),
            panelsJSON: JSON.stringify(panelObjects),
            version: 1,
            timeRestore: false,
            kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                    query: { language: 'kuery', query: '' },
                    filter: []
                })
            }
        },
        references
    };
}

const dashboardSpecs = [
    {
        id: 'edr-home',
        title: 'EDR Analysis',
        description: 'OpenSearch overview for endpoint detections, status mix, and recent activity.',
        visuals: [
            ['visualization', 'edr-home-total', createMetricVisualization({ title: 'Total Detections', description: 'All EDR detections.', query: EDR_QUERIES.home, subtitle: 'Last 48h sample' })],
            ['visualization', 'edr-home-critical', createMetricVisualization({ title: 'Critical Alerts', description: 'Critical and high-severity detections.', query: EDR_QUERIES.activeThreats, subtitle: 'Priority triage' })],
            ['visualization', 'edr-home-threats', createPieVisualization({ title: 'Threat Types', description: 'Threat-type distribution.', query: EDR_QUERIES.home, field: 'threat_type.keyword' })],
            ['visualization', 'edr-home-status', createPieVisualization({ title: 'Remediation Status', description: 'Status distribution.', query: EDR_QUERIES.home, field: 'status.keyword' })],
            ['visualization', 'edr-home-trend', createLineVisualization({ title: 'Detection Trend', description: 'Detection trend over time.', query: EDR_QUERIES.home })],
            ['search', 'edr-home-recent', createSavedSearch({ title: 'Recent Detections', description: 'Latest EDR detections.', query: EDR_QUERIES.home, columns: ['@timestamp', 'endpoint', 'threat_type', 'severity', 'status', 'process_name', 'user'] })]
        ],
        panels: [
            { type: 'visualization', id: 'edr-home-total', x: 0, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-home-critical', x: 12, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-home-threats', x: 24, y: 0, w: 12, h: 12 },
            { type: 'visualization', id: 'edr-home-status', x: 36, y: 0, w: 12, h: 12 },
            { type: 'visualization', id: 'edr-home-trend', x: 0, y: 8, w: 24, h: 12 },
            { type: 'search', id: 'edr-home-recent', x: 0, y: 20, w: 48, h: 14 }
        ]
    },
    {
        id: 'edr-endpoints',
        title: 'EDR Endpoint Status',
        description: 'Endpoint posture dashboard aligned to EDR team triage needs.',
        visuals: [
            ['visualization', 'edr-endpoints-total-alerts', createMetricVisualization({ title: 'Total Alerts', description: 'All EDR alerts visible to the endpoint team.', query: EDR_QUERIES.home, subtitle: 'Last 30 days' })],
            ['visualization', 'edr-endpoints-malware-total', createMetricVisualization({ title: 'Malware Detections', description: 'Malware-oriented detections for the endpoint team.', query: EDR_QUERIES.malware, subtitle: 'Last 30 days' })],
            ['visualization', 'edr-endpoints-devices-total', createMetricVisualization({ title: 'Total Devices', description: 'Unique endpoints seen in EDR telemetry.', query: EDR_QUERIES.endpoints, subtitle: 'Unique hosts', metricType: 'cardinality', field: 'endpoint.keyword' })],
            ['visualization', 'edr-endpoints-contained-files-total', createMetricVisualization({ title: 'Contained Files', description: 'Files seen in blocked, quarantined, or investigating states.', query: EDR_QUERIES.containedFiles, subtitle: 'Last 7 days' })],
            ['search', 'edr-endpoints-malware-by-hash', createSavedSearch({ title: 'Malware Detections By Hash', description: 'Malware detections grouped for hash review.', query: EDR_QUERIES.malware, columns: ['file_hash', 'threat_type', 'endpoint', 'severity', 'status'] })],
            ['visualization', 'edr-endpoints-alerts-by-type', createPieVisualization({ title: 'Alerts By Type', description: 'Threat-type distribution for EDR alerts.', query: EDR_QUERIES.home, field: 'threat_type.keyword' })],
            ['search', 'edr-endpoints-recent-alerts', createSavedSearch({ title: 'Most Recent Alerts', description: 'Latest EDR alerts for rapid triage.', query: EDR_QUERIES.home, columns: ['@timestamp', 'endpoint', 'threat_type', 'severity', 'status', 'user'] })],
            ['search', 'edr-endpoints-contained-files-grid', createSavedSearch({ title: 'Contained Files', description: 'Recent blocked or quarantined files.', query: EDR_QUERIES.containedFiles, columns: ['@timestamp', 'file_path', 'file_hash', 'endpoint', 'status', 'action'] })],
            ['visualization', 'edr-endpoints-alerts-by-endpoint', createPieVisualization({ title: 'Alerts By Endpoint', description: 'Endpoints with the highest alert volume.', query: EDR_QUERIES.home, field: 'endpoint.keyword' })]
        ],
        panels: [
            { type: 'visualization', id: 'edr-endpoints-total-alerts', x: 0, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-endpoints-malware-total', x: 12, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-endpoints-devices-total', x: 24, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-endpoints-contained-files-total', x: 36, y: 0, w: 12, h: 8 },
            { type: 'search', id: 'edr-endpoints-malware-by-hash', x: 0, y: 8, w: 16, h: 14 },
            { type: 'visualization', id: 'edr-endpoints-alerts-by-type', x: 16, y: 8, w: 16, h: 14 },
            { type: 'search', id: 'edr-endpoints-recent-alerts', x: 32, y: 8, w: 16, h: 14 },
            { type: 'search', id: 'edr-endpoints-contained-files-grid', x: 0, y: 22, w: 24, h: 14 },
            { type: 'visualization', id: 'edr-endpoints-alerts-by-endpoint', x: 24, y: 22, w: 24, h: 14 }
        ]
    },
    {
        id: 'edr-active-threats',
        title: 'EDR Active Threats',
        description: 'High-priority detections for immediate triage.',
        visuals: [
            ['visualization', 'edr-active-total', createMetricVisualization({ title: 'Active Threats', description: 'Critical and high-severity detections.', query: EDR_QUERIES.activeThreats, subtitle: 'High priority' })],
            ['visualization', 'edr-active-threat-type', createPieVisualization({ title: 'Threat Type Split', description: 'Threat-type split for priority alerts.', query: EDR_QUERIES.activeThreats, field: 'threat_type.keyword' })],
            ['visualization', 'edr-active-status', createPieVisualization({ title: 'Status Split', description: 'Status split for priority alerts.', query: EDR_QUERIES.activeThreats, field: 'status.keyword' })],
            ['search', 'edr-active-grid', createSavedSearch({ title: 'Active Threat Queue', description: 'Priority queue for EDR detections.', query: EDR_QUERIES.activeThreats, columns: ['@timestamp', 'severity', 'endpoint', 'threat_type', 'status', 'mitre_technique', 'process_name'] })]
        ],
        panels: [
            { type: 'visualization', id: 'edr-active-total', x: 0, y: 0, w: 16, h: 8 },
            { type: 'visualization', id: 'edr-active-threat-type', x: 16, y: 0, w: 16, h: 12 },
            { type: 'visualization', id: 'edr-active-status', x: 32, y: 0, w: 16, h: 12 },
            { type: 'search', id: 'edr-active-grid', x: 0, y: 12, w: 48, h: 16 }
        ]
    },
    {
        id: 'edr-isolation',
        title: 'EDR Host Isolation',
        description: 'Containment-focused dashboard for blocked and quarantined activity.',
        visuals: [
            ['visualization', 'edr-isolation-total', createMetricVisualization({ title: 'Containment Events', description: 'Blocked, quarantined, or investigating rows.', query: EDR_QUERIES.isolation, subtitle: 'Response events' })],
            ['visualization', 'edr-isolation-status', createPieVisualization({ title: 'Containment Status', description: 'Status distribution for containment events.', query: EDR_QUERIES.isolation, field: 'status.keyword' })],
            ['visualization', 'edr-isolation-action', createPieVisualization({ title: 'Containment Actions', description: 'Actions present in containment events.', query: EDR_QUERIES.isolation, field: 'action.keyword' })],
            ['visualization', 'edr-isolation-verdict', createPieVisualization({ title: 'Verdict Source', description: 'Sources driving containment verdicts.', query: EDR_QUERIES.isolation, field: 'verdict_source.keyword' })],
            ['search', 'edr-isolation-grid', createSavedSearch({ title: 'Isolation Activity', description: 'Isolation and containment rows.', query: EDR_QUERIES.isolation, columns: ['@timestamp', 'endpoint', 'status', 'action', 'response_action', 'response_status', 'admin_rating', 'verdict_source', 'containment_reason', 'process_name', 'file_path'] })]
        ],
        panels: [
            { type: 'visualization', id: 'edr-isolation-total', x: 0, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-isolation-status', x: 12, y: 0, w: 12, h: 12 },
            { type: 'visualization', id: 'edr-isolation-action', x: 24, y: 0, w: 12, h: 12 },
            { type: 'visualization', id: 'edr-isolation-verdict', x: 36, y: 0, w: 12, h: 12 },
            { type: 'search', id: 'edr-isolation-grid', x: 0, y: 12, w: 48, h: 18 }
        ]
    },
    {
        id: 'edr-contained-threats',
        title: 'EDR Contained Threats',
        description: 'Containment workbench for unknown and auto-contained activity.',
        visuals: [
            ['visualization', 'edr-contained-total', createMetricVisualization({ title: 'Contained Threats', description: 'Contained or auto-quarantined threat records.', query: EDR_QUERIES.containedThreats, subtitle: 'Containment queue' })],
            ['visualization', 'edr-contained-unknown', createMetricVisualization({ title: 'Unknown Verdicts', description: 'Threats still pending a final trust decision.', query: `${EDR_QUERIES.containedThreats} and xcitium_rating:"Unknown"`, subtitle: 'Needs review' })],
            ['visualization', 'edr-contained-allow', createMetricVisualization({ title: 'Allowlisted', description: 'Threats reclassified as trusted by analysts.', query: `${EDR_QUERIES.containedThreats} and admin_rating:"Trusted"`, subtitle: 'Released safely' })],
            ['visualization', 'edr-contained-block', createMetricVisualization({ title: 'Blocklisted', description: 'Contained threats finalized as malicious.', query: `${EDR_QUERIES.containedThreats} and admin_rating:"Malicious"`, subtitle: 'Escalated' })],
            ['visualization', 'edr-contained-reasons', createPieVisualization({ title: 'Containment Reasons', description: 'Why containment was triggered.', query: EDR_QUERIES.containedThreats, field: 'containment_reason.keyword' })],
            ['visualization', 'edr-contained-verdicts', createPieVisualization({ title: 'Verdict Sources', description: 'Where verdicts came from.', query: EDR_QUERIES.containedThreats, field: 'verdict_source.keyword' })],
            ['visualization', 'edr-contained-ratings', createPieVisualization({ title: 'Trust Ratings', description: 'Current trust and analyst ratings.', query: EDR_QUERIES.containedThreats, field: 'xcitium_rating.keyword' })],
            ['search', 'edr-contained-grid', createSavedSearch({ title: 'Contained Application Queue', description: 'Contained processes and files awaiting or reflecting verdicts.', query: EDR_QUERIES.containedThreats, columns: ['@timestamp', 'endpoint', 'process_name', 'file_path', 'file_hash', 'admin_rating', 'status', 'containment_reason', 'verdict_source'] })],
            ['search', 'edr-contained-actions', createSavedSearch({ title: 'Review Decisions', description: 'Analyst decisions around contained files and applications.', query: EDR_QUERIES.containedThreats, columns: ['@timestamp', 'endpoint', 'response_action', 'response_status', 'action_by', 'admin_rating', 'incident_id', 'file_hash'] })]
        ],
        panels: [
            { type: 'visualization', id: 'edr-contained-total', x: 0, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-contained-unknown', x: 12, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-contained-allow', x: 24, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-contained-block', x: 36, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-contained-reasons', x: 0, y: 8, w: 16, h: 12 },
            { type: 'visualization', id: 'edr-contained-verdicts', x: 16, y: 8, w: 16, h: 12 },
            { type: 'visualization', id: 'edr-contained-ratings', x: 32, y: 8, w: 16, h: 12 },
            { type: 'search', id: 'edr-contained-grid', x: 0, y: 20, w: 24, h: 16 },
            { type: 'search', id: 'edr-contained-actions', x: 24, y: 20, w: 24, h: 16 }
        ]
    },
    {
        id: 'edr-response-center',
        title: 'EDR Response Center',
        description: 'Endpoint response execution and playbook-driven remediation tied to remote actions.',
        visuals: [
            ['visualization', 'edr-response-total', createMetricVisualization({ title: 'Response Actions', description: 'Analyst or automated response actions.', query: EDR_QUERIES.response, subtitle: 'Action queue' })],
            ['visualization', 'edr-response-pending', createMetricVisualization({ title: 'Pending', description: 'Actions waiting for analyst completion.', query: `${EDR_QUERIES.response} and response_status:"Pending"`, subtitle: 'Needs follow-up' })],
            ['visualization', 'edr-response-completed', createMetricVisualization({ title: 'Completed', description: 'Completed response actions.', query: `${EDR_QUERIES.response} and response_status:"Completed"`, subtitle: 'Closed' })],
            ['visualization', 'edr-response-failed', createMetricVisualization({ title: 'Failed', description: 'Failed or incomplete actions.', query: `${EDR_QUERIES.response} and response_status:"Failed"`, subtitle: 'Retry / investigate' })],
            ['visualization', 'edr-response-flows', createMetricVisualization({ title: 'Action Flows', description: 'Unique execution flows launched by the response service.', query: EDR_QUERIES.responseExecuted, subtitle: 'Artifact runs', metricType: 'cardinality', field: 'response_flow_id.keyword' })],
            ['visualization', 'edr-response-types', createPieVisualization({ title: 'Action Types', description: 'Distribution of response actions.', query: EDR_QUERIES.response, field: 'response_action.keyword' })],
            ['visualization', 'edr-response-artifacts', createPieVisualization({ title: 'Response Artifacts', description: 'Response artifacts executed by the response service.', query: EDR_QUERIES.responseService, field: 'response_artifact.keyword' })],
            ['visualization', 'edr-response-policies', createPieVisualization({ title: 'Policies Triggered', description: 'Policies that published or influenced response actions.', query: EDR_QUERIES.playbookAutomation, field: 'policy_name.keyword' })],
            ['visualization', 'edr-response-owners', createPieVisualization({ title: 'Action Owners', description: 'Analysts or automation completing response actions.', query: EDR_QUERIES.response, field: 'action_by.keyword' })],
            ['search', 'edr-response-queue', createSavedSearch({ title: 'Response Queue', description: 'Primary action queue for endpoint response.', query: EDR_QUERIES.response, columns: ['@timestamp', 'service_name', 'endpoint', 'threat_type', 'response_action', 'response_status', 'policy_name', 'action_by', 'client_id', 'incident_id'] })],
            ['search', 'edr-response-detail', createSavedSearch({ title: 'Execution Details', description: 'Action-level detail for containment, execution flows, and remote parameters.', query: EDR_QUERIES.responseService, columns: ['@timestamp', 'action_id', 'response_artifact', 'response_flow_id', 'response_duration_ms', 'client_id', 'endpoint', 'command_line', 'remote_ip', 'response_params'] })],
            ['search', 'edr-response-playbook-grid', createSavedSearch({ title: 'Playbook Decisions', description: 'Policy decisions and CTI enrichment outcomes that led to response actions.', query: EDR_QUERIES.playbookAutomation, columns: ['@timestamp', 'service_event', 'event_id', 'policy_name', 'playbook_result', 'response_action', 'cti_lookup_status', 'cti_indicator_value', 'endpoint', 'client_id'] })]
        ],
        panels: [
            { type: 'visualization', id: 'edr-response-total', x: 0, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-response-pending', x: 12, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-response-completed', x: 24, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-response-failed', x: 36, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-response-flows', x: 0, y: 8, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-response-types', x: 12, y: 8, w: 12, h: 12 },
            { type: 'visualization', id: 'edr-response-artifacts', x: 24, y: 8, w: 12, h: 12 },
            { type: 'visualization', id: 'edr-response-policies', x: 36, y: 8, w: 12, h: 12 },
            { type: 'visualization', id: 'edr-response-owners', x: 0, y: 20, w: 16, h: 12 },
            { type: 'search', id: 'edr-response-queue', x: 16, y: 20, w: 32, h: 12 },
            { type: 'search', id: 'edr-response-detail', x: 0, y: 32, w: 24, h: 16 },
            { type: 'search', id: 'edr-response-playbook-grid', x: 24, y: 32, w: 24, h: 16 }
        ]
    },
    {
        id: 'edr-playbook-automation',
        title: 'EDR Playbook Automation',
        description: 'Policy engine view for threat-event intake, CTI enrichment failures, and action publication decisions.',
        visuals: [
            ['visualization', 'edr-playbook-total', createMetricVisualization({ title: 'Threat Events', description: 'Threat events observed by the playbook service.', query: EDR_QUERIES.playbookAutomation, subtitle: 'Automation input' })],
            ['visualization', 'edr-playbook-published', createMetricVisualization({ title: 'Actions Published', description: 'Playbook decisions that emitted response actions.', query: EDR_QUERIES.publishedActions, subtitle: 'Published to queue' })],
            ['visualization', 'edr-playbook-cooldown', createMetricVisualization({ title: 'Cooldown Skips', description: 'Actions suppressed by cooldown logic.', query: EDR_QUERIES.cooldownSkips, subtitle: 'Suppressed repeats' })],
            ['visualization', 'edr-playbook-cti-failures', createMetricVisualization({ title: 'CTI Failures', description: 'CTI enrichments that failed during policy evaluation.', query: `${EDR_QUERIES.playbookAutomation} and cti_lookup_status:"Failed"`, subtitle: 'Needs CTI service' })],
            ['visualization', 'edr-playbook-policies', createPieVisualization({ title: 'Policy Hits', description: 'Policies evaluated during automation.', query: EDR_QUERIES.playbookAutomation, field: 'policy_name.keyword' })],
            ['visualization', 'edr-playbook-results', createPieVisualization({ title: 'Decision Outcomes', description: 'Automation outcomes after evaluation.', query: EDR_QUERIES.playbookAutomation, field: 'playbook_result.keyword' })],
            ['visualization', 'edr-playbook-threat-types', createPieVisualization({ title: 'Threat Event Types', description: 'Threat types entering the playbook service.', query: EDR_QUERIES.playbookAutomation, field: 'threat_type.keyword' })],
            ['search', 'edr-playbook-grid', createSavedSearch({ title: 'Playbook Decision Stream', description: 'Policy decisions made by the playbook service.', query: EDR_QUERIES.playbookAutomation, columns: ['@timestamp', 'service_event', 'event_id', 'threat_type', 'severity', 'policy_name', 'playbook_result', 'response_action', 'client_id', 'endpoint'] })],
            ['search', 'edr-playbook-cti-grid', createSavedSearch({ title: 'CTI Enrichment Failures', description: 'Failed CTI lookups blocking or reducing automation confidence.', query: `${EDR_QUERIES.playbookAutomation} and cti_lookup_status:"Failed"`, columns: ['@timestamp', 'event_id', 'policy_name', 'cti_indicator_type', 'cti_indicator_value', 'cti_error', 'endpoint', 'client_id'] })]
        ],
        panels: [
            { type: 'visualization', id: 'edr-playbook-total', x: 0, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-playbook-published', x: 12, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-playbook-cooldown', x: 24, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-playbook-cti-failures', x: 36, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-playbook-policies', x: 0, y: 8, w: 16, h: 12 },
            { type: 'visualization', id: 'edr-playbook-results', x: 16, y: 8, w: 16, h: 12 },
            { type: 'visualization', id: 'edr-playbook-threat-types', x: 32, y: 8, w: 16, h: 12 },
            { type: 'search', id: 'edr-playbook-grid', x: 0, y: 20, w: 24, h: 16 },
            { type: 'search', id: 'edr-playbook-cti-grid', x: 24, y: 20, w: 24, h: 16 }
        ]
    },
    {
        id: 'edr-detection-pipeline',
        title: 'EDR Detection Pipeline',
        description: 'Operational health dashboard for the detection service, YARA compilation, CTI sync, and monitor polling.',
        visuals: [
            ['visualization', 'edr-pipeline-total', createMetricVisualization({ title: 'Pipeline Events', description: 'Operational detection-service telemetry.', query: EDR_QUERIES.detectionPipeline, subtitle: 'Detection service' })],
            ['visualization', 'edr-pipeline-artifacts', createMetricVisualization({ title: 'Monitored Artifacts', description: 'Unique artifacts being polled.', query: EDR_QUERIES.detectionPipeline, subtitle: 'Artifact coverage', metricType: 'cardinality', field: 'artifact_name.keyword' })],
            ['visualization', 'edr-pipeline-cti-syncs', createMetricVisualization({ title: 'CTI Sync Jobs', description: 'Completed CTI sync cycles.', query: `${EDR_QUERIES.detectionPipeline} and service_event:"CTI Sync Complete"`, subtitle: 'Bloom refreshed' })],
            ['visualization', 'edr-pipeline-bootstrap', createMetricVisualization({ title: 'Bootstrap Steps', description: 'Bootstrap detection queries applied on startup.', query: `${EDR_QUERIES.detectionPipeline} and service_event:"Bootstrap Applied"`, subtitle: 'Startup steps' })],
            ['visualization', 'edr-pipeline-components', createPieVisualization({ title: 'Pipeline Components', description: 'Detection-service components emitting telemetry.', query: EDR_QUERIES.detectionPipeline, field: 'service_component.keyword' })],
            ['visualization', 'edr-pipeline-monitor-artifacts', createPieVisualization({ title: 'Monitor Artifacts', description: 'Artifacts actively monitored by the detection pipeline.', query: `${EDR_QUERIES.detectionPipeline} and artifact_name:*`, field: 'artifact_name.keyword' })],
            ['visualization', 'edr-pipeline-stages', createPieVisualization({ title: 'Stage Coverage', description: 'Detection stages represented in service telemetry.', query: `${EDR_QUERIES.detectionPipeline} and detection_stage:*`, field: 'detection_stage.keyword' })],
            ['search', 'edr-pipeline-ops-grid', createSavedSearch({ title: 'Pipeline Operations', description: 'Detection service runtime, CTI sync, and YARA compilation events.', query: EDR_QUERIES.detectionPipeline, columns: ['@timestamp', 'service_event', 'service_component', 'pipeline_mode', 'detection_stage', 'cti_url', 'memory_scan_enabled', 'service_status'] })],
            ['search', 'edr-pipeline-monitor-grid', createSavedSearch({ title: 'Monitor Polling Status', description: 'Detailed monitor state and startup telemetry for artifact collection.', query: EDR_QUERIES.detectionPipeline, columns: ['@timestamp', 'artifact_name', 'monitor_status', 'lookback_window_ms', 'start_time_unix_ms', 'bootstrap_step', 'bloom_upserted', 'yara_cache_path'] })]
        ],
        panels: [
            { type: 'visualization', id: 'edr-pipeline-total', x: 0, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-pipeline-artifacts', x: 12, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-pipeline-cti-syncs', x: 24, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-pipeline-bootstrap', x: 36, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-pipeline-components', x: 0, y: 8, w: 16, h: 12 },
            { type: 'visualization', id: 'edr-pipeline-monitor-artifacts', x: 16, y: 8, w: 16, h: 12 },
            { type: 'visualization', id: 'edr-pipeline-stages', x: 32, y: 8, w: 16, h: 12 },
            { type: 'search', id: 'edr-pipeline-ops-grid', x: 0, y: 20, w: 24, h: 16 },
            { type: 'search', id: 'edr-pipeline-monitor-grid', x: 24, y: 20, w: 24, h: 16 }
        ]
    },
    {
        id: 'edr-collected-artifacts',
        title: 'EDR Collected Artifacts',
        description: 'Collected-artifact view for response flows, artifact results, and collection metadata.',
        visuals: [
            ['visualization', 'edr-collected-total', createMetricVisualization({ title: 'Collected Artifacts', description: 'Collections completed for EDR actions.', query: EDR_QUERIES.collectedArtifacts, subtitle: 'Artifact runs' })],
            ['visualization', 'edr-collected-flows', createMetricVisualization({ title: 'Unique Flows', description: 'Distinct collection flow identifiers.', query: EDR_QUERIES.collectedArtifacts, subtitle: 'Flow coverage', metricType: 'cardinality', field: 'response_flow_id.keyword' })],
            ['visualization', 'edr-collected-rows', createMetricVisualization({ title: 'Total Rows', description: 'Rows returned by collected artifacts.', query: EDR_QUERIES.collectedArtifacts, subtitle: 'Result rows', metricType: 'sum', field: 'collection_rows' })],
            ['visualization', 'edr-collected-status', createPieVisualization({ title: 'Collection Status', description: 'Status of collected artifact runs.', query: EDR_QUERIES.collectedArtifacts, field: 'collection_status.keyword' })],
            ['visualization', 'edr-collected-artifact-split', createPieVisualization({ title: 'Artifact Types', description: 'Artifacts collected through remote actions.', query: EDR_QUERIES.collectedArtifacts, field: 'collected_artifact.keyword' })],
            ['visualization', 'edr-collected-creators', createPieVisualization({ title: 'Collection Creators', description: 'Services or users that launched collections.', query: EDR_QUERIES.collectedArtifacts, field: 'collection_creator.keyword' })],
            ['search', 'edr-collected-grid', createSavedSearch({ title: 'Collected Artifact Queue', description: 'Flow-level artifact collections and their metadata.', query: EDR_QUERIES.collectedArtifacts, columns: ['response_flow_id', 'collected_artifact', 'collection_created_at', 'collection_last_active_at', 'collection_creator', 'collection_bytes', 'collection_rows', 'collection_status', 'client_id', 'endpoint'] })],
            ['search', 'edr-collected-details', createSavedSearch({ title: 'Artifact Collection Details', description: 'Detailed collection results, request counts, upload totals, and durations.', query: EDR_QUERIES.collectedArtifacts, columns: ['@timestamp', 'collection_id', 'response_flow_id', 'request_count', 'result_count', 'uploaded_bytes', 'files_uploaded', 'collection_duration_seconds', 'user'] })]
        ],
        panels: [
            { type: 'visualization', id: 'edr-collected-total', x: 0, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-collected-flows', x: 12, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-collected-rows', x: 24, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-collected-status', x: 36, y: 0, w: 12, h: 12 },
            { type: 'visualization', id: 'edr-collected-artifact-split', x: 0, y: 8, w: 18, h: 12 },
            { type: 'visualization', id: 'edr-collected-creators', x: 18, y: 8, w: 18, h: 12 },
            { type: 'search', id: 'edr-collected-grid', x: 0, y: 20, w: 24, h: 16 },
            { type: 'search', id: 'edr-collected-details', x: 24, y: 20, w: 24, h: 16 }
        ]
    },
    {
        id: 'edr-client-events',
        title: 'EDR Client Events',
        description: 'Client-event view for process execution and endpoint telemetry collected directly from hosts.',
        visuals: [
            ['visualization', 'edr-client-total', createMetricVisualization({ title: 'Client Events', description: 'Client events sent by monitored endpoints.', query: EDR_QUERIES.clientEvents, subtitle: 'Endpoint telemetry' })],
            ['visualization', 'edr-client-hosts', createMetricVisualization({ title: 'Unique Clients', description: 'Distinct clients reporting events.', query: EDR_QUERIES.clientEvents, subtitle: 'Reporting clients', metricType: 'cardinality', field: 'client_id.keyword' })],
            ['visualization', 'edr-client-processes', createMetricVisualization({ title: 'Unique Processes', description: 'Distinct process names seen in client events.', query: EDR_QUERIES.clientEvents, subtitle: 'Observed binaries', metricType: 'cardinality', field: 'process_name.keyword' })],
            ['visualization', 'edr-client-threat-types', createPieVisualization({ title: 'Threat Types', description: 'Threat types detected in client events.', query: EDR_QUERIES.clientEvents, field: 'threat_type.keyword' })],
            ['visualization', 'edr-client-detection-method', createPieVisualization({ title: 'Detection Methods', description: 'Detection methods attached to client event rows.', query: EDR_QUERIES.clientEvents, field: 'detection_method.keyword' })],
            ['visualization', 'edr-client-trend', createLineVisualization({ title: 'Client Event Trend', description: 'Client event volume over time.', query: EDR_QUERIES.clientEvents })],
            ['search', 'edr-client-grid', createSavedSearch({ title: 'Client Event Stream', description: 'Client event rows captured from monitored endpoints.', query: EDR_QUERIES.clientEvents, columns: ['@timestamp', 'client_event_name', 'threat_type', 'severity', 'category', 'mitre_techniques', 'process_id', 'parent_process_id', 'process_name', 'exe_path', 'command_line', 'client_id'] })],
            ['search', 'edr-client-details', createSavedSearch({ title: 'Client Event Details', description: 'Detailed process, parent, user, and working-directory context for client events.', query: EDR_QUERIES.clientEvents, columns: ['@timestamp', 'process_name', 'exe_path', 'command_line', 'parent_name', 'parent_command_line', 'username', 'uid', 'cwd', 'detection_method', 'hostname', 'os'] })]
        ],
        panels: [
            { type: 'visualization', id: 'edr-client-total', x: 0, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-client-hosts', x: 12, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-client-processes', x: 24, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-client-threat-types', x: 36, y: 0, w: 12, h: 12 },
            { type: 'visualization', id: 'edr-client-detection-method', x: 0, y: 8, w: 16, h: 12 },
            { type: 'visualization', id: 'edr-client-trend', x: 16, y: 8, w: 32, h: 12 },
            { type: 'search', id: 'edr-client-grid', x: 0, y: 20, w: 24, h: 16 },
            { type: 'search', id: 'edr-client-details', x: 24, y: 20, w: 24, h: 16 }
        ]
    },
    {
        id: 'edr-server-events',
        title: 'EDR Server Events',
        description: 'Server-event view for process execution, file integrity, and network monitor outputs.',
        visuals: [
            ['visualization', 'edr-server-total', createMetricVisualization({ title: 'Server Events', description: 'Server events received by the EDR backend.', query: EDR_QUERIES.serverEvents, subtitle: 'Server monitor feed' })],
            ['visualization', 'edr-server-artifacts', createMetricVisualization({ title: 'Server Artifacts', description: 'Unique server-side monitor artifacts.', query: EDR_QUERIES.serverEvents, subtitle: 'Monitor coverage', metricType: 'cardinality', field: 'server_event_name.keyword' })],
            ['visualization', 'edr-server-high', createMetricVisualization({ title: 'High Severity', description: 'High-severity server event rows.', query: `${EDR_QUERIES.serverEvents} and severity:"HIGH"`, subtitle: 'Triage focus' })],
            ['visualization', 'edr-server-event-split', createPieVisualization({ title: 'Server Event Types', description: 'Distribution of server event artifacts.', query: EDR_QUERIES.serverEvents, field: 'server_event_name.keyword' })],
            ['visualization', 'edr-server-category', createPieVisualization({ title: 'Event Categories', description: 'Execution, network, and integrity categories from server events.', query: EDR_QUERIES.serverEvents, field: 'category.keyword' })],
            ['visualization', 'edr-server-hosts', createPieVisualization({ title: 'Hostnames', description: 'Hosts contributing to server event activity.', query: EDR_QUERIES.serverEvents, field: 'hostname.keyword' })],
            ['search', 'edr-server-grid', createSavedSearch({ title: 'Server Event Stream', description: 'Server event timeline and monitor rows from the endpoint telemetry pipeline.', query: EDR_QUERIES.serverEvents, columns: ['server_time', 'event_timestamp', 'client_id', 'hostname', 'os', 'threat_type', 'severity', 'severity_num', 'category', 'mitre_techniques', 'process_id', 'server_event_name'] })],
            ['search', 'edr-server-details', createSavedSearch({ title: 'Server Event Details', description: 'Detailed server-event context including detection method and originating artifact.', query: EDR_QUERIES.serverEvents, columns: ['@timestamp', 'server_event_name', 'artifact_name', 'detection_method', 'endpoint', 'client_id', 'hostname', 'os', 'mitre_technique', 'user'] })]
        ],
        panels: [
            { type: 'visualization', id: 'edr-server-total', x: 0, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-server-artifacts', x: 12, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-server-high', x: 24, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-server-event-split', x: 36, y: 0, w: 12, h: 12 },
            { type: 'visualization', id: 'edr-server-category', x: 0, y: 8, w: 16, h: 12 },
            { type: 'visualization', id: 'edr-server-hosts', x: 16, y: 8, w: 16, h: 12 },
            { type: 'search', id: 'edr-server-grid', x: 0, y: 20, w: 28, h: 16 },
            { type: 'search', id: 'edr-server-details', x: 28, y: 20, w: 20, h: 16 }
        ]
    },
    {
        id: 'edr-malware',
        title: 'EDR Malware Analysis',
        description: 'Malware-centric dashboard with file and severity pivots.',
        visuals: [
            ['visualization', 'edr-malware-total', createMetricVisualization({ title: 'Malware Events', description: 'Malware-tagged detections.', query: EDR_QUERIES.malware, subtitle: 'Malware family focus' })],
            ['visualization', 'edr-malware-threats', createPieVisualization({ title: 'Malware Family Split', description: 'Threat type split for malware detections.', query: EDR_QUERIES.malware, field: 'threat_type.keyword' })],
            ['visualization', 'edr-malware-severity', createPieVisualization({ title: 'Malware Severity', description: 'Severity split for malware detections.', query: EDR_QUERIES.malware, field: 'severity.keyword' })],
            ['search', 'edr-malware-grid', createSavedSearch({ title: 'Malware Detections', description: 'Malware-oriented EDR rows.', query: EDR_QUERIES.malware, columns: ['@timestamp', 'threat_type', 'file_hash', 'file_path', 'endpoint', 'severity', 'status', 'admin_rating', 'response_action', 'download_url'] })]
        ],
        panels: [
            { type: 'visualization', id: 'edr-malware-total', x: 0, y: 0, w: 16, h: 8 },
            { type: 'visualization', id: 'edr-malware-threats', x: 16, y: 0, w: 16, h: 12 },
            { type: 'visualization', id: 'edr-malware-severity', x: 32, y: 0, w: 16, h: 12 },
            { type: 'search', id: 'edr-malware-grid', x: 0, y: 12, w: 48, h: 16 }
        ]
    },
    {
        id: 'edr-hash-intelligence',
        title: 'EDR Hash Intelligence',
        description: 'Hash-centric investigation dashboard for recurring binaries, spread, and block decisions.',
        visuals: [
            ['visualization', 'edr-hash-unique', createMetricVisualization({ title: 'Unique Hashes', description: 'Distinct file hashes seen in EDR telemetry.', query: EDR_QUERIES.hashIntel, subtitle: 'Hash inventory', metricType: 'cardinality', field: 'file_hash.keyword' })],
            ['visualization', 'edr-hash-blocked', createMetricVisualization({ title: 'Blocked Hashes', description: 'Hash block actions taken by analysts or automation.', query: `${EDR_QUERIES.hashIntel} and response_action:"Block Hash"`, subtitle: 'Global prevention' })],
            ['visualization', 'edr-hash-malicious', createMetricVisualization({ title: 'Malicious Verdicts', description: 'Hashes with malicious analyst verdicts.', query: `${EDR_QUERIES.hashIntel} and admin_rating:"Malicious"`, subtitle: 'Confirmed bad' })],
            ['visualization', 'edr-hash-endpoints', createMetricVisualization({ title: 'Affected Endpoints', description: 'Unique endpoints touched by hashed files.', query: EDR_QUERIES.hashIntel, subtitle: 'Spread scope', metricType: 'cardinality', field: 'endpoint.keyword' })],
            ['visualization', 'edr-hash-top', createPieVisualization({ title: 'Top Recurring Hashes', description: 'Most frequently observed hashes.', query: EDR_QUERIES.hashIntel, field: 'file_hash.keyword', size: 6 })],
            ['visualization', 'edr-hash-threats', createPieVisualization({ title: 'Threat Families', description: 'Threat families associated with file hashes.', query: EDR_QUERIES.hashIntel, field: 'threat_type.keyword' })],
            ['visualization', 'edr-hash-response', createPieVisualization({ title: 'Hash Action Split', description: 'Action split for hashed files.', query: EDR_QUERIES.hashIntel, field: 'response_action.keyword' })],
            ['search', 'edr-hash-grid', createSavedSearch({ title: 'Hash Intelligence Stream', description: 'Primary hash investigation stream.', query: EDR_QUERIES.hashIntel, columns: ['@timestamp', 'file_hash', 'endpoint', 'threat_type', 'severity', 'admin_rating', 'response_action', 'incident_id'] })],
            ['search', 'edr-hash-trajectory', createSavedSearch({ title: 'Hash Trajectory', description: 'Execution, source, and spread detail for hashed binaries.', query: EDR_QUERIES.hashIntel, columns: ['@timestamp', 'file_hash', 'endpoint', 'process_name', 'parent_process_hash', 'file_path', 'download_url', 'response_status', 'action_by'] })]
        ],
        panels: [
            { type: 'visualization', id: 'edr-hash-unique', x: 0, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-hash-blocked', x: 12, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-hash-malicious', x: 24, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-hash-endpoints', x: 36, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-hash-top', x: 0, y: 8, w: 16, h: 12 },
            { type: 'visualization', id: 'edr-hash-threats', x: 16, y: 8, w: 16, h: 12 },
            { type: 'visualization', id: 'edr-hash-response', x: 32, y: 8, w: 16, h: 12 },
            { type: 'search', id: 'edr-hash-grid', x: 0, y: 20, w: 24, h: 16 },
            { type: 'search', id: 'edr-hash-trajectory', x: 24, y: 20, w: 24, h: 16 }
        ]
    },
    {
        id: 'edr-process-tree',
        title: 'EDR Process Tree',
        description: 'Process lineage and execution activity for endpoint investigations.',
        visuals: [
            ['visualization', 'edr-process-total', createMetricVisualization({ title: 'Process Events', description: 'Process-oriented detections.', query: EDR_QUERIES.processTree, subtitle: 'Execution telemetry' })],
            ['visualization', 'edr-process-endpoints', createMetricVisualization({ title: 'Affected Endpoints', description: 'Unique endpoints with process activity.', query: EDR_QUERIES.processTree, subtitle: 'Unique hosts', metricType: 'cardinality', field: 'endpoint.keyword' })],
            ['visualization', 'edr-process-actions', createPieVisualization({ title: 'Process Actions', description: 'Action split for process activity.', query: EDR_QUERIES.processTree, field: 'action.keyword' })],
            ['visualization', 'edr-process-parents', createPieVisualization({ title: 'Parent Processes', description: 'Top parent processes.', query: EDR_QUERIES.processTree, field: 'parent_process.keyword' })],
            ['visualization', 'edr-process-children', createPieVisualization({ title: 'Spawned Processes', description: 'Most common process names observed.', query: EDR_QUERIES.processTree, field: 'process_name.keyword' })],
            ['visualization', 'edr-process-trend', createLineVisualization({ title: 'Process Execution Trend', description: 'Process activity trend over time.', query: EDR_QUERIES.processTree })],
            ['search', 'edr-process-grid', createSavedSearch({ title: 'Process Activity', description: 'Process lineage rows.', query: EDR_QUERIES.processTree, columns: ['@timestamp', 'endpoint', 'parent_process', 'process_name', 'process_id', 'command_line', 'user', 'action', 'status', 'severity'] })],
            ['search', 'edr-process-action-details', createSavedSearch({ title: 'Action Details', description: 'Detailed execution and response context for each process event.', query: EDR_QUERIES.processTree, columns: ['@timestamp', 'action', 'endpoint', 'process_name', 'parent_process', 'process_id', 'command_line', 'file_path', 'user', 'status', 'severity', 'threat_type', 'mitre_technique'] })]
        ],
        panels: [
            { type: 'visualization', id: 'edr-process-total', x: 0, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-process-endpoints', x: 12, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-process-actions', x: 24, y: 0, w: 12, h: 12 },
            { type: 'visualization', id: 'edr-process-parents', x: 36, y: 0, w: 12, h: 12 },
            { type: 'visualization', id: 'edr-process-children', x: 0, y: 8, w: 16, h: 12 },
            { type: 'visualization', id: 'edr-process-trend', x: 16, y: 12, w: 32, h: 12 },
            { type: 'search', id: 'edr-process-grid', x: 0, y: 20, w: 48, h: 14 },
            { type: 'search', id: 'edr-process-action-details', x: 0, y: 34, w: 48, h: 16 }
        ]
    },
    {
        id: 'edr-file-integrity',
        title: 'EDR File Integrity',
        description: 'File creation, modification, and deletion activity across endpoints.',
        visuals: [
            ['visualization', 'edr-file-total', createMetricVisualization({ title: 'File Events', description: 'File integrity-related rows.', query: EDR_QUERIES.fileIntegrity, subtitle: 'File activity' })],
            ['visualization', 'edr-file-actions', createPieVisualization({ title: 'File Actions', description: 'File action distribution.', query: EDR_QUERIES.fileIntegrity, field: 'action.keyword' })],
            ['visualization', 'edr-file-status', createPieVisualization({ title: 'File Status', description: 'Status distribution for file events.', query: EDR_QUERIES.fileIntegrity, field: 'status.keyword' })],
            ['search', 'edr-file-grid', createSavedSearch({ title: 'File Integrity Stream', description: 'File-related EDR rows.', query: EDR_QUERIES.fileIntegrity, columns: ['@timestamp', 'endpoint', 'action', 'file_path', 'file_hash', 'status', 'process_name'] })]
        ],
        panels: [
            { type: 'visualization', id: 'edr-file-total', x: 0, y: 0, w: 16, h: 8 },
            { type: 'visualization', id: 'edr-file-actions', x: 16, y: 0, w: 16, h: 12 },
            { type: 'visualization', id: 'edr-file-status', x: 32, y: 0, w: 16, h: 12 },
            { type: 'search', id: 'edr-file-grid', x: 0, y: 12, w: 48, h: 16 }
        ]
    },
    {
        id: 'edr-hunting',
        title: 'EDR Threat Hunting',
        description: 'Global hunting dashboard for endpoint telemetry.',
        visuals: [
            ['visualization', 'edr-hunting-total', createMetricVisualization({ title: 'Huntable Events', description: 'All EDR telemetry for hunting.', query: EDR_QUERIES.hunting, subtitle: 'Hunt scope' })],
            ['visualization', 'edr-hunting-threats', createPieVisualization({ title: 'Threat Mix', description: 'Threat distribution across hunting scope.', query: EDR_QUERIES.hunting, field: 'threat_type.keyword' })],
            ['visualization', 'edr-hunting-status', createPieVisualization({ title: 'Status Mix', description: 'Status distribution across hunting scope.', query: EDR_QUERIES.hunting, field: 'status.keyword' })],
            ['visualization', 'edr-hunting-trend', createLineVisualization({ title: 'Hunting Trend', description: 'Telemetry volume over time.', query: EDR_QUERIES.hunting })],
            ['search', 'edr-hunting-grid', createSavedSearch({ title: 'Hunting Stream', description: 'Raw EDR telemetry for hunting.', query: EDR_QUERIES.hunting, columns: ['@timestamp', 'endpoint', 'threat_type', 'severity', 'status', 'process_name', 'command_line', 'file_hash'] })]
        ],
        panels: [
            { type: 'visualization', id: 'edr-hunting-total', x: 0, y: 0, w: 12, h: 8 },
            { type: 'visualization', id: 'edr-hunting-threats', x: 12, y: 0, w: 12, h: 12 },
            { type: 'visualization', id: 'edr-hunting-status', x: 24, y: 0, w: 12, h: 12 },
            { type: 'visualization', id: 'edr-hunting-trend', x: 36, y: 0, w: 12, h: 12 },
            { type: 'search', id: 'edr-hunting-grid', x: 0, y: 12, w: 48, h: 16 }
        ]
    }
];

async function provisionDashboards() {
    for (const spec of dashboardSpecs) {
        for (const [type, id, payload] of spec.visuals) {
            await upsertSavedObject(type, id, payload.attributes, payload.references);
        }

        const dashboardPayload = createDashboard({
            title: spec.title,
            description: spec.description,
            panels: spec.panels
        });
        await upsertSavedObject('dashboard', spec.id, dashboardPayload.attributes, dashboardPayload.references);
        console.log(`Provisioned dashboard ${spec.id}.`);
    }
}

async function main() {
    await ensureEdrSeedData();
    await ensureXcitiumFeatureSeedData();
    await ensureServiceTelemetrySeedData();
    await ensureVelociraptorTelemetrySeedData();
    await ensureDataView();
    await provisionDashboards();
    console.log('EDR OpenSearch provisioning complete.');
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
