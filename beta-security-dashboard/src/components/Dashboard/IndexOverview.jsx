import React, { useState, useEffect } from 'react';
import { 
    Database, 
    FileText, 
    HardDrive, 
    Activity, 
    Search,
    RefreshCw,
    ChevronRight,
    AlertCircle,
    CheckCircle,
    XCircle,
    Layers,
    Trash2
} from 'lucide-react';
import { DataTable } from '../Common/DataTable';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { fetchIndices, deleteOldIndexPatterns } from '../../api/opensearch';
import { fetchClusterHealth } from '../../api/otelApi';
import { Shield, Cpu, Wifi, Server } from 'lucide-react';

// Simple bar chart component
const BarChart = ({ data, labelKey, valueKey }) => {
    const maxValue = Math.max(...data.map(d => d[valueKey]));
    
    return (
        <div className="space-y-2">
            {data.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                    <div className="w-32 text-xs text-text-muted truncate" title={item[labelKey]}>
                        {item[labelKey]}
                    </div>
                    <div className="flex-1 h-6 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
                        <div 
                            className="h-full rounded bg-neutral-950 transition-all duration-500 dark:bg-white"
                            style={{ width: `${(item[valueKey] / maxValue) * 100}%` }}
                        />
                    </div>
                    <div className="w-20 text-xs text-text-main text-right">
                        {item[valueKey].toLocaleString()}
                    </div>
                </div>
            ))}
        </div>
    );
};

// Stat card component
const StatCard = ({ icon: Icon, label, value, subtext }) => (
    <div className="bg-bg-card border border-border-subtle rounded-xl p-4">
        <div className="flex items-start justify-between">
            <div className="rounded-lg border border-neutral-950/20 bg-neutral-950/5 p-2 text-neutral-950 dark:border-white/20 dark:bg-white/10 dark:text-white">
                <Icon size={20} />
            </div>
        </div>
        <div className="mt-3">
            <div className="text-2xl font-bold text-text-main">{value}</div>
            <div className="text-xs text-text-muted mt-1">{label}</div>
            {subtext && <div className="text-[10px] text-text-muted mt-1">{subtext}</div>}
        </div>
    </div>
);

