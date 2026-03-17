import React, { useState, useEffect } from 'react';
import { DataTable } from '../Common/DataTable';
import { fetchLogs } from '../../api/opensearch';

export function Events({ type = 'Security Events' }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const logs = await fetchLogs({ timeRange: '24h' });
            setData(logs);
            setLoading(false);
        };
        load();
    }, [type]);

    const columns = [
        { key: 'timestamp', label: 'Timestamp', render: (val) => new Date(val).toLocaleString() },
        {
            key: 'category', label: 'Category', render: (val) => (
                <span className={`px-2 py-1 rounded text-xs font-semibold ${val === 'FAILED_LOGIN' ? 'bg-red-900/30 text-red-500' : 'bg-blue-900/30 text-blue-500'
                    }`}>
                    {val}
                </span>
            )
        },
        { key: 'user', label: 'User' },
        { key: 'source_ip', label: 'Source IP' },
        { key: 'node', label: 'Node' },
        {
            key: 'message', label: 'Message', render: (val) => (
                <div className="max-w-md truncate font-mono text-xs opacity-70" title={val}>
                    {val}
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-text-main">{type}</h1>
                    <p className="text-text-muted text-sm mt-1">Real-time analysis of {type.toLowerCase()} from all monitored sources.</p>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={data}
                loading={loading}
                searchable={true}
                exportable={true}
            />
        </div>
    );
}
