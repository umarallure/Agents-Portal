import React, { useState, useEffect } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Check, X, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface DailyDealFlowRecord {
  id: string;
  submission_id: string;
  client_phone_number?: string | null;
  lead_vendor?: string | null;
  date?: string | null;
  insured_name?: string | null;
  buffer_agent?: string | null;
  agent?: string | null;
  licensed_agent_account?: string | null;
  status?: string | null;
  call_result?: string | null;
  carrier?: string | null;
  product_type?: string | null;
  draft_date?: string | null;
  monthly_premium?: number | null;
  face_amount?: number | null;
  from_callback?: boolean | null;
  notes?: string | null;
  policy_number?: string | null;
  carrier_audit?: string | null;
  product_type_carrier?: string | null;
  level_or_gi?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface EditableRowProps {
  record: DailyDealFlowRecord;
  isEditing: boolean;
  onEdit: (id: string) => void;
  onSave: (id: string, updatedData: Partial<DailyDealFlowRecord>) => Promise<void>;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
  isSaving?: boolean;
}

// Dropdown options matching the existing system
const BUFFER_AGENT_OPTIONS = [
  "Kyla",
  "Justine",
  "Nicole Mejia",
  "Angelica",
  "Laiza Batain",
  "Aqib Afridi",
  "Qasim Raja",
  "Hussain Khan",
  "N/A",
];

const AGENT_OPTIONS = [
  "Claudia", "Lydia", "Juan", "Angy","Benjamin", "N/A", "Isaac",
   "Tatumn",
   "Zack"
];

const LICENSED_ACCOUNT_OPTIONS = [
  "Claudia", "Lydia","Trinity", "Isaac", "Noah", "Benjamin", "N/A","Tatumn"
];

const CARRIER_OPTIONS = [
  "Liberty", "SBLI", "Corebridge", "MOH", "Transamerica", "RNA", "ANAM",
  "GTL", "Aetna", "Americo", "CICA", "N/A"
];

const PRODUCT_TYPE_OPTIONS = [
  "Preferred", "Standard", "Graded", "Modified", "GI", "Immediate", "Level", "ROP", "N/A"
];

const STATUS_OPTIONS = [
  "Needs BPO Callback",
  "Pending Approval",
  "Previously Sold BPO",
  "Incomplete Transfer",
  "DQ'd Can't be sold",
  "Returned To Center - DQ",
  "Future Submission Date",
  "Application Withdrawn",
  "Call Never Sent"
];

const CALL_RESULT_OPTIONS = [
  "Submitted", "Underwriting", "Not Submitted"
];

const LEAD_VENDOR_OPTIONS = [
  "LeadsMarket", "Media Alpha", "QuoteWizard", "SelectQuote", "SeniorQuote", "N/A"
];

const LEVEL_OR_GI_OPTIONS = [
  "Level", "GI", "ROP", "N/A"
];

export const EditableRow: React.FC<EditableRowProps> = ({
  record,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  isSaving = false
}) => {
  const [editData, setEditData] = useState<Partial<DailyDealFlowRecord>>({});

  useEffect(() => {
    if (isEditing) {
      setEditData(record);
    }
  }, [isEditing, record]);

  const handleSave = async () => {
    await onSave(record.id, editData);
  };

  const handleCancel = () => {
    setEditData({});
    onCancel(record.id);
  };

  const updateField = (field: keyof DailyDealFlowRecord, value: any) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const getStatusBadgeVariant = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'needs callback':
        return 'secondary';
      case 'not interested':
        return 'destructive';
      case '⁠dq':
        return 'destructive';
      case 'future submission date':
        return 'outline';
      case 'call back fix':
        return 'secondary';
      case 'call never sent':
        return 'outline';
      case 'disconnected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getCallResultBadgeVariant = (result: string | null) => {
    switch (result?.toLowerCase()) {
      case 'submitted':
        return 'default';
      case 'underwriting':
        return 'secondary';
      case 'not submitted':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (isEditing) {
    return (
      <TableRow className="bg-blue-50 dark:bg-blue-950/20">
        {/* Date */}
        <TableCell className="font-medium">
          <Input
            type="date"
            value={editData.date || ''}
            onChange={(e) => updateField('date', e.target.value)}
            className="w-full"
          />
        </TableCell>

        {/* Insured Name */}
        <TableCell>
          <Input
            value={editData.insured_name || ''}
            onChange={(e) => updateField('insured_name', e.target.value)}
            placeholder="Insured Name"
            className="w-full"
          />
        </TableCell>

        {/* Agent */}
        <TableCell>
          <Select
            value={editData.agent || ''}
            onValueChange={(value) => updateField('agent', value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Agent" />
            </SelectTrigger>
            <SelectContent>
              {AGENT_OPTIONS.map((agent) => (
                <SelectItem key={agent} value={agent}>
                  {agent}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>

        {/* Licensed Account */}
        <TableCell>
          <Select
            value={editData.licensed_agent_account || ''}
            onValueChange={(value) => updateField('licensed_agent_account', value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Licensed Account" />
            </SelectTrigger>
            <SelectContent>
              {LICENSED_ACCOUNT_OPTIONS.map((account) => (
                <SelectItem key={account} value={account}>
                  {account}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>

        {/* Status */}
        <TableCell>
          <Select
            value={editData.status || ''}
            onValueChange={(value) => updateField('status', value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>

        {/* Call Result */}
        <TableCell>
          <Select
            value={editData.call_result || ''}
            onValueChange={(value) => updateField('call_result', value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Call Result" />
            </SelectTrigger>
            <SelectContent>
              {CALL_RESULT_OPTIONS.map((result) => (
                <SelectItem key={result} value={result}>
                  {result}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>

        {/* Carrier */}
        <TableCell>
          <Select
            value={editData.carrier || ''}
            onValueChange={(value) => updateField('carrier', value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Carrier" />
            </SelectTrigger>
            <SelectContent>
              {CARRIER_OPTIONS.map((carrier) => (
                <SelectItem key={carrier} value={carrier}>
                  {carrier}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>

        {/* Product Type */}
        <TableCell>
          <Select
            value={editData.product_type || ''}
            onValueChange={(value) => updateField('product_type', value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Product Type" />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_TYPE_OPTIONS.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>

        {/* Notes */}
        <TableCell>
          <Textarea
            value={editData.notes || ''}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Notes"
            className="w-full resize-none"
            rows={2}
          />
        </TableCell>

        {/* Actions */}
        <TableCell>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="h-8 w-8 p-0"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow className="hover:bg-muted/50">
      {/* Date */}
      <TableCell className="font-medium">
        {record.date ? format(new Date(record.date), 'MMM dd, yyyy') : '-'}
      </TableCell>

      {/* Insured Name */}
      <TableCell>{record.insured_name || '-'}</TableCell>

      {/* Agent */}
      <TableCell>{record.agent || '-'}</TableCell>

      {/* Licensed Account */}
      <TableCell>{record.licensed_agent_account || '-'}</TableCell>

      {/* Status */}
      <TableCell>
        {record.status ? (
          <Badge variant={getStatusBadgeVariant(record.status)}>
            {record.status}
          </Badge>
        ) : '-'}
      </TableCell>

      {/* Call Result */}
      <TableCell>
        {record.call_result ? (
          <Badge variant={getCallResultBadgeVariant(record.call_result)}>
            {record.call_result}
          </Badge>
        ) : '-'}
      </TableCell>

      {/* Carrier */}
      <TableCell>{record.carrier || '-'}</TableCell>

      {/* Product Type */}
      <TableCell>{record.product_type || '-'}</TableCell>

      {/* Notes */}
      <TableCell>
        {record.notes ? (
          <div className="max-w-[200px]">
            <p className="line-clamp-2 text-sm" title={record.notes}>
              {record.notes}
            </p>
          </div>
        ) : '-'}
      </TableCell>

      {/* Actions */}
      <TableCell>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(record.id)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(record.id)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default EditableRow;
