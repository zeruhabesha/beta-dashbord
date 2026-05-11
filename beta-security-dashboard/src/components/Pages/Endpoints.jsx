import React, { useState, useEffect } from 'react';
import { DataTable } from '../Common/DataTable';
import { Monitor, Server, Laptop, CheckCircle2, AlertCircle } from 'lucide-react';

export function Endpoints() {
    // Mocking endpoint data for this demo view
    const [data] = useState([
        { id: 1, name: 'SOC-ANALSYST-L1', type: 'Workstation', os: 'Windows 11', status: 'Online', ip: '192.168.1.12', version: '4.7.2' },
        { id: 2, name: 'SRV-DOMAIN-01', type: 'Server', os: 'Ubuntu 22.04', status: 'Online', ip: '10.0.5.2', version: '4.7.2' },
        { id: 3, name: 'SRV-SQL-PROD', type: 'Server', os: 'RHEL 9.1', status: 'Warning', ip: '10.0.5.10', version: '4.7.0', alerts: 3 },
        { id: 4, name: 'EXEC-MBP-14', type: 'Workstation', os: 'macOS 14.2', status: 'Offline', ip: '192.168.2.44', version: '4.7.1' },
    ]);

    const columns = [
        {
            key: 'name', label: 'Endpoint Name', render: (val, row) => (
                <div className="flex items-center gap-3">
                    {row.type === 'Server' ? <Server size={18} className="text-text-main" /> : <Laptop size={18} className="text-text-main" />}
                    <span className="font-bold text-text-main">{val}</span>
                </div>
            )
        },
        {
            key: 'status', label: 'Status', render: (val) => (
                <div className="flex items-center gap-2">
                    {val === 'Online' ? <CheckCircle2 size={16} className="text-text-main" /> : <AlertCircle size={16} className={val === 'Offline' ? 'text-text-muted' : 'text-text-main'} />}
                    <span className={val === 'Online' ? 'text-text-main font-medium' : val === 'Offline' ? 'text-text-muted' : 'text-text-main font-medium'}>
                        {val}
                    </span>
                </div>
            )
        },
        { key: 'os', label: 'Operating System' },
        { key: 'ip', label: 'IP Address', render: (val) => <code className="text-xs bg-bg-body px-1.5 py-0.5 rounded text-text-muted">{val}</code> },
        { key: 'version', label: 'Agent Version' }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-text-main">Endpoint Inventory</h1>
                    <p className="text-text-muted text-sm mt-1">Manage and monitor security agents across your infrastructure.</p>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={data}
                loading={false}
            />
        </div>
    );
}
