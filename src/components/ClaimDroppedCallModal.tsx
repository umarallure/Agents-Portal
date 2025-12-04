import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Agent {
  user_id: string;
  display_name: string;
}

type WorkflowType = 'buffer' | 'licensed' | 'retention';
type RetentionType = 'new_sale' | 'fixed_payment' | 'carrier_requirements';

interface ClaimDroppedCallModalProps {
  open: boolean;
  loading: boolean;
  agentType: WorkflowType;
  bufferAgents: Agent[];
  licensedAgents: Agent[];
  retentionAgents: Agent[];
  fetchingAgents: boolean;
  claimBufferAgent: string;
  claimLicensedAgent: string;
  claimRetentionAgent: string;
  isRetentionCall: boolean;
  retentionType: RetentionType | '';
  retentionNotes: string;
  quoteCarrier: string;
  quoteProduct: string;
  quoteCoverage: string;
  quoteMP: string;
  onAgentTypeChange: (type: WorkflowType) => void;
  onBufferAgentChange: (id: string) => void;
  onLicensedAgentChange: (id: string) => void;
  onRetentionAgentChange: (id: string) => void;
  onRetentionCallChange: (value: boolean) => void;
  onRetentionTypeChange: (type: RetentionType | '') => void;
  onRetentionNotesChange: (notes: string) => void;
  onQuoteCarrierChange: (carrier: string) => void;
  onQuoteProductChange: (product: string) => void;
  onQuoteCoverageChange: (coverage: string) => void;
  onQuoteMPChange: (mp: string) => void;
  onCancel: () => void;
  onClaim: () => void;
}

