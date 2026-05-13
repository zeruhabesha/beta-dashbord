import React, { useEffect, useState } from 'react';
import {
    Activity,
    AlertCircle,
    CheckCircle2,
    ChevronRight,
    Database,
    Edit,
    FileText,
    Info,
    Layers,
    Network,
    Plus,
    RefreshCw,
    Save,
    Shield,
    Trash2,
    X,
    Zap
} from 'lucide-react';
import { DataTable } from '../Common/DataTable';
import { Input as UiInput } from '@/components/ui/input';
import { Textarea as UiTextarea } from '@/components/ui/textarea';
import {
    Select as UiSelect,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    createNamespace,
    createNetworkAttachmentDefinition,
    createTenantResource,
    deleteTenantResource,
    getNamespace,
    getNetworkAttachmentDefinition,
    getKubernetesVersion,
    listNamespaces,
    listNetworkAttachmentDefinitions,
    listStorageClasses,
    listTenantResources,
    replaceNetworkAttachmentDefinition,
    replaceTenantResource
} from '../../api/kubernetes';

function createDefaultIpsNetworking() {
    return {
        attachmentMode: 'global',
        networkAttachments: ['', ''],
        staticIP: '',
        globalAttachments: {
            wan: 'global-wan',
            lan: 'global-lan'
        },
        specificAttachments: {
            namespace: '',
            wan: {
                name: 'macvlan-conf-wan',
                bridge: 'br0',
                range: '192.168.1.0/24',
                rangeStart: '192.168.1.10',
                rangeEnd: '192.168.1.100'
            },
            lan: {
                name: 'macvlan-conf-lan',
                bridge: 'br1',
                range: '10.0.1.0/24',
                rangeStart: '',
                rangeEnd: ''
            }
        }
    };
}

const DEFAULT_FORM_DATA = {
    tenantId: '',
    suricata: {
        mode: 'IDS',
        replicas: 2,
        image: 'jasonish/suricata:latest',
        ruleSets: ['emerging-threats.rules'],
        resources: { cpu: '500m', memory: '1Gi', cpuLimit: '2', memoryLimit: '4Gi' },
        config: { homeNet: '10.0.0.0/8', externalNet: '!$HOME_NET' },
        ipsNetworking: createDefaultIpsNetworking(),
        autoScaling: { enabled: false, minReplicas: 1, maxReplicas: 10, targetCPUUtilizationPercentage: 70 },
        mlEnforcement: {
            enabled: false,
            image: 'tesfuman/suricata-ctrl:latest',
            mlTopic: '',
            auditTopic: '',
            minConfidence: 0.8,
            maxBlockDurationHours: 48,
            deduplicationWindowSeconds: 300
        }
    },
    zeek: {
        replicas: 1,
        image: 'zeek/zeek:latest',
        policyScripts: ['conn-analysis.zeek'],
        resources: { cpu: '500m', memory: '1Gi', cpuLimit: '1', memoryLimit: '2Gi' },
        config: { interface: 'eth0', logRotation: '1h', enableFileExtraction: false }
    },
    logging: {
        kafkaBootstrapServers: 'kafka.kafka.svc.cluster.local:9092',
        kafkaTopic: '',
        logLevel: 'info',
        bufferSize: 10000,
        enableJSON: true,
        retentionDays: 30
    },
    network: {
        ingressCIDR: '0.0.0.0/0',
        egressCIDR: '0.0.0.0/0',
        enableNetworkPolicies: true,
        isolationMode: 'strict',
        allowedNamespaces: ['monitoring', 'kafka']
    },
    storage: {
        enablePVC: true,
        size: '5Gi',
        storageClassName: '',
        accessMode: 'ReadWriteOnce'
    }
};

const TABS = [
    { id: 'general', label: 'General', icon: Layers },
    { id: 'suricata', label: 'Suricata', icon: Shield },
    { id: 'zeek', label: 'Zeek', icon: Activity },
    { id: 'ml', label: 'ML Enforcement', icon: Zap },
    { id: 'logging', label: 'Logging', icon: FileText },
    { id: 'network', label: 'Network', icon: Network },
    { id: 'storage', label: 'Storage', icon: Database }
];

const LOG_LEVEL_OPTIONS = [
    { value: 'debug', label: 'Debug' },
    { value: 'info', label: 'Info' },
    { value: 'warn', label: 'Warning' },
    { value: 'error', label: 'Error' }
];

const ISOLATION_OPTIONS = [
    { value: 'strict', label: 'Strict' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'disabled', label: 'Disabled' }
];

const ACCESS_MODE_OPTIONS = [
    { value: 'ReadWriteOnce', label: 'ReadWriteOnce' },
    { value: 'ReadOnlyMany', label: 'ReadOnlyMany' },
    { value: 'ReadWriteMany', label: 'ReadWriteMany' }
];

function cloneValue(value) {
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
}

function mergeDeep(target, source) {
    const next = cloneValue(target);
    Object.entries(source || {}).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            next[key] = cloneValue(value);
        } else if (value && typeof value === 'object') {
            next[key] = mergeDeep(next[key] || {}, value);
        } else {
            next[key] = value;
        }
    });
    return next;
}

function createEmptyForm() {
    return cloneValue(DEFAULT_FORM_DATA);
}

function normalizePhase(phase) {
    const value = (phase || '').toLowerCase();
    if (!value) return 'Pending';
    if (['ready', 'running', 'active', 'healthy'].includes(value)) return 'Running';
    if (['creating', 'pending', 'progressing', 'reconciling'].includes(value)) return 'Pending';
    if (['failed', 'error', 'degraded'].includes(value)) return 'Failed';
    return phase || 'Unknown';
}

function formatTime(value) {
    if (!value) return 'Just now';
    const timestamp = new Date(value);
    return Number.isNaN(timestamp.getTime()) ? value : timestamp.toLocaleString();
}

function linesToArray(value) {
    return value.split('\n').map((item) => item.trim()).filter(Boolean);
}

function arrayToLines(value) {
    return (value || []).join('\n');
}

function buildTenantNamespaceName(tenantId, resource = null) {
    const existingNamespace = resource?.status?.namespaceName;
    if (existingNamespace && existingNamespace !== 'Not created') {
        return existingNamespace;
    }

    const trimmed = tenantId.trim();
    return trimmed ? `tenant-${trimmed}` : '';
}

function splitAttachmentReference(reference) {
    const trimmed = (reference || '').trim();
    if (!trimmed) {
        return { namespace: '', name: '' };
    }

    const separatorIndex = trimmed.indexOf('/');
    if (separatorIndex === -1) {
        return { namespace: '', name: trimmed };
    }

    return {
        namespace: trimmed.slice(0, separatorIndex),
        name: trimmed.slice(separatorIndex + 1)
    };
}

function parseNadConfig(rawConfig) {
    if (!rawConfig) return null;
    try {
        return JSON.parse(rawConfig);
    } catch (_error) {
        return null;
    }
}

function applyNadConfigDefaults(target, resource) {
    const config = parseNadConfig(resource?.spec?.config);
    if (!config) {
        return target;
    }

    return {
        ...target,
        bridge: config.bridge || target.bridge,
        range: config.ipam?.range || target.range,
        rangeStart: config.ipam?.range_start || '',
        rangeEnd: config.ipam?.range_end || ''
    };
}

function buildNadLookup(resources = []) {
    return resources.reduce((lookup, resource) => {
        const namespace = resource.metadata?.namespace || 'default';
        const name = resource.metadata?.name;
        if (name) {
            lookup.set(`${namespace}/${name}`, resource);
        }
        return lookup;
    }, new Map());
}

function getSpecificNadNamespace(formData, resource = null) {
    return formData.suricata.ipsNetworking?.specificAttachments?.namespace?.trim()
        || buildTenantNamespaceName(formData.tenantId, resource);
}

function buildIpsAttachmentReferences(formData, resource = null) {
    const ipsNetworking = formData.suricata.ipsNetworking || createDefaultIpsNetworking();

    if (ipsNetworking.attachmentMode === 'specific') {
        const namespace = getSpecificNadNamespace(formData, resource);
        const tenantNamespace = buildTenantNamespaceName(formData.tenantId, resource);
        const references = [
            ipsNetworking.specificAttachments?.wan?.name?.trim() || '',
            ipsNetworking.specificAttachments?.lan?.name?.trim() || ''
        ];

        return references.map((name) => {
            if (!name) return '';
            if (!namespace || namespace === tenantNamespace) return name;
            return `${namespace}/${name}`;
        });
    }

    return [
        ipsNetworking.globalAttachments?.wan?.trim() ? `default/${ipsNetworking.globalAttachments.wan.trim()}` : '',
        ipsNetworking.globalAttachments?.lan?.trim() ? `default/${ipsNetworking.globalAttachments.lan.trim()}` : ''
    ];
}

function buildNetworkAttachmentDefinitionManifest(namespace, name, attachment) {
    const ipam = {
        type: 'whereabouts',
        range: attachment.range.trim()
    };

    if (attachment.rangeStart.trim()) {
        ipam.range_start = attachment.rangeStart.trim();
    }

    if (attachment.rangeEnd.trim()) {
        ipam.range_end = attachment.rangeEnd.trim();
    }

    return {
        apiVersion: 'k8s.cni.cncf.io/v1',
        kind: 'NetworkAttachmentDefinition',
        metadata: {
            name: name.trim(),
            namespace
        },
        spec: {
            config: JSON.stringify({
                cniVersion: '0.3.1',
                type: 'bridge',
                bridge: attachment.bridge.trim(),
                ipam
            })
        }
    };
}

function normalizeTenant(resource) {
    const spec = resource.spec || {};
    const status = resource.status || {};
    const suricataStatus = status.suricataStatus || {};
    const normalizedStatus = normalizePhase(status.phase);
    const hasNamespace = Boolean(status.namespaceName);

    return {
        name: resource.metadata?.name || spec.tenantId,
        tenantId: spec.tenantId || resource.metadata?.name || 'unknown',
        mode: spec.suricata?.mode || 'IDS',
        status: normalizedStatus,
        rawPhase: status.phase || 'Awaiting operator',
        replicas: spec.suricata?.replicas ?? 0,
        readyReplicas: suricataStatus.readyReplicas ?? suricataStatus.ReadyReplicas ?? 0,
        ml: spec.suricata?.mlEnforcement?.enabled ? 'Enabled' : 'Disabled',
        namespaceName: status.namespaceName || 'Not created',
        hasNamespace,
        createdAt: resource.metadata?.creationTimestamp,
        resource
    };
}

function formFromResource(resource, nadResources = []) {
    const next = mergeDeep(createEmptyForm(), resource.spec || {});
    next.tenantId = resource.spec?.tenantId || resource.metadata?.name || '';
    next.suricata.ipsNetworking = mergeDeep(createDefaultIpsNetworking(), next.suricata.ipsNetworking || {});

    const ipsNetworking = resource.spec?.suricata?.ipsNetworking;
    if (ipsNetworking) {
        const nadLookup = buildNadLookup(nadResources);
        const tenantNamespace = buildTenantNamespaceName(next.tenantId, resource);
        const [wanReference = '', lanReference = ''] = ipsNetworking.networkAttachments || [];
        const wanAttachment = splitAttachmentReference(wanReference);
        const lanAttachment = splitAttachmentReference(lanReference);
        const selectedNamespace =
            wanAttachment.namespace
            || lanAttachment.namespace
            || tenantNamespace;

        if (selectedNamespace && selectedNamespace !== 'default') {
            next.suricata.ipsNetworking.attachmentMode = 'specific';
            next.suricata.ipsNetworking.specificAttachments.namespace = selectedNamespace;
            next.suricata.ipsNetworking.specificAttachments.wan.name = wanAttachment.name || next.suricata.ipsNetworking.specificAttachments.wan.name;
            next.suricata.ipsNetworking.specificAttachments.lan.name = lanAttachment.name || next.suricata.ipsNetworking.specificAttachments.lan.name;

            const wanResource = nadLookup.get(`${selectedNamespace}/${wanAttachment.name}`);
            const lanResource = nadLookup.get(`${selectedNamespace}/${lanAttachment.name}`);
            next.suricata.ipsNetworking.specificAttachments.wan = applyNadConfigDefaults(next.suricata.ipsNetworking.specificAttachments.wan, wanResource);
            next.suricata.ipsNetworking.specificAttachments.lan = applyNadConfigDefaults(next.suricata.ipsNetworking.specificAttachments.lan, lanResource);
        } else {
            next.suricata.ipsNetworking.attachmentMode = 'global';
            next.suricata.ipsNetworking.globalAttachments.wan = wanAttachment.name || next.suricata.ipsNetworking.globalAttachments.wan;
            next.suricata.ipsNetworking.globalAttachments.lan = lanAttachment.name || next.suricata.ipsNetworking.globalAttachments.lan;
        }

        next.suricata.ipsNetworking.networkAttachments = [wanReference, lanReference];
    }

    return next;
}

function buildManifest(formData, existingResource = null) {
    const spec = cloneValue(formData);
    spec.tenantId = formData.tenantId.trim();
    spec.suricata.ruleSets = spec.suricata.ruleSets.filter(Boolean);
    spec.zeek.policyScripts = spec.zeek.policyScripts.filter(Boolean);
    spec.network.allowedNamespaces = spec.network.allowedNamespaces.filter(Boolean);

    if (spec.suricata.mode === 'IPS') {
        spec.suricata.ipsNetworking = {
            networkAttachments: buildIpsAttachmentReferences(formData, existingResource)
                .map((attachment) => attachment.trim())
                .filter(Boolean)
                .slice(0, 2),
            staticIP: spec.suricata.ipsNetworking?.staticIP?.trim() || ''
        };
    } else {
        delete spec.suricata.ipsNetworking;
    }

    return {
        apiVersion: 'ids.betatech.com/v1alpha1',
        kind: 'TenantIDS',
        metadata: {
            name: existingResource?.metadata?.name || spec.tenantId,
            ...(existingResource?.metadata?.resourceVersion ? { resourceVersion: existingResource.metadata.resourceVersion } : {})
        },
        spec
    };
}

