import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CallResultFormProps {
  submissionId: string;
  customerName?: string;
  onSuccess?: () => void;
}

const statusOptions = [
  "Needs callback",
  "Not Interested",
  "⁠DQ",
  "Future Submission Date",
  "Call Back Fix",
  "Call Never Sent",
  "Disconnected"
];

const carrierOptions = [
  "Liberty",
  "Corebridge",
  "MOH",
  "Transamerica",
  "RNA",
  "ANAM",
  "Aetna",
  "Americo",
  "CICA",
  "N/A"
];

const productTypeOptions = [
  "Preferred",
  "Standard",
  "Graded",
  "Modified",
  "GI",
  "Immediate",
  "Level",
  "ROP",
  "N/A"
];

const bufferAgentOptions = [
  "N/A",
  "Ira",
  "Burney", 
  "Kyla",
  "Bryan",
  "Justine"
];

const agentOptions = [
  "Claudia",
  "Lydia",
  "Benjamin",
  "Erica",
  "N/A"
];

const licensedAccountOptions = [
  "Claudia",
  "Lydia",
  "Benjamin",
  "N/A"
];

const leadVendorOptions = [
"Ark Tech",
"GrowthOnics BPO",
"Maverick",
"Omnitalk BPO",
"Vize BPO",
"Corebiz",
"Digicon",
"Ambition",
"Benchmark",
"Poshenee",
"Plexi",
"Gigabite",
"Everline solution",
"Progressive BPO",
"Cerberus BPO",
"TM Global",
"Optimum BPO",
"Ethos BPO",
"Trust Link",
"Quotes BPO",
"Zupax Marketing",
"Argon Communications",
"Care Solutions",
"Cutting Edge",
"Next Era",
"Rock BPO",
"Avenue Consultancy"
];

const dqReasonOptions = [
  "Multiple Chargebacks",
  "Not Cognatively Functional",
  "Transferred Many Times Without Success",
  "TCPA",
  "Decline All Available Carriers",
  "Already a DQ in our System",
  "Other"
];

const needsCallbackReasonOptions = [
  "Banking information invalid",
  "Existing Policy - Draft hasn't passed",
  "Other"
];

const notInterestedReasonOptions = [
  "Existing coverage - Not Looking for More",
  "Other"
];

const futureSubmissionReasonOptions = [
  "Future Submission Date - Draft Date Too Far Away",
  "Future Submission Date - Birthday is before draft date",
  "Other"
];

const getReasonOptions = (status: string) => {
  switch (status) {
    case "⁠DQ":
      return dqReasonOptions;
    case "Needs callback":
      return needsCallbackReasonOptions;
    case "Not Interested":
      return notInterestedReasonOptions;
    case "Future Submission Date":
      return futureSubmissionReasonOptions;
    default:
      return [];
  }
};

const getNoteText = (status: string, reason: string, clientName: string = "[Client Name]") => {
  const statusReasonMapping: { [status: string]: { [reason: string]: string } } = {
    "⁠DQ": {
      "Multiple Chargebacks": `${clientName} has been DQ'd. They have caused multiple chargebacks in our agency, so we cannot submit another application for them`,
      "Not Cognatively Functional": `${clientName} has been DQ'd. They are not mentally able to make financial decisions. We cannot submit an application for them`,
      "Transferred Many Times Without Success": `We have spoken with ${clientName} more than 5 times and have not been able to successfully submit an application. We should move on from this caller`,
      "TCPA": `${clientName} IS A TCPA LITIGATOR. PLEASE REMOVE FROM YOUR SYSTEM IMMEDIATELY`,
      "Decline All Available Carriers": `${clientName} was denied through all carriers they are elligible to apply for`,
      "Already a DQ in our System": `${clientName} is already a DQ in our system. We will not accept this caller again.`,
      "Other": "Custom message if none of the above fit"
    },
    "Needs callback": {
      "Banking information invalid": `The banking information for ${clientName} could not be validated. We need to call them back and verify a new form of payment`,
      "Existing Policy - Draft hasn't passed": `${clientName} has an existing policy with an initial draft date that hasn't passed. We can call them [a week after entered draft date] to see if they want additional coverage`,
      "Other": "Custom message if none of the above fit"
    },
    "Not Interested": {
      "Existing coverage - Not Looking for More": `${clientName} has exsiting coverage and cannot afford additional coverage`,
      "Other": "Custom message if none of the above fit"
    },
    "Future Submission Date": {
      "Future Submission Date - Draft Date Too Far Away": `The application for ${clientName} has been filled out and signed, but we cannot submit until [Submission date] because the draft date is too far out`,
      "Future Submission Date - Birthday is before draft date": `${clientName}'s birthday is before their initial draft, so we need to call them on [the day after client DOB] to requote and submit application`,
      "Other": "Custom message if none of the above fit"
    }
  };
  
  return statusReasonMapping[status]?.[reason] || "";
};

