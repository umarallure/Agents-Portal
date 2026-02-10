import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CalendarIcon, FileText, Download, Loader2, Upload, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { parseESTDate } from "@/lib/dateUtils";
import { googleDriveService } from "@/services/googleDrive";

interface EODReportsProps {
  className?: string;
}

interface DailyDealFlowData {
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
}

interface LeadVendor {
  id: string;
  name: string;
  did?: string;
  google_drive_folder_id?: string;
  report_folder_name?: string;
  is_active: boolean;
}

interface UploadResult {
  vendor: string;
  success: boolean;
  fileId?: string;
  error?: string;
}

export const EODReports = ({ className }: EODReportsProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("download");
  const [vendors, setVendors] = useState<LeadVendor[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set());
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [googleAccessToken, setGoogleAccessToken] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();

  // Fetch lead vendors from database on mount
  useEffect(() => {
    fetchLeadVendors();
  }, []);

  const fetchLeadVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_vendors')
        .select('id, name, did, google_drive_folder_id, report_folder_name, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      const vendorsList = data || [];
      setVendors(vendorsList);
      
      // Auto-select all vendors with Drive folders for upload
      const vendorsWithFolders = vendorsList
        .filter(v => v.google_drive_folder_id)
        .map(v => v.name);
      setSelectedVendors(new Set(vendorsWithFolders));
    } catch (error) {
      console.error("Error fetching lead vendors:", error);
      toast({
        title: "Error",
        description: "Failed to load lead vendors",
        variant: "destructive",
      });
    }
  };

  // Get allowed vendors for additional columns (MP and Face Amount)
  const allowedVendors = vendors.map(v => v.name);

  // Base columns for all reports
  const baseReportColumns = [
    "Date",
    "INSURED NAME", 
    "Buffer Agent",
    "Agent",
    "GHL Status",
    "Carrier",
    "Product Type", 
    "Draft Date",
    "From Callback?",
    "Notes"
  ];

  // Additional columns for allowed vendors
  const additionalColumns = ["MP", "Face Amount"];
  
  // Custom additional columns for all vendors
  const customAdditionalColumns = ["Licensed Agent Account", "Call Result"];

  // Google OAuth authentication
  const authenticateWithGoogle = () => {
    // In production, implement proper OAuth flow
    // For now, prompt user to paste access token
    const token = prompt("Please enter your Google Drive access token:\n\n(To get a token, visit: https://developers.google.com/oauthplayground/\nSelect 'Drive API v3' > 'https://www.googleapis.com/auth/drive.file' > Authorize APIs)");
    
    if (token) {
      setGoogleAccessToken(token);
      googleDriveService.initialize(token);
      setIsAuthenticated(true);
      toast({
        title: "Authenticated",
        description: "Successfully connected to Google Drive",
      });
    }
  };

  const fetchDataForDate = async (date: Date): Promise<DailyDealFlowData[]> => {
    try {
      // Format date correctly to avoid timezone issues
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const { data, error } = await supabase
        .from('daily_deal_flow')
        .select('*')
        .eq('date', dateStr)
        .order('lead_vendor', { ascending: true })
        .order('insured_name', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Error fetching data:", error);
      throw new Error("Failed to fetch data for the selected date");
    }
  };

  const groupDataByVendor = (data: DailyDealFlowData[]) => {
    const grouped: { [vendor: string]: DailyDealFlowData[] } = {};
    
    data.forEach(row => {
      const vendor = row.lead_vendor || 'Unknown Vendor';
      if (!grouped[vendor]) {
        grouped[vendor] = [];
      }
      grouped[vendor].push(row);
    });

    return grouped;
  };

  const createExcelFile = (vendorData: DailyDealFlowData[], vendor: string, fileDate: string) => {
    // Determine columns for this vendor
    let headers = [...baseReportColumns];
    if (allowedVendors.includes(vendor)) {
      headers.push(...additionalColumns);
    }
    headers.push(...customAdditionalColumns);

    // Helper function to safely format dates avoiding timezone shifts
    const formatDateSafe = (dateStr: string | undefined): string => {
      if (!dateStr) return '';
      try {
        // Parse the date string as EST to avoid timezone shifts
        const estDate = parseESTDate(dateStr);
        return format(estDate, "MM/dd/yyyy");
      } catch (error) {
        console.error('Date formatting error:', error);
        return dateStr;
      }
    };

    // Helper function to convert row data to Excel format
    const convertRowToExcelData = (row: DailyDealFlowData) => {
      const baseRowData = [
        formatDateSafe(row.date),
        row.insured_name || '',
        row.buffer_agent || 'N/A',
        row.agent || 'N/A',
        row.status || '',
        row.carrier || 'N/A',
        row.product_type || 'N/A',
        formatDateSafe(row.draft_date),
        row.from_callback ? 'Yes' : 'No',
        row.notes || ''
      ];

      // Add additional columns for allowed vendors
      if (allowedVendors.includes(vendor)) {
        baseRowData.push(
          row.monthly_premium ? `$${row.monthly_premium.toFixed(2)}` : '',
          row.face_amount ? `$${row.face_amount.toLocaleString()}` : ''
        );
      }

      // Add custom additional columns for all vendors
      baseRowData.push(
        row.licensed_agent_account || 'N/A',
        row.call_result || 'N/A'
      );

      return baseRowData;
    };

    // Separate data into BPO Transfers and Internal Callbacks
    const bpoTransfers = vendorData.filter(row => !row.from_callback);
    const internalCallbacks = vendorData.filter(row => row.from_callback);

    // Build the worksheet data array
    const worksheetData: any[][] = [];

    // Add BPO Transfers section
    if (bpoTransfers.length > 0) {
      worksheetData.push(['BPO Transfers']);
      worksheetData.push([]);
      worksheetData.push(headers);
      bpoTransfers.forEach(row => {
        worksheetData.push(convertRowToExcelData(row));
      });
      worksheetData.push([]);
      worksheetData.push([]);
    }

    // Add Internal Callbacks section
    if (internalCallbacks.length > 0) {
      worksheetData.push(['Internal Callbacks']);
      worksheetData.push([]);
      worksheetData.push(headers);
      internalCallbacks.forEach(row => {
        worksheetData.push(convertRowToExcelData(row));
      });
    }

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Auto-size columns
    const colWidths = headers.map((header) => {
      switch (header) {
        case 'Date':
        case 'Draft Date':
          return { wch: 12 };
        case 'INSURED NAME':
          return { wch: 20 };
        case 'Notes':
          return { wch: 30 };
        case 'GHL Status':
          return { wch: 18 };
        case 'Licensed Agent Account':
          return { wch: 18 };
        case 'Face Amount':
          return { wch: 15 };
        case 'From Callback?':
          return { wch: 12 };
        default:
          return { wch: 15 };
      }
    });
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'EOD Report');

    // Generate buffer
    const fileName = `${vendor} Daily Report ${fileDate}.xlsx`;
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    
    return { buffer, fileName };
  };

  // Toggle vendor selection
  const toggleVendorSelection = (vendorName: string) => {
    const newSelected = new Set(selectedVendors);
    if (newSelected.has(vendorName)) {
      newSelected.delete(vendorName);
    } else {
      newSelected.add(vendorName);
    }
    setSelectedVendors(newSelected);
  };

  // Select/Deselect all vendors
  const toggleAllVendors = (select: boolean) => {
    if (select) {
      const allVendorsWithFolders = vendors
        .filter(v => v.google_drive_folder_id)
        .map(v => v.name);
      setSelectedVendors(new Set(allVendorsWithFolders));
    } else {
      setSelectedVendors(new Set());
    }
  };

  const generateAndDownloadReports = async () => {
    if (!selectedDate) {
      toast({
        title: "Date Required",
        description: "Please select a date for the EOD report",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const data = await fetchDataForDate(selectedDate);

      if (data.length === 0) {
        toast({
          title: "No Data Found",
          description: "No records found for the selected date",
          variant: "destructive",
        });
        return;
      }

      const groupedData = groupDataByVendor(data);
      const vendorNames = Object.keys(groupedData);

      if (vendorNames.length === 0) {
        toast({
          title: "No Vendors Found",
          description: "No vendor data available for the selected date",
          variant: "destructive",
        });
        return;
      }

      const fileDate = format(selectedDate, "MM_dd");
      const folderName = `EOD-${format(selectedDate, "MM-dd-yyyy")}`;

      const zip = new JSZip();
      let fileCount = 0;

      for (const vendor of vendorNames) {
        const vendorData = groupedData[vendor];
        if (vendorData.length > 0) {
          const { buffer, fileName } = createExcelFile(vendorData, vendor, fileDate);
          zip.file(fileName, buffer);
          fileCount++;
        }
      }

      if (fileCount === 0) {
        toast({
          title: "No Files Generated",
          description: "No valid data found to generate reports",
          variant: "destructive",
        });
        return;
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${folderName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      toast({
        title: "Reports Generated Successfully",
        description: `Generated ${fileCount} reports for ${format(selectedDate, "MMM dd, yyyy")}`,
      });

      setIsDialogOpen(false);

    } catch (error) {
      console.error("Error generating reports:", error);
      toast({
        title: "Error Generating Reports",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const uploadToGoogleDrive = async () => {
    if (!selectedDate) {
      toast({
        title: "Date Required",
        description: "Please select a date for the EOD report",
        variant: "destructive",
      });
      return;
    }

    if (selectedVendors.size === 0) {
      toast({
        title: "No Vendors Selected",
        description: "Please select at least one vendor to upload",
        variant: "destructive",
      });
      return;
    }

    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please authenticate with Google Drive first",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadResults([]);

    try {
      const data = await fetchDataForDate(selectedDate);

      if (data.length === 0) {
        toast({
          title: "No Data Found",
          description: "No records found for the selected date",
          variant: "destructive",
        });
        return;
      }

      const groupedData = groupDataByVendor(data);
      const fileDate = format(selectedDate, "MM_dd");
      
      const results: UploadResult[] = [];
      let successCount = 0;

      // Upload only selected vendors
      for (const vendorName of selectedVendors) {
        const vendorData = groupedData[vendorName];
        const vendorInfo = vendors.find(v => v.name === vendorName);

        if (!vendorData || vendorData.length === 0) {
          results.push({
            vendor: vendorName,
            success: false,
            error: "No data for this date"
          });
          continue;
        }

        if (!vendorInfo?.google_drive_folder_id) {
          results.push({
            vendor: vendorName,
            success: false,
            error: "No Google Drive folder configured"
          });
          continue;
        }

        const { buffer, fileName } = createExcelFile(vendorData, vendorName, fileDate);
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        const result = await googleDriveService.uploadFile(
          blob,
          fileName,
          vendorInfo.google_drive_folder_id
        );

        results.push({
          vendor: vendorName,
          success: result.success,
          fileId: result.fileId,
          error: result.error
        });

        if (result.success) {
          successCount++;
        }
      }

      setUploadResults(results);

      if (successCount > 0) {
        toast({
          title: "Upload Complete",
          description: `Successfully uploaded ${successCount} of ${selectedVendors.size} reports to Google Drive`,
        });
      } else {
        toast({
          title: "Upload Failed",
          description: "No reports were uploaded successfully",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error("Error uploading to Google Drive:", error);
      toast({
        title: "Upload Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Get vendors that have data and folder configured
  const getVendorsWithFolders = () => {
    return vendors.filter(v => v.google_drive_folder_id);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={cn("flex items-center gap-2", className)}
        >
          <FileText className="h-4 w-4" />
          EOD Reports
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate EOD Reports
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Date Selection */}
          <div className="space-y-2">
            <Label htmlFor="report-date">Select Report Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {selectedDate && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900">
                📊 Report will be generated for: {format(selectedDate, "MMMM dd, yyyy")}
              </p>
            </div>
          )}

          {/* Tabs for Download vs Upload */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="download" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download ZIP
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload to Drive
              </TabsTrigger>
            </TabsList>

            {/* Download Tab */}
            <TabsContent value="download" className="space-y-4">
              <div className="space-y-2">
                <Label>Report Details</Label>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• Reports will be generated by lead vendor</p>
                  <p>• Each vendor gets a separate Excel file</p>
                  <p>• All files will be packaged in a ZIP file</p>
                  <p>• Data split into "BPO Transfers" and "Internal Callbacks" sections</p>
                  <p>• Premium vendors include MP and Face Amount columns</p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isGenerating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={generateAndDownloadReports}
                  disabled={!selectedDate || isGenerating}
                  className="flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Download Reports
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* Upload Tab */}
            <TabsContent value="upload" className="space-y-4">
              {!isAuthenticated ? (
                <div className="p-4 border rounded-lg bg-yellow-50">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-yellow-900">
                        Google Drive Authentication Required
                      </p>
                      <p className="text-xs text-yellow-700">
                        You need to authenticate with Google Drive to upload reports.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={authenticateWithGoogle}
                        className="mt-2"
                      >
                        <ExternalLink className="h-3 w-3 mr-2" />
                        Authenticate with Google
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 border rounded-lg bg-green-50">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Connected to Google Drive</span>
                  </div>
                </div>
              )}

              {/* Vendor Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Select Vendors to Upload</Label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleAllVendors(true)}
                      disabled={!isAuthenticated}
                    >
                      Select All
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleAllVendors(false)}
                      disabled={!isAuthenticated}
                    >
                      Deselect All
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg p-3 max-h-60 overflow-y-auto space-y-2">
                  {getVendorsWithFolders().length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No vendors have Google Drive folders configured.
                      <br />
                      Please configure folders in the Lead Vendors settings.
                    </p>
                  ) : (
                    getVendorsWithFolders().map((vendor) => (
                      <div
                        key={vendor.id}
                        className="flex items-center space-x-3 p-2 rounded hover:bg-muted"
                      >
                        <Checkbox
                          id={`vendor-${vendor.id}`}
                          checked={selectedVendors.has(vendor.name)}
                          onCheckedChange={() => toggleVendorSelection(vendor.name)}
                          disabled={!isAuthenticated}
                        />
                        <label
                          htmlFor={`vendor-${vendor.id}`}
                          className="flex-1 text-sm cursor-pointer"
                        >
                          {vendor.name}
                        </label>
                        {vendor.report_folder_name && (
                          <span className="text-xs text-muted-foreground">
                            Folder: {vendor.report_folder_name}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  {selectedVendors.size} of {getVendorsWithFolders().length} vendors selected
                </p>
              </div>

              {/* Upload Results */}
              {uploadResults.length > 0 && (
                <div className="border rounded-lg p-3 space-y-2">
                  <Label>Upload Results</Label>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {uploadResults.map((result, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-2 text-sm p-2 rounded ${
                          result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {result.success ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                        <span className="font-medium">{result.vendor}:</span>
                        <span className="text-xs">
                          {result.success ? 'Uploaded successfully' : result.error}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={uploadToGoogleDrive}
                  disabled={!selectedDate || !isAuthenticated || selectedVendors.size === 0 || isUploading}
                  className="flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload to Drive ({selectedVendors.size})
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Export for module system
