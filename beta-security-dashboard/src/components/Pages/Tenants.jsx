import React, { useState } from 'react';
import { 
    Plus, Server, Shield, Activity, Lock, 
    Network, Database, Zap, FileText, Settings,
    ChevronRight, Info, AlertTriangle, Monitor,
    Trash2, Edit, Save, X, Layers
} from 'lucide-react';
import { DataTable } from '../Common/DataTable';

export function Tenants() {
    const [view, setView] = useState('list'); // 'list' | 'create' | 'edit'
    const [activeTab, setActiveTab] = useState('general');
    const [formData, setFormData] = useState({
        tenantId: '',
        suricata: {
            mode: 'IDS',
            replicas: 2,
            image: 'jasonish/suricata:latest',
            ruleSets: ['emerging-threats.rules'],
            resources: { cpu: '500m', memory: '1Gi', cpuLimit: '2', memoryLimit: '4Gi' },
            config: { homeNet: '10.0.0.0/8', externalNet: '!$HOME_NET', afPacketInterfaces: ['eth0'], ruleReloadInterval: '5m', enableIPSMode: false },
            ipsNetworking: { networkAttachments: ['', ''], staticIP: '' },
            autoScaling: { enabled: false, minReplicas: 1, maxReplicas: 10, targetCPUUtilizationPercentage: 70 },
            mlEnforcement: { 
                enabled: false, 
                image: 'tesfuman/suricata-ctrl:latest', 
                mlTopic: '', 
                auditTopic: '',
                confidenceTiers: [
                    { minConfidence: 0.95, blockDurationHours: 24, action: 'drop' },
                    { minConfidence: 0.85, blockDurationHours: 12, action: 'drop' },
                    { minConfidence: 0.70, blockDurationHours: 6, action: 'alert' }
                ],
                minConfidence: 0.80,
                maxBlockDurationHours: 48,
                deduplicationWindowSeconds: 300,
                resources: { cpu: '100m', memory: '128Mi', cpuLimit: '500m', memoryLimit: '256Mi' }
            }
        },
        zeek: {
            replicas: 1,
            image: 'zeek/zeek:latest',
            policyScripts: ['conn-analysis.zeek'],
            resources: { cpu: '500m', memory: '1Gi', cpuLimit: '1', memoryLimit: '2Gi' },
            config: { interface: 'eth0', logRotation: '1h', enableFileExtraction: false, seedValue: 42 },
            autoScaling: { enabled: false, minReplicas: 1, maxReplicas: 5, targetCPUUtilizationPercentage: 70 }
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
    });

    const [tenants] = useState([
        { id: 'bank-secure', mode: 'IPS', status: 'Running', replicas: 2, ml: 'Enabled' },
        { id: 'ml-tenant', mode: 'IDS', status: 'Pending', replicas: 1, ml: 'Disabled' },
        { id: 'acme-corp', mode: 'IDS', status: 'Running', replicas: 3, ml: 'Enabled' },
    ]);

    const columns = [
        { key: 'id', label: 'Tenant ID', render: (val) => <span className="font-bold text-primary-400">{val}</span> },
        { key: 'mode', label: 'Mode', render: (val) => (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${val === 'IPS' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                {val}
            </span>
        )},
        { key: 'status', label: 'Status', render: (val) => (
            <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${val === 'Running' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div>
                <span>{val}</span>
            </div>
        )},
        { key: 'replicas', label: 'Replicas' },
        { key: 'ml', label: 'ML Enforcement', render: (val) => (
            <span className={`text-xs ${val === 'Enabled' ? 'text-purple-400' : 'text-text-muted'}`}>
                {val}
            </span>
        )}
    ];

    const tabs = [
        { id: 'general', label: 'General', icon: Settings },
        { id: 'suricata', label: 'Suricata', icon: Shield },
        { id: 'zeek', label: 'Zeek', icon: Activity },
        { id: 'ml', label: 'ML Enforcement', icon: Zap },
        { id: 'logging', label: 'Logging', icon: FileText },
        { id: 'network', label: 'Network', icon: Network },
        { id: 'storage', label: 'Storage', icon: Database },
    ];

    const handleInputChange = (section, field, value, subfield = null) => {
        setFormData(prev => {
            if (!section) {
                return { ...prev, [field]: value };
            }
            if (subfield) {
                return {
                    ...prev,
                    [section]: {
                        ...prev[section],
                        [field]: {
                            ...prev[section][field],
                            [subfield]: value
                        }
                    }
                };
            }
            return {
                ...prev,
                [section]: {
                    ...prev[section],
                    [field]: value
                }
            };
        });
    };

    const FormField = ({ label, description, children, error }) => (
        <div className="space-y-1.5">
            <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-text-main">{label}</label>
                {description && (
                    <div className="group relative">
                        <Info size={14} className="text-text-muted cursor-help" />
                        <div className="absolute left-full ml-2 top-0 w-48 p-2 bg-slate-800 border border-border-subtle rounded text-[10px] text-text-muted invisible group-hover:visible z-10 shadow-2xl">
                            {description}
                        </div>
                    </div>
                )}
            </div>
            {children}
            {error && <p className="text-[10px] text-red-400 mt-1">{error}</p>}
        </div>
    );

    const Input = (props) => (
        <input 
            {...props}
            className="w-full bg-slate-950 border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all placeholder:text-slate-600"
        />
    );

    const Select = ({ options, ...props }) => (
        <select 
            {...props}
            className="w-full bg-slate-950 border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:border-primary-500/50 transition-all cursor-pointer"
        >
            {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
    );

    const Toggle = ({ enabled, onChange, label }) => (
        <button 
            type="button"
            onClick={() => onChange(!enabled)}
            className="flex items-center gap-3 group"
        >
            <div className={`w-10 h-5 rounded-full transition-all relative ${enabled ? 'bg-primary-600' : 'bg-slate-700'}`}>
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${enabled ? 'left-6' : 'left-1'}`}></div>
            </div>
            {label && <span className="text-sm text-text-muted group-hover:text-text-main transition-colors">{label}</span>}
        </button>
    );

    const SectionHeader = ({ title, icon: Icon, description }) => (
        <div className="flex items-center gap-3 border-b border-border-subtle/30 pb-4 mb-6">
            <div className="p-2 bg-primary-500/10 rounded-lg">
                <Icon size={20} className="text-primary-400" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-text-main">{title}</h3>
                <p className="text-xs text-text-muted">{description}</p>
            </div>
        </div>
    );

    const ResourceInputs = ({ values, onChange, section }) => (
        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-900/50 rounded-xl border border-border-subtle/30 mt-4">
            <FormField label="CPU Request" description="Guaranteed minimum CPU">
                <Input value={values.cpu} onChange={(e) => handleInputChange(section, 'resources', e.target.value, 'cpu')} />
            </FormField>
            <FormField label="Memory Request" description="Guaranteed minimum memory">
                <Input value={values.memory} onChange={(e) => handleInputChange(section, 'resources', e.target.value, 'memory')} />
            </FormField>
            <FormField label="CPU Limit" description="Maximum CPU cap">
                <Input value={values.cpuLimit} onChange={(e) => handleInputChange(section, 'resources', e.target.value, 'cpuLimit')} />
            </FormField>
            <FormField label="Memory Limit" description="Maximum memory (OOM-killed if exceeded)">
                <Input value={values.memoryLimit} onChange={(e) => handleInputChange(section, 'resources', e.target.value, 'memoryLimit')} />
            </FormField>
        </div>
    );

    const renderTabContent = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        <SectionHeader 
                            title="Tenant Identity" 
                            icon={Layers} 
                            description="Basic identification and primary operational mode."
                        />
                        <div className="grid grid-cols-2 gap-6">
                            <FormField label="Tenant ID [REQUIRED]" description="Unique identifier driving all naming (Namespace, Kafka, etc.)">
                                <Input 
                                    placeholder="e.g. acme-corp" 
                                    value={formData.tenantId}
                                    onChange={(e) => handleInputChange(null, 'tenantId', e.target.value)}
                                />
                            </FormField>
                            <FormField label="Operational Mode" description="Passive detection (IDS) vs Inline prevention (IPS)">
                                <div className="flex bg-slate-950 p-1 rounded-lg border border-border-subtle/50">
                                    {['IDS', 'IPS'].map(m => (
                                        <button
                                            key={m}
                                            onClick={() => handleInputChange('suricata', 'mode', m)}
                                            className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${
                                                formData.suricata.mode === m 
                                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/40' 
                                                : 'text-text-muted hover:text-text-main'
                                            }`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </FormField>
                        </div>

                        {formData.suricata.mode === 'IPS' && (
                            <div className="space-y-6 pt-4 border-t border-border-subtle/20 animate-in slide-in-from-top-4 duration-500">
                                <SectionHeader 
                                    title="IPS Networking" 
                                    icon={Network} 
                                    description="Configure Multus network attachments for inline traffic flow."
                                />
                                <div className="grid grid-cols-2 gap-6">
                                    <FormField label="WAN Attachment" description="Ingress / external-facing interface">
                                        <Input 
                                            placeholder="namespace/nad-name" 
                                            value={formData.suricata.ipsNetworking.networkAttachments[0]}
                                            onChange={(e) => {
                                                const newAtts = [...formData.suricata.ipsNetworking.networkAttachments];
                                                newAtts[0] = e.target.value;
                                                handleInputChange('suricata', 'ipsNetworking', newAtts, 'networkAttachments');
                                            }}
                                        />
                                    </FormField>
                                    <FormField label="LAN Attachment" description="Egress / internal-facing interface">
                                        <Input 
                                            placeholder="namespace/nad-name" 
                                            value={formData.suricata.ipsNetworking.networkAttachments[1]}
                                            onChange={(e) => {
                                                const newAtts = [...formData.suricata.ipsNetworking.networkAttachments];
                                                newAtts[1] = e.target.value;
                                                handleInputChange('suricata', 'ipsNetworking', newAtts, 'networkAttachments');
                                            }}
                                        />
                                    </FormField>
                                    <FormField label="Static IP (Optional)" description="CIDR for traffic steering (requires Whereabouts CNI)">
                                        <Input 
                                            placeholder="192.168.1.50/24" 
                                            value={formData.suricata.ipsNetworking.staticIP}
                                            onChange={(e) => handleInputChange('suricata', 'ipsNetworking', e.target.value, 'staticIP')}
                                        />
                                    </FormField>
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 'suricata':
                return (
                    <div className="space-y-8">
                        <SectionHeader title="Suricata Engine" icon={Shield} description="Configure detection engine parameters and rule sets." />
                        <div className="grid grid-cols-2 gap-6">
                            <FormField label="Replicas" description="Number of pods for traffic inspection.">
                                <Input type="number" min="0" max="20" value={formData.suricata.replicas} onChange={(e) => handleInputChange('suricata', 'replicas', parseInt(e.target.value))} />
                            </FormField>
                            <FormField label="Image" description="Docker image for Suricata container.">
                                <Input value={formData.suricata.image} onChange={(e) => handleInputChange('suricata', 'image', e.target.value)} />
                            </FormField>
                        </div>

                        <div>
                            <FormField label="Rule Sets" description="List of rule files to load.">
                                <div className="space-y-2">
                                    {formData.suricata.ruleSets.map((rule, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <Input value={rule} onChange={(e) => {
                                                const newRules = [...formData.suricata.ruleSets];
                                                newRules[idx] = e.target.value;
                                                handleInputChange('suricata', 'ruleSets', newRules);
                                            }} />
                                            <button 
                                                onClick={() => {
                                                    const newRules = formData.suricata.ruleSets.filter((_, i) => i !== idx);
                                                    handleInputChange('suricata', 'ruleSets', newRules);
                                                }}
                                                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    <button 
                                        onClick={() => handleInputChange('suricata', 'ruleSets', [...formData.suricata.ruleSets, ''])}
                                        className="text-xs font-bold text-primary-400 flex items-center gap-1 mt-2 hover:text-primary-300"
                                    >
                                        <Plus size={14} /> Add Rule File
                                    </button>
                                </div>
                            </FormField>
                        </div>

                        <div className="pt-6 border-t border-border-subtle/20">
                            <h4 className="text-sm font-bold text-text-main mb-4 flex items-center gap-2">
                                <Database size={16} className="text-primary-400" />
                                Resource Requests & Limits
                            </h4>
                            <ResourceInputs values={formData.suricata.resources} section="suricata" />
                        </div>

                        <div className="pt-6 border-t border-border-subtle/20">
                            <Toggle 
                                enabled={formData.suricata.autoScaling.enabled} 
                                onChange={(val) => handleInputChange('suricata', 'autoScaling', val, 'enabled')}
                                label="Enable Auto Scaling (HPA)"
                            />
                            {formData.suricata.autoScaling.enabled && (
                                <div className="grid grid-cols-3 gap-4 mt-4 p-4 bg-slate-900/50 rounded-xl border border-border-subtle/30 animate-in slide-in-from-top-2">
                                    <FormField label="Min Replicas">
                                        <Input type="number" value={formData.suricata.autoScaling.minReplicas} onChange={(e) => handleInputChange('suricata', 'autoScaling', parseInt(e.target.value), 'minReplicas')} />
                                    </FormField>
                                    <FormField label="Max Replicas">
                                        <Input type="number" value={formData.suricata.autoScaling.maxReplicas} onChange={(e) => handleInputChange('suricata', 'autoScaling', parseInt(e.target.value), 'maxReplicas')} />
                                    </FormField>
                                    <FormField label="CPU Target %">
                                        <Input type="number" value={formData.suricata.autoScaling.targetCPUUtilizationPercentage} onChange={(e) => handleInputChange('suricata', 'autoScaling', parseInt(e.target.value), 'targetCPUUtilizationPercentage')} />
                                    </FormField>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'zeek':
                return (
                    <div className="space-y-8">
                        <SectionHeader title="Zeek NSM" icon={Activity} description="Protocol analysis and network metadata extraction." />
                        <div className="grid grid-cols-2 gap-6">
                            <FormField label="Replicas" description="Number of pods for protocol analysis.">
                                <Input type="number" min="0" max="20" value={formData.zeek.replicas} onChange={(e) => handleInputChange('zeek', 'replicas', parseInt(e.target.value))} />
                            </FormField>
                            <FormField label="Image" description="Docker image for Zeek container.">
                                <Input value={formData.zeek.image} onChange={(e) => handleInputChange('zeek', 'image', e.target.value)} />
                            </FormField>
                        </div>

                        <FormField label="Policy Scripts" description="List of scripts for custom detection logic.">
                            <div className="space-y-2">
                                {formData.zeek.policyScripts.map((script, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <Input value={script} onChange={(e) => {
                                            const newScripts = [...formData.zeek.policyScripts];
                                            newScripts[idx] = e.target.value;
                                            handleInputChange('zeek', 'policyScripts', newScripts);
                                        }} />
                                        <button 
                                            onClick={() => {
                                                const newScripts = formData.zeek.policyScripts.filter((_, i) => i !== idx);
                                                handleInputChange('zeek', 'policyScripts', newScripts);
                                            }}
                                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                                <button 
                                    onClick={() => handleInputChange('zeek', 'policyScripts', [...formData.zeek.policyScripts, ''])}
                                    className="text-xs font-bold text-primary-400 flex items-center gap-1 mt-2 hover:text-primary-300"
                                >
                                    <Plus size={14} /> Add Policy Script
                                </button>
                            </div>
                        </FormField>

                        <div className="pt-6 border-t border-border-subtle/20">
                            <h4 className="text-sm font-bold text-text-main mb-4 flex items-center gap-2">
                                <Database size={16} className="text-primary-400" />
                                Resource Requests & Limits
                            </h4>
                            <ResourceInputs values={formData.zeek.resources} section="zeek" />
                        </div>

                        <div className="pt-6 border-t border-border-subtle/20">
                            <Toggle 
                                enabled={formData.zeek.autoScaling.enabled} 
                                onChange={(val) => handleInputChange('zeek', 'autoScaling', val, 'enabled')}
                                label="Enable Auto Scaling (HPA)"
                            />
                        </div>
                    </div>
                );

            case 'ml':
                return (
                    <div className="space-y-8">
                        <SectionHeader title="ML Enforcement" icon={Zap} description="AI-driven dynamic IP blocking and confidence-based response." />
                        
                        <div className="bg-slate-900/50 p-6 rounded-2xl border border-primary-500/20 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Zap size={80} className="text-primary-400" />
                            </div>
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h4 className="text-md font-bold text-text-main mb-1">Enable suricata-ctrl sidecar</h4>
                                    <p className="text-xs text-text-muted">Dynamic dataset management and enforcement decisioning.</p>
                                </div>
                                <Toggle 
                                    enabled={formData.suricata.mlEnforcement.enabled} 
                                    onChange={(val) => handleInputChange('suricata', 'mlEnforcement', val, 'enabled')}
                                />
                            </div>

                            {formData.suricata.mlEnforcement.enabled && (
                                <div className="space-y-8 animate-in slide-in-from-top-4">
                                    <div className="grid grid-cols-2 gap-6">
                                        <FormField label="Sidecar Image">
                                            <Input value={formData.suricata.mlEnforcement.image} onChange={(e) => handleInputChange('suricata', 'mlEnforcement', e.target.value, 'image')} />
                                        </FormField>
                                        <FormField label="ML Decision Topic" description="Topic to consume threat predictions from.">
                                            <Input placeholder="ml-decisions.my-tenant" value={formData.suricata.mlEnforcement.mlTopic} onChange={(e) => handleInputChange('suricata', 'mlEnforcement', e.target.value, 'mlTopic')} />
                                        </FormField>
                                    </div>

                                    <div>
                                        <h5 className="text-sm font-bold text-text-main mb-4 border-b border-border-subtle/20 pb-2">Confidence Tiers</h5>
                                        <div className="overflow-x-auto rounded-xl border border-border-subtle/30">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-950 border-b border-border-subtle/30">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left font-semibold text-text-muted">Min Confidence</th>
                                                        <th className="px-4 py-3 text-left font-semibold text-text-muted">Duration (hrs)</th>
                                                        <th className="px-4 py-3 text-left font-semibold text-text-muted">Action</th>
                                                        <th className="px-4 py-3 w-10"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border-subtle/20">
                                                    {formData.suricata.mlEnforcement.confidenceTiers.map((tier, idx) => (
                                                        <tr key={idx} className="bg-slate-900/30">
                                                            <td className="px-4 py-2">
                                                                <input 
                                                                    type="number" step="0.01" min="0" max="1"
                                                                    className="bg-transparent w-24 focus:outline-none text-primary-400 font-bold"
                                                                    value={tier.minConfidence}
                                                                    onChange={(e) => {
                                                                        const newTiers = [...formData.suricata.mlEnforcement.confidenceTiers];
                                                                        newTiers[idx].minConfidence = parseFloat(e.target.value);
                                                                        handleInputChange('suricata', 'mlEnforcement', newTiers, 'confidenceTiers');
                                                                    }}
                                                                />
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                <input 
                                                                    type="number" step="0.5"
                                                                    className="bg-transparent w-24 focus:outline-none text-text-main"
                                                                    value={tier.blockDurationHours}
                                                                    onChange={(e) => {
                                                                        const newTiers = [...formData.suricata.mlEnforcement.confidenceTiers];
                                                                        newTiers[idx].blockDurationHours = parseFloat(e.target.value);
                                                                        handleInputChange('suricata', 'mlEnforcement', newTiers, 'confidenceTiers');
                                                                    }}
                                                                />
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                <select 
                                                                    className="bg-transparent focus:outline-none text-text-main cursor-pointer"
                                                                    value={tier.action}
                                                                    onChange={(e) => {
                                                                        const newTiers = [...formData.suricata.mlEnforcement.confidenceTiers];
                                                                        newTiers[idx].action = e.target.value;
                                                                        handleInputChange('suricata', 'mlEnforcement', newTiers, 'confidenceTiers');
                                                                    }}
                                                                >
                                                                    <option value="drop">Drop</option>
                                                                    <option value="alert">Alert</option>
                                                                </select>
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                <button 
                                                                    onClick={() => {
                                                                        const newTiers = formData.suricata.mlEnforcement.confidenceTiers.filter((_, i) => i !== idx);
                                                                        handleInputChange('suricata', 'mlEnforcement', newTiers, 'confidenceTiers');
                                                                    }}
                                                                    className="text-red-400 hover:text-red-300 transition-colors"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <button 
                                                onClick={() => {
                                                    const newTiers = [...formData.suricata.mlEnforcement.confidenceTiers, { minConfidence: 0.5, blockDurationHours: 1, action: 'alert' }];
                                                    handleInputChange('suricata', 'mlEnforcement', newTiers, 'confidenceTiers');
                                                }}
                                                className="w-full py-2 bg-slate-950/50 text-xs font-bold text-text-muted hover:text-primary-400 transition-colors border-t border-border-subtle/30"
                                            >
                                                + Add Enforcement Tier
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6 pt-6 border-t border-border-subtle/20">
                                        <FormField label="Tenant-Level Threshold" description="Predictions below this are ignored entirely.">
                                            <Input type="number" step="0.01" min="0" max="1" value={formData.suricata.mlEnforcement.minConfidence} onChange={(e) => handleInputChange('suricata', 'mlEnforcement', parseFloat(e.target.value), 'minConfidence')} />
                                        </FormField>
                                        <FormField label="Max Block Duration" description="No block can exceed this duration (hours).">
                                            <Input type="number" value={formData.suricata.mlEnforcement.maxBlockDurationHours} onChange={(e) => handleInputChange('suricata', 'mlEnforcement', parseFloat(e.target.value), 'maxBlockDurationHours')} />
                                        </FormField>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'logging':
                return (
                    <div className="space-y-8">
                        <SectionHeader title="Logging & Kafka" icon={FileText} description="Configure log shipping and retention policies." />
                        <div className="grid grid-cols-2 gap-6">
                            <FormField label="Kafka Servers" description="Bootstrap broker addresses.">
                                <Input value={formData.logging.kafkaBootstrapServers} onChange={(e) => handleInputChange('logging', 'kafkaBootstrapServers', e.target.value)} />
                            </FormField>
                            <FormField label="Log Topic" description="Destination topic for security logs.">
                                <Input placeholder="tenant-<id>-logs" value={formData.logging.kafkaTopic} onChange={(e) => handleInputChange('logging', 'kafkaTopic', e.target.value)} />
                            </FormField>
                            <FormField label="Log Level">
                                <Select 
                                    options={[{value:'debug',label:'Debug'},{value:'info',label:'Info'},{value:'warn',label:'Warning'},{value:'error',label:'Error'}]} 
                                    value={formData.logging.logLevel}
                                    onChange={(e) => handleInputChange('logging', 'logLevel', e.target.value)}
                                />
                            </FormField>
                            <FormField label="Retention (Days)">
                                <Input type="number" min="1" max="365" value={formData.logging.retentionDays} onChange={(e) => handleInputChange('logging', 'retentionDays', parseInt(e.target.value))} />
                            </FormField>
                        </div>
                    </div>
                );

            case 'network':
                return (
                    <div className="space-y-8">
                        <SectionHeader title="Network Policy" icon={Network} description="Kubernetes isolation rules and traffic segmentation." />
                        <div className="grid grid-cols-2 gap-6">
                            <FormField label="Ingress CIDR">
                                <Input value={formData.network.ingressCIDR} onChange={(e) => handleInputChange('network', 'ingressCIDR', e.target.value)} />
                            </FormField>
                            <FormField label="Egress CIDR">
                                <Input value={formData.network.egressCIDR} onChange={(e) => handleInputChange('network', 'egressCIDR', e.target.value)} />
                            </FormField>
                            <FormField label="Isolation Mode">
                                <Select 
                                    options={[{value:'strict',label:'Strict (Default)'},{value:'moderate',label:'Moderate'},{value:'disabled',label:'Disabled'}]} 
                                    value={formData.network.isolationMode}
                                    onChange={(e) => handleInputChange('network', 'isolationMode', e.target.value)}
                                />
                            </FormField>
                        </div>
                        <FormField label="Allowed Namespaces" description="Allow traffic from these specific namespaces.">
                            <div className="flex flex-wrap gap-2 p-4 bg-slate-950 border border-border-subtle rounded-xl">
                                {formData.network.allowedNamespaces.map((ns, idx) => (
                                    <div key={idx} className="bg-primary-500/10 border border-primary-500/30 text-primary-400 px-3 py-1 rounded-full text-xs flex items-center gap-2">
                                        {ns}
                                        <button onClick={() => {
                                            const newNs = formData.network.allowedNamespaces.filter((_, i) => i !== idx);
                                            handleInputChange('network', 'allowedNamespaces', newNs);
                                        }}><X size={12} /></button>
                                    </div>
                                ))}
                                <Input 
                                    placeholder="Add namespace..." 
                                    className="border-none bg-transparent w-32 focus:ring-0 focus:ring-offset-0 px-1 py-0"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.target.value) {
                                            handleInputChange('network', 'allowedNamespaces', [...formData.network.allowedNamespaces, e.target.value]);
                                            e.target.value = '';
                                        }
                                    }}
                                />
                            </div>
                        </FormField>
                    </div>
                );

            case 'storage':
                return (
                    <div className="space-y-8">
                        <SectionHeader title="Storage Policy" icon={Database} description="Persistent volume configuration for stateful data." />
                        <div className="pt-2">
                            <Toggle 
                                enabled={formData.storage.enablePVC} 
                                onChange={(val) => handleInputChange('storage', 'enablePVC', val)}
                                label="Enable Persistent Storage"
                            />
                        </div>
                        {formData.storage.enablePVC && (
                            <div className="grid grid-cols-2 gap-6 animate-in slide-in-from-top-4">
                                <FormField label="Volume Size" description="e.g. 5Gi, 500Mi">
                                    <Input value={formData.storage.size} onChange={(e) => handleInputChange('storage', 'size', e.target.value)} />
                                </FormField>
                                <FormField label="Storage Class">
                                    <Input placeholder="(cluster default)" value={formData.storage.storageClassName} onChange={(e) => handleInputChange('storage', 'storageClassName', e.target.value)} />
                                </FormField>
                                <FormField label="Access Mode">
                                    <Select 
                                        options={[
                                            {value:'ReadWriteOnce',label:'ReadWriteOnce (Single Node)'},
                                            {value:'ReadOnlyMany',label:'ReadOnlyMany (Multi-Node RO)'},
                                            {value:'ReadWriteMany',label:'ReadWriteMany (Multi-Node RW)'}
                                        ]} 
                                        value={formData.storage.accessMode}
                                        onChange={(e) => handleInputChange('storage', 'accessMode', e.target.value)}
                                    />
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
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-text-main">Tenant Management</h1>
                        <p className="text-text-muted text-sm mt-1">Deploy and configure dedicated IDS/IPS stack for your tenants.</p>
                    </div>
                    <button 
                        onClick={() => setView('create')}
                        className="bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-primary-900/20"
                    >
                        <Plus size={18} />
                        Create New Tenant
                    </button>
                </div>

                <DataTable 
                    columns={columns} 
                    data={tenants} 
                    actions={(row) => (
                        <div className="flex gap-2">
                            <button className="p-1.5 hover:bg-bg-body rounded text-text-muted hover:text-primary-400 transition-colors">
                                <Edit size={16} />
                            </button>
                            <button className="p-1.5 hover:bg-bg-body rounded text-text-muted hover:text-red-400 transition-colors">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    )}
                />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => setView('list')}
                    className="p-2 hover:bg-bg-card rounded-lg text-text-muted transition-colors"
                >
                    <X size={20} />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-text-main">
                        {view === 'create' ? 'Configure New Tenant' : 'Edit Tenant'}
                    </h1>
                    <p className="text-text-muted text-xs">Define identity, security engines, and infrastructure policy.</p>
                </div>
                <div className="ml-auto flex gap-3">
                    <button 
                        onClick={() => setView('list')}
                        className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-main transition-colors"
                    >
                        Cancel
                    </button>
                    <button className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary-900/20">
                        <Save size={18} />
                        Deploy Tenant
                    </button>
                </div>
            </div>

            <div className="flex gap-6">
                {/* Tabs Sidebar */}
                <div className="w-64 space-y-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                                activeTab === tab.id 
                                ? 'bg-primary-600/10 text-primary-400 border border-primary-500/20 shadow-[0_0_15px_rgba(37,99,235,0.1)]' 
                                : 'text-text-muted hover:bg-bg-card hover:text-text-main border border-transparent'
                            }`}
                        >
                            <tab.icon size={18} className={activeTab === tab.id ? 'text-primary-400' : 'text-text-muted'} />
                            {tab.label}
                            {activeTab === tab.id && <ChevronRight size={14} className="ml-auto" />}
                        </button>
                    ))}
                </div>

                {/* Tab Content Container */}
                <div className="flex-1 bg-bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-xl">
                    <div className="p-8 h-[600px] overflow-y-auto custom-scrollbar">
                        {renderTabContent()}
                    </div>
                </div>
            </div>
        </div>
    );
}
