import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Save, X, Edit, CalendarIcon, Eye } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DailyDealFlowRow } from "../DailyDealFlowPage";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EditableRowProps {
  row: DailyDealFlowRow;
  rowIndex: number;
  onUpdate: () => void;
}

// Dropdown options (same as CallResultForm)
const bufferAgentOptions = [
  "N/A", "Ira", "Burney", "Kyla", "Bryan", "Justine", "Isaac", "Landon", "Juan"
];

const agentOptions = [
  "Claudia", "Lydia", "Juan", "Benjamin", "Erica", "N/A", "Isaac"
];

const licensedAccountOptions = [
  "Claudia", "Lydia", "Isaac", "Juan", "Benjamin", "Erica", "N/A"
];

const carrierOptions = [
  "Liberty", "SBLI", "Corebridge", "MOH", "Transamerica", "RNA", "ANAM",
  "GTL", "Aetna", "Americo", "CICA", "N/A"
];

const productTypeOptions = [
  "Preferred", "Standard", "Graded", "Modified", "GI", "Immediate", "Level", "ROP", "N/A"
];

const statusOptions = [
  "Needs BPO Callback",
  "Not Interested", 
  "Returned To Center - DQ",
  "Application Withdrawn",
  "Call Back Fix",
  "Incomplete Transfer"
];

const callResultOptions = [
  "Submitted", "Underwriting", "Not Submitted"
];

const leadVendorOptions = [
  "Ark Tech", "GrowthOnics BPO", "Maverick", "Omnitalk BPO", "Vize BPO",
  "Corebiz", "Digicon", "Ambition", "Benchmark", "Poshenee", "Plexi",
  "Gigabite", "Everline solution", "Progressive BPO", "Cerberus BPO",
  "TM Global", "Optimum BPO", "Ethos BPO", "Trust Link", "Crown Connect BPO",
  "Quotes BPO", "Zupax Marketing", "Argon Communications", "Care Solutions",
  "Cutting Edge", "Next Era", "Rock BPO", "Avenue Consultancy"
];

