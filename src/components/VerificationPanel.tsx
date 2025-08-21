import { useState, useEffect } from "react";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
// Custom field order for display
const customFieldOrder = [
  "lead_vendor", // Corebiz: William G Moore
  "street_address",
  "beneficiary_information",
  "billing_and_mailing_address_is_the_same",
  "date_of_birth",
  "birth_state",
  "age",
  "phone_number",
  "call_phone_landline",
  "social_security",
  "driver_license",
  "exp",
  "existing_coverage",
  "applied_to_life_insurance_last_two_years",
  "height", // 5.2
  "weight", // 160
  "doctors_name", // Dr. Daniel Pham, MD
  "tobacco_use", // NO
  "health_conditions", // nil
  "medications", // nil
  "insurance_application_details", // Insurance Application Details (if exists)
  "carrier", // AMAM
  "monthly_premium", // $63.37
  "coverage_amount", // $5,000
  "draft_date", // 8th of aug
  "first_draft", // First Draft (if exists)
  "institution_name", // Bank of Oklahoma
  "beneficiary_routing", // Routing Number: 103900036
  "beneficiary_account", // Account Number: 103900036
  "account_type", // Checking

   // Address: 8700 NE 16th St
  "city", // Oklahoma City
  "state", // OK
  "zip_code", // 73110
   // Son Garland Moore ( 09 08 1985)
   // Billing and mailing address is the same: (Y/N)
   // 1948-05-26
   // NE
   // 77
   // (405) 423-4272
   // Call phone/landline (if exists)
   // 447489617
   // Driver License Number: nil
   // Exp: (if exists)
   // nil
   // nil
  
  
  
  
  

  
  "additional_notes" // ADDITIONAL NOTES
];
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ColoredProgress } from "@/components/ui/colored-progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Clock, User, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { useRealtimeVerification, VerificationItem } from "@/hooks/useRealtimeVerification";

interface VerificationPanelProps {
  sessionId: string;
  onTransferReady?: () => void;
}

