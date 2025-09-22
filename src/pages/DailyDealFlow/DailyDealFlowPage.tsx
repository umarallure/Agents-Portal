import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NavigationHeader } from "@/components/NavigationHeader";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DataGrid } from "./components/DataGrid";
import { GridToolbar } from "./components/GridToolbar";
import { CreateEntryForm } from "./components/CreateEntryForm";
import { EODReports } from "@/components/EODReports";
import { WeeklyReports } from "@/components/WeeklyReports";
import { GHLExport } from "@/components/GHLExport";
import { Loader2, RefreshCw, Download, FileSpreadsheet, ChevronDown, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [bufferAgentFilter, setBufferAgentFilter] = useState(ALL_OPTION);
  const [licensedAgentFilter, setLicensedAgentFilter] = useState(ALL_OPTION);
  const [leadVendorFilter, setLeadVendorFilter] = useState(ALL_OPTION);
  const [statusFilter, setStatusFilter] = useState(ALL_OPTION);
  const [carrierFilter, setCarrierFilter] = useState(ALL_OPTION);
  const [callResultFilter, setCallResultFilter] = useState(ALL_OPTION);
  
  const { toast } = useToast();

  // Fetch data from Supabase
  const fetchData = async (showRefreshToast = false) => {
    try {
      setRefreshing(true);
      
      let query = supabase
        .from('daily_deal_flow')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      // Apply date filter if set
      if (dateFilter) {
        // Format date correctly to avoid timezone issues
        const year = dateFilter.getFullYear();
        const month = String(dateFilter.getMonth() + 1).padStart(2, '0');
        const day = String(dateFilter.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        query = query.eq('date', dateStr);
      }

      const { data: dealFlowData, error } = await query;

      if (error) {
        console.error("Error fetching daily deal flow data:", error);
        toast({
          title: "Error",
          description: "Failed to fetch deal flow data",
          variant: "destructive",
        });
        return;
      }

      setData(dealFlowData || []);
      
      if (showRefreshToast) {
        toast({
          title: "Success",
          description: "Data refreshed successfully",
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

  // Initial data load
  useEffect(() => {
    fetchData();
  }, [dateFilter]);


  // Filter data based on all filter criteria
  const filteredData = data.filter(row => {
    // Search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = (
        row.insured_name?.toLowerCase().includes(searchLower) ||
        row.client_phone_number?.toLowerCase().includes(searchLower) ||
        row.submission_id?.toLowerCase().includes(searchLower) ||
        row.lead_vendor?.toLowerCase().includes(searchLower) ||
        row.agent?.toLowerCase().includes(searchLower) ||
        row.status?.toLowerCase().includes(searchLower) ||
        row.carrier?.toLowerCase().includes(searchLower) ||
        row.licensed_agent_account?.toLowerCase().includes(searchLower) ||
        row.buffer_agent?.toLowerCase().includes(searchLower)
      );
      if (!matchesSearch) return false;
    }

    // Buffer Agent filter - handle null/undefined values and ALL_OPTION
    if (bufferAgentFilter && bufferAgentFilter !== ALL_OPTION) {
      const rowBufferAgent = row.buffer_agent || "N/A";
      if (rowBufferAgent !== bufferAgentFilter) {
        return false;
      }
    }

    // Licensed Agent filter - handle null/undefined values and ALL_OPTION
    if (licensedAgentFilter && licensedAgentFilter !== ALL_OPTION) {
      const rowLicensedAgent = row.licensed_agent_account || "N/A";
      if (rowLicensedAgent !== licensedAgentFilter) {
        return false;
      }
    }

    // Lead Vendor filter - handle null/undefined values and ALL_OPTION
    if (leadVendorFilter && leadVendorFilter !== ALL_OPTION) {
      const rowLeadVendor = row.lead_vendor || "N/A";
      if (rowLeadVendor !== leadVendorFilter) {
        return false;
      }
    }

    // Status filter - handle null/undefined values and ALL_OPTION
    if (statusFilter && statusFilter !== ALL_OPTION) {
      const rowStatus = row.status || "N/A";
      if (rowStatus !== statusFilter) {
        return false;
      }
    }

    // Carrier filter - handle null/undefined values and ALL_OPTION
    if (carrierFilter && carrierFilter !== ALL_OPTION) {
      const rowCarrier = row.carrier || "N/A";
      if (rowCarrier !== carrierFilter) {
        return false;
      }
    }

    // Call Result filter - handle null/undefined values and ALL_OPTION
    if (callResultFilter && callResultFilter !== ALL_OPTION) {
      const rowCallResult = row.call_result || "N/A";
      if (rowCallResult !== callResultFilter) {
        return false;
      }
    }

    return true;
  });

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
        </div>

        {/* Toolbar */}
        <GridToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
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
          totalRows={filteredData.length}
        />

        {/* Data Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Deal Flow Data</span>
              <span className="text-sm font-normal text-muted-foreground">
                {filteredData.length} records
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataGrid
              data={filteredData}
              onDataUpdate={fetchData}
            />
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
};

export default DailyDealFlowPage;
