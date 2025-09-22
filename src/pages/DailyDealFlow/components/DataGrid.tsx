import { useState, useMemo } from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { DailyDealFlowRow } from "../DailyDealFlowPage";
import { EditableRow } from "./EditableRow";

interface DataGridProps {
  data: DailyDealFlowRow[];
  onDataUpdate: () => void;
  hasWritePermissions?: boolean;
}

export const DataGrid = ({ data, onDataUpdate, hasWritePermissions = true }: DataGridProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [groupBy, setGroupBy] = useState<string>('none');
  const itemsPerPage = 50;

  const groupByOptions = [
    { value: 'none', label: 'No Grouping' },
    { value: 'lead_vendor', label: 'Lead Vendor' },
    { value: 'buffer_agent', label: 'Buffer Agent' },
    { value: 'agent', label: 'Agent' },
    { value: 'licensed_agent_account', label: 'Licensed Agent' },
    { value: 'status', label: 'Status' },
    { value: 'call_result', label: 'Call Result' }
  ];

  const columns = [
    "S.No", "Date", "Lead Vendor", "Insured Name", "Buffer Agent", "Agent", "Licensed Account", "Status",
    "Call Result", "Carrier", "Product Type", "Draft Date", "MP", "Face Amount", "Notes"
  ];
  
  // Add Actions column only for users with write permissions
  if (hasWritePermissions) {
    columns.push("Actions");
  }

  // Sort data based on group by selection
  const sortedData = useMemo(() => {
    if (groupBy === 'none') return data;

    return [...data].sort((a, b) => {
      const aValue = a[groupBy as keyof DailyDealFlowRow] || '';
      const bValue = b[groupBy as keyof DailyDealFlowRow] || '';

      // Handle null/undefined values
      if (!aValue && !bValue) return 0;
      if (!aValue) return 1;
      if (!bValue) return -1;

      return String(aValue).localeCompare(String(bValue));
    });
  }, [data, groupBy]);

  // Calculate pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = useMemo(() => sortedData.slice(startIndex, endIndex), [sortedData, startIndex, endIndex]);

  // Pagination handlers
  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const goToPrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

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
              setCurrentPage(1); // Reset to first page when grouping changes
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
          {currentData.map((row, index) => (
            <EditableRow 
              key={row.id} 
              row={row} 
              rowIndex={startIndex + index} 
              serialNumber={startIndex + index + 1}
              onUpdate={onDataUpdate}
              hasWritePermissions={hasWritePermissions}
            />
          ))}
        </TableBody>
      </Table>

      {data.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No data available
        </div>
      )}

      {/* Pagination Controls */}
      {sortedData.length > 0 && (
        <div className="flex items-center justify-between px-4 py-4 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, sortedData.length)} of {sortedData.length} entries
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
