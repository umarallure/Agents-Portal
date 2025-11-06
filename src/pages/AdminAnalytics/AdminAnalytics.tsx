import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLicensedAgent } from '@/hooks/useLicensedAgent';
import { NavigationHeader } from '@/components/NavigationHeader';
import { ParsedPolicyItem } from '@/lib/mondayApi';
import { useToast } from '@/hooks/use-toast';
import { useAdminAnalyticsData } from '@/hooks/useAdminAnalyticsData';

// Import all components
import { AnalyticsSidebar } from './components/AnalyticsSidebar';
import { AnalyticsFilters } from './components/AnalyticsFilters';
import { OverviewStats } from './components/OverviewStats';
import { AgentsPerformanceTab } from './components/AgentsPerformanceTab';
import { VendorsPerformanceTab } from './components/VendorsPerformanceTab';
import { CarriersPerformanceTab } from './components/CarriersPerformanceTab';
import { DailySalesTab } from './components/DailySalesTab';
import { TabLoading } from './components/TabLoading';

const AdminAnalytics = () => {
  const { user, loading: authLoading } = useAuth();
  const { licensedAgentInfo, loading: licensedLoading } = useLicensedAgent();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Restrict access to Ben only
  const isBen = user?.id === '424f4ea8-1b8c-4c0f-bc13-3ea699900c79';

  // Active sidebar tab
  const [activeTab, setActiveTab] = useState('agents');
  
  // Track which tabs have been visited (for lazy loading)
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set(['agents']));
  
  // Filters state
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [carrierFilter, setCarrierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string[]>(['Issued Paid', 'Pending', 'Issued Not Paid']);
  
  // Agent-specific status filter (multi-select)
  const [agentStatusFilter, setAgentStatusFilter] = useState<string[]>([]);

  // Handle tab change and mark as visited
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setVisitedTabs(prev => new Set([...prev, tab]));
  };

  // Only fetch data when a tab that needs data has been visited
  const shouldFetchData = visitedTabs.has('agents') || visitedTabs.has('vendors') || visitedTabs.has('carriers');

  // Use React Query for data fetching with automatic caching
  // Only enabled when user visits a tab that needs data
  const { 
    data: placements = [], 
    isLoading, 
    isError, 
    error,
    refetch,
    isFetching
  } = useAdminAnalyticsData(shouldFetchData);

  // Agent mapping
  const agentEmailMap: Record<string, string> = {
    'isaac.r@heritageinsurance.io': 'Isaac Reed',
    'benjamin.w@unlimitedinsurance.io': 'Benjamin Wunder',
    'lydia.s@unlimitedinsurance.io': 'Lydia Sutton',
    'noah@unlimitedinsurance.io': 'Noah Brock',
    'tatumn.s@heritageinsurance.io': 'Trinity Queen'
  };

  const agentNames = Object.values(agentEmailMap);

  // Helper function to get column value by ID
  const getColumnValue = (item: ParsedPolicyItem, columnId: string): string => {
    const column = item.column_values?.find(col => col.id === columnId);
    return column?.text || '';
  };

  // Helper to get premium as number
  const getPremium = (item: ParsedPolicyItem): number => {
    const premiumText = getColumnValue(item, 'numbers');
    return premiumText ? parseFloat(premiumText.replace(/[^0-9.-]+/g, '')) || 0 : 0;
  };

  // Helper to get policy type (GI or Non GI)
  const getPolicyType = (item: ParsedPolicyItem): string => {
    return getColumnValue(item, 'text_mkxdrsg2');
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    
    // Redirect non-Ben users to dashboard
    if (!authLoading && user && !isBen) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      navigate('/dashboard');
    }
  }, [user, authLoading, isBen, navigate, toast]);

  // Show error toast if query fails
  useEffect(() => {
    if (isError) {
      toast({
        title: "Error fetching data",
        description: error?.message || "Unable to load analytics data. Please try again.",
        variant: "destructive",
      });
    }
  }, [isError, error, toast]);

  // Show success toast when data loads for the first time
  useEffect(() => {
    if (!isLoading && !isError && placements.length > 0 && shouldFetchData) {
      toast({
        title: "Analytics Loaded",
        description: `Loaded ${placements.length} total policy placements`,
      });
    }
  }, [isLoading, shouldFetchData]); // Only run when loading state changes

  // Manual refresh handler
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
            // Last 24 hours
            const dayAgo = new Date(now);
            dayAgo.setHours(now.getHours() - 24);
            return placementDate >= dayAgo && placementDate <= now;
          }
          case '7days': {
            // Last 7 days
            const weekAgo = new Date(now);
            weekAgo.setDate(now.getDate() - 7);
            return placementDate >= weekAgo && placementDate <= now;
          }
          case '30days': {
            // Last 30 days
            const monthAgo = new Date(now);
            monthAgo.setDate(now.getDate() - 30);
            return placementDate >= monthAgo && placementDate <= now;
          }
          case '6months': {
            // Last 6 months
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

    // Carrier filter
    if (carrierFilter !== 'all') {
      filtered = filtered.filter(p => getColumnValue(p, 'color_mknkq2qd') === carrierFilter);
    }

    // Status filter (multi-select)
    if (statusFilter.length > 0) {
      filtered = filtered.filter(p => {
        const status = getColumnValue(p, 'status');
        return statusFilter.includes(status);
      });
    }

    return filtered;
  };

  const filteredPlacements = getFilteredPlacements();

  // Get unique carriers
  const uniqueCarriers = Array.from(
    new Set(placements.map(p => getColumnValue(p, 'color_mknkq2qd')).filter(Boolean))
  ).sort();

  // Get unique statuses
  const uniqueStatuses = Array.from(
    new Set(placements.map(p => getColumnValue(p, 'status')).filter(Boolean))
  ).sort();

  // Calculate agent performance data
  const getAgentPerformance = () => {
    return agentNames.map(agentName => {
      // First filter by global filters (date, carrier, etc.)
      let agentPlacements = filteredPlacements.filter(
        p => getColumnValue(p, 'color_mkq0rkaw') === agentName
      );
      
      // Then apply agent-specific status filter if selected
      if (agentStatusFilter.length > 0) {
        agentPlacements = agentPlacements.filter(
          p => agentStatusFilter.includes(getColumnValue(p, 'status'))
        );
      }
      
      const totalPlacements = agentPlacements.length;
      const totalPremium = agentPlacements.reduce((sum, p) => sum + getPremium(p), 0);
      const avgPremium = totalPlacements > 0 ? totalPremium / totalPlacements : 0;
      
      const uniqueCarriersCount = new Set(
        agentPlacements.map(p => getColumnValue(p, 'color_mknkq2qd')).filter(Boolean)
      ).size;

      // Calculate status breakdown for this agent
      const statusBreakdown: Record<string, number> = {};
      agentPlacements.forEach(p => {
        const status = getColumnValue(p, 'status');
        if (status) {
          statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
        }
      });

      // Calculate GI/Non-GI breakdown for this agent
      const policyTypeBreakdown: Record<string, number> = {};
      agentPlacements.forEach(p => {
        const policyType = getPolicyType(p);
        if (policyType) {
          policyTypeBreakdown[policyType] = (policyTypeBreakdown[policyType] || 0) + 1;
        }
      });

      return {
        name: agentName,
        totalPlacements,
        totalPremium,
        avgPremium,
        uniqueCarriers: uniqueCarriersCount,
        statusBreakdown,
        policyTypeBreakdown
      };
    }).sort((a, b) => b.totalPlacements - a.totalPlacements);
  };

  // Calculate lead vendor performance
  const getLeadVendorPerformance = () => {
    const vendorMap = new Map<string, {
      totalPlacements: number;
      totalPremium: number;
    }>();

    filteredPlacements.forEach(p => {
      const vendor = getColumnValue(p, 'dropdown_mkq2x0kx');
      if (vendor) {
        const existing = vendorMap.get(vendor) || { totalPlacements: 0, totalPremium: 0 };
        vendorMap.set(vendor, {
          totalPlacements: existing.totalPlacements + 1,
          totalPremium: existing.totalPremium + getPremium(p)
        });
      }
    });

    return Array.from(vendorMap.entries())
      .map(([name, data]) => ({
        name,
        ...data,
        avgPremium: data.totalPlacements > 0 ? data.totalPremium / data.totalPlacements : 0
      }))
      .sort((a, b) => b.totalPlacements - a.totalPlacements);
  };

  // Calculate carrier performance
  const getCarrierPerformance = () => {
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

  const handleClearFilters = () => {
    setDateFilter('all');
    setCarrierFilter('all');
    setStatusFilter(['Issued Paid', 'Pending', 'Issued Not Paid']);
    setStartDate('');
    setEndDate('');
  };

  // Auth loading check
  if (authLoading || licensedLoading) {
    return <TabLoading message="Authenticating..." />;
  }

  // Calculate metrics only if data is loaded
  const agentPerformance = isLoading ? [] : getAgentPerformance();
  const vendorPerformance = isLoading ? [] : getLeadVendorPerformance();
  const carrierPerformance = isLoading ? [] : getCarrierPerformance();

  const totalPremium = filteredPlacements.reduce((sum, p) => sum + getPremium(p), 0);
  const avgPremium = filteredPlacements.length > 0 ? totalPremium / filteredPlacements.length : 0;
  const activeCarriers = new Set(filteredPlacements.map(p => getColumnValue(p, 'color_mknkq2qd')).filter(Boolean)).size;

  // Calculate GI/Non-GI stats
  const giStats = filteredPlacements.reduce((acc, p) => {
    const policyType = getPolicyType(p);
    if (policyType === 'GI') {
      acc.giCount += 1;
    } else if (policyType === 'Non GI') {
      acc.nonGiCount += 1;
    }
    return acc;
  }, { giCount: 0, nonGiCount: 0 });

  const totalGiDeals = giStats.giCount;
  const totalNonGiDeals = giStats.nonGiCount;
  const giPercentage = (totalGiDeals + totalNonGiDeals) > 0 
    ? Math.round((totalGiDeals / (totalGiDeals + totalNonGiDeals)) * 100) 
    : 0;

  // Calculate average placement per week
  const avgPlacementPerWeek = (() => {
    if (filteredPlacements.length === 0) return 0;
    
    // Get all issue dates from placements
    const dates = filteredPlacements
      .map(p => getColumnValue(p, 'date_mkq1d86z'))
      .filter(date => date && date.trim() !== '')
      .map(date => new Date(date))
      .filter(date => !isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    
    if (dates.length === 0) return filteredPlacements.length; // If no dates, assume all in current week
    
    const earliestDate = dates[0];
    const latestDate = dates[dates.length - 1];
    
    // Calculate weeks between earliest and latest date
    const timeDiff = latestDate.getTime() - earliestDate.getTime();
    const weeksDiff = Math.max(timeDiff / (1000 * 60 * 60 * 24 * 7), 1); // At least 1 week
    
    return filteredPlacements.length / weeksDiff;
  })();

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader title="Admin Analytics" />

      <div className="flex">
        {/* Sidebar */}
        <AnalyticsSidebar activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Main Content */}
        <div className="flex-1 p-6 space-y-6">
          {/* Filters Card - Only show when data is needed */}
          {shouldFetchData && (
            <>
              <AnalyticsFilters
                dateFilter={dateFilter}
                carrierFilter={carrierFilter}
                statusFilter={statusFilter}
                startDate={startDate}
                endDate={endDate}
                uniqueCarriers={uniqueCarriers}
                uniqueStatuses={uniqueStatuses}
                onDateFilterChange={setDateFilter}
                onCarrierFilterChange={setCarrierFilter}
                onStatusFilterChange={setStatusFilter}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                onClearFilters={handleClearFilters}
                onRefresh={handleRefresh}
                isRefreshing={isFetching}
              />

              {/* Overview Stats */}
              <OverviewStats
                totalPlacements={filteredPlacements.length}
                totalPremium={totalPremium}
                avgPremium={avgPremium}
                totalGiDeals={totalGiDeals}
                totalNonGiDeals={totalNonGiDeals}
                giPercentage={giPercentage}
                avgPlacementPerWeek={avgPlacementPerWeek}
              />
            </>
          )}

          {/* Tab Content */}
          {activeTab === 'agents' && (
            <>
              {isLoading ? (
                <TabLoading message="Loading agent performance data..." />
              ) : (
                <AgentsPerformanceTab 
                  agentPerformance={agentPerformance}
                  uniqueStatuses={uniqueStatuses}
                  selectedStatuses={agentStatusFilter}
                  onStatusFilterChange={setAgentStatusFilter}
                />
              )}
            </>
          )}

          {activeTab === 'vendors' && (
            <>
              {isLoading ? (
                <TabLoading message="Loading vendor performance data..." />
              ) : (
                <VendorsPerformanceTab vendorPerformance={vendorPerformance} />
              )}
            </>
          )}

          {activeTab === 'daily' && (
            <DailySalesTab />
          )}

          {activeTab === 'carriers' && (
            <>
              {isLoading ? (
                <TabLoading message="Loading carrier performance data..." />
              ) : (
                <CarriersPerformanceTab carrierPerformance={carrierPerformance} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