export const CallResultForm = ({ submissionId, customerName, onSuccess }: CallResultFormProps) => {
  const [applicationSubmitted, setApplicationSubmitted] = useState<boolean | null>(null);
  const [status, setStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [notes, setNotes] = useState("");
  const [carrier, setCarrier] = useState("");
  const [productType, setProductType] = useState("");
  const [draftDate, setDraftDate] = useState<Date>();
  const [submittingAgent, setSubmittingAgent] = useState("");
  const [licensedAgentAccount, setLicensedAgentAccount] = useState("");
  const [coverageAmount, setCoverageAmount] = useState("");
  const [monthlyPremium, setMonthlyPremium] = useState("");
  const [submissionDate, setSubmissionDate] = useState<Date>();
  const [sentToUnderwriting, setSentToUnderwriting] = useState<boolean | null>(null);
  const [bufferAgent, setBufferAgent] = useState("");
  const [agentWhoTookCall, setAgentWhoTookCall] = useState("");
  const [leadVendor, setLeadVendor] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [callSource, setCallSource] = useState("");
  
  const { toast } = useToast();

  // Reset status reason and notes when status changes or when switching application submission status
  useEffect(() => {
    if (!["⁠DQ", "Needs callback", "Not Interested", "Future Submission Date"].includes(status)) {
      setStatusReason("");
      // Only clear notes if they were auto-populated from status reasons
      if (statusReason && statusReason !== "Other") {
        setNotes("");
      }
    } else {
      // Reset reason when status changes to ensure valid options
      setStatusReason("");
      setNotes("");
    }
  }, [status]);

  useEffect(() => {
    if (applicationSubmitted !== false) {
      setStatusReason("");
      setStatus("");
      setNotes("");
    }
  }, [applicationSubmitted]);

  const showCarrierApplicationFields = status === "Needs Carrier Application";
  const showSubmittedFields = applicationSubmitted === true;
  const showNotSubmittedFields = applicationSubmitted === false;
  const showStatusReasonDropdown = applicationSubmitted === false && ["⁠DQ", "Needs callback", "Not Interested", "Future Submission Date"].includes(status);
  const currentReasonOptions = getReasonOptions(status);

  const handleStatusReasonChange = (reason: string) => {
    setStatusReason(reason);
    if (reason && reason !== "Other") {
      // Auto-populate notes with the mapped text using actual customer name
      const clientName = customerName || "[Client Name]";
      setNotes(getNoteText(status, reason, clientName));
    } else if (reason === "Other") {
      // Clear notes for custom message
      setNotes("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Determine status based on underwriting field
      let finalStatus = status;
      if (applicationSubmitted === true) {
        finalStatus = sentToUnderwriting === true ? "Underwriting" : "Submitted";
      }

      const callResultData = {
        submission_id: submissionId,
        application_submitted: applicationSubmitted,
        status: finalStatus,
        notes,
        dq_reason: showStatusReasonDropdown ? statusReason : null,
        buffer_agent: bufferAgent,
        agent_who_took_call: agentWhoTookCall,
        sent_to_underwriting: sentToUnderwriting,
        ...(showSubmittedFields || showCarrierApplicationFields ? {
          carrier,
          product_type: productType,
          draft_date: draftDate ? format(draftDate, "yyyy-MM-dd") : null,
          submitting_agent: submittingAgent,
          licensed_agent_account: licensedAgentAccount,
          coverage_amount: coverageAmount ? parseFloat(coverageAmount) : null,
          monthly_premium: monthlyPremium ? parseFloat(monthlyPremium) : null,
          face_amount: coverageAmount ? parseFloat(coverageAmount) : null, // Coverage Amount saves to face_amount
          submission_date: submissionDate ? format(submissionDate, "yyyy-MM-dd") : null,
        } : {}),
        call_source: callSource
      };

      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("call_results")
        .insert({
          ...callResultData,
          agent_id: user?.id
        });

      if (error) {
        console.error("Error saving call result:", error);
        toast({
          title: "Error",
          description: "Failed to save call result",
          variant: "destructive",
        });
        return;
      }

      // Update verification session status to completed if one exists
      try {
        const { error: sessionUpdateError } = await supabase
          .from('verification_sessions')
          .update({ status: 'completed' })
          .eq('submission_id', submissionId)
          .in('status', ['pending', 'in_progress', 'ready_for_transfer', 'transferred']);

        if (sessionUpdateError) {
          console.error("Error updating verification session:", sessionUpdateError);
          // Don't fail the entire process if session update fails
        } else {
          console.log("Verification session marked as completed");
        }
      } catch (sessionError) {
        console.error("Verification session update failed:", sessionError);
        // Don't fail the entire process if session update fails
      }

      // Update lead vendor in leads table if provided and application is submitted
      if (applicationSubmitted === true && leadVendor) {
        try {
          const { error: leadUpdateError } = await supabase
            .from("leads")
            .update({ lead_vendor: leadVendor })
            .eq("submission_id", submissionId);

          if (leadUpdateError) {
            console.error("Error updating lead vendor:", leadUpdateError);
            // Don't fail the entire process if lead vendor update fails
          } else {
            console.log("Lead vendor updated successfully");
          }
        } catch (leadVendorError) {
          console.error("Lead vendor update failed:", leadVendorError);
          // Don't fail the entire process if lead vendor update fails
        }
      }

      // Update Google Sheets based on lead type
      // Determine if callback is TRUE or FALSE for Google Sheets
      const fromCallbackValue = callSource === "Agent Callback" ? "TRUE" : "FALSE";
      try {
        // Check if this is a callback lead (submission ID starts with "CB")
        const isCallbackLead = submissionId.startsWith("CB");
        
        if (isCallbackLead) {
          // For new callback leads: Create a new Google Sheets entry
          console.log("Processing callback lead - creating new Google Sheets entry");
          
          // First, fetch the lead data from the database
          const { data: leadData, error: leadError } = await supabase
            .from("leads")
            .select("*")
            .eq("submission_id", submissionId)
            .single();

          if (leadError) {
            console.error("Error fetching lead data:", leadError);
            // Continue without Google Sheets update if lead data fetch fails
          } else {
            // Call the create-new-callback-sheet function with both lead and call result data
            const { error: sheetsError } = await supabase.functions.invoke('create-new-callback-sheet', {
              body: {
                leadData: {
                  submission_id: leadData.submission_id,
                  submission_date: leadData.created_at ? new Date(leadData.created_at).toLocaleDateString('en-US', {
                    month: 'numeric',
                    day: 'numeric',
                    year: '2-digit'
                  }) : new Date().toLocaleDateString('en-US', {
                    month: 'numeric',
                    day: 'numeric',
                    year: '2-digit'
                  }),
                  customer_full_name: leadData.customer_full_name,
                  phone_number: leadData.phone_number,
                  email: leadData.email,
                  street_address: leadData.street_address,
                  city: leadData.city,
                  state: leadData.state,
                  zip_code: leadData.zip_code,
                  date_of_birth: leadData.date_of_birth,
                  age: leadData.age,
                  social_security: leadData.social_security,
                  health_conditions: leadData.health_conditions,
                  lead_vendor: leadData.lead_vendor,
                  additional_notes: leadData.additional_notes
                },
                callResult: {
                  application_submitted: applicationSubmitted,
                  status: finalStatus,
                  buffer_agent: bufferAgent,
                  agent_who_took_call: agentWhoTookCall,
                  licensed_agent_account: licensedAgentAccount,
                  carrier: carrier,
                  product_type: productType,
                  draft_date: draftDate ? format(draftDate, "yyyy-MM-dd") : null,
                  monthly_premium: monthlyPremium ? parseFloat(monthlyPremium) : null,
                  face_amount: coverageAmount ? parseFloat(coverageAmount) : null, // Coverage Amount saves to face_amount
                  notes: notes,
                  dq_reason: showStatusReasonDropdown ? statusReason : null,
                  sent_to_underwriting: sentToUnderwriting,
                  from_callback: fromCallbackValue,
                  call_source: callSource
                }
              }
            });
            // If callSource is "Reconnected Transfer", create a new entry with current date in column E
            if (callSource === "Reconnected Transfer") {
              await supabase.functions.invoke('create-new-callback-sheet', {
                body: {
                  leadData: {
                    ...leadData,
                    submission_date: new Date().toLocaleDateString('en-US', {
                      month: 'numeric',
                      day: 'numeric',
                      year: '2-digit'
                    })
                  },
                  callResult: {
                    ...callResultData,
                    from_callback: "FALSE",
                    call_source: "Reconnected Transfer"
                  }
                }
              });
            }

            if (sheetsError) {
              console.error("Error creating new callback entry in Google Sheets:", sheetsError);
            }
          }
        } else {
          // For JotForm leads: Update existing Google Sheets row
          
          const { error: sheetsError } = await supabase.functions.invoke('google-sheets-update', {
            body: {
              submissionId: submissionId,
              callResult: {
                application_submitted: applicationSubmitted,
                status: finalStatus,
                buffer_agent: bufferAgent,
                agent_who_took_call: agentWhoTookCall,
                licensed_agent_account: licensedAgentAccount,
                carrier: carrier,
                product_type: productType,
                draft_date: draftDate ? format(draftDate, "yyyy-MM-dd") : null,
                monthly_premium: monthlyPremium ? parseFloat(monthlyPremium) : null,
                face_amount: coverageAmount ? parseFloat(coverageAmount) : null, // Coverage Amount saves to face_amount
                notes: notes,
                dq_reason: showStatusReasonDropdown ? statusReason : null,
                sent_to_underwriting: sentToUnderwriting,
                from_callback: fromCallbackValue,
                call_source: callSource
              }
            }
          });

          if (sheetsError) {
            console.error("Error updating existing Google Sheets row:", sheetsError);
          }
        }
      } catch (sheetsError) {
        console.error("Google Sheets operation failed:", sheetsError);
      }

      // Send Slack notification for submitted applications
      if (applicationSubmitted === true) {
        try {
          
          
          // First, fetch the lead data for the Slack notification
          const { data: leadData, error: leadError } = await supabase
            .from("leads")
            .select("*")
            .eq("submission_id", submissionId)
            .single();

          if (!leadError && leadData) {
            const callResultForSlack = {
              application_submitted: applicationSubmitted,
              buffer_agent: bufferAgent,
              agent_who_took_call: agentWhoTookCall,
              carrier: carrier,
              product_type: productType,
              draft_date: draftDate ? format(draftDate, "yyyy-MM-dd") : null,
              monthly_premium: monthlyPremium ? parseFloat(monthlyPremium) : null,
              face_amount: coverageAmount ? parseFloat(coverageAmount) : null, // Coverage Amount saves to face_amount
              sent_to_underwriting: sentToUnderwriting,
              lead_vendor: leadData.lead_vendor || leadVendor || 'N/A',
              notes: notes,
              dq_reason: showStatusReasonDropdown ? statusReason : null
            };
            
            
            const { error: slackError } = await supabase.functions.invoke('slack-notification', {
              body: {
                submissionId: submissionId,
                leadData: {
                  customer_full_name: leadData.customer_full_name,
                  phone_number: leadData.phone_number,
                  email: leadData.email
                },
                callResult: callResultForSlack
              }
            });

            if (slackError) {
              console.error("Error sending Slack notification:", slackError);
              // Don't fail the entire process if Slack fails
            } else {
              console.log("Slack notification sent successfully");
            }
          }
        } catch (slackError) {
          console.error("Slack notification failed:", slackError);
          // Don't fail the entire process if Slack fails
        }
      }

      // Send center notification for NOT submitted applications
      if (applicationSubmitted === false) {
        try {
          // First, fetch the lead data for the center notification
          const { data: leadData, error: leadError } = await supabase
            .from("leads")
            .select("*")
            .eq("submission_id", submissionId)
            .single();

          if (!leadError && leadData) {
            const callResultForCenter = {
              application_submitted: applicationSubmitted,
              status: finalStatus,
              dq_reason: showStatusReasonDropdown ? statusReason : null,
              notes: notes,
              buffer_agent: bufferAgent,
              agent_who_took_call: agentWhoTookCall,
              lead_vendor: leadData.lead_vendor || leadVendor || 'N/A'
            };
            
            console.log("Sending center notification for not submitted application");
            
            const { error: centerError } = await supabase.functions.invoke('center-notification', {
              body: {
                submissionId: submissionId,
                leadData: {
                  customer_full_name: leadData.customer_full_name,
                  phone_number: leadData.phone_number,
                  email: leadData.email,
                  lead_vendor: leadData.lead_vendor
                },
                callResult: callResultForCenter
              }
            });

            if (centerError) {
              console.error("Error sending center notification:", centerError);
              // Don't fail the entire process if center notification fails
            } else {
              console.log("Center notification sent successfully");
            }
          }
        } catch (centerError) {
          console.error("Center notification failed:", centerError);
          // Don't fail the entire process if center notification fails
        }
      }

      toast({
        title: "Success",
        description: "Call result saved successfully",
      });

      // Call onSuccess callback to navigate to journey page
      if (onSuccess) {
        onSuccess();
      } else {
        // Reset form if no callback provided
        setApplicationSubmitted(null);
        setStatus("");
        setStatusReason("");
        setNotes("");
        setCarrier("");
        setProductType("");
        setDraftDate(undefined);
        setSubmittingAgent("");
        setLicensedAgentAccount("");
        setCoverageAmount("");
        setMonthlyPremium("");
        setSubmissionDate(undefined);
        setSentToUnderwriting(null);
        setBufferAgent("");
        setAgentWhoTookCall("");
        setLeadVendor("");
        setCallSource("");
      }

    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update Call Result</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Primary Question */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Was the application submitted?
            </Label>
            <div className="flex gap-4">
              <Button
                type="button"
                variant={applicationSubmitted === true ? "default" : "outline"}
                onClick={() => setApplicationSubmitted(true)}
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Yes
              </Button>
              <Button
                type="button"
                variant={applicationSubmitted === false ? "default" : "outline"}
                onClick={() => setApplicationSubmitted(false)}
                className="flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                No
              </Button>
            </div>
          </div>

          {/* Call Source Dropdown */}
          <div>
            <Label htmlFor="callSource">Call Source</Label>
            <Select value={callSource} onValueChange={setCallSource}>
              <SelectTrigger>
                <SelectValue placeholder="Select call source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="First Time Transfer">First Time Transfer</SelectItem>
                <SelectItem value="Reconnected Transfer">Reconnected Transfer</SelectItem>
                <SelectItem value="Agent Callback">Agent Callback</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Fields for submitted applications */}
          {showSubmittedFields && (
            <>
              {/* Call Information - Only shown when application is submitted */}
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                <h3 className="font-semibold text-gray-800">Call Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bufferAgent">Buffer Agent</Label>
                    <Select value={bufferAgent} onValueChange={setBufferAgent}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select buffer agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {bufferAgentOptions.map((agent) => (
                          <SelectItem key={agent} value={agent}>
                            {agent}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="agentWhoTookCall">Agent who took the call</Label>
                    <Select value={agentWhoTookCall} onValueChange={setAgentWhoTookCall}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {agentOptions.map((agent) => (
                          <SelectItem key={agent} value={agent}>
                            {agent}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            <div className="space-y-4 p-4 border rounded-lg bg-green-50">
              <h3 className="font-semibold text-green-800">Application Submitted Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="licensedAgentAccount">Licensed Agent Account</Label>
                  <Select value={licensedAgentAccount} onValueChange={setLicensedAgentAccount}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select licensed account" />
                    </SelectTrigger>
                    <SelectContent>
                      {licensedAccountOptions.map((account) => (
                        <SelectItem key={account} value={account}>
                          {account}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="carrier">Carrier Name</Label>
                  <Select value={carrier} onValueChange={setCarrier}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select carrier" />
                    </SelectTrigger>
                    <SelectContent>
                      {carrierOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="productType">Product Type</Label>
                  <Select value={productType} onValueChange={setProductType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product type" />
                    </SelectTrigger>
                    <SelectContent>
                      {productTypeOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="leadVendor">Lead Vendor</Label>
                  <Select value={leadVendor} onValueChange={setLeadVendor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select lead vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {leadVendorOptions.map((vendor) => (
                        <SelectItem key={vendor} value={vendor}>
                          {vendor}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Draft Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !draftDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {draftDate ? format(draftDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={draftDate}
                        onSelect={setDraftDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="monthlyPremium">Monthly Premium</Label>
                  <Input
                    id="monthlyPremium"
                    type="number"
                    step="0.01"
                    value={monthlyPremium}
                    onChange={(e) => setMonthlyPremium(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="coverageAmount">Coverage Amount</Label>
                  <Input
                    id="coverageAmount"
                    type="number"
                    value={coverageAmount}
                    onChange={(e) => setCoverageAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Sent to Underwriting Question */}
              <div className="space-y-3 mt-6">
                <Label className="text-base font-semibold">
                  Sent to Underwriting?
                </Label>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={sentToUnderwriting === true ? "default" : "outline"}
                    onClick={() => setSentToUnderwriting(true)}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Yes
                  </Button>
                  <Button
                    type="button"
                    variant={sentToUnderwriting === false ? "default" : "outline"}
                    onClick={() => setSentToUnderwriting(false)}
                    className="flex items-center gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    No
                  </Button>
                </div>
                {sentToUnderwriting !== null && (
                  <div className="text-sm text-muted-foreground mt-2">
                    Call Result will be: <strong>{sentToUnderwriting ? "Underwriting" : "Submitted"}</strong>
                  </div>
                )}
              </div>
            </div>
            </>
          )}

          {/* Fields for not submitted applications */}
          {showNotSubmittedFields && (
            <div className="space-y-4 p-4 border rounded-lg bg-orange-50">
              <h3 className="font-semibold text-orange-800">Application Not Submitted</h3>
              
              {/* Call Information for Not Submitted */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bufferAgentNotSubmitted">Buffer Agent</Label>
                  <Select value={bufferAgent} onValueChange={setBufferAgent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select buffer agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {bufferAgentOptions.map((agent) => (
                        <SelectItem key={agent} value={agent}>
                          {agent}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="agentWhoTookCallNotSubmitted">Agent who took the call</Label>
                  <Select value={agentWhoTookCall} onValueChange={setAgentWhoTookCall}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agentOptions.map((agent) => (
                        <SelectItem key={agent} value={agent}>
                          {agent}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="status">Status/Stage</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Reason dropdown - shows for DQ, Needs Callback, Not Interested, Future Submission Date */}
              {showStatusReasonDropdown && (
                <div>
                  <Label htmlFor="statusReason">
                    {status === "⁠DQ" ? "Reason for DQ" : 
                     status === "Needs callback" ? "Callback Reason" :
                     status === "Not Interested" ? "Reason Not Interested" :
                     status === "Future Submission Date" ? "Future Submission Reason" :
                     "Reason"}
                  </Label>
                  <Select value={statusReason} onValueChange={handleStatusReasonChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={`Select reason for ${status.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {currentReasonOptions.map((reason) => (
                        <SelectItem key={reason} value={reason}>
                          {reason}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={showStatusReasonDropdown && statusReason && statusReason !== "Other" 
                    ? "Note has been auto-populated. You can edit if needed." 
                    : showStatusReasonDropdown && statusReason === "Other"
                    ? "Please enter a custom message."
                    : "Why was the application not submitted?"
                  }
                  rows={3}
                />
                {showStatusReasonDropdown && statusReason && statusReason !== "Other" && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Note has been auto-populated based on selected reason. You can edit if needed.
                  </p>
                )}
                {showStatusReasonDropdown && statusReason === "Other" && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Please enter a custom message for this reason.
                  </p>
                )}
              </div>

              {/* Additional fields for "Needs Carrier Application" */}
              {showCarrierApplicationFields && (
                <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
                  <h4 className="font-semibold text-blue-800">Carrier Application Details</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="carrierApp">Carrier</Label>
                      <Select value={carrier} onValueChange={setCarrier}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select carrier" />
                        </SelectTrigger>
                        <SelectContent>
                          {carrierOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="productTypeApp">Product Type</Label>
                      <Select value={productType} onValueChange={setProductType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select product type" />
                        </SelectTrigger>
                        <SelectContent>
                          {productTypeOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Submission Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !submissionDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {submissionDate ? format(submissionDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={submissionDate}
                            onSelect={setSubmissionDate}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <Label htmlFor="faceAmount">Face Amount</Label>
                      <Input
                        id="faceAmount"
                        type="number"
                        value={faceAmount}
                        onChange={(e) => setFaceAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={applicationSubmitted === null || isSubmitting}
              className="min-w-32"
            >
              {isSubmitting ? "Saving..." : "Save Call Result"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};