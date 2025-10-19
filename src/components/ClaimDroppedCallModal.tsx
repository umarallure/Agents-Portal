import React from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Agent {
  user_id: string;
  display_name: string;
}

interface ClaimDroppedCallModalProps {
  open: boolean;
  loading: boolean;
  agentType: 'buffer' | 'licensed';
  bufferAgents: Agent[];
  licensedAgents: Agent[];
  fetchingAgents: boolean;
  claimBufferAgent: string;
  claimLicensedAgent: string;
  isRetentionCall: boolean;
  onAgentTypeChange: (type: 'buffer' | 'licensed') => void;
  onBufferAgentChange: (id: string) => void;
  onLicensedAgentChange: (id: string) => void;
  onRetentionCallChange: (value: boolean) => void;
  onCancel: () => void;
  onClaim: () => void;
}

export const ClaimDroppedCallModal: React.FC<ClaimDroppedCallModalProps> = ({
  open,
  loading,
  agentType,
  bufferAgents,
  licensedAgents,
  fetchingAgents,
  claimBufferAgent,
  claimLicensedAgent,
  isRetentionCall,
  onAgentTypeChange,
  onBufferAgentChange,
  onLicensedAgentChange,
  onRetentionCallChange,
  onCancel,
  onClaim,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Claim Dropped Call</h2>
        {/* Workflow type selector */}
        <div className="mb-4">
          <label className="block font-medium mb-2">Select Workflow Type</label>
          <select
            value={agentType}
            onChange={e => onAgentTypeChange(e.target.value as 'buffer' | 'licensed')}
            className="border rounded px-2 py-1 w-full"
          >
            <option value="buffer">Buffer Agent</option>
            <option value="licensed">Licensed Agent</option>
          </select>
        </div>
        {/* Buffer Agent Dropdown */}
        {agentType === 'buffer' && (
          <div className="mb-4">
            <label className="block font-medium mb-2">Select Buffer Agent</label>
            {fetchingAgents ? (
              <div className="flex items-center gap-2 py-2">
                <span className="text-sm text-muted-foreground">Loading agents...</span>
              </div>
            ) : (
              <select
                value={claimBufferAgent}
                onChange={e => onBufferAgentChange(e.target.value)}
                className="border rounded px-2 py-1 w-full"
              >
                <option value="">Select Buffer Agent</option>
                {bufferAgents.map(agent => (
                  <option key={agent.user_id} value={agent.user_id}>{agent.display_name}</option>
                ))}
              </select>
            )}
            {bufferAgents.length === 0 && !fetchingAgents && (
              <p className="text-sm text-muted-foreground">No buffer agents available. Switch to "Licensed Agent" workflow.</p>
            )}
          </div>
        )}
        {/* Licensed Agent Dropdown */}
        {agentType === 'licensed' && (
          <div className="mb-4">
            <label className="block font-medium mb-2">Select Licensed Agent</label>
            {fetchingAgents ? (
              <div className="flex items-center gap-2 py-2">
                <span className="text-sm text-muted-foreground">Loading agents...</span>
              </div>
            ) : (
              <select
                value={claimLicensedAgent}
                onChange={e => onLicensedAgentChange(e.target.value)}
                className="border rounded px-2 py-1 w-full"
              >
                <option value="">Select Licensed Agent</option>
                {licensedAgents.map(agent => (
                  <option key={agent.user_id} value={agent.user_id}>{agent.display_name}</option>
                ))}
              </select>
            )}
            {licensedAgents.length === 0 && !fetchingAgents && (
              <p className="text-sm text-muted-foreground">No licensed agents available. Please ensure licensed agents are registered in the system.</p>
            )}
          </div>
        )}
        
        {/* Retention Call Toggle */}
        <div className="flex items-center justify-between space-x-2 border-t pt-4 mt-4">
          <div className="space-y-0.5">
            <Label htmlFor="claim-retention-call" className="text-base">
              Mark as Retention Call
            </Label>
            <p className="text-sm text-muted-foreground">
              This claim will be tracked as a retention team call
            </p>
          </div>
          <Switch
            id="claim-retention-call"
            checked={isRetentionCall}
            onCheckedChange={onRetentionCallChange}
          />
        </div>
        
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button onClick={onClaim} disabled={loading || (agentType === 'buffer' && !claimBufferAgent) || (agentType === 'licensed' && !claimLicensedAgent)}>
            {loading ? 'Claiming...' : 'Claim & Reconnect'}
          </Button>
        </div>
      </div>
    </div>
  );
};
