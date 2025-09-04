import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { CalendarIcon, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface GridToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  dateFilter?: Date;
  onDateFilterChange: (date: Date | undefined) => void;
  totalRows: number;
}

export const GridToolbar = ({
  searchTerm,
  onSearchChange,
  dateFilter,
  onDateFilterChange,
  totalRows
}: GridToolbarProps) => {
  const clearDateFilter = () => {
    onDateFilterChange(undefined);
  };

  const clearSearch = () => {
    onSearchChange("");
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-card rounded-lg border">
      {/* Search */}
      <div className="flex-1 max-w-sm">
        <Label htmlFor="search" className="text-sm font-medium">
          Search Records
        </Label>
        <div className="relative mt-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="search"
            placeholder="Search by name, phone, agent, etc..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Date Filter */}
      <div>
        <Label className="text-sm font-medium">
          Filter by Date
        </Label>
        <div className="flex items-center gap-2 mt-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal min-w-[140px]",
                  !dateFilter && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFilter ? format(dateFilter, "PPP") : "All dates"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFilter}
                onSelect={onDateFilterChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          {dateFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearDateFilter}
              className="h-8 w-8 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        <strong>{totalRows}</strong> records found
      </div>
    </div>
  );
};
