import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Search, Download, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';

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
            <Card className="p-6">
                <div className="flex flex-col gap-3">
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12" />
                    ))}
                </div>
            </Card>
        );
    }

    return (
        <Card className="overflow-hidden">
            {/* Table Header Actions */}
            {(searchable || exportable || filterable) && (
                <div className="flex items-center gap-3 border-b p-4">
                    {searchable && (
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                            <Input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="pl-10"
                            />
                        </div>
                    )}
                    {filterable && (
                        <Button variant="outline" type="button">
                            <Filter size={16} />
                            Filters
                        </Button>
                    )}
                    {exportable && (
                        <Button variant="outline" type="button">
                            <Download size={16} />
                            Export
                        </Button>
                    )}
                </div>
            )}

            {/* Table */}
            <Table>
                <TableHeader className="bg-muted/40">
                    <TableRow>
                        {columns.map((column) => (
                            <TableHead
                                key={column.key}
                                onClick={() => column.sortable !== false && handleSort(column.key)}
                                className={cn(
                                    'px-6 text-xs font-semibold uppercase tracking-wider',
                                    column.sortable !== false && 'cursor-pointer select-none hover:text-foreground'
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    {column.label}
                                    {column.sortable !== false && sortColumn === column.key && (
                                        sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                    )}
                                </div>
                            </TableHead>
                        ))}
                        {actions && <TableHead className="px-6 text-right text-xs font-semibold uppercase">Actions</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedData.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-12 text-center text-muted-foreground">
                                No data available
                            </TableCell>
                        </TableRow>
                    ) : (
                        paginatedData.map((row, rowIndex) => (
                            <TableRow
                                key={rowIndex}
                                onClick={() => onRowClick && onRowClick(row)}
                                className={cn(onRowClick && 'cursor-pointer')}
                            >
                                {columns.map((column) => (
                                    <TableCell key={column.key} className="px-6 py-4 whitespace-nowrap text-foreground">
                                        {column.render ? column.render(row[column.key], row) : row[column.key]}
                                    </TableCell>
                                ))}
                                {actions && (
                                    <TableCell className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {actions(row)}
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-6 py-4">
                    <div className="text-sm text-muted-foreground">
                        Showing {startIndex + 1} to {Math.min(startIndex + pageSize, sortedData.length)} of {sortedData.length} results
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Page {currentPage} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    );
};
