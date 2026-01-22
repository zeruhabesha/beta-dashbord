import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Search, Download, Filter } from 'lucide-react';
import clsx from 'clsx';

export const DataTable = ({
    columns,
    data,
    loading = false,
    onRowClick,
    actions,
    searchable = true,
    exportable = false,
    filterable = false,
    pageSize = 10
}) => {
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Sorting
    const handleSort = (columnKey) => {
        if (sortColumn === columnKey) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(columnKey);
            setSortDirection('asc');
        }
    };

    // Filtering
    const filteredData = data.filter(row => {
        if (!searchTerm) return true;
        return Object.values(row).some(value =>
            String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    // Sorting
    const sortedData = [...filteredData].sort((a, b) => {
        if (!sortColumn) return 0;
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    // Pagination
    const totalPages = Math.ceil(sortedData.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedData = sortedData.slice(startIndex, startIndex + pageSize);

    if (loading) {
        return (
            <div className="bg-bg-card border border-border-subtle rounded-lg p-6">
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-12 bg-bg-body rounded animate-pulse"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-bg-card border border-border-subtle rounded-lg overflow-hidden">
            {/* Table Header Actions */}
            {(searchable || exportable || filterable) && (
                <div className="p-4 border-b border-border-subtle flex items-center gap-3">
                    {searchable && (
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full bg-bg-body border border-border-subtle rounded-lg py-2 pl-10 pr-4 text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary-500 transition-colors"
                            />
                        </div>
                    )}
                    {filterable && (
                        <button className="px-4 py-2 bg-bg-body border border-border-subtle rounded-lg text-sm text-text-muted hover:text-text-main hover:border-primary-500/30 transition-all flex items-center gap-2">
                            <Filter size={16} />
                            Filters
                        </button>
                    )}
                    {exportable && (
                        <button className="px-4 py-2 bg-bg-body border border-border-subtle rounded-lg text-sm text-text-muted hover:text-text-main hover:border-primary-500/30 transition-all flex items-center gap-2">
                            <Download size={16} />
                            Export
                        </button>
                    )}
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-bg-body/50 border-b border-border-subtle">
                        <tr>
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    onClick={() => column.sortable !== false && handleSort(column.key)}
                                    className={clsx(
                                        "px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider",
                                        column.sortable !== false && "cursor-pointer hover:text-primary-400 transition-colors select-none"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        {column.label}
                                        {column.sortable !== false && sortColumn === column.key && (
                                            sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                        )}
                                    </div>
                                </th>
                            ))}
                            {actions && <th className="px-6 py-3 text-right text-xs font-semibold text-text-muted uppercase">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                        {paginatedData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-12 text-center text-text-muted">
                                    No data available
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((row, rowIndex) => (
                                <tr
                                    key={rowIndex}
                                    onClick={() => onRowClick && onRowClick(row)}
                                    className={clsx(
                                        "transition-colors",
                                        onRowClick && "cursor-pointer hover:bg-bg-body/50"
                                    )}
                                >
                                    {columns.map((column) => (
                                        <td key={column.key} className="px-6 py-4 text-sm text-text-main whitespace-nowrap">
                                            {column.render ? column.render(row[column.key], row) : row[column.key]}
                                        </td>
                                    ))}
                                    {actions && (
                                        <td className="px-6 py-4 text-right text-sm">
                                            <div className="flex items-center justify-end gap-2">
                                                {actions(row)}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-border-subtle flex items-center justify-between">
                    <div className="text-sm text-text-muted">
                        Showing {startIndex + 1} to {Math.min(startIndex + pageSize, sortedData.length)} of {sortedData.length} results
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 bg-bg-body border border-border-subtle rounded text-sm text-text-muted hover:text-text-main hover:border-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-text-muted">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 bg-bg-body border border-border-subtle rounded text-sm text-text-muted hover:text-text-main hover:border-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