export const VerificationPanel = ({ sessionId, onTransferReady }: VerificationPanelProps) => {
  // Helper to get lead data from verificationItems
  const getLeadData = () => {
    const leadData: Record<string, string> = {};
    if (verificationItems) {
      verificationItems.forEach(item => {
        if (['lead_vendor', 'customer_full_name'].includes(item.field_name)) {
          leadData[item.field_name] = inputValues[item.id] || item.original_value || '';
        }
      });
    }
    return leadData;
  };
  const { toast } = useToast();

  // Copy notes logic
  const copyNotesToClipboard = () => {
    if (!verificationItems) return;
    const notesText = verificationItems.map(item => {
      const label = formatFieldName(item.field_name);
      const value = inputValues[item.id] || 'N/A';
      return `${label}: ${value}`;
    }).join('\n');
    navigator.clipboard.writeText(notesText);
    toast({
      title: "Copied!",
      description: "Verification notes copied to clipboard",
    });
  };
  const [elapsedTime, setElapsedTime] = useState("00:00");
  const [notes, setNotes] = useState("");
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  
  const {
    session,
    verificationItems,
    loading,
    error,
    toggleVerification,
    updateVerifiedValue,
    updateVerificationNotes,
    updateSessionStatus,
    refetch,
  } = useRealtimeVerification(sessionId);

  useEffect(() => {
    // Update elapsed time every second
    const interval = setInterval(() => {
      if (session?.started_at) {
        const start = new Date(session.started_at);
        const now = new Date();
        const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;
        setElapsedTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.started_at]);

  // Initialize input values when verification items change
  useEffect(() => {
    if (verificationItems) {
      const newInputValues: Record<string, string> = {};
      verificationItems.forEach(item => {
        if (!inputValues[item.id]) {
          newInputValues[item.id] = item.verified_value || item.original_value || '';
        }
      });
      setInputValues(prev => ({ ...prev, ...newInputValues }));
    }
  }, [verificationItems]);

  // Add early returns for loading and error states AFTER all hooks
  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-gray-500">Loading verification data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-red-500">
            Error: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-gray-500">
            No verification session found
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleFieldValueChange = (itemId: string, newValue: string) => {
    // Update local state immediately for smooth UI
    setInputValues(prev => ({
      ...prev,
      [itemId]: newValue
    }));
    
    // Debounce the database update
    setTimeout(() => {
      updateVerifiedValue(itemId, newValue);
    }, 500);
  };

  const handleCheckboxChange = (itemId: string, checked: boolean) => {
    toggleVerification(itemId, checked);
  };

  const handleTransferToLA = async () => {
    await updateSessionStatus('transferred');
    onTransferReady?.();
  };

  // Calculate real-time progress percentage
  const calculateProgress = () => {
    if (!verificationItems || verificationItems.length === 0) return 0;
    const verifiedCount = verificationItems.filter(item => item.is_verified).length;
    return Math.round((verifiedCount / verificationItems.length) * 100);
  };

  const currentProgress = calculateProgress();

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-500';
      case 'in_progress': return 'bg-blue-500';
      case 'claimed': return 'bg-purple-500';
      case 'ready_for_transfer': return 'bg-green-500';
      case 'transferred': return 'bg-orange-500';
      case 'completed': return 'bg-emerald-500';
      default: return 'bg-gray-500';
    }
  };

  const getFieldIcon = (item: VerificationItem) => {
    if (!item.is_verified) return <XCircle className="h-4 w-4 text-gray-400" />;
    if (item.is_modified) return <CheckCircle className="h-4 w-4 text-blue-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  // Sort items by custom order, then group by category for display
  const sortedItems = (verificationItems || []).slice().sort((a, b) => {
    const aIdx = customFieldOrder.indexOf(a.field_name);
    const bIdx = customFieldOrder.indexOf(b.field_name);
    if (aIdx === -1 && bIdx === -1) return 0;
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  const formatFieldName = (fieldName: string) => {
    return fieldName.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading verification panel...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Verification session not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Verification Panel</CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={getStatusBadgeColor(session.status)}>
              {session.status.replace('_', ' ').toUpperCase()}
            </Badge>
            {/* Copy Notes Button */}
            <Button onClick={copyNotesToClipboard} variant="outline" size="sm">
              <Copy className="h-4 w-4 mr-2" />
              Copy Edited Notes
            </Button>
          </div>
        </div>
        {/* Session Info */}
        <div className="space-y-2 text-sm mt-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Agent: {session.buffer_agent_id || 'Unknown'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Time: {elapsedTime}</span>
          </div>
        </div>
        {/* Small Progress Bar (original) */}
        <div className="space-y-2 mt-4">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span className={`font-semibold ${
              currentProgress >= 76 ? 'text-green-600' :
              currentProgress >= 51 ? 'text-yellow-600' :
              currentProgress >= 26 ? 'text-orange-600' : 'text-red-600'
            }`}>
              {currentProgress}%
            </span>
          </div>
          <div className="relative">
            <ColoredProgress 
              value={currentProgress} 
              className="h-3 transition-all duration-500"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {verificationItems.filter(item => item.is_verified).length} of {verificationItems.length} fields verified
            <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
              currentProgress >= 76 ? 'bg-green-100 text-green-800' :
              currentProgress >= 51 ? 'bg-yellow-100 text-yellow-800' :
              currentProgress >= 26 ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
            }`}>
              {currentProgress >= 76 ? 'Ready for Transfer' :
               currentProgress >= 51 ? 'Nearly Complete' :
               currentProgress >= 26 ? 'In Progress' : 'Just Started'}
            </span>
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)', minHeight: '500px' }}>
        {sortedItems.map((item) => (
          <div key={item.id} className="space-y-2">
            <div className="flex items-center gap-2">
              {getFieldIcon(item)}
              <Label className="text-xs font-medium">
                {formatFieldName(item.field_name)}
              </Label>
              <Checkbox
                checked={item.is_verified}
                onCheckedChange={(checked) => 
                  handleCheckboxChange(item.id, checked as boolean)
                }
                className="ml-auto"
              />
            </div>
            <Input
              value={inputValues[item.id] || ''}
              onChange={(e) => handleFieldValueChange(item.id, e.target.value)}
              placeholder={`Enter ${formatFieldName(item.field_name).toLowerCase()}`}
              className="text-xs"
            />
            <Separator className="mt-4" />
          </div>
        ))}

        {/* Notes Section */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional notes about the verification..."
            className="text-xs"
            rows={3}
          />
        </div>
      </CardContent>

        {/* Footer */}
        <div className="p-4 border-t flex-shrink-0">
          <div className="flex justify-end gap-3">
            {/* Buffer Agent Buttons */}
            {session.buffer_agent_id && !session.licensed_agent_id && (
              <>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await updateSessionStatus('call_dropped');
                    const leadData = getLeadData();
                    // Send notification to center
                    await supabase.functions.invoke('center-transfer-notification', {
                      body: {
                        type: 'call_dropped',
                        submissionId: session.submission_id,
                        leadData
                      }
                    });
                    alert(`Call with ${leadData.customer_full_name || 'client'} dropped. Need to reconnect.`);
                    toast({
                      title: 'Call Dropped',
                      description: `Call with ${leadData.customer_full_name || 'client'} dropped. Need to reconnect.`
                    });
                    refetch();
                  }}
                >
                  Call Dropped
                </Button>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await updateSessionStatus('buffer_done');
                    toast({
                      title: 'Call Done',
                      description: 'Buffer agent is now free from the call.'
                    });
                    refetch();
                  }}
                >
                  Call Done
                </Button>
                <Button
                  variant="default"
                  onClick={async () => {
                    await updateSessionStatus('transferred');
                    // Send notification to center when LA claims the call
                    const leadData = getLeadData();
                    // You may need to pass bufferAgentName and licensedAgentName from props/context
                    await supabase.functions.invoke('center-transfer-notification', {
                      body: {
                        type: 'transfer_to_la',
                        submissionId: session.submission_id,
                        leadData,
                        bufferAgentName: session.buffer_agent_name || 'Buffer Agent',
                        licensedAgentName: session.licensed_agent_name || 'Licensed Agent'
                      }
                    });
                    onTransferReady?.();
                    refetch();
                  }}
                >
                  Transfer to LA
                </Button>
              </>
            )}
            {/* Licensed Agent Buttons */}
            {session.licensed_agent_id && (
              <>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await updateSessionStatus('call_dropped');
                    const leadData = getLeadData();
                    await supabase.functions.invoke('center-transfer-notification', {
                      body: {
                        type: 'call_dropped',
                        submissionId: session.submission_id,
                        leadData
                      }
                    });
                    alert(`Call with ${leadData.customer_full_name || 'client'} dropped. Need to reconnect.`);
                    toast({
                      title: 'Call Dropped',
                      description: `Call with ${leadData.customer_full_name || 'client'} dropped. Need to reconnect.`
                    });
                    refetch();
                  }}
                >
                  Call Dropped
                </Button>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await updateSessionStatus('la_done');
                    toast({
                      title: 'Call Done',
                      description: 'Licensed agent is now free from the call.'
                    });
                    refetch();
                  }}
                >
                  Call Done
                </Button>
                <Button
                  variant="default"
                  onClick={async () => {
                    await updateSessionStatus('ready_for_transfer');
                    toast({
                      title: 'Transfer',
                      description: 'Session is now available for other licensed agents to claim.'
                    });
                    refetch();
                  }}
                >
                  Transfer to Other Licensed Agent
                </Button>
              </>
            )}
          </div>
        </div>
    </Card>
  );
};
