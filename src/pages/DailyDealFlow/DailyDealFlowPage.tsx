import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DataGrid } from "./components/DataGrid";
import { GridToolbar } from "./components/GridToolbar";
import { Loader2, RefreshCw, Download } from "lucide-react";

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
  const [data, setData] = useState<DailyDealFlowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  
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
        const dateStr = dateFilter.toISOString().split('T')[0];
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


  // Filter data based on search term
  const filteredData = data.filter(row => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      row.insured_name?.toLowerCase().includes(searchLower) ||
      row.client_phone_number?.toLowerCase().includes(searchLower) ||
      row.submission_id?.toLowerCase().includes(searchLower) ||
      row.lead_vendor?.toLowerCase().includes(searchLower) ||
      row.agent?.toLowerCase().includes(searchLower) ||
      row.status?.toLowerCase().includes(searchLower)
    );
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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Daily Deal Flow Sheet</h1>
            <p className="text-muted-foreground mt-1">
              Manage and edit your daily deal flow data in real-time
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button
              variant="outline"
              onClick={handleExport}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <GridToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
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
  );
};

export default DailyDealFlowPage;