function validateForm(formData) {
    if (!formData.tenantId.trim()) return 'Tenant ID is required.';
    if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(formData.tenantId.trim())) {
        return 'Tenant ID must use lowercase letters, numbers, and dashes only.';
    }
    if (formData.tenantId.trim().length > 63) return 'Tenant ID must be 63 characters or fewer.';

    if (formData.suricata.mode === 'IPS') {
        const ipsNetworking = formData.suricata.ipsNetworking || createDefaultIpsNetworking();

        if (ipsNetworking.attachmentMode === 'specific') {
            const namespace = getSpecificNadNamespace(formData);
            if (!namespace) return 'Specific NAD mode requires a target namespace or tenant ID.';

            const requiredSpecificFields = [
                ['WAN NAD name', ipsNetworking.specificAttachments?.wan?.name],
                ['WAN bridge', ipsNetworking.specificAttachments?.wan?.bridge],
                ['WAN CIDR range', ipsNetworking.specificAttachments?.wan?.range],
                ['LAN NAD name', ipsNetworking.specificAttachments?.lan?.name],
                ['LAN bridge', ipsNetworking.specificAttachments?.lan?.bridge],
                ['LAN CIDR range', ipsNetworking.specificAttachments?.lan?.range]
            ];

            const missingField = requiredSpecificFields.find(([, value]) => !String(value || '').trim());
            if (missingField) {
                return `IPS specific NAD mode requires ${missingField[0]}.`;
            }
        } else {
            const attachments = [
                ipsNetworking.globalAttachments?.wan?.trim(),
                ipsNetworking.globalAttachments?.lan?.trim()
            ].filter(Boolean);
            if (attachments.length !== 2) {
                return 'IPS global NAD mode requires both WAN and LAN shared attachments.';
            }
        }
    }

    return '';
}

const FormField = ({ label, description, children }) => (
    <div className="space-y-2">
        <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-text-main">{label}</label>
            {description && (
                <div className="group relative">
                    <Info size={14} className="cursor-help text-text-muted" />
                    <div className="absolute left-full top-0 z-10 ml-2 hidden w-56 rounded-lg border border-border-subtle bg-bg-card p-2 text-[11px] text-text-muted group-hover:block">
                        {description}
                    </div>
                </div>
            )}
        </div>
        {children}
    </div>
);

const EMPTY_SELECT_VALUE = '__empty__';

const Input = ({ className = '', ...props }) => (
    <UiInput
        {...props}
        className={`glass-panel h-10 rounded-lg ${className}`}
    />
);

const TextArea = ({ className = '', ...props }) => (
    <UiTextarea
        {...props}
        className={`glass-panel min-h-28 rounded-lg ${className}`}
    />
);

