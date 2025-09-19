import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Download, Loader2, FileText, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BulkLookupResult {
  client_phone_number: string;
  lead_vendor: string;
  insured_name: string;
  submission_id: string;
  status: string;
  call_result: string;
  agent: string;
  buffer_agent: string;
  carrier: string;
  product_type: string;
  draft_date: string;
  monthly_premium: number;
  face_amount: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

const BulkLookup = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BulkLookupResult[]>([]);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast({
          title: "Invalid file type",
          description: "Please select a CSV file.",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      setResults([]);
      setProcessedCount(0);
      setTotalCount(0);
    }
  };

  const parseCSV = (csvText: string): Array<{phone: string, lead_vendor: string, insured_name: string}> => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const phoneIndex = headers.findIndex(h => h.toLowerCase().includes('phone') || h.toLowerCase().includes('client phone'));
    const leadVendorIndex = headers.findIndex(h => h.toLowerCase().includes('lead') && h.toLowerCase().includes('vendor'));
    const insuredNameIndex = headers.findIndex(h => h.toLowerCase().includes('insured') && h.toLowerCase().includes('name'));

    if (phoneIndex === -1 || leadVendorIndex === -1 || insuredNameIndex === -1) {
      throw new Error('CSV must contain columns for phone number, lead vendor, and insured name');
    }

    const parsedData: Array<{phone: string, lead_vendor: string, insured_name: string}> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length > Math.max(phoneIndex, leadVendorIndex, insuredNameIndex)) {
        const phone = values[phoneIndex]?.trim();
        const lead_vendor = values[leadVendorIndex]?.trim();
        const insured_name = values[insuredNameIndex]?.trim();

        if (phone && lead_vendor && insured_name) {
          parsedData.push({ phone, lead_vendor, insured_name });
        }
      }
    }

    return parsedData;
  };

  const findDuplicatesWithPendingApproval = async (lookupData: Array<{phone: string, lead_vendor: string, insured_name: string}>): Promise<BulkLookupResult[]> => {
    const allResults: BulkLookupResult[] = [];

    for (const item of lookupData) {
      try {
        // Find all entries matching the criteria
        const { data: matchingEntries, error } = await supabase
          .from('daily_deal_flow')
          .select('*')
          .eq('client_phone_number', item.phone)
          .eq('lead_vendor', item.lead_vendor)
          .eq('insured_name', item.insured_name)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error querying database:', error);
          continue;
        }

        if (matchingEntries && matchingEntries.length > 1) {
          // Check if at least one entry has 'Pending Approval' status
          const hasPendingApproval = matchingEntries.some(entry => entry.status === 'Pending Approval');

          if (hasPendingApproval) {
            // Add all entries for this lead
            allResults.push(...matchingEntries.map(entry => ({
              client_phone_number: entry.client_phone_number || '',
              lead_vendor: entry.lead_vendor || '',
              insured_name: entry.insured_name || '',
              submission_id: entry.submission_id,
              status: entry.status || '',
              call_result: entry.call_result || '',
              agent: entry.agent || '',
              buffer_agent: entry.buffer_agent || '',
              carrier: entry.carrier || '',
              product_type: entry.product_type || '',
              draft_date: entry.draft_date || '',
              monthly_premium: entry.monthly_premium || 0,
              face_amount: entry.face_amount || 0,
              notes: entry.notes || '',
              created_at: entry.created_at || '',
              updated_at: entry.updated_at || ''
            })));
          }
        }
      } catch (error) {
        console.error('Error processing item:', item, error);
      }
    }

    return allResults;
  };

  const handleProcess = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to process.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResults([]);
    setProcessedCount(0);
    setTotalCount(0);

    try {
      const csvText = await file.text();
      const lookupData = parseCSV(csvText);
      setTotalCount(lookupData.length);

      toast({
        title: "Processing started",
        description: `Processing ${lookupData.length} entries from CSV...`,
      });

      const duplicateResults = await findDuplicatesWithPendingApproval(lookupData);
      setResults(duplicateResults);
      setProcessedCount(lookupData.length);

      toast({
        title: "Processing completed",
        description: `Found ${duplicateResults.length} duplicate entries with Pending Approval status.`,
      });

    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "An error occurred while processing the file.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (results.length === 0) {
      toast({
        title: "No data to export",
        description: "Please process a CSV file first to generate results.",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      'Client Phone Number',
      'Lead Vendor',
      'Insured Name',
      'Submission ID',
      'Status',
      'Call Result',
      'Agent',
      'Buffer Agent',
      'Carrier',
      'Product Type',
      'Draft Date',
      'Monthly Premium',
      'Face Amount',
      'Notes',
      'Created At',
      'Updated At'
    ];

    const csvContent = [
      headers.join(','),
      ...results.map(row => [
        `"${row.client_phone_number}"`,
        `"${row.lead_vendor}"`,
        `"${row.insured_name}"`,
        `"${row.submission_id}"`,
        `"${row.status}"`,
        `"${row.call_result}"`,
        `"${row.agent}"`,
        `"${row.buffer_agent}"`,
        `"${row.carrier}"`,
        `"${row.product_type}"`,
        `"${row.draft_date}"`,
        `"${row.monthly_premium}"`,
        `"${row.face_amount}"`,
        `"${row.notes.replace(/"/g, '""')}"`,
        `"${row.created_at}"`,
        `"${row.updated_at}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bulk_lookup_results_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export completed",
      description: `Exported ${results.length} records to CSV file.`,
    });
  };

  const exportDuplicateDataToCSV = (duplicateData: any[]) => {
    if (duplicateData.length === 0) {
      toast({
        title: "No data to export",
        description: "No duplicate data available.",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      'Submission ID',
      'Insured Name',
      'Client Phone Number',
      'Lead Vendor',
      'Date',
      'Status',
      'Call Result',
      'Agent',
      'Buffer Agent',
      'Licensed Agent Account',
      'Carrier',
      'Product Type',
      'Draft Date',
      'Monthly Premium',
      'Face Amount',
      'From Callback',
      'Notes',
      'Policy Number',
      'Carrier Audit',
      'Product Type Carrier',
      'Level or GI',
      'Created At',
      'Updated At'
    ];

    const csvContent = [
      headers.join(','),
      ...duplicateData.map(row => [
        `"${row.submission_id || ''}"`,
        `"${row.insured_name || ''}"`,
        `"${row.client_phone_number || ''}"`,
        `"${row.lead_vendor || ''}"`,
        `"${row.date || ''}"`,
        `"${row.status || ''}"`,
        `"${row.call_result || ''}"`,
        `"${row.agent || ''}"`,
        `"${row.buffer_agent || ''}"`,
        `"${row.licensed_agent_account || ''}"`,
        `"${row.carrier || ''}"`,
        `"${row.product_type || ''}"`,
        `"${row.draft_date || ''}"`,
        `"${row.monthly_premium || ''}"`,
        `"${row.face_amount || ''}"`,
        `"${row.from_callback || ''}"`,
        `"${(row.notes || '').replace(/"/g, '""')}"`,
        `"${row.policy_number || ''}"`,
        `"${row.carrier_audit || ''}"`,
        `"${row.product_type_carrier || ''}"`,
        `"${row.level_or_gi || ''}"`,
        `"${row.created_at || ''}"`,
        `"${row.updated_at || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `duplicate_leads_with_pending_approval_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export completed",
      description: `Exported ${duplicateData.length} duplicate records to CSV file.`,
    });
  };

  const clearFile = () => {
    setFile(null);
    setResults([]);
    setProcessedCount(0);
    setTotalCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Bulk Duplicate Lookup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Upload a CSV file containing phone numbers, lead vendors, and insured names.
              The system will find duplicate entries where at least one has 'Pending Approval' status.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="csv-file">Select CSV File</Label>
            <div className="flex items-center gap-2">
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                ref={fileInputRef}
                className="flex-1"
              />
              {file && (
                <Button variant="outline" onClick={clearFile}>
                  Clear
                </Button>
              )}
            </div>
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleProcess}
              disabled={!file || loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {loading ? 'Processing...' : 'Process CSV'}
            </Button>

            {results.length > 0 && (
              <Button
                onClick={exportToCSV}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Results ({results.length})
              </Button>
            )}
          </div>

          {processedCount > 0 && (
            <div className="text-sm text-muted-foreground">
              Processed {processedCount} of {totalCount} entries
            </div>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Results ({results.length} entries)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Phone</th>
                    <th className="text-left p-2">Lead Vendor</th>
                    <th className="text-left p-2">Insured Name</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Agent</th>
                    <th className="text-left p-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {results.slice(0, 10).map((result, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">{result.client_phone_number}</td>
                      <td className="p-2">{result.lead_vendor}</td>
                      <td className="p-2">{result.insured_name}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          result.status === 'Pending Approval'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {result.status}
                        </span>
                      </td>
                      <td className="p-2">{result.agent}</td>
                      <td className="p-2">{new Date(result.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {results.length > 10 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Showing first 10 results. Export to CSV to see all {results.length} entries.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkLookup;