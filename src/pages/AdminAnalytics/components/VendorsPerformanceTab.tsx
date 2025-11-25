import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Building2, Phone, Users, TrendingUp, Calendar, RefreshCw, Filter, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface VendorTransferData {
  vendor_name: string;
  total_transfers: number;
  daily_average: number;
}

interface VendorsPerformanceTabProps {
  vendorPerformance?: any[];
}

export const VendorsPerformanceTab = ({ vendorPerformance }: VendorsPerformanceTabProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<string[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [vendorStats, setVendorStats] = useState<VendorTransferData[]>([]);
  
  // Time range filter
  const [timeRange, setTimeRange] = useState<string>('7days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    if (vendors.length > 0) {
      fetchVendorPerformance();
    }
  }, [selectedVendors, timeRange, customStartDate, customEndDate, vendors]);

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_deal_flow')
        .select('lead_vendor')
        .not('lead_vendor', 'is', null);

      if (error) throw error;

      const uniqueVendors = Array.from(
        new Set(data?.map(item => item.lead_vendor).filter(Boolean) as string[])
      ).sort();

      setVendors(uniqueVendors);
      setSelectedVendors(uniqueVendors);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast({
        title: "Error",
        description: "Failed to load vendors",
        variant: "destructive",
      });
    }
  };

  const getDateRange = (): { start: Date; end: Date } => {
    const now = new Date();
    const end = endOfDay(now);
    
    switch (timeRange) {
      case 'today':
        return { start: startOfDay(now), end };
      case '7days':
        return { start: startOfDay(subDays(now, 7)), end };
      case '30days':
        return { start: startOfDay(subDays(now, 30)), end };
      case '90days':
        return { start: startOfDay(subDays(now, 90)), end };
      case 'custom':
        if (customStartDate && customEndDate) {
          return {
            start: startOfDay(new Date(customStartDate)),
            end: endOfDay(new Date(customEndDate))
          };
        }
        return { start: startOfDay(subDays(now, 7)), end };
      default:
        return { start: startOfDay(subDays(now, 7)), end };
    }
  };

  const fetchVendorPerformance = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      
      const vendorsToQuery = selectedVendors.length > 0 ? selectedVendors : vendors;

      if (vendorsToQuery.length === 0) {
        setVendorStats([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('daily_deal_flow')
        .select('lead_vendor, date')
        .in('lead_vendor', vendorsToQuery)
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'));

      if (error) throw error;

      const vendorMap = new Map<string, { transfers: number; dates: Set<string> }>();

      data?.forEach(item => {
        if (!item.lead_vendor) return;
        
        const existing = vendorMap.get(item.lead_vendor) || { 
          transfers: 0, 
          dates: new Set<string>() 
        };
        
        existing.transfers += 1;
        if (item.date) {
          existing.dates.add(item.date);
        }
        
        vendorMap.set(item.lead_vendor, existing);
      });

      const daysDiff = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      
      const stats: VendorTransferData[] = Array.from(vendorMap.entries()).map(([vendor, data]) => {
        const daily_average = data.transfers / daysDiff;
        
        return {
          vendor_name: vendor,
          total_transfers: data.transfers,
          daily_average: parseFloat(daily_average.toFixed(2))
        };
      });

      stats.sort((a, b) => b.total_transfers - a.total_transfers);

      setVendorStats(stats);
    } catch (error) {
      console.error('Error fetching vendor performance:', error);
      toast({
        title: "Error",
        description: "Failed to load performance data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVendorToggle = (vendor: string) => {
    setSelectedVendors(prev => {
      if (prev.includes(vendor)) {
        return prev.filter(v => v !== vendor);
      } else {
        return [...prev, vendor];
      }
    });
  };

  const handleSelectAllVendors = () => {
    if (selectedVendors.length === vendors.length) {
      setSelectedVendors([]);
    } else {
      setSelectedVendors(vendors);
    }
  };

  const handleClearFilters = () => {
    setTimeRange('7days');
    setCustomStartDate('');
    setCustomEndDate('');
    setSelectedVendors(vendors);
  };

  const handleRefresh = () => {
    fetchVendorPerformance();
    toast({
      title: "Refreshing data...",
      description: "Fetching latest transfer data",
    });
  };

  const totalTransfers = vendorStats.reduce((sum, v) => sum + v.total_transfers, 0);
  const avgTransfersPerVendor = vendorStats.length > 0 
    ? (totalTransfers / vendorStats.length).toFixed(1) 
    : '0';

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700 font-medium">Active Vendors</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{vendorStats.length}</p>
            <p className="text-xs text-blue-600 mt-1">
              {selectedVendors.length === vendors.length ? 'All selected' : `${selectedVendors.length} selected`}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-100">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Phone className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700 font-medium">Total Transfers</span>
            </div>
            <p className="text-2xl font-bold text-green-900">{totalTransfers.toLocaleString()}</p>
            <p className="text-xs text-green-600 mt-1">In selected period</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-purple-700 font-medium">Avg Per Vendor</span>
            </div>
            <p className="text-2xl font-bold text-purple-900">{avgTransfersPerVendor}</p>
            <p className="text-xs text-purple-600 mt-1">Transfers per vendor</p>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-100">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-orange-700 font-medium">Time Range</span>
            </div>
            <p className="text-lg font-bold text-orange-900">
              {timeRange === 'today' && 'Today'}
              {timeRange === '7days' && 'Last 7 Days'}
              {timeRange === '30days' && 'Last 30 Days'}
              {timeRange === '90days' && 'Last 90 Days'}
              {timeRange === 'custom' && 'Custom Range'}
            </p>
            <p className="text-xs text-orange-600 mt-1">Selected period</p>
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
              <Button variant="default" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="time-range">Time Range</Label>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger id="time-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {timeRange === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Vendors ({selectedVendors.length} of {vendors.length})</Label>
              <Button variant="ghost" size="sm" onClick={handleSelectAllVendors}>
                {selectedVendors.length === vendors.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto border rounded-md p-4">
              {vendors.map(vendor => (
                <div key={vendor} className="flex items-center space-x-2">
                  <Checkbox
                    id={`vendor-${vendor}`}
                    checked={selectedVendors.includes(vendor)}
                    onCheckedChange={() => handleVendorToggle(vendor)}
                  />
                  <label
                    htmlFor={`vendor-${vendor}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {vendor}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vendor Performance Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Transfers Per Call Center</span>
            <Badge variant="outline">{vendorStats.length} Vendors</Badge>
          </CardTitle>
          <CardDescription>
            Number of transfers from daily deal flow, grouped by lead vendor
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading transfer data...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {vendorStats.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No data available</p>
                  <p className="text-sm">Try selecting different vendors or time range</p>
                </div>
              ) : (
                vendorStats.map((vendor, index) => (
                  <Card key={vendor.vendor_name} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold">
                            #{index + 1}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{vendor.vendor_name}</h3>
                            <p className="text-xs text-muted-foreground">Call Center</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                          <div className="text-center">
                            <p className="text-3xl font-bold text-green-600">
                              {vendor.total_transfers.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">Total Transfers</p>
                          </div>
                          <div className="text-center">
                            <p className="text-3xl font-bold text-purple-600">
                              {vendor.daily_average.toFixed(1)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">Daily Average</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