export const EditableRow = ({ row, rowIndex, onUpdate }: EditableRowProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<DailyDealFlowRow>(row);
  const [isSaving, setIsSaving] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const { toast } = useToast();

  // Color coding based on status
  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'submitted':
        return 'bg-green-50 border-green-200';
      case 'underwriting':
        return 'bg-blue-50 border-blue-200';
      case 'not submitted':
        return 'bg-red-50 border-red-200';
      case 'needs callback':
        return 'bg-yellow-50 border-yellow-200';
      case 'dq':
        return 'bg-gray-50 border-gray-200';
      default:
        return rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50';
    }
  };

  const getStatusTextColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'submitted':
        return 'text-green-800';
      case 'underwriting':
        return 'text-blue-800';
      case 'not submitted':
        return 'text-red-800';
      case 'needs callback':
        return 'text-yellow-800';
      case 'dq':
        return 'text-gray-800';
      default:
        return 'text-foreground';
    }
  };

  // Lead Vendor color coding
  const getLeadVendorBadge = (vendor?: string) => {
    const colors: { [key: string]: string } = {
      'Ark Tech': 'bg-blue-500 text-white',
      'GrowthOnics BPO': 'bg-green-500 text-white',
      'Maverick': 'bg-purple-500 text-white',
      'Omnitalk BPO': 'bg-orange-500 text-white',
      'Vize BPO': 'bg-red-500 text-white',
      'Corebiz': 'bg-indigo-500 text-white',
      'Digicon': 'bg-pink-500 text-white',
      'Ambition': 'bg-teal-500 text-white',
      'Benchmark': 'bg-yellow-600 text-white',
      'Poshenee': 'bg-cyan-500 text-white',
      'Plexi': 'bg-emerald-500 text-white',
      'Gigabite': 'bg-rose-500 text-white',
      'Everline solution': 'bg-violet-500 text-white',
      'Progressive BPO': 'bg-amber-500 text-white',
      'Cerberus BPO': 'bg-slate-500 text-white',
      'TM Global': 'bg-lime-500 text-white',
      'Optimum BPO': 'bg-fuchsia-500 text-white',
      'Ethos BPO': 'bg-sky-500 text-white',
      'Trust Link': 'bg-stone-500 text-white',
      'Crown Connect BPO': 'bg-neutral-500 text-white',
      'Quotes BPO': 'bg-zinc-500 text-white',
      'Zupax Marketing': 'bg-red-600 text-white',
      'Argon Communications': 'bg-blue-600 text-white',
      'Care Solutions': 'bg-green-600 text-white',
      'Cutting Edge': 'bg-purple-600 text-white',
      'Next Era': 'bg-orange-600 text-white',
      'Rock BPO': 'bg-gray-600 text-white',
      'Avenue Consultancy': 'bg-pink-600 text-white',
    };
    return colors[vendor || ''] || 'bg-gray-400 text-white';
  };

  // Status color badge
  const getStatusBadge = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'pending approval':
        return 'bg-green-600 text-white';
      case 'needs bpo callback':
        return 'bg-yellow-500 text-white';
      case 'returned to center - dq':
        return 'bg-orange-500 text-white';
      case 'dq':
      case "dq'd can't be sold":
        return 'bg-gray-500 text-white';
      case 'application withdrawn':
        return 'bg-purple-500 text-white';
      case 'call back fix':
        return 'bg-pink-500 text-white';
      case 'incomplete transfer':
        return 'bg-indigo-500 text-white';
      case 'disconnected':
        return 'bg-slate-500 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  // Call Result color badge
  const getCallResultBadge = (result?: string) => {
    switch (result?.toLowerCase()) {
      case 'submitted':
        return 'bg-green-600 text-white';
      case 'underwriting':
        return 'bg-yellow-600 text-white';
      case 'not submitted':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  // Buffer Agent color badge
  const getBufferAgentBadge = (agent?: string) => {
    const colors: { [key: string]: string } = {
      'N/A': 'bg-gray-500 text-white',
      'Ira': 'bg-blue-500 text-white',
      'Burney': 'bg-green-500 text-white',
      'Kyla': 'bg-purple-500 text-white',
      'Bryan': 'bg-orange-500 text-white',
      'Justine': 'bg-pink-500 text-white',
      'Isaac': 'bg-indigo-500 text-white',
      'Landon': 'bg-teal-500 text-white',
      'Juan': 'bg-red-500 text-white',
    };
    return colors[agent || ''] || 'bg-gray-400 text-white';
  };

  // Agent color badge
  const getAgentBadge = (agent?: string) => {
    const colors: { [key: string]: string } = {
      'Claudia': 'bg-emerald-500 text-white',
      'Lydia': 'bg-violet-500 text-white',
      'Juan': 'bg-amber-500 text-white',
      'Benjamin': 'bg-sky-500 text-white',
      'Erica': 'bg-rose-500 text-white',
      'N/A': 'bg-gray-500 text-white',
      'Isaac': 'bg-cyan-500 text-white',
    };
    return colors[agent || ''] || 'bg-gray-400 text-white';
  };

  // Licensed Agent color badge
  const getLicensedAgentBadge = (agent?: string) => {
    const colors: { [key: string]: string } = {
      'Claudia': 'bg-emerald-600 text-white',
      'Lydia': 'bg-violet-600 text-white',
      'Isaac': 'bg-cyan-600 text-white',
      'Juan': 'bg-amber-600 text-white',
      'Benjamin': 'bg-sky-600 text-white',
      'Erica': 'bg-rose-600 text-white',
      'N/A': 'bg-gray-600 text-white',
    };
    return colors[agent || ''] || 'bg-gray-500 text-white';
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('daily_deal_flow')
        .update({
          ...editData,
          updated_at: new Date().toISOString()
        })
        .eq('id', row.id);

      if (error) {
        console.error("Error updating row:", error);
        toast({
          title: "Error",
          description: "Failed to update row",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Row updated successfully",
      });

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData(row);
    setIsEditing(false);
  };

  const updateField = (field: keyof DailyDealFlowRow, value: any) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  // Details Dialog Component
  const DetailsDialog = () => (
    <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lead Details - {row.insured_name}</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Contact Information</h3>
            
            <div>
              <Label className="text-sm font-medium">Phone Number</Label>
              {isEditing ? (
                <Input
                  value={editData.client_phone_number || ''}
                  onChange={(e) => updateField('client_phone_number', e.target.value)}
                  className="mt-1"
                />
              ) : (
                <div className="mt-1 p-2 bg-muted rounded">{row.client_phone_number || 'N/A'}</div>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium">Lead Vendor</Label>
              {isEditing ? (
                <Select
                  value={editData.lead_vendor || ''}
                  onValueChange={(value) => updateField('lead_vendor', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {leadVendorOptions.map(option => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="mt-1 p-2 bg-muted rounded">{row.lead_vendor || 'N/A'}</div>
              )}
            </div>

            {/* Submission ID intentionally omitted from editable form */}
          </div>

          {/* Financial Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Financial Information</h3>
            
            <div>
              <Label className="text-sm font-medium">Monthly Premium</Label>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.01"
                  value={editData.monthly_premium?.toString() || ''}
                  onChange={(e) => updateField('monthly_premium', parseFloat(e.target.value) || null)}
                  className="mt-1"
                  placeholder="0.00"
                />
              ) : (
                <div className="mt-1 p-2 bg-muted rounded">
                  {row.monthly_premium ? `$${row.monthly_premium}` : 'N/A'}
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium">Face Amount</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={editData.face_amount?.toString() || ''}
                  onChange={(e) => updateField('face_amount', parseFloat(e.target.value) || null)}
                  className="mt-1"
                  placeholder="0.00"
                />
              ) : (
                <div className="mt-1 p-2 bg-muted rounded">
                  {row.face_amount ? `$${row.face_amount.toLocaleString()}` : 'N/A'}
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium">Draft Date</Label>
              {isEditing ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full mt-1 justify-start text-left font-normal",
                        !editData.draft_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editData.draft_date ? format(new Date(editData.draft_date), "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editData.draft_date ? new Date(editData.draft_date) : undefined}
                      onSelect={(date) => updateField('draft_date', date ? format(date, "yyyy-MM-dd") : null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="mt-1 p-2 bg-muted rounded">
                  {row.draft_date ? format(new Date(row.draft_date), "PPP") : 'N/A'}
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium">From Callback</Label>
              {isEditing ? (
                <Select
                  value={editData.from_callback ? 'TRUE' : 'FALSE'}
                  onValueChange={(value) => updateField('from_callback', value === 'TRUE')}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRUE">Yes</SelectItem>
                    <SelectItem value="FALSE">No</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="mt-1 p-2 bg-muted rounded">
                  {row.from_callback ? 'Yes' : 'No'}
                </div>
              )}
            </div>
          </div>

          {/* Notes Section - Full Width */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Notes</h3>
            {isEditing ? (
              <Textarea
                value={editData.notes || ''}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Enter notes..."
                className="min-h-[100px]"
              />
            ) : (
              <div className="p-3 bg-muted rounded min-h-[100px] whitespace-pre-wrap">
                {row.notes || 'No notes available'}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {isEditing && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setEditData(row);
                setIsEditing(false);
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  if (isEditing) {
    return (
      <>
        <tr className="bg-blue-50 border-2 border-blue-200">
          {/* Date */}
          <td className="border border-border px-3 py-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-8 text-xs justify-start text-left font-normal",
                    !editData.date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-1 h-3 w-3" />
                  {editData.date ? format(new Date(editData.date), "MMM dd") : "Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={editData.date ? new Date(editData.date) : undefined}
                  onSelect={(date) => updateField('date', date ? format(date, "yyyy-MM-dd") : null)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </td>

          {/* Lead Vendor */}
          <td className="border border-border px-3 py-2">
            <Select
              value={editData.lead_vendor || ''}
              onValueChange={(value) => updateField('lead_vendor', value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Vendor" />
              </SelectTrigger>
              <SelectContent>
                {leadVendorOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </td>

          {/* Insured Name */}
          <td className="border border-border px-3 py-2">
            <Input
              value={editData.insured_name || ''}
              onChange={(e) => updateField('insured_name', e.target.value)}
              className="h-8 text-xs"
              placeholder="Customer name"
            />
          </td>

          {/* Buffer Agent */}
          <td className="border border-border px-3 py-2">
            <Select
              value={editData.buffer_agent || ''}
              onValueChange={(value) => updateField('buffer_agent', value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Buffer Agent" />
              </SelectTrigger>
              <SelectContent>
                {bufferAgentOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </td>

          {/* Agent */}
          <td className="border border-border px-3 py-2">
            <Select
              value={editData.agent || ''}
              onValueChange={(value) => updateField('agent', value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Agent" />
              </SelectTrigger>
              <SelectContent>
                {agentOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </td>

          {/* Licensed Account */}
          <td className="border border-border px-3 py-2">
            <Select
              value={editData.licensed_agent_account || ''}
              onValueChange={(value) => updateField('licensed_agent_account', value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Licensed" />
              </SelectTrigger>
              <SelectContent>
                {licensedAccountOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </td>

          {/* Status */}
          <td className="border border-border px-3 py-2">
            <Select
              value={editData.status || ''}
              onValueChange={(value) => updateField('status', value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </td>

          {/* Call Result */}
          <td className="border border-border px-3 py-2">
            <Select
              value={editData.call_result || ''}
              onValueChange={(value) => updateField('call_result', value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Result" />
              </SelectTrigger>
              <SelectContent>
                {callResultOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </td>

          {/* Carrier */}
          <td className="border border-border px-3 py-2">
            <Select
              value={editData.carrier || ''}
              onValueChange={(value) => updateField('carrier', value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Carrier" />
              </SelectTrigger>
              <SelectContent>
                {carrierOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </td>

          {/* Product Type */}
          <td className="border border-border px-3 py-2">
            <Select
              value={editData.product_type || ''}
              onValueChange={(value) => updateField('product_type', value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Product" />
              </SelectTrigger>
              <SelectContent>
                {productTypeOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </td>

          {/* Draft Date */}
          <td className="border border-border px-3 py-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-8 text-xs justify-start text-left font-normal",
                    !editData.draft_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-1 h-3 w-3" />
                  {editData.draft_date ? format(new Date(editData.draft_date), "MMM dd") : "Draft Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={editData.draft_date ? new Date(editData.draft_date) : undefined}
                  onSelect={(date) => updateField('draft_date', date ? format(date, "yyyy-MM-dd") : null)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </td>

          {/* MP (Monthly Premium) */}
          <td className="border border-border px-3 py-2">
            <Input
              type="number"
              step="0.01"
              value={editData.monthly_premium?.toString() || ''}
              onChange={(e) => updateField('monthly_premium', parseFloat(e.target.value) || null)}
              className="h-8 text-xs"
              placeholder="0.00"
            />
          </td>

          {/* Face Amount */}
          <td className="border border-border px-3 py-2">
            <Input
              type="number"
              value={editData.face_amount?.toString() || ''}
              onChange={(e) => updateField('face_amount', parseFloat(e.target.value) || null)}
              className="h-8 text-xs"
              placeholder="0.00"
            />
          </td>

          {/* Notes (3 lines max) */}
          <td className="border border-border px-3 py-2 max-w-md">
            <Textarea
              value={editData.notes || ''}
              onChange={(e) => updateField('notes', e.target.value)}
              className="h-16 text-xs resize-none"
              placeholder="Notes..."
            />
          </td>

          {/* Actions */}
          <td className="border border-border px-3 py-2">
            <div className="flex gap-1">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="h-7 w-7 p-0"
              >
                <Save className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
                className="h-7 w-7 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDetailsDialog(true)}
                className="h-7 w-7 p-0"
              >
                <Eye className="h-3 w-3" />
              </Button>
            </div>
          </td>
        </tr>
        <DetailsDialog />
      </>
    );
  }

  // Display mode
  return (
    <>
      <tr className={`${getStatusColor(row.status)} hover:bg-muted/50 transition-colors border`}>
        {/* Date */}
        <td className="border border-border px-3 py-2 text-sm w-20">
          {row.date ? format(new Date(row.date), "MMM dd, yy") : ''}
        </td>

        {/* Lead Vendor */}
        <td className="border border-border px-2 py-2 text-sm w-20">
          {row.lead_vendor ? (
            <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap inline-block ${getLeadVendorBadge(row.lead_vendor)}`}>
              {row.lead_vendor.length > 12 ? row.lead_vendor.substring(0, 12) + '...' : row.lead_vendor}
            </span>
          ) : ''}
        </td>

        {/* Insured Name */}
        <td className="border border-border px-2 py-2 text-sm w-14 truncate">
          <span className="font-medium text-gray-800 block truncate">
            {row.insured_name && row.insured_name.length > 12 ? row.insured_name.substring(0, 12) + '...' : row.insured_name}
          </span>
        </td>

        {/* Buffer Agent */}
        <td className="border border-border px-2 py-2 text-sm w-24">
          {row.buffer_agent ? (
            <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap inline-block ${getBufferAgentBadge(row.buffer_agent)}`}>
              {row.buffer_agent}
            </span>
          ) : ''}
        </td>

        {/* Agent */}
        <td className="border border-border px-2 py-2 text-sm w-20">
          {row.agent ? (
            <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap inline-block ${getAgentBadge(row.agent)}`}>
              {row.agent}
            </span>
          ) : ''}
        </td>

        {/* Licensed Account */}
        <td className="border border-border px-2 py-2 text-sm w-28">
          {row.licensed_agent_account ? (
            <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap inline-block ${getLicensedAgentBadge(row.licensed_agent_account)}`}>
              {row.licensed_agent_account.length > 10 ? row.licensed_agent_account.substring(0, 10) + '...' : row.licensed_agent_account}
            </span>
          ) : ''}
        </td>

        {/* Status */}
        <td className="border border-border px-2 py-2 text-sm w-32">
          {row.status ? (
            <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap inline-block ${getStatusBadge(row.status)}`}>
              {row.status.length > 16 ? row.status.substring(0, 16) + '...' : row.status}
            </span>
          ) : ''}
        </td>

        {/* Call Result */}
        <td className="border border-border px-2 py-2 text-sm w-24">
          {row.call_result ? (
            <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap inline-block ${getCallResultBadge(row.call_result)}`}>
              {row.call_result.length > 12 ? row.call_result.substring(0, 12) + '...' : row.call_result}
            </span>
          ) : ''}
        </td>

        {/* Carrier */}
        <td className="border border-border px-3 py-2 text-sm w-16 truncate">
          {row.carrier}
        </td>

        {/* Product Type */}
        <td className="border border-border px-3 py-2 text-sm w-20 truncate">
          {row.product_type}
        </td>

        {/* Draft Date */}
        <td className="border border-border px-3 py-2 text-sm w-20">
          {row.draft_date ? format(new Date(row.draft_date), "MMM dd, yy") : ''}
        </td>

        {/* MP (Monthly Premium) */}
        <td className="border border-border px-3 py-2 text-sm w-16 text-right">
          {row.monthly_premium ? `$${row.monthly_premium.toFixed(2)}` : ''}
        </td>

        {/* Face Amount */}
        <td className="border border-border px-3 py-2 text-sm w-20 text-right">
          {row.face_amount ? `$${row.face_amount.toLocaleString()}` : ''}
        </td>

        {/* Notes (3 lines max) */}
        <td className="border border-border px-3 py-2 text-xs w-28">
          <div className="line-clamp-3 whitespace-pre-wrap">
            {row.notes || ''}
          </div>
        </td>

        {/* Actions */}
        <td className="border border-border px-3 py-2 w-28">
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              className="h-7 w-7 p-0"
              title="Edit row"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setIsEditing(true); setShowDetailsDialog(true); }}
              className="h-7 w-7 p-0"
              title="View & edit details"
            >
              <Eye className="h-3 w-3" />
            </Button>
          </div>
        </td>
      </tr>
      <DetailsDialog />
    </>
  );
};
