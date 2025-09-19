import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NavigationHeader } from "@/components/NavigationHeader";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, Download } from "lucide-react";

export interface SubmissionPortalRow {
  id: string;
  submission_id: string;
  date?: string;
  insured_name?: string;
  lead_vendor?: string;
  client_phone_number?: string;
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
  application_submitted?: boolean;
  sent_to_underwriting?: boolean;
  submission_date?: string;
  dq_reason?: string;
  call_source?: string;
  submission_source?: string;
}

const SubmissionPortalPage = () => {
  const [data, setData] = useState<SubmissionPortalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState("__ALL__");

  const { toast } = useToast();

  // Fetch data from Supabase
  const fetchData = async (showRefreshToast = false) => {
    try {
      setRefreshing(true);

      // Query the view directly - TypeScript will complain but it works at runtime
      let query = (supabase as any)
        .from('submission_portal')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      // Apply date filter if set
      if (dateFilter) {
        const year = dateFilter.getFullYear();
        const month = String(dateFilter.getMonth() + 1).padStart(2, '0');
        const day = String(dateFilter.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        query = query.eq('date', dateStr);
      }

      // Apply status filter
      if (statusFilter !== "__ALL__") {
        query = query.eq('status', statusFilter);
      }

      const { data: portalData, error } = await query;

      if (error) {
        console.error("Error fetching submission portal data:", error);
        toast({
          title: "Error",
          description: "Failed to fetch submission portal data",
          variant: "destructive",
        });
        return;
      }

      setData((portalData as SubmissionPortalRow[]) || []);

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

  useEffect(() => {
    fetchData();
  }, [dateFilter, statusFilter]);

  const handleRefresh = () => {
    fetchData(true);
  };

  const handleExport = () => {
    // Simple CSV export
    if (data.length === 0) {
      toast({
        title: "No Data",
        description: "No data to export",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      'Submission ID',
      'Date',
      'Insured Name',
      'Lead Vendor',
      'Phone Number',
      'Buffer Agent',
      'Agent',
      'Licensed Agent',
      'Status',
      'Call Result',
      'Carrier',
      'Product Type',
      'Monthly Premium',
      'Face Amount',
      'Application Submitted',
      'Sent to Underwriting',
      'Submission Date',
      'Call Source',
      'Submission Source',
      'Created At'
    ];

    const csvContent = [
      headers.join(','),
      ...data.map(row => [
        row.submission_id,
        row.date || '',
        row.insured_name || '',
        row.lead_vendor || '',
        row.client_phone_number || '',
        row.buffer_agent || '',
        row.agent || '',
        row.licensed_agent_account || '',
        row.status || '',
        row.call_result || '',
        row.carrier || '',
        row.product_type || '',
        row.monthly_premium || '',
        row.face_amount || '',
        row.application_submitted ? 'Yes' : 'No',
        row.sent_to_underwriting ? 'Yes' : 'No',
        row.submission_date || '',
        row.call_source || '',
        row.submission_source || '',
        row.created_at || ''
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `submission-portal-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Data exported to CSV successfully",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading submission portal data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader title="Submission Portal" />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">
                Track all submitted applications from call result updates
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={handleExport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <input
                  type="date"
                  value={dateFilter ? dateFilter.toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      setDateFilter(new Date(e.target.value));
                    } else {
                      setDateFilter(undefined);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="__ALL__">All Statuses</option>
                  <option value="Pending Approval">Pending Approval</option>
                  <option value="Underwriting">Underwriting</option>
                  <option value="Submitted">Submitted</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Submitted Applications ({data.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {data.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No submitted applications found for the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Submission ID</th>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Insured Name</th>
                      <th className="text-left p-2">Lead Vendor</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Agent</th>
                      <th className="text-left p-2">Carrier</th>
                      <th className="text-left p-2">Premium</th>
                      <th className="text-left p-2">Submitted</th>
                      <th className="text-left p-2">Underwriting</th>
                      <th className="text-left p-2">Call Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row) => (
                      <tr key={row.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-mono text-sm">{row.submission_id}</td>
                        <td className="p-2">{row.date}</td>
                        <td className="p-2">{row.insured_name}</td>
                        <td className="p-2">{row.lead_vendor}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            row.status === 'Pending Approval'
                              ? 'bg-yellow-100 text-yellow-800'
                              : row.status === 'Underwriting'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="p-2">{row.agent || row.buffer_agent}</td>
                        <td className="p-2">{row.carrier}</td>
                        <td className="p-2">{row.monthly_premium ? `$${row.monthly_premium}` : ''}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            row.application_submitted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {row.application_submitted ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            row.sent_to_underwriting ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {row.sent_to_underwriting ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="p-2">{row.call_source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
};

export default SubmissionPortalPage;