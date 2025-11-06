import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Filter, RefreshCw } from 'lucide-react';

interface AnalyticsFiltersProps {
  dateFilter: string;
  carrierFilter: string;
  statusFilter: string[];
  startDate: string;
  endDate: string;
  uniqueCarriers: string[];
  uniqueStatuses: string[];
  onDateFilterChange: (value: string) => void;
  onCarrierFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string[]) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onClearFilters: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const AnalyticsFilters = ({
  dateFilter,
  carrierFilter,
  statusFilter,
  startDate,
  endDate,
  uniqueCarriers,
  uniqueStatuses,
  onDateFilterChange,
  onCarrierFilterChange,
  onStatusFilterChange,
  onStartDateChange,
  onEndDateChange,
  onClearFilters,
  onRefresh,
  isRefreshing
}: AnalyticsFiltersProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Date Filter */}
          <div className="space-y-2">
            <Label htmlFor="date-filter">Time Period</Label>
            <Select value={dateFilter} onValueChange={onDateFilterChange}>
              <SelectTrigger id="date-filter">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="24hours">Last 24 Hours</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter (Multi-Select) */}
          <div className="space-y-2">
            <Label htmlFor="status-filter">Issue Status</Label>
            <MultiSelect
              options={uniqueStatuses}
              selected={statusFilter}
              onChange={onStatusFilterChange}
              placeholder="Select statuses (multi-select)"
              className="w-full"
            />
          </div>

          {/* Carrier Filter */}
          <div className="space-y-2">
            <Label htmlFor="carrier-filter">Carrier</Label>
            <Select value={carrierFilter} onValueChange={onCarrierFilterChange}>
              <SelectTrigger id="carrier-filter">
                <SelectValue placeholder="All Carriers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Carriers</SelectItem>
                {uniqueCarriers.map(carrier => (
                  <SelectItem key={carrier} value={carrier}>
                    {carrier}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          <div className="space-y-2">
            <Label className="invisible">Clear</Label>
            <Button
              variant="outline"
              className="w-full"
              onClick={onClearFilters}
            >
              Clear All Filters
            </Button>
          </div>
        </div>

        {/* Custom Date Range */}
        {dateFilter === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
