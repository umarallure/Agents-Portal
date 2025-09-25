import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NavigationHeader } from "@/components/NavigationHeader";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DataGrid } from "./components/DataGrid";
import { GridToolbar } from "./components/GridToolbar";
import { CreateEntryForm } from "./components/CreateEntryForm";
import { EODReports } from "@/components/EODReports";
import { WeeklyReports } from "@/components/WeeklyReports";
import { GHLExport } from "@/components/GHLExport";
import { Loader2, RefreshCw, Download, FileSpreadsheet, ChevronDown, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { canPerformWriteOperations } from "@/lib/userPermissions";
import { dateObjectToESTString } from "@/lib/dateUtils";

export interface DailyDealFlowRow {
  id: string;
  submission_id: string;
  client_phone_number?: string;
  lead_vendor?: string;
  date?: string;
  insured_name?: string;
  buffer_agent?: string;
  agent?: string;
  licensed_agent_account?: string;
  status?: string;
  call_result?: string;
  carrier?: string;
  product_type?: string;
  draft_date?: string;
  monthly_premium?: number;
  face_amount?: number;
  from_callback?: boolean;
  notes?: string;
  policy_number?: string;
  carrier_audit?: string;
  product_type_carrier?: string;
  level_or_gi?: string;
  created_at?: string;
  updated_at?: string;
}

const DailyDealFlowPage = () => {
  // Special constant to match GridToolbar (cannot use empty string with Radix UI)
  const ALL_OPTION = "__ALL__";
  
  const [data, setData] = useState<DailyDealFlowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [dateFromFilter, setDateFromFilter] = useState<Date | undefined>(undefined);
  const [dateToFilter, setDateToFilter] = useState<Date | undefined>(undefined);
  const [bufferAgentFilter, setBufferAgentFilter] = useState(ALL_OPTION);
  const [licensedAgentFilter, setLicensedAgentFilter] = useState(ALL_OPTION);
  const [leadVendorFilter, setLeadVendorFilter] = useState(ALL_OPTION);
  const [statusFilter, setStatusFilter] = useState(ALL_OPTION);
  const [carrierFilter, setCarrierFilter] = useState(ALL_OPTION);
  const [callResultFilter, setCallResultFilter] = useState(ALL_OPTION);
  
  const recordsPerPage = 100;
  
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Check if current user has write permissions
  const hasWritePermissions = canPerformWriteOperations(user?.id);

  // Helper functions to handle mutual exclusivity between single date and date range
  const handleDateFilterChange = (date: Date | undefined) => {
    setDateFilter(date);
    // Clear date range when single date is set
    if (date) {
      setDateFromFilter(undefined);
      setDateToFilter(undefined);
    }
  };

  const handleDateFromFilterChange = (date: Date | undefined) => {
    setDateFromFilter(date);
    // Clear single date when range is used
    if (date || dateToFilter) {
      setDateFilter(undefined);
    }
  };

  const handleDateToFilterChange = (date: Date | undefined) => {
    setDateToFilter(date);
    // Clear single date when range is used
    if (date || dateFromFilter) {
      setDateFilter(undefined);
    }
  };

  // Fetch data from Supabase with lazy loading - only current page
  const fetchData = async (page = 1, showRefreshToast = false) => {
    try {
      setRefreshing(true);

      const from = (page - 1) * recordsPerPage;
      const to = from + recordsPerPage - 1;

      let query = supabase
        .from('daily_deal_flow')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      // Apply date filter if set - using EST timezone for consistency
      if (dateFilter) {
        const dateStr = dateObjectToESTString(dateFilter);
        query = query.eq('date', dateStr);
      }

      // Apply date range filter if set - using EST timezone for consistency
      if (dateFromFilter) {
        const dateFromStr = dateObjectToESTString(dateFromFilter);
        query = query.gte('date', dateFromStr);
      }

      if (dateToFilter) {
        const dateToStr = dateObjectToESTString(dateToFilter);
        query = query.lte('date', dateToStr);
      }

      // Apply other filters
      if (bufferAgentFilter && bufferAgentFilter !== ALL_OPTION) {
        query = query.eq('buffer_agent', bufferAgentFilter);
      }

      if (licensedAgentFilter && licensedAgentFilter !== ALL_OPTION) {
        query = query.eq('licensed_agent_account', licensedAgentFilter);
      }

      if (leadVendorFilter && leadVendorFilter !== ALL_OPTION) {
        query = query.eq('lead_vendor', leadVendorFilter);
      }

      if (statusFilter && statusFilter !== ALL_OPTION) {
        query = query.eq('status', statusFilter);
      }

      if (carrierFilter && carrierFilter !== ALL_OPTION) {
        query = query.eq('carrier', carrierFilter);
      }

      if (callResultFilter && callResultFilter !== ALL_OPTION) {
        query = query.eq('call_result', callResultFilter);
      }

      // Apply search filter if set
      if (searchTerm) {
        query = query.or(`insured_name.ilike.%${searchTerm}%,client_phone_number.ilike.%${searchTerm}%,submission_id.ilike.%${searchTerm}%,lead_vendor.ilike.%${searchTerm}%,agent.ilike.%${searchTerm}%,status.ilike.%${searchTerm}%,carrier.ilike.%${searchTerm}%,licensed_agent_account.ilike.%${searchTerm}%,buffer_agent.ilike.%${searchTerm}%`);
      }

      const { data: pageData, error, count } = await query;

      if (error) {
        console.error("Error fetching daily deal flow data:", error);
        toast({
          title: "Error",
          description: "Failed to fetch deal flow data",
          variant: "destructive",
        });
        return;
      }

      setData(pageData || []);
      setTotalRecords(count || 0);
      setCurrentPage(page);

      if (showRefreshToast) {
        toast({
          title: "Success",
          description: `Data refreshed successfully - loaded ${pageData?.length || 0} records for page ${page}`,
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial data load and refetch when filters change
  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
    fetchData(1);
  }, [dateFilter, dateFromFilter, dateToFilter, bufferAgentFilter, licensedAgentFilter, leadVendorFilter, statusFilter, carrierFilter, callResultFilter]);

  // Refetch when search term changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
      fetchData(1);
    }, 300); // Debounce search by 300ms

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Handle page changes
  const handlePageChange = (page: number) => {
    fetchData(page);
  };


  // With server-side filtering, data is already filtered
  const filteredData = data;

  const handleRefresh = () => {
    fetchData(true);
  };

  const handleExport = () => {
    // TODO: Implement CSV export
    toast({
      title: "Coming Soon",
      description: "Export functionality will be available soon",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-lg">Loading Daily Deal Flow...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader title="Daily Deal Flow Sheet" />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-full mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">
                Manage and edit your daily deal flow data in real-time
              </p>
            </div>
          
          {hasWritePermissions && (
            <div className="flex items-center gap-2">
              {/* Create Entry Button */}
              <CreateEntryForm onSuccess={fetchData} />
              
              {/* Reports Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Reports
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <EODReports />
                  <WeeklyReports />
                  <GHLExport />
                  <DropdownMenuItem onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Current View
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Refresh Button */}
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          )}
        </div>

        {/* Toolbar */}
        <GridToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          dateFilter={dateFilter}
          onDateFilterChange={handleDateFilterChange}
          dateFromFilter={dateFromFilter}
          onDateFromFilterChange={handleDateFromFilterChange}
          dateToFilter={dateToFilter}
          onDateToFilterChange={handleDateToFilterChange}
          bufferAgentFilter={bufferAgentFilter}
          onBufferAgentFilterChange={setBufferAgentFilter}
          licensedAgentFilter={licensedAgentFilter}
          onLicensedAgentFilterChange={setLicensedAgentFilter}
          leadVendorFilter={leadVendorFilter}
          onLeadVendorFilterChange={setLeadVendorFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          carrierFilter={carrierFilter}
          onCarrierFilterChange={setCarrierFilter}
          callResultFilter={callResultFilter}
          onCallResultFilterChange={setCallResultFilter}
          totalRows={totalRecords}
        />

        {/* Data Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Deal Flow Data</span>
              <span className="text-sm font-normal text-muted-foreground">
                {totalRecords} total records • Page {currentPage} of {Math.ceil(totalRecords / recordsPerPage)} • Showing {data.length} records
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataGrid
              data={filteredData}
              onDataUpdate={fetchData}
              hasWritePermissions={hasWritePermissions}
              currentPage={currentPage}
              totalRecords={totalRecords}
              recordsPerPage={recordsPerPage}
              onPageChange={handlePageChange}
            />
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
};

export default DailyDealFlowPage;