const Select = ({ options, className = '', value, onChange, disabled }) => {
    const selectedValue = value === '' ? EMPTY_SELECT_VALUE : value;

    return (
        <UiSelect
            value={selectedValue}
            disabled={disabled}
            onValueChange={(nextValue) => {
                onChange?.({ target: { value: nextValue === EMPTY_SELECT_VALUE ? '' : nextValue } });
            }}
        >
            <SelectTrigger className={`glass-panel h-10 rounded-lg ${className}`}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    {options.map((option) => (
                        <SelectItem key={option.value || EMPTY_SELECT_VALUE} value={option.value === '' ? EMPTY_SELECT_VALUE : option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </UiSelect>
    );
};

const Toggle = ({ enabled, onChange, label }) => (
    <button type="button" onClick={() => onChange(!enabled)} className="flex items-center gap-3 group">
        <div className={`relative h-6 w-11 rounded-full transition-all duration-300 ${enabled ? 'bg-neutral-950 dark:bg-white' : 'bg-neutral-300 border border-border-subtle group-hover:bg-neutral-400 dark:bg-neutral-800 dark:group-hover:bg-neutral-700'}`}>
            <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all duration-300 ${enabled ? 'left-6' : 'left-1'}`} />
        </div>
        {label && <span className="text-sm font-medium text-text-muted transition-colors group-hover:text-text-main">{label}</span>}
    </button>
);

const SectionHeader = ({ title, icon: Icon, description }) => (
    <div className="mb-6 flex items-center gap-3 border-b border-border-subtle/30 pb-4">
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-2 dark:border-white/10 dark:bg-white/10">
            <Icon size={20} className="text-neutral-950 dark:text-white" />
        </div>
        <div>
            <h3 className="text-lg font-bold text-text-main">{title}</h3>
            <p className="text-xs text-text-muted">{description}</p>
        </div>
    </div>
);

const StatCard = ({ label, value, subtext }) => (
    <div className="glass-panel glass-panel-hover rounded-2xl p-5 transform transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group">
        <div className="absolute inset-0 bg-white/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
        <div className="relative z-10">
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-text-accent text-neon">{label}</div>
            <div className="mt-3 text-4xl font-extrabold text-white text-neon">{value}</div>
            {subtext && <div className="mt-3 text-xs text-text-muted/80">{subtext}</div>}
        </div>
    </div>
);

export function Tenants() {
    const [view, setView] = useState('list');
    const [activeTab, setActiveTab] = useState('general');
    const [formData, setFormData] = useState(createEmptyForm);
    const [tenants, setTenants] = useState([]);
    const [namespaces, setNamespaces] = useState([]);
    const [networkAttachmentDefinitions, setNetworkAttachmentDefinitions] = useState([]);
    const [storageClasses, setStorageClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitBusy, setSubmitBusy] = useState(false);
    const [deleteName, setDeleteName] = useState('');
    const [pageError, setPageError] = useState('');
    const [referenceError, setReferenceError] = useState('');
    const [submitError, setSubmitError] = useState('');
    const [submitMessage, setSubmitMessage] = useState('');
    const [selectedResource, setSelectedResource] = useState(null);
    const [clusterVersion, setClusterVersion] = useState('');
    const [lastSyncedAt, setLastSyncedAt] = useState('');

    const isEditMode = view === 'edit';

    const setValue = (path, value) => {
        setFormData((previous) => {
            const next = cloneValue(previous);
            let cursor = next;
            for (let index = 0; index < path.length - 1; index += 1) {
                cursor = cursor[path[index]];
            }
            cursor[path[path.length - 1]] = value;
            return next;
        });
    };

    const loadReferenceData = async () => {
        const [storageClassResult, namespaceResult, nadResult] = await Promise.allSettled([
            listStorageClasses(),
            listNamespaces(),
            listNetworkAttachmentDefinitions()
        ]);

        if (storageClassResult.status === 'fulfilled') {
            setStorageClasses((storageClassResult.value.items || []).map((item) => item.metadata?.name).filter(Boolean));
        } else {
            setStorageClasses([]);
        }

        if (namespaceResult.status === 'fulfilled') {
            setNamespaces((namespaceResult.value.items || []).map((item) => item.metadata?.name).filter(Boolean));
        } else {
            setNamespaces([]);
        }

        if (nadResult.status === 'fulfilled') {
            setNetworkAttachmentDefinitions(nadResult.value.items || []);
        } else {
            setNetworkAttachmentDefinitions([]);
        }

        const unavailableResources = [];
        if (namespaceResult.status === 'rejected') unavailableResources.push('namespaces');
        if (nadResult.status === 'rejected') unavailableResources.push('NetworkAttachmentDefinitions');
        setReferenceError(unavailableResources.length ? `Unable to load live ${unavailableResources.join(' and ')} from Kubernetes.` : '');
    };

    const loadTenants = async (showSpinner = true) => {
        if (showSpinner) setLoading(true);
        try {
            const [version, payload] = await Promise.all([
                getKubernetesVersion().catch(() => null),
                listTenantResources()
            ]);
            setClusterVersion(version?.gitVersion || '');
            setTenants((payload.items || []).map(normalizeTenant));
            setLastSyncedAt(new Date().toISOString());
            setPageError('');
        } catch (error) {
            setPageError(error.message || 'Failed to load tenant resources from Kubernetes.');
        } finally {
            if (showSpinner) setLoading(false);
        }
    };

    useEffect(() => {
        loadTenants();
        loadReferenceData();

        const intervalId = setInterval(() => {
            loadTenants(false);
            loadReferenceData();
        }, 15000);

        return () => clearInterval(intervalId);
    }, []);

    const openCreate = () => {
        setView('create');
        setActiveTab('general');
        setSelectedResource(null);
        setFormData(createEmptyForm());
        setSubmitError('');
        setSubmitMessage('');
    };

    const openEdit = (tenant) => {
        setView('edit');
        setActiveTab('general');
        setSelectedResource(tenant.resource);
        setFormData(formFromResource(tenant.resource, networkAttachmentDefinitions));
        setSubmitError('');
        setSubmitMessage('');
    };

    const closeForm = () => {
        setView('list');
        setSelectedResource(null);
        setSubmitError('');
    };

    const ensureNamespaceExists = async (namespaceName) => {
        try {
            await getNamespace(namespaceName);
        } catch (error) {
            if (!/not found|404/i.test(error.message || '')) {
                throw error;
            }

            try {
                await createNamespace({
                    apiVersion: 'v1',
                    kind: 'Namespace',
                    metadata: {
                        name: namespaceName
                    }
                });
            } catch (createError) {
                if (!/already exists|409/i.test(createError.message || '')) {
                    throw createError;
                }
            }
        }
    };

    const upsertSpecificNetworkAttachmentDefinition = async (namespaceName, attachment) => {
        const attachmentName = attachment.name.trim();
        const manifest = buildNetworkAttachmentDefinitionManifest(namespaceName, attachmentName, attachment);

        try {
            const existing = await getNetworkAttachmentDefinition(namespaceName, attachmentName);
            manifest.metadata.resourceVersion = existing.metadata?.resourceVersion;
            return replaceNetworkAttachmentDefinition(namespaceName, attachmentName, manifest);
        } catch (error) {
            if (/not found|404/i.test(error.message || '')) {
                return createNetworkAttachmentDefinition(namespaceName, manifest);
            }
            throw error;
        }
    };

    const handleSubmit = async () => {
        const validationError = validateForm(formData);
        if (validationError) {
            setSubmitError(validationError);
            setActiveTab('general');
            return;
        }

        setSubmitBusy(true);
        setSubmitError('');
        try {
            let nadMessage = '';

            if (formData.suricata.mode === 'IPS' && formData.suricata.ipsNetworking.attachmentMode === 'specific') {
                const specificNamespace = getSpecificNadNamespace(formData, selectedResource);
                await ensureNamespaceExists(specificNamespace);
                await Promise.all([
                    upsertSpecificNetworkAttachmentDefinition(specificNamespace, formData.suricata.ipsNetworking.specificAttachments.wan),
                    upsertSpecificNetworkAttachmentDefinition(specificNamespace, formData.suricata.ipsNetworking.specificAttachments.lan)
                ]);
                nadMessage = ` Created or updated WAN/LAN NADs in namespace ${specificNamespace}.`;
            }

            const manifest = buildManifest(formData, selectedResource);
            if (isEditMode && selectedResource) {
                await replaceTenantResource(selectedResource.metadata.name, manifest);
                setSubmitMessage(`Updated TenantIDS resource ${formData.tenantId}.${nadMessage}`);
            } else {
                await createTenantResource(manifest);
                setSubmitMessage(`Submitted TenantIDS resource ${formData.tenantId}.${nadMessage} Waiting for operator reconciliation.`);
            }
            await loadTenants(false);
            await loadReferenceData();
            closeForm();
        } catch (error) {
            setSubmitError(error.message || 'Failed to save tenant resource.');
        } finally {
            setSubmitBusy(false);
        }
    };

    const handleDelete = async (tenant) => {
        if (!window.confirm(`Delete tenant "${tenant.tenantId}" from Kubernetes?`)) return;
        setDeleteName(tenant.name);
        try {
            await deleteTenantResource(tenant.name);
            await loadTenants(false);
            setSubmitMessage(`Deleted tenant ${tenant.tenantId}.`);
        } catch (error) {
            setPageError(error.message || `Failed to delete ${tenant.tenantId}.`);
        } finally {
            setDeleteName('');
        }
    };

    const totalTenants = tenants.length;
    const runningTenants = tenants.filter((tenant) => tenant.status === 'Running').length;
    const pendingTenants = tenants.filter((tenant) => tenant.status === 'Pending').length;
    const mlEnabledTenants = tenants.filter((tenant) => tenant.ml === 'Enabled').length;

    const columns = [
        {
            key: 'tenantId',
            label: 'Tenant ID',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-primary-400">{value}</div>
                    <div className={`text-xs ${row.hasNamespace ? 'text-text-muted' : 'text-text-main'}`}>{row.namespaceName}</div>
                </div>
            )
        },
        {
            key: 'mode',
            label: 'Mode',
            render: (value) => (
                <span className={`rounded border px-2 py-0.5 text-xs font-medium ${value === 'IPS' ? 'border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-black' : 'border-neutral-300 bg-neutral-100 text-neutral-950 dark:border-neutral-700 dark:bg-black dark:text-white'}`}>
                    {value}
                </span>
            )
        },
        {
            key: 'status',
            label: 'Status',
            render: (value, row) => (
                <div className="flex items-center gap-3">
                    <div className="relative flex h-3 w-3">
                        {value === 'Running' && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neutral-300 opacity-75"></span>}
                        <span className={`relative inline-flex h-3 w-3 rounded-full ${value === 'Running' ? 'bg-white' : value === 'Failed' ? 'bg-neutral-200' : 'bg-neutral-500'}`}></span>
                    </div>
                    <div>
                        <div className="font-semibold text-text-main">{value}</div>
                        <div className="text-[10px] uppercase tracking-wider text-text-muted">{row.rawPhase}</div>
                    </div>
                </div>
            )
        },
        {
            key: 'replicas',
            label: 'Replicas',
            render: (value, row) => (
                <div>
                    <div>{value}</div>
                    <div className="text-xs text-text-muted">Ready: {row.readyReplicas}</div>
                </div>
            )
        },
        {
            key: 'ml',
            label: 'ML Enforcement',
            render: (value) => <span className={`text-xs ${value === 'Enabled' ? 'text-text-main' : 'text-text-muted'}`}>{value}</span>
        },
        {
            key: 'createdAt',
            label: 'Observed',
            render: (value) => <span className="text-xs text-text-muted">{formatTime(value)}</span>
        }
    ];

    const listFields = {
        suricataRules: arrayToLines(formData.suricata.ruleSets),
        zeekPolicies: arrayToLines(formData.zeek.policyScripts),
        allowedNamespaces: arrayToLines(formData.network.allowedNamespaces)
    };

    const tenantNamespaceName = buildTenantNamespaceName(formData.tenantId, selectedResource);
    const selectedSpecificNamespace = getSpecificNadNamespace(formData, selectedResource);
    const defaultNamespaceNads = networkAttachmentDefinitions
        .filter((resource) => resource.metadata?.namespace === 'default')
        .map((resource) => resource.metadata?.name)
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right));
    const specificNamespaceNads = networkAttachmentDefinitions
        .filter((resource) => resource.metadata?.namespace === selectedSpecificNamespace)
        .map((resource) => resource.metadata?.name)
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right));
    const namespaceSuggestions = Array.from(new Set(['default', tenantNamespaceName, ...namespaces].filter(Boolean))).sort((left, right) => left.localeCompare(right));
    const previewAttachments = formData.suricata.mode === 'IPS'
        ? buildIpsAttachmentReferences(formData, selectedResource).filter(Boolean)
        : [];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <div className="space-y-8">
                        <SectionHeader title="Tenant Identity" icon={Layers} description="Create or update a cluster-scoped TenantIDS custom resource." />
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <FormField label="Tenant ID [REQUIRED]" description="Maps to spec.tenantId and defaults metadata.name.">
                                <Input value={formData.tenantId} disabled={isEditMode} placeholder="e.g. acme-corp" onChange={(event) => setValue(['tenantId'], event.target.value)} />
                            </FormField>
                            <FormField label="Operational Mode" description="Use IDS for passive inspection or IPS for inline prevention.">
                                <div className="flex rounded-lg border border-border-subtle/50 bg-bg-body p-1">
                                    {['IDS', 'IPS'].map((mode) => (
                                        <button
                                            key={mode}
                                            type="button"
                                            onClick={() => setValue(['suricata', 'mode'], mode)}
                                            className={`flex-1 rounded-md py-2 text-xs font-bold transition-colors ${formData.suricata.mode === mode ? 'bg-neutral-950 text-white dark:bg-white dark:text-black' : 'text-text-muted hover:text-text-main'}`}
                                        >
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                            </FormField>
                        </div>
                        {formData.suricata.mode === 'IPS' && (
                            <div className="space-y-6">
                                <FormField label="NAD Scope" description="Choose shared global NADs from the default namespace or create tenant-specific NADs before deploying IPS.">
                                    <div className="grid grid-cols-1 gap-3 rounded-xl border border-border-subtle/50 bg-bg-body p-1 sm:grid-cols-2">
                                        {[
                                            { value: 'global', label: 'Global Shared NADs' },
                                            { value: 'specific', label: 'Specific NAD Namespace' }
                                        ].map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => setValue(['suricata', 'ipsNetworking', 'attachmentMode'], option.value)}
                                                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${formData.suricata.ipsNetworking.attachmentMode === option.value ? 'bg-neutral-950 text-white dark:bg-white dark:text-black' : 'text-text-muted hover:text-text-main'}`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </FormField>

                                {referenceError && (
                                    <div className="rounded-xl border border-neutral-300 bg-neutral-100 p-3 text-xs text-neutral-950 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white">
                                        {referenceError}
                                    </div>
                                )}

                                {formData.suricata.ipsNetworking.attachmentMode === 'global' ? (
                                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                        <FormField label="Shared NAD Namespace" description="Global/shared NADs are referenced from the default namespace.">
                                            <Input value="default" disabled />
                                        </FormField>
                                        <div className="rounded-xl border border-border-subtle bg-bg-body p-4 text-xs text-text-muted">
                                            Use existing shared `NetworkAttachmentDefinition` objects such as `default/global-wan` and `default/global-lan`.
                                        </div>
                                        <FormField label="WAN Attachment" description="Reference an existing shared NAD name from the default namespace.">
                                            <Input
                                                list="global-nad-options"
                                                value={formData.suricata.ipsNetworking.globalAttachments.wan}
                                                placeholder="global-wan"
                                                onChange={(event) => setValue(['suricata', 'ipsNetworking', 'globalAttachments', 'wan'], event.target.value)}
                                            />
                                        </FormField>
                                        <FormField label="LAN Attachment" description="Reference an existing shared NAD name from the default namespace.">
                                            <Input
                                                list="global-nad-options"
                                                value={formData.suricata.ipsNetworking.globalAttachments.lan}
                                                placeholder="global-lan"
                                                onChange={(event) => setValue(['suricata', 'ipsNetworking', 'globalAttachments', 'lan'], event.target.value)}
                                            />
                                        </FormField>
                                        <datalist id="global-nad-options">
                                            {defaultNamespaceNads.map((name) => (
                                                <option key={name} value={name} />
                                            ))}
                                        </datalist>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                            <FormField label="Target NAD Namespace" description="The dashboard will create or update WAN/LAN NADs in this namespace before submitting the TenantIDS resource.">
                                                <Input
                                                    list="nad-namespace-options"
                                                    value={formData.suricata.ipsNetworking.specificAttachments.namespace}
                                                    placeholder={tenantNamespaceName || 'tenant-<tenant-id>'}
                                                    onChange={(event) => setValue(['suricata', 'ipsNetworking', 'specificAttachments', 'namespace'], event.target.value)}
                                                />
                                            </FormField>
                                            <div className="rounded-xl border border-border-subtle bg-bg-body p-4 text-xs text-text-muted">
                                                {selectedSpecificNamespace
                                                    ? `Specific IPS mode will create or update NADs in ${selectedSpecificNamespace}. If that namespace does not exist yet, the dashboard will create it first.`
                                                    : 'Specific IPS mode defaults to the tenant namespace pattern `tenant-<tenant-id>` once a tenant ID is provided.'}
                                            </div>
                                        </div>
                                        <datalist id="nad-namespace-options">
                                            {namespaceSuggestions.map((namespace) => (
                                                <option key={namespace} value={namespace} />
                                            ))}
                                        </datalist>

                                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                            <div className="space-y-4 rounded-2xl border border-border-subtle bg-bg-body/50 p-5">
                                                <div>
                                                    <div className="text-sm font-semibold text-text-main">WAN NAD</div>
                                                    <div className="mt-1 text-xs text-text-muted">Creates the external-facing `NetworkAttachmentDefinition` bridge/IPAM config.</div>
                                                </div>
                                                <FormField label="Name">
                                                    <Input
                                                        list="specific-nad-options"
                                                        value={formData.suricata.ipsNetworking.specificAttachments.wan.name}
                                                        placeholder="macvlan-conf-wan"
                                                        onChange={(event) => setValue(['suricata', 'ipsNetworking', 'specificAttachments', 'wan', 'name'], event.target.value)}
                                                    />
                                                </FormField>
                                                <FormField label="Bridge">
                                                    <Input
                                                        value={formData.suricata.ipsNetworking.specificAttachments.wan.bridge}
                                                        placeholder="br0"
                                                        onChange={(event) => setValue(['suricata', 'ipsNetworking', 'specificAttachments', 'wan', 'bridge'], event.target.value)}
                                                    />
                                                </FormField>
                                                <FormField label="CIDR Range">
                                                    <Input
                                                        value={formData.suricata.ipsNetworking.specificAttachments.wan.range}
                                                        placeholder="192.168.1.0/24"
                                                        onChange={(event) => setValue(['suricata', 'ipsNetworking', 'specificAttachments', 'wan', 'range'], event.target.value)}
                                                    />
                                                </FormField>
                                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                    <FormField label="Range Start (Optional)">
                                                        <Input
                                                            value={formData.suricata.ipsNetworking.specificAttachments.wan.rangeStart}
                                                            placeholder="192.168.1.10"
                                                            onChange={(event) => setValue(['suricata', 'ipsNetworking', 'specificAttachments', 'wan', 'rangeStart'], event.target.value)}
                                                        />
                                                    </FormField>
                                                    <FormField label="Range End (Optional)">
                                                        <Input
                                                            value={formData.suricata.ipsNetworking.specificAttachments.wan.rangeEnd}
                                                            placeholder="192.168.1.100"
                                                            onChange={(event) => setValue(['suricata', 'ipsNetworking', 'specificAttachments', 'wan', 'rangeEnd'], event.target.value)}
                                                        />
                                                    </FormField>
                                                </div>
                                            </div>

                                            <div className="space-y-4 rounded-2xl border border-border-subtle bg-bg-body/50 p-5">
                                                <div>
                                                    <div className="text-sm font-semibold text-text-main">LAN NAD</div>
                                                    <div className="mt-1 text-xs text-text-muted">Creates the internal-facing `NetworkAttachmentDefinition` bridge/IPAM config.</div>
                                                </div>
                                                <FormField label="Name">
                                                    <Input
                                                        list="specific-nad-options"
                                                        value={formData.suricata.ipsNetworking.specificAttachments.lan.name}
                                                        placeholder="macvlan-conf-lan"
                                                        onChange={(event) => setValue(['suricata', 'ipsNetworking', 'specificAttachments', 'lan', 'name'], event.target.value)}
                                                    />
                                                </FormField>
                                                <FormField label="Bridge">
                                                    <Input
                                                        value={formData.suricata.ipsNetworking.specificAttachments.lan.bridge}
                                                        placeholder="br1"
                                                        onChange={(event) => setValue(['suricata', 'ipsNetworking', 'specificAttachments', 'lan', 'bridge'], event.target.value)}
                                                    />
                                                </FormField>
                                                <FormField label="CIDR Range">
                                                    <Input
                                                        value={formData.suricata.ipsNetworking.specificAttachments.lan.range}
                                                        placeholder="10.0.1.0/24"
                                                        onChange={(event) => setValue(['suricata', 'ipsNetworking', 'specificAttachments', 'lan', 'range'], event.target.value)}
                                                    />
                                                </FormField>
                                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                    <FormField label="Range Start (Optional)">
                                                        <Input
                                                            value={formData.suricata.ipsNetworking.specificAttachments.lan.rangeStart}
                                                            placeholder="10.0.1.10"
                                                            onChange={(event) => setValue(['suricata', 'ipsNetworking', 'specificAttachments', 'lan', 'rangeStart'], event.target.value)}
                                                        />
                                                    </FormField>
                                                    <FormField label="Range End (Optional)">
                                                        <Input
                                                            value={formData.suricata.ipsNetworking.specificAttachments.lan.rangeEnd}
                                                            placeholder="10.0.1.100"
                                                            onChange={(event) => setValue(['suricata', 'ipsNetworking', 'specificAttachments', 'lan', 'rangeEnd'], event.target.value)}
                                                        />
                                                    </FormField>
                                                </div>
                                            </div>
                                        </div>

                                        <datalist id="specific-nad-options">
                                            {specificNamespaceNads.map((name) => (
                                                <option key={name} value={name} />
                                            ))}
                                        </datalist>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                    <FormField label="Static IP (Optional)" description="When set, the first/WAN attachment receives this Whereabouts-managed IP.">
                                        <Input value={formData.suricata.ipsNetworking.staticIP} placeholder="192.168.1.50/24" onChange={(event) => setValue(['suricata', 'ipsNetworking', 'staticIP'], event.target.value)} />
                                    </FormField>
                                    <div className="rounded-xl border border-border-subtle bg-bg-body p-4 text-xs text-text-muted">
                                        <div className="font-semibold text-text-main">Resolved Attachment References</div>
                                        <div className="mt-2 space-y-1">
                                            {previewAttachments.length > 0 ? previewAttachments.map((attachment) => (
                                                <div key={attachment}>{attachment}</div>
                                            )) : <div>Provide WAN/LAN details to generate the exact `spec.suricata.ipsNetworking.networkAttachments` values.</div>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'suricata':
                return (
                    <div className="space-y-8">
                        <SectionHeader title="Suricata Engine" icon={Shield} description="Maps directly to spec.suricata." />
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <FormField label="Replicas">
                                <Input type="number" min="0" max="20" value={formData.suricata.replicas} onChange={(event) => setValue(['suricata', 'replicas'], Number(event.target.value))} />
                            </FormField>
                            <FormField label="Image">
                                <Input value={formData.suricata.image} onChange={(event) => setValue(['suricata', 'image'], event.target.value)} />
                            </FormField>
                            <FormField label="HOME_NET">
                                <Input value={formData.suricata.config.homeNet} onChange={(event) => setValue(['suricata', 'config', 'homeNet'], event.target.value)} />
                            </FormField>
                            <FormField label="EXTERNAL_NET">
                                <Input value={formData.suricata.config.externalNet} onChange={(event) => setValue(['suricata', 'config', 'externalNet'], event.target.value)} />
                            </FormField>
                        </div>
                        <FormField label="Rule Sets (one per line)">
                            <TextArea value={listFields.suricataRules} onChange={(event) => setValue(['suricata', 'ruleSets'], linesToArray(event.target.value))} />
                        </FormField>
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <FormField label="CPU Request">
                                <Input value={formData.suricata.resources.cpu} onChange={(event) => setValue(['suricata', 'resources', 'cpu'], event.target.value)} />
                            </FormField>
                            <FormField label="Memory Request">
                                <Input value={formData.suricata.resources.memory} onChange={(event) => setValue(['suricata', 'resources', 'memory'], event.target.value)} />
                            </FormField>
                            <FormField label="CPU Limit">
                                <Input value={formData.suricata.resources.cpuLimit} onChange={(event) => setValue(['suricata', 'resources', 'cpuLimit'], event.target.value)} />
                            </FormField>
                            <FormField label="Memory Limit">
                                <Input value={formData.suricata.resources.memoryLimit} onChange={(event) => setValue(['suricata', 'resources', 'memoryLimit'], event.target.value)} />
                            </FormField>
                        </div>
                    </div>
                );
            case 'zeek':
                return (
                    <div className="space-y-8">
                        <SectionHeader title="Zeek Engine" icon={Activity} description="Maps directly to spec.zeek." />
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <FormField label="Replicas">
                                <Input type="number" min="0" max="20" value={formData.zeek.replicas} onChange={(event) => setValue(['zeek', 'replicas'], Number(event.target.value))} />
                            </FormField>
                            <FormField label="Image">
                                <Input value={formData.zeek.image} onChange={(event) => setValue(['zeek', 'image'], event.target.value)} />
                            </FormField>
                            <FormField label="Interface">
                                <Input value={formData.zeek.config.interface} onChange={(event) => setValue(['zeek', 'config', 'interface'], event.target.value)} />
                            </FormField>
                            <FormField label="Log Rotation">
                                <Input value={formData.zeek.config.logRotation} onChange={(event) => setValue(['zeek', 'config', 'logRotation'], event.target.value)} />
                            </FormField>
                        </div>
                        <FormField label="Policy Scripts (one per line)">
                            <TextArea value={listFields.zeekPolicies} onChange={(event) => setValue(['zeek', 'policyScripts'], linesToArray(event.target.value))} />
                        </FormField>
                        <FormField label="Enable File Extraction">
                            <Toggle enabled={formData.zeek.config.enableFileExtraction} onChange={(value) => setValue(['zeek', 'config', 'enableFileExtraction'], value)} />
                        </FormField>
                    </div>
                );
            case 'ml':
                return (
                    <div className="space-y-8">
                        <SectionHeader title="ML Enforcement" icon={Zap} description="Controls spec.suricata.mlEnforcement for the suricata-ctrl sidecar." />
                        <FormField label="Enable ML Enforcement">
                            <Toggle enabled={formData.suricata.mlEnforcement.enabled} onChange={(value) => setValue(['suricata', 'mlEnforcement', 'enabled'], value)} />
                        </FormField>
                        {formData.suricata.mlEnforcement.enabled && (
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                <FormField label="Sidecar Image">
                                    <Input value={formData.suricata.mlEnforcement.image} onChange={(event) => setValue(['suricata', 'mlEnforcement', 'image'], event.target.value)} />
                                </FormField>
                                <FormField label="ML Topic">
                                    <Input value={formData.suricata.mlEnforcement.mlTopic} placeholder={`ml-decisions.${formData.tenantId || 'tenant-id'}`} onChange={(event) => setValue(['suricata', 'mlEnforcement', 'mlTopic'], event.target.value)} />
                                </FormField>
                                <FormField label="Audit Topic">
                                    <Input value={formData.suricata.mlEnforcement.auditTopic} placeholder={`enforcement-audit.${formData.tenantId || 'tenant-id'}`} onChange={(event) => setValue(['suricata', 'mlEnforcement', 'auditTopic'], event.target.value)} />
                                </FormField>
                                <FormField label="Deduplication Window (seconds)">
                                    <Input type="number" value={formData.suricata.mlEnforcement.deduplicationWindowSeconds} onChange={(event) => setValue(['suricata', 'mlEnforcement', 'deduplicationWindowSeconds'], Number(event.target.value))} />
                                </FormField>
                                <FormField label="Min Confidence">
                                    <Input type="number" step="0.01" min="0" max="1" value={formData.suricata.mlEnforcement.minConfidence} onChange={(event) => setValue(['suricata', 'mlEnforcement', 'minConfidence'], Number(event.target.value))} />
                                </FormField>
                                <FormField label="Max Block Duration (hours)">
                                    <Input type="number" value={formData.suricata.mlEnforcement.maxBlockDurationHours} onChange={(event) => setValue(['suricata', 'mlEnforcement', 'maxBlockDurationHours'], Number(event.target.value))} />
                                </FormField>
                            </div>
                        )}
                    </div>
                );
            case 'logging':
                return (
                    <div className="space-y-8">
                        <SectionHeader title="Logging & Kafka" icon={FileText} description="Maps to spec.logging." />
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <FormField label="Kafka Bootstrap Servers">
                                <Input value={formData.logging.kafkaBootstrapServers} onChange={(event) => setValue(['logging', 'kafkaBootstrapServers'], event.target.value)} />
                            </FormField>
                            <FormField label="Kafka Topic">
                                <Input value={formData.logging.kafkaTopic} placeholder={`tenant-${formData.tenantId || '<id>'}-logs`} onChange={(event) => setValue(['logging', 'kafkaTopic'], event.target.value)} />
                            </FormField>
                            <FormField label="Log Level">
                                <Select options={LOG_LEVEL_OPTIONS} value={formData.logging.logLevel} onChange={(event) => setValue(['logging', 'logLevel'], event.target.value)} />
                            </FormField>
                            <FormField label="Retention Days">
                                <Input type="number" min="1" max="365" value={formData.logging.retentionDays} onChange={(event) => setValue(['logging', 'retentionDays'], Number(event.target.value))} />
                            </FormField>
                            <FormField label="Buffer Size">
                                <Input type="number" min="100" value={formData.logging.bufferSize} onChange={(event) => setValue(['logging', 'bufferSize'], Number(event.target.value))} />
                            </FormField>
                            <FormField label="Enable JSON">
                                <Toggle enabled={formData.logging.enableJSON} onChange={(value) => setValue(['logging', 'enableJSON'], value)} />
                            </FormField>
                        </div>
                    </div>
                );
            case 'network':
                return (
                    <div className="space-y-8">
                        <SectionHeader title="Network Policy" icon={Network} description="Maps to spec.network." />
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <FormField label="Ingress CIDR">
                                <Input value={formData.network.ingressCIDR} onChange={(event) => setValue(['network', 'ingressCIDR'], event.target.value)} />
                            </FormField>
                            <FormField label="Egress CIDR">
                                <Input value={formData.network.egressCIDR} onChange={(event) => setValue(['network', 'egressCIDR'], event.target.value)} />
                            </FormField>
                            <FormField label="Isolation Mode">
                                <Select options={ISOLATION_OPTIONS} value={formData.network.isolationMode} onChange={(event) => setValue(['network', 'isolationMode'], event.target.value)} />
                            </FormField>
                            <FormField label="Enable Network Policies">
                                <Toggle enabled={formData.network.enableNetworkPolicies} onChange={(value) => setValue(['network', 'enableNetworkPolicies'], value)} />
                            </FormField>
                        </div>
                        <FormField label="Allowed Namespaces (one per line)">
                            <TextArea value={listFields.allowedNamespaces} onChange={(event) => setValue(['network', 'allowedNamespaces'], linesToArray(event.target.value))} />
                        </FormField>
                    </div>
                );
            case 'storage':
                return (
                    <div className="space-y-8">
                        <SectionHeader title="Storage Policy" icon={Database} description="Maps to spec.storage." />
                        <FormField label="Enable Persistent Storage">
                            <Toggle enabled={formData.storage.enablePVC} onChange={(value) => setValue(['storage', 'enablePVC'], value)} />
                        </FormField>
                        {formData.storage.enablePVC && (
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                <FormField label="Volume Size">
                                    <Input value={formData.storage.size} onChange={(event) => setValue(['storage', 'size'], event.target.value)} />
                                </FormField>
                                <FormField label="Storage Class">
                                    <Select options={[{ value: '', label: '(cluster default)' }, ...storageClasses.map((name) => ({ value: name, label: name }))]} value={formData.storage.storageClassName} onChange={(event) => setValue(['storage', 'storageClassName'], event.target.value)} />
                                </FormField>
                                <FormField label="Access Mode">
                                    <Select options={ACCESS_MODE_OPTIONS} value={formData.storage.accessMode} onChange={(event) => setValue(['storage', 'accessMode'], event.target.value)} />
                                </FormField>
                            </div>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    if (view === 'list') {
        return (
            <div className="space-y-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                        <h1 className="pb-1 text-3xl font-extrabold text-text-main">Tenant Management</h1>
                        <p className="mt-1 text-sm text-text-muted/80">Deploy and monitor live TenantIDS custom resources from the Kubernetes API.</p>
                        <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium text-text-muted">
                            <span className="glass-panel rounded-full px-3 py-1 text-text-main">API Group: ids.betatech.com/v1alpha1</span>
                            <span className="glass-panel rounded-full px-3 py-1 text-text-main">Kind: TenantIDS</span>
                            {clusterVersion && <span className="glass-panel rounded-full px-3 py-1 text-text-main">Cluster: {clusterVersion}</span>}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => { loadTenants(); loadReferenceData(); }} className="glass-panel glass-panel-hover flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-text-main transition-all">
                            <RefreshCw size={16} className={loading ? 'animate-spin text-text-accent' : 'text-text-muted'} />
                            Refresh
                        </button>
                        <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-neutral-950 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200">
                            <Plus size={18} />
                            Create New Tenant
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Total Tenants" value={totalTenants} subtext={lastSyncedAt ? `Last sync ${formatTime(lastSyncedAt)}` : 'Waiting for first sync'} />
                    <StatCard label="Running" value={runningTenants} subtext="Operator-reported healthy or ready tenants" />
                    <StatCard label="Pending" value={pendingTenants} subtext="Creating, reconciling, or otherwise in progress" />
                    <StatCard label="ML Enabled" value={mlEnabledTenants} subtext="Tenants with ML enforcement enabled" />
                </div>

                {pageError && (
                    <div className="flex items-start gap-3 rounded-2xl border border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-950 dark:border-white/20 dark:bg-white/10 dark:text-white">
                        <AlertCircle size={18} className="mt-0.5 text-text-main" />
                        <div>
                            <div className="font-semibold">Kubernetes API unavailable</div>
                            <div className="mt-1 text-text-muted">{pageError}</div>
                            <div className="mt-2 text-xs text-text-muted">Point `/api/kubernetes` at a reachable Kind API endpoint or `kubectl proxy` target.</div>
                        </div>
                    </div>
                )}

                {submitMessage && (
                    <div className="flex items-center gap-3 rounded-2xl border border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-950 dark:border-white/20 dark:bg-white/10 dark:text-white">
                        <CheckCircle2 size={18} className="text-text-main" />
                        <span>{submitMessage}</span>
                    </div>
                )}

                <DataTable
                    columns={columns}
                    data={tenants}
                    loading={loading}
                    pageSize={10}
                    actions={(row) => (
                        <>
                            <button type="button" onClick={(event) => { event.stopPropagation(); openEdit(row); }} className="rounded p-1.5 text-text-muted transition-colors hover:bg-bg-body hover:text-primary-400">
                                <Edit size={16} />
                            </button>
                            <button type="button" disabled={deleteName === row.name} onClick={(event) => { event.stopPropagation(); handleDelete(row); }} className="rounded p-1.5 text-text-muted transition-colors hover:bg-bg-body hover:text-text-main disabled:opacity-50">
                                <Trash2 size={16} />
                            </button>
                        </>
                    )}
                />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl space-y-6 pb-12">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                <div className="flex items-center gap-4">
                    <button onClick={closeForm} className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-card">
                        <X size={20} />
                    </button>
                    <div>
                        <h1 className="pb-1 text-3xl font-extrabold text-text-main">{isEditMode ? 'Edit Tenant' : 'Configure New Tenant'}</h1>
                        <p className="text-sm font-medium text-text-muted/80">This form creates or updates a live TenantIDS resource in the Kubernetes API.</p>
                    </div>
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-4">
                    {selectedResource && <div className="glass-panel rounded-full px-4 py-1.5 text-xs font-semibold text-text-accent text-neon">Resource: {selectedResource.metadata?.name}</div>}
                    <button onClick={closeForm} className="px-4 py-2 text-sm font-bold text-text-muted transition-colors hover:text-white">
                        Cancel
                    </button>
                    <button disabled={submitBusy} onClick={handleSubmit} className="flex items-center gap-2 rounded-lg bg-neutral-950 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-neutral-200">
                        <Save size={18} />
                        {submitBusy ? 'Saving...' : isEditMode ? 'Update Tenant' : 'Deploy Tenant'}
                    </button>
                </div>
            </div>

            {submitError && (
                <div className="flex items-start gap-3 rounded-2xl border border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-950 dark:border-white/20 dark:bg-white/10 dark:text-white">
                    <AlertCircle size={18} className="mt-0.5 text-text-main" />
                    <div>{submitError}</div>
                </div>
            )}

            <div className="flex flex-col gap-6 xl:flex-row">
                <div className="w-full xl:w-64">
                    <div className="space-y-1">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-sm font-bold transition-colors duration-300 ${activeTab === tab.id ? 'glass-panel border-white/20 bg-white/10 text-white' : 'border-transparent text-text-muted hover:glass-panel hover:text-white'}`}
                            >
                                <tab.icon size={18} className={activeTab === tab.id ? 'text-text-accent' : 'text-text-muted/70'} />
                                {tab.label}
                                {activeTab === tab.id && <ChevronRight size={16} className="ml-auto animate-pulse" />}
                            </button>
                        ))}
                    </div>
                    <div className="mt-6 rounded-2xl border border-border-subtle bg-bg-card p-4 text-xs text-text-muted">
                        <div className="font-semibold uppercase tracking-[0.2em] text-text-main">Live API</div>
                        <div className="mt-2">This page polls Kubernetes every 15 seconds and writes cluster-scoped TenantIDS resources.</div>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden rounded-2xl glass-panel">
                    <div className="h-[680px] overflow-y-auto p-8 custom-scrollbar relative">
                        <div className="pointer-events-none absolute inset-0 bg-white/5"></div>
                        <div className="relative z-10">
                            {renderTabContent()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
