import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Award, RefreshCw, Filter, X, DollarSign, TrendingUp, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAdminAnalyticsData } from '@/hooks/useAdminAnalyticsData';
import { ParsedPolicyItem } from '@/lib/mondayApi';

interface CarrierPerformanceData {
  name: string;
  totalPlacements: number;
  totalPremium: number;
  avgPremium: number;
}

export const CarriersPage = () => {
  const { toast } = useToast();

  // Filters state
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>(['Issued Paid', 'Pending', 'Issued Not Paid']);

  // Use React Query for data fetching
  const { 
    data: placements = [], 
    isLoading, 
    isError, 
    error,
    refetch,
    isFetching
  } = useAdminAnalyticsData(true);

  // Helper functions
  const getColumnValue = (item: ParsedPolicyItem, columnId: string): string => {
    const column = item.column_values?.find(col => col.id === columnId);
    return column?.text || '';
  };

  const getPremium = (item: ParsedPolicyItem): number => {
    const premiumText = getColumnValue(item, 'numbers');
    return premiumText ? parseFloat(premiumText.replace(/[^0-9.-]+/g, '')) || 0 : 0;
  };

  useEffect(() => {
    if (isError) {
      toast({
        title: "Error fetching data",
        description: error?.message || "Unable to load analytics data. Please try again.",
        variant: "destructive",
      });
    }
  }, [isError, error, toast]);

  // Filter placements based on current filters
  const getFilteredPlacements = () => {
    let filtered = placements;

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(p => {
        const dateStr = getColumnValue(p, 'date_mkq1d86z');
        if (!dateStr) return false;
        const placementDate = new Date(dateStr);

        switch (dateFilter) {
          case '24hours': {
            const dayAgo = new Date(now);
            dayAgo.setHours(now.getHours() - 24);
            return placementDate >= dayAgo && placementDate <= now;
          }
          case '7days': {
            const weekAgo = new Date(now);
            weekAgo.setDate(now.getDate() - 7);
            return placementDate >= weekAgo && placementDate <= now;
          }
          case '30days': {
            const monthAgo = new Date(now);
            monthAgo.setDate(now.getDate() - 30);
            return placementDate >= monthAgo && placementDate <= now;
          }
          case '6months': {
            const sixMonthsAgo = new Date(now);
            sixMonthsAgo.setMonth(now.getMonth() - 6);
            return placementDate >= sixMonthsAgo && placementDate <= now;
          }
          case 'custom': {
            if (startDate && endDate) {
              const start = new Date(startDate);
              const end = new Date(endDate);
              end.setHours(23, 59, 59, 999);
              return placementDate >= start && placementDate <= end;
            }
            return true;
          }
          default:
            return true;
        }
      });
    }

    // Status filter
    if (statusFilter.length > 0) {
      filtered = filtered.filter(p => {
        const status = getColumnValue(p, 'status');
        return statusFilter.includes(status);
      });
    }

    return filtered;
  };

  const filteredPlacements = getFilteredPlacements();

  // Get unique statuses
  const uniqueStatuses = Array.from(
    new Set(placements.map(p => getColumnValue(p, 'status')).filter(Boolean))
  ).sort();

  // Calculate carrier performance data
  const getCarrierPerformance = (): CarrierPerformanceData[] => {
    const carrierMap = new Map<string, {
      totalPlacements: number;
      totalPremium: number;
    }>();

    filteredPlacements.forEach(p => {
      const carrier = getColumnValue(p, 'color_mknkq2qd');
      if (carrier) {
        const existing = carrierMap.get(carrier) || { totalPlacements: 0, totalPremium: 0 };
        carrierMap.set(carrier, {
          totalPlacements: existing.totalPlacements + 1,
          totalPremium: existing.totalPremium + getPremium(p)
        });
      }
    });

    return Array.from(carrierMap.entries())
      .map(([name, data]) => ({
        name,
        ...data,
        avgPremium: data.totalPlacements > 0 ? data.totalPremium / data.totalPlacements : 0
      }))
      .sort((a, b) => b.totalPlacements - a.totalPlacements);
  };

  const carrierPerformance = isLoading ? [] : getCarrierPerformance();

  // Summary stats
  const totalPlacements = filteredPlacements.length;
  const totalPremium = filteredPlacements.reduce((sum, p) => sum + getPremium(p), 0);
  const avgPremium = totalPlacements > 0 ? totalPremium / totalPlacements : 0;
  const activeCarriers = carrierPerformance.length;

  const handleClearFilters = () => {
    setDateFilter('all');
    setStatusFilter(['Issued Paid', 'Pending', 'Issued Not Paid']);
    setStartDate('');
    setEndDate('');
  };

  const handleRefresh = async () => {
    toast({
      title: "Refreshing data...",
      description: "Fetching latest policy placements from Monday.com",
    });
    
    await refetch();
    
    toast({
      title: "Data refreshed",
      description: `Updated with ${placements.length} policy placements`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-orange-50 border-orange-100">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-orange-700 font-medium">Active Carriers</span>
            </div>
            <p className="text-2xl font-bold text-orange-900">{activeCarriers}</p>
            <p className="text-xs text-orange-600 mt-1">With placements</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Award className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700 font-medium">Total Placements</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{totalPlacements.toLocaleString()}</p>
            <p className="text-xs text-blue-600 mt-1">In selected period</p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-100">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700 font-medium">Total Premium</span>
            </div>
            <p className="text-2xl font-bold text-green-900">${totalPremium.toLocaleString()}</p>
            <p className="text-xs text-green-600 mt-1">Combined premium</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-purple-700 font-medium">Avg Premium</span>
            </div>
            <p className="text-2xl font-bold text-purple-900">${Math.round(avgPremium).toLocaleString()}</p>
            <p className="text-xs text-purple-600 mt-1">Per placement</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filters</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <Button variant="default" size="sm" onClick={handleRefresh} disabled={isFetching}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Time Period Filter */}
            <div className="space-y-2">
              <Label htmlFor="date-filter">Time Period</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger id="date-filter">
                  <SelectValue />
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

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Issue Status</Label>
              <div className="flex flex-wrap gap-2">
                {uniqueStatuses.map(status => (
                  <Badge
                    key={status}
                    variant={statusFilter.includes(status) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      setStatusFilter(prev =>
                        prev.includes(status)
                          ? prev.filter(s => s !== status)
                          : [...prev, status]
                      );
                    }}
                  >
                    {status}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Custom Date Range */}
          {dateFilter === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Carrier Performance Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="h-5 w-5" />
            <span>Carrier Performance</span>
            <Badge variant="outline">{carrierPerformance.length} Carriers</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading carrier data...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {carrierPerformance.map((carrier, index) => (
                <Card key={carrier.name} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 text-orange-600 font-bold">
                          #{index + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{carrier.name}</h3>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">{carrier.totalPlacements}</p>
                          <p className="text-xs text-muted-foreground">Placements</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">
                            ${carrier.totalPremium.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Total Premium</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-600">
                            ${Math.round(carrier.avgPremium).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Avg Premium</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {carrierPerformance.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No carrier data available for the selected filters
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CarriersPage;
