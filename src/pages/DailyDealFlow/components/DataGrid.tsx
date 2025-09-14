import { useState, useMemo } from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { DailyDealFlowRow } from "../DailyDealFlowPage";
import { EditableRow } from "./EditableRow";

interface DataGridProps {
  data: DailyDealFlowRow[];
  onDataUpdate: () => void;
}

export const DataGrid = ({ data, onDataUpdate }: DataGridProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const columns = [
    "Date", "Lead Vendor", "Insured Name", "Buffer Agent", "Agent", "Licensed Account", "Status",
    "Call Result", "Carrier", "Product Type", "Draft Date", "MP", "Face Amount", "Notes", "Actions"
  ];

  // Calculate pagination
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = useMemo(() => data.slice(startIndex, endIndex), [data, startIndex, endIndex]);

  // Pagination handlers
  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const goToPrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  // Row editing and saving handled inside page-level EditableRow

  return (
    <div className="w-full overflow-x-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#9CA3AF #F3F4F6' }}>
      <Table className="min-w-full">
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column} className={
                column === 'Date' ? 'w-20' :
                column === 'Lead Vendor' ? 'w-20' :
                column === 'Insured Name' ? 'w-14' :
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
                column === 'Notes' ? 'w-28' :
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
              onUpdate={onDataUpdate} 
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
      {data.length > 0 && (
        <div className="flex items-center justify-between px-4 py-4 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, data.length)} of {data.length} entries
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
  );
};
