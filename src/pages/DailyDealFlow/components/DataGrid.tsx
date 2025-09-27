import { useState, useMemo } from 'react';
import React from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { DailyDealFlowRow } from "../DailyDealFlowPage";
import { EditableRow } from "./EditableRow";

interface DataGridProps {
  data: DailyDealFlowRow[];
  onDataUpdate: () => void;
  hasWritePermissions?: boolean;
  currentPage?: number;
  totalRecords?: number;
  recordsPerPage?: number;
  onPageChange?: (page: number) => void;
}

export const DataGrid = ({ 
  data, 
  onDataUpdate, 
  hasWritePermissions = true,
  currentPage = 1,
  totalRecords = 0,
  recordsPerPage = 50,
  onPageChange
}: DataGridProps) => {
  const [groupBy, setGroupBy] = useState<string>('none');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const groupByOptions = [
    { value: 'none', label: 'No Grouping' },
    { value: 'lead_vendor', label: 'Lead Vendor' },
    { value: 'buffer_agent', label: 'Buffer Agent' },
    { value: 'agent', label: 'Agent' },
    { value: 'licensed_agent_account', label: 'Licensed Agent' },
    { value: 'status', label: 'Status' },
    { value: 'call_result', label: 'Call Result' },
    { value: 'carrier', label: 'Carrier' },
    { value: 'product_type', label: 'Product Type' },
    { value: 'is_callback', label: 'Callback' }
  ];

  const columns = [
    "S.No", "Date", "Lead Vendor", "Insured Name", "Phone Number", "Buffer Agent", "Agent", "Licensed Account", "Status",
    "Call Result", "Carrier", "Product Type", "Draft Date", "MP", "Face Amount", "Notes"
  ];
  
  // Add Actions column only for users with write permissions
  if (hasWritePermissions) {
    columns.push("Actions");
  }

  // Group data based on group by selection
  const groupedData = useMemo(() => {
    if (groupBy === 'none') {
      return { groups: [], ungroupedData: data };
    }

    const groups: { [key: string]: DailyDealFlowRow[] } = {};
    
    data.forEach(row => {
      let groupValue: string | boolean | undefined;
      
      if (groupBy === 'is_callback') {
        // Special handling for callback field
        groupValue = row.is_callback ? 'Callback' : 'Regular Lead';
      } else {
        groupValue = row[groupBy as keyof DailyDealFlowRow] || 'N/A';
      }
      
      const groupKey = String(groupValue);
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(row);
    });

    // Sort groups alphabetically and sort items within each group
    const sortedGroups = Object.keys(groups)
      .sort()
      .map(groupKey => ({
        key: groupKey,
        label: groupKey,
        items: groups[groupKey].sort((a, b) => {
          // Sort within group by date (newest first)
          const aDate = new Date(a.date || a.created_at || '1970-01-01');
          const bDate = new Date(b.date || b.created_at || '1970-01-01');
          return bDate.getTime() - aDate.getTime();
        }),
        count: groups[groupKey].length
      }));

    return { groups: sortedGroups, ungroupedData: [] };
  }, [data, groupBy]);

  // Detect duplicate rows based on insured_name, client_phone_number, and lead_vendor
  const duplicateRows = useMemo(() => {
    const seen = new Map<string, number>();
    const duplicates = new Set<string>();

    data.forEach(row => {
      const key = `${row.insured_name || ''}|${row.client_phone_number || ''}|${row.lead_vendor || ''}`;
      const count = seen.get(key) || 0;
      seen.set(key, count + 1);
      if (count + 1 > 1) {
        duplicates.add(key);
      }
    });

    return duplicates;
  }, [data]);

  // Check if a row is duplicate
  const isRowDuplicate = (row: DailyDealFlowRow) => {
    const key = `${row.insured_name || ''}|${row.client_phone_number || ''}|${row.lead_vendor || ''}`;
    return duplicateRows.has(key);
  };

  // Toggle group expansion
  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  // Expand/collapse all groups
  const toggleAllGroups = (expand: boolean) => {
    if (expand) {
      const allKeys = new Set(groupedData.groups.map(g => g.key));
      setExpandedGroups(allKeys);
    } else {
      setExpandedGroups(new Set());
    }
  };

  // Calculate pagination based on server-side data
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + data.length;

  // Pagination handlers
  const goToFirstPage = () => onPageChange?.(1);
  const goToLastPage = () => onPageChange?.(totalPages);
  const goToNextPage = () => onPageChange?.(Math.min(currentPage + 1, totalPages));
  const goToPrevPage = () => onPageChange?.(Math.max(currentPage - 1, 1));

  // Row editing and saving handled inside page-level EditableRow

  return (
    <div className="w-full">
      {/* Group By Selector */}
      <div className="flex items-center justify-between mb-4 px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Group by:</span>
            <Select value={groupBy} onValueChange={(value) => {
              setGroupBy(value);
              setExpandedGroups(new Set()); // Reset expanded groups when changing grouping
              // Reset to first page when grouping changes
              if (onPageChange) {
                onPageChange(1);
              }
            }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select grouping field" />
              </SelectTrigger>
              <SelectContent>
                {groupByOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {groupBy !== 'none' && groupedData.groups.length > 0 && (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => toggleAllGroups(true)}
                className="text-xs"
              >
                Expand All
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => toggleAllGroups(false)}
                className="text-xs"
              >
                Collapse All
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#9CA3AF #F3F4F6' }}>
        <Table className="min-w-full">
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column} className={
                column === 'S.No' ? 'w-12' :
                column === 'Date' ? 'w-20' :
                column === 'Lead Vendor' ? 'w-20' :
                column === 'Insured Name' ? 'w-32' :
                column === 'Phone Number' ? 'w-28' :
                column === 'Buffer Agent' ? 'w-24' :
                column === 'Agent' ? 'w-20' :
                column === 'Licensed Account' ? 'w-24' :
                column === 'Status' ? 'w-32' :
                column === 'Call Result' ? 'w-24' :
                column === 'Carrier' ? 'w-16' :
                column === 'Product Type' ? 'w-20' :
                column === 'Draft Date' ? 'w-20' :
                column === 'MP' ? 'w-16' :
                column === 'Face Amount' ? 'w-20' :
                column === 'Notes' ? 'w-32' :
                column === 'Actions' ? 'w-20' : ''
              }>
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupBy === 'none' ? (
            // Render ungrouped data
            data.map((row, index) => (
              <EditableRow 
                key={row.id} 
                row={row} 
                rowIndex={startIndex + index} 
                serialNumber={startIndex + index + 1}
                onUpdate={onDataUpdate}
                hasWritePermissions={hasWritePermissions}
                isDuplicate={isRowDuplicate(row)}
              />
            ))
          ) : (
            // Render grouped data
            groupedData.groups.map((group) => (
              <React.Fragment key={group.key}>
                {/* Group Header */}
                <TableRow className="bg-muted/50 hover:bg-muted/70">
                  <td colSpan={columns.length} className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleGroup(group.key)}
                        className="h-6 w-6 p-0"
                      >
                        {expandedGroups.has(group.key) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4" />
                        )}
                      </Button>
                      <span className="font-semibold text-sm">
                        {group.label} ({group.count} {group.count === 1 ? 'entry' : 'entries'})
                      </span>
                    </div>
                  </td>
                </TableRow>
                
                {/* Group Items */}
                {expandedGroups.has(group.key) && group.items.map((row, groupIndex) => {
                  // Calculate global index for serial number
                  const globalIndex = groupedData.groups
                    .slice(0, groupedData.groups.findIndex(g => g.key === group.key))
                    .reduce((sum, g) => sum + (expandedGroups.has(g.key) ? g.items.length : 0), 0) + groupIndex;
                  
                  return (
                    <EditableRow 
                      key={row.id} 
                      row={row} 
                      rowIndex={startIndex + globalIndex} 
                      serialNumber={startIndex + globalIndex + 1}
                      onUpdate={onDataUpdate}
                      hasWritePermissions={hasWritePermissions}
                      isDuplicate={isRowDuplicate(row)}
                    />
                  );
                })}
              </React.Fragment>
            ))
          )}
        </TableBody>
      </Table>

      {((groupBy === 'none' && data.length === 0) || (groupBy !== 'none' && groupedData.groups.length === 0)) && (
        <div className="text-center py-8 text-muted-foreground">
          No data available
        </div>
      )}

      {/* Pagination Controls */}
      {totalRecords > 0 && (
        <div className="flex items-center justify-between px-4 py-4 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, totalRecords)} of {totalRecords} entries
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToFirstPage}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center space-x-1">
              <span className="text-sm text-muted-foreground">Page</span>
              <span className="text-sm font-medium">{currentPage}</span>
              <span className="text-sm text-muted-foreground">of</span>
              <span className="text-sm font-medium">{totalPages}</span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToLastPage}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