export const ClaimDroppedCallModal: React.FC<ClaimDroppedCallModalProps> = ({
  open,
  loading,
  agentType,
  bufferAgents,
  licensedAgents,
  retentionAgents,
  fetchingAgents,
  claimBufferAgent,
  claimLicensedAgent,
  claimRetentionAgent,
  isRetentionCall,
  retentionType,
  retentionNotes,
  quoteCarrier,
  quoteProduct,
  quoteCoverage,
  quoteMP,
  onAgentTypeChange,
  onBufferAgentChange,
  onLicensedAgentChange,
  onRetentionAgentChange,
  onRetentionCallChange,
  onRetentionTypeChange,
  onRetentionNotesChange,
  onQuoteCarrierChange,
  onQuoteProductChange,
  onQuoteCoverageChange,
  onQuoteMPChange,
  onCancel,
  onClaim,
}) => {
  if (!open) return null;

  const isFormValid = () => {
    if (agentType === 'buffer' && !claimBufferAgent) return false;
    if (agentType === 'licensed' && !claimLicensedAgent) return false;
    if (agentType === 'retention') {
      if (!claimRetentionAgent || !retentionType) return false;
      if (retentionType === 'fixed_payment' && !retentionNotes) return false;
      if (retentionType === 'carrier_requirements' && !retentionNotes) return false;
    }
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Claim Call</h2>
        
        {/* Workflow type selector */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-3 text-gray-700">Select Workflow Type</label>
          <RadioGroup value={agentType} onValueChange={(value) => onAgentTypeChange(value as WorkflowType)}>
            <div className="flex items-center space-x-3 p-3 rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-colors cursor-pointer">
              <RadioGroupItem value="buffer" id="workflow-buffer" />
              <Label htmlFor="workflow-buffer" className="cursor-pointer flex-1 font-medium">Buffer to LA Workflow</Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-colors cursor-pointer mt-2">
              <RadioGroupItem value="licensed" id="workflow-licensed" />
              <Label htmlFor="workflow-licensed" className="cursor-pointer flex-1 font-medium">Direct to LA Workflow</Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-colors cursor-pointer mt-2">
              <RadioGroupItem value="retention" id="workflow-retention" />
              <Label htmlFor="workflow-retention" className="cursor-pointer flex-1 font-medium">Retention Workflow</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Buffer Agent Dropdown */}
        {agentType === 'buffer' && (
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-3 text-gray-700">Select Buffer Agent</label>
            {fetchingAgents ? (
              <div className="flex items-center gap-2 py-4">
                <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-gray-600">Loading agents...</span>
              </div>
            ) : (
              <Select value={claimBufferAgent} onValueChange={onBufferAgentChange}>
                <SelectTrigger className="w-full h-12 text-base">
                  <SelectValue placeholder="Select Buffer Agent" />
                </SelectTrigger>
                <SelectContent>
                  {bufferAgents.map(agent => (
                    <SelectItem key={agent.user_id} value={agent.user_id} className="text-base py-3">
                      {agent.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Licensed Agent Dropdown */}
        {agentType === 'licensed' && (
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-3 text-gray-700">Select Licensed Agent</label>
            {fetchingAgents ? (
              <div className="flex items-center gap-2 py-4">
                <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-gray-600">Loading agents...</span>
              </div>
            ) : (
              <Select value={claimLicensedAgent} onValueChange={onLicensedAgentChange}>
                <SelectTrigger className="w-full h-12 text-base">
                  <SelectValue placeholder="Select Licensed Agent" />
                </SelectTrigger>
                <SelectContent>
                  {licensedAgents.map(agent => (
                    <SelectItem key={agent.user_id} value={agent.user_id} className="text-base py-3">
                      {agent.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Retention Workflow */}
        {agentType === 'retention' && (
          <>
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-3 text-gray-700">Select Retention Agent</label>
              {fetchingAgents ? (
                <div className="flex items-center gap-2 py-4">
                  <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-gray-600">Loading agents...</span>
                </div>
              ) : (
                <Select value={claimRetentionAgent} onValueChange={onRetentionAgentChange}>
                  <SelectTrigger className="w-full h-12 text-base">
                    <SelectValue placeholder="Select Retention Agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {retentionAgents.map(agent => (
                      <SelectItem key={agent.user_id} value={agent.user_id} className="text-base py-3">
                        {agent.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold mb-3 text-gray-700">
                Retention Call Type <span className="text-red-500">*</span>
              </label>
              <Select value={retentionType} onValueChange={(value) => onRetentionTypeChange(value as RetentionType | '')}>
                <SelectTrigger className="w-full h-12 text-base">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_sale" className="text-base py-3">New Sale</SelectItem>
                  <SelectItem value="fixed_payment" className="text-base py-3">Fixed Failed Payment</SelectItem>
                  <SelectItem value="carrier_requirements" className="text-base py-3">Fulfilling Carrier Requirements</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* New Sale - Optional Quote Fields */}
            {retentionType === 'new_sale' && (
              <div className="mb-6 p-5 border-2 border-blue-100 rounded-lg bg-blue-50">
                <p className="text-sm font-semibold mb-4 text-gray-700">Quote Details (Optional)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Carrier</Label>
                    <Input 
                      value={quoteCarrier} 
                      onChange={e => onQuoteCarrierChange(e.target.value)}
                      placeholder="e.g., SBLI"
                      className="h-11"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Product Level</Label>
                    <Input 
                      value={quoteProduct} 
                      onChange={e => onQuoteProductChange(e.target.value)}
                      placeholder="e.g., Level"
                      className="h-11"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Coverage Amount</Label>
                    <Input 
                      value={quoteCoverage} 
                      onChange={e => onQuoteCoverageChange(e.target.value)}
                      placeholder="e.g., $100,000"
                      className="h-11"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Monthly Premium</Label>
                    <Input 
                      value={quoteMP} 
                      onChange={e => onQuoteMPChange(e.target.value)}
                      placeholder="e.g., $89.00"
                      className="h-11"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Fixed Payment or Carrier Requirements - Required Notes */}
            {(retentionType === 'fixed_payment' || retentionType === 'carrier_requirements') && (
              <div className="mb-6">
                <Label className="text-sm font-semibold mb-2 block">
                  Notes <span className="text-red-500">*</span> <span className="text-xs text-gray-500 font-normal">(Required)</span>
                </Label>
                <Textarea
                  value={retentionNotes}
                  onChange={e => onRetentionNotesChange(e.target.value)}
                  placeholder="Enter detailed notes..."
                  rows={5}
                  className="mt-1 resize-none"
                />
              </div>
            )}
          </>
        )}
        
        {/* Retention Call Toggle - Only for buffer workflow */}
        {agentType === 'buffer' && (
          <div className="flex items-center justify-between space-x-3 border-t-2 pt-6 mt-6 pb-2">
            <div className="space-y-1">
              <Label htmlFor="claim-retention-call" className="text-base font-semibold">
                Mark as Retention Call
              </Label>
              <p className="text-sm text-gray-600">
                This claim will be tracked as a retention team call
              </p>
            </div>
            <Switch
              id="claim-retention-call"
              checked={isRetentionCall}
              onCheckedChange={onRetentionCallChange}
              className="data-[state=checked]:bg-blue-600"
            />
          </div>
        )}
        
        <div className="flex justify-end gap-3 mt-8">
          <Button variant="outline" onClick={onCancel} disabled={loading} className="h-11 px-6 text-base">
            Cancel
          </Button>
          <Button onClick={onClaim} disabled={loading || !isFormValid()} className="h-11 px-6 text-base">
            {loading ? 'Claiming...' : 'Claim & Reconnect'}
          </Button>
        </div>
      </div>
    </div>
  );
};