export function IndexOverview() {
    const [indices, setIndices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [cleanupStatus, setCleanupStatus] = useState(null);
    const [clusterHealth, setClusterHealth] = useState(null);

    const loadIndices = async () => {
        setLoading(true);
        const data = await fetchIndices();
        setIndices(data);
        setLoading(false);
    };

    const handleCleanup = async () => {
        if (!confirm('Remove old tenant index patterns from saved objects?')) return;
        setCleanupStatus('cleaning');
        const results = await deleteOldIndexPatterns();
        setCleanupStatus(`Removed ${results.filter(r => r.deleted).length} old patterns`);
        setTimeout(() => setCleanupStatus(null), 3000);
    };

    useEffect(() => {
        loadIndices();
        // Auto-refresh every 30 seconds
        const interval = setInterval(loadIndices, 30000);
        return () => clearInterval(interval);
    }, []);

    // Filter indices based on search
    const filteredIndices = indices.filter(idx => 
        idx.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculate statistics
    const totalIndices = indices.length;
    const totalDocs = indices.reduce((sum, idx) => sum + idx.docsCount, 0);
    const totalSize = indices.reduce((sum, idx) => sum + idx.storeSize, 0);
    const healthyIndices = indices.filter(idx => idx.health === 'green').length;
    const yellowIndices = indices.filter(idx => idx.health === 'yellow').length;
    const redIndices = indices.filter(idx => idx.health === 'red').length;

    // Format bytes
    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Get top indices by document count
    const topIndicesByDocs = [...indices]
        .sort((a, b) => b.docsCount - a.docsCount)
        .slice(0, 10);

    // Get top indices by size
    const topIndicesBySize = [...indices]
        .sort((a, b) => b.storeSize - a.storeSize)
        .slice(0, 10);

    // Table columns
    const columns = [
        { 
            key: 'name', 
            label: 'Index Name',
            render: (val) => (
                <span className="font-mono text-xs text-primary-400">{val}</span>
            )
        },
        { 
            key: 'health', 
            label: 'Health',
            render: (val) => {
                const colors = {
                    green: 'text-success bg-success/10 border border-success/30',
                    yellow: 'text-neutral-950 bg-neutral-100 border border-neutral-300 dark:text-white dark:bg-neutral-900 dark:border-neutral-700',
                    red: 'text-destructive bg-destructive/10 border border-destructive/30'
                };
                const icons = {
                    green: CheckCircle,
                    yellow: AlertCircle,
                    red: XCircle
                };
                const Icon = icons[val] || AlertCircle;
                return (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${colors[val] || colors.yellow}`}>
                        <Icon size={12} />
                        {val?.toUpperCase() || 'UNKNOWN'}
                    </span>
                );
            }
        },
        { 
            key: 'status', 
            label: 'Status',
            render: (val) => (
                <span className={`text-xs ${val === 'open' ? 'text-text-main' : 'text-text-muted'}`}>
                    {val?.toUpperCase()}
                </span>
            )
        },
        { 
            key: 'docsCount', 
            label: 'Documents',
            render: (val) => (
                <span className="text-xs text-text-main">{val.toLocaleString()}</span>
            )
        },
        { 
            key: 'storeSize', 
            label: 'Size',
            render: (val) => (
                <span className="text-xs text-text-main">{formatBytes(val)}</span>
            )
        }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                        <Database className="text-primary-400" size={24} />
                        Index Overview
                    </h2>
                    <p className="text-sm text-text-muted mt-1">
                        Real-time view of indices from the connected OpenSearch cluster
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        type="button"
                        onClick={handleCleanup}
                        disabled={cleanupStatus === 'cleaning'}
                        variant="warning"
                        title="Remove old tenant-* index patterns"
                    >
                        <Trash2 size={16} />
                        {cleanupStatus === 'cleaning' ? 'Cleaning...' : 'Clean Up'}
                    </Button>
                    <Button
                        type="button"
                        onClick={loadIndices}
                        disabled={loading}
                        variant="info"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <StatCard 
                    icon={Layers} 
                    label="Total Indices" 
                    value={totalIndices} 
                />
                <StatCard 
                    icon={FileText} 
                    label="Total Documents" 
                    value={totalDocs.toLocaleString()} 
                    subtext={`${formatBytes(totalSize)} total`}
                />
                <StatCard 
                    icon={CheckCircle} 
                    label="Healthy" 
                    value={healthyIndices} 
                />
                <StatCard 
                    icon={AlertCircle} 
                    label="Warning" 
                    value={yellowIndices} 
                />
                <StatCard 
                    icon={XCircle} 
                    label="Critical" 
                    value={redIndices} 
                />
                <StatCard 
                    icon={HardDrive} 
                    label="Storage Used" 
                    value={formatBytes(totalSize)} 
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Indices by Documents */}
                <div className="bg-bg-card border border-border-subtle rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <FileText size={18} className="text-primary-400" />
                        <h3 className="font-semibold text-text-main">Top Indices by Document Count</h3>
                    </div>
                    {topIndicesByDocs.length > 0 ? (
                        <BarChart 
                            data={topIndicesByDocs} 
                            labelKey="name" 
                            valueKey="docsCount"
                        />
                    ) : (
                        <div className="text-center py-8 text-text-muted text-sm">
                            {loading ? 'Loading...' : 'No data available'}
                        </div>
                    )}
                </div>

                {/* Top Indices by Size */}
                <div className="bg-bg-card border border-border-subtle rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <HardDrive size={18} className="text-text-main" />
                        <h3 className="font-semibold text-text-main">Top Indices by Size</h3>
                    </div>
                    {topIndicesBySize.length > 0 ? (
                        <BarChart 
                            data={topIndicesBySize.map(idx => ({...idx, storeSizeMB: Math.round(idx.storeSize / 1024 / 1024)}))} 
                            labelKey="name" 
                            valueKey="storeSizeMB"
                        />
                    ) : (
                        <div className="text-center py-8 text-text-muted text-sm">
                            {loading ? 'Loading...' : 'No data available'}
                        </div>
                    )}
                    <div className="text-xs text-text-muted mt-2 text-right">Size in MB</div>
                </div>
            </div>

            {/* Indices Table */}
            <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border-subtle flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Layers size={18} className="text-primary-400" />
                        <h3 className="font-semibold text-text-main">All Indices</h3>
                    </div>
                    <div className="flex-1 relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                        <Input
                            type="text"
                            placeholder="Search indices..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <div className="text-sm text-text-muted">
                        Showing {filteredIndices.length} of {totalIndices} indices
                    </div>
                </div>
                
                <DataTable
                    columns={columns}
                    data={filteredIndices}
                    loading={loading}
                    pageSize={15}
                    searchable={false}
                    onRowClick={(row) => setSelectedIndex(row)}
                />
            </div>

            {/* Health Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-bg-card border border-border-subtle rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <CheckCircle size={16} className="text-success" />
                        <span className="text-sm font-medium text-text-main">Green Indices</span>
                    </div>
                    <div className="text-2xl font-bold text-success">{healthyIndices}</div>
                    <div className="text-xs text-text-muted">Fully healthy shards</div>
                </div>
                
                <div className="bg-bg-card border border-border-subtle rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertCircle size={16} className="text-text-main" />
                        <span className="text-sm font-medium text-text-main">Yellow Indices</span>
                    </div>
                    <div className="text-2xl font-bold text-text-main">{yellowIndices}</div>
                    <div className="text-xs text-text-muted">Some replica shards unassigned</div>
                </div>
                
                <div className="bg-bg-card border border-border-subtle rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <XCircle size={16} className="text-destructive" />
                        <span className="text-sm font-medium text-text-main">Red Indices</span>
                    </div>
                    <div className="text-2xl font-bold text-destructive">{redIndices}</div>
                    <div className="text-xs text-text-muted">Some primary shards unassigned</div>
                </div>
            </div>
        </div>
    );
}
