import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DailyDealFlowRow } from "../DailyDealFlowPage";
import { EditableRow } from "./EditableRow";

interface DataGridProps {
  data: DailyDealFlowRow[];
  onDataUpdate: () => void;
}

export const DataGrid = ({ data, onDataUpdate }: DataGridProps) => {

  const columns = [
    "Date", "Lead Vendor", "Insured Name", "Agent", "Licensed Account", "Status",
    "Call Result", "Carrier", "Product Type", "Notes", "Actions"
  ];

  // Row editing and saving handled inside page-level EditableRow

  return (
    <div className="w-full">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column} className={
                column === 'Date' ? 'w-24' :
                column === 'Lead Vendor' ? 'w-32' :
                column === 'Insured Name' ? 'w-40' :
                column === 'Agent' ? 'w-24' :
                column === 'Licensed Account' ? 'w-28' :
                column === 'Status' ? 'w-32' :
                column === 'Call Result' ? 'w-28' :
                column === 'Carrier' ? 'w-28' :
                column === 'Product Type' ? 'w-24' :
                column === 'Notes' ? 'max-w-md' :
                column === 'Actions' ? 'w-24' : ''
              }>
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <EditableRow key={row.id} row={row} onUpdate={onDataUpdate} />
          ))}
        </TableBody>
      </Table>

      {data.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No data available
        </div>
      )}
    </div>
  );
};
