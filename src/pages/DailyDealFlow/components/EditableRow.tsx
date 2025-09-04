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
  "Needs callback", "Not Interested", "⁠DQ", "Future Submission Date",
  "Call Back Fix", "Call Never Sent", "Disconnected"
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

export const EditableRow = ({ row, onUpdate }: EditableRowProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<DailyDealFlowRow>(row);
  const [isSaving, setIsSaving] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const { toast } = useToast();

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
      <tr className="hover:bg-muted/50 transition-colors">
        {/* Date */}
        <td className="border border-border px-3 py-2 text-sm w-24">
          {row.date ? format(new Date(row.date), "MMM dd, yy") : ''}
        </td>

        {/* Lead Vendor */}
        <td className="border border-border px-3 py-2 text-sm w-32 truncate">
          {row.lead_vendor}
        </td>

        {/* Insured Name */}
  <td className="border border-border px-3 py-2 text-sm w-40 truncate">
          {row.insured_name}
        </td>

        {/* Agent */}
        <td className="border border-border px-3 py-2 text-sm w-24 truncate">
          {row.agent}
        </td>

        {/* Licensed Account */}
        <td className="border border-border px-3 py-2 text-sm w-28 truncate">
          {row.licensed_agent_account}
        </td>

        {/* Status */}
        <td className="border border-border px-3 py-2 text-sm w-32 truncate">
          {row.status}
        </td>

        {/* Call Result */}
        <td className="border border-border px-3 py-2 text-sm w-28 truncate">
          {row.call_result}
        </td>

        {/* Carrier */}
        <td className="border border-border px-3 py-2 text-sm w-28 truncate">
          {row.carrier}
        </td>

        {/* Product Type */}
        <td className="border border-border px-3 py-2 text-sm w-24 truncate">
          {row.product_type}
        </td>

        {/* Notes (3 lines max) */}
  <td className="border border-border px-3 py-2 text-xs max-w-md">
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
