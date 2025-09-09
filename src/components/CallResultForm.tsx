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
import { CalendarIcon, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { logCallUpdate, getLeadInfo } from "@/lib/callLogging";

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
  "Updated Banking/draft date",
  "Fulfilled carrier requirements",
  "Call Back Fix",
  "Call Never Sent",
  "Disconnected"
];

const carrierOptions = [
  "Liberty",
  "SBLI",
  "Corebridge",
  "MOH",
  "Transamerica",
  "RNA",
  "ANAM",
  "GTL",
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
  "Justine",
  "Isaac",
  "Landon",
  "Juan",
  "Kaye",
  "Precy Lou",
  "Laiza Batain"
];

const agentOptions = [
  "Claudia",
  "Lydia",
  "Juan",
  "Benjamin",
  "Erica",
  "N/A",
  "Kaye",
  "Isaac",
  "Precy Lou",
  "Laiza Batain"
];

const licensedAccountOptions = [
  "Claudia",
  "Lydia",
  "Isaac",
  "Benjamin",
  "Noah",
  "Erica",
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
"Crown Connect BPO",
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

const updatedBankingDraftReasonOptions = [
  "Updated Banking and draft date",
  "Updated draft w/ same banking information"
];

const fulfilledCarrierReasonOptions = [
  "Fulfilled carrier requirements"
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
    case "Updated Banking/draft date":
      return updatedBankingDraftReasonOptions;
    case "Fulfilled carrier requirements":
      return fulfilledCarrierReasonOptions;
    default:
      return [];
  }
};

const getNoteText = (status: string, reason: string, clientName: string = "[Client Name]", newDraftDate?: Date) => {
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
    },
    "Updated Banking/draft date": {
      "Updated Banking and draft date": newDraftDate ? `New Draft date ${newDraftDate.toLocaleDateString()}` : "New Draft date [Please select a date]",
      "Updated draft w/ same banking information": newDraftDate ? `New Draft date ${newDraftDate.toLocaleDateString()}` : "New Draft date [Please select a date]"
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
  const [newDraftDate, setNewDraftDate] = useState<Date>();
  
  const { toast } = useToast();

  // Load existing call result data
  useEffect(() => {
    const loadExistingCallResult = async () => {
      if (!submissionId) return;

      try {
        const { data: existingResult, error } = await supabase
          .from('call_results')
          .select('*')
          .eq('submission_id', submissionId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (existingResult && !error) {
          console.log('Loading existing call result:', existingResult);
          // Populate form with existing data
          setApplicationSubmitted(Boolean(existingResult.application_submitted));
          setStatus(existingResult.status || '');
          setNotes(existingResult.notes || '');
          setCarrier(existingResult.carrier || '');
          setProductType(existingResult.product_type || '');
          setDraftDate(existingResult.draft_date ? new Date(existingResult.draft_date) : undefined);
          setSubmittingAgent(existingResult.submitting_agent || '');
          setLicensedAgentAccount(existingResult.licensed_agent_account || '');
          setCoverageAmount(existingResult.coverage_amount ? existingResult.coverage_amount.toString() : '');
          setMonthlyPremium(existingResult.monthly_premium ? existingResult.monthly_premium.toString() : '');
          setSubmissionDate(existingResult.submission_date ? new Date(existingResult.submission_date) : undefined);
          setSentToUnderwriting(Boolean(existingResult.sent_to_underwriting));
          setBufferAgent(existingResult.buffer_agent || '');
          setAgentWhoTookCall(existingResult.agent_who_took_call || '');
          setCallSource(existingResult.call_source || '');
          
          // Set status reason if it exists
          if (existingResult.dq_reason) {
            setStatusReason(existingResult.dq_reason);
          }
          
          // Set new draft date if it exists
          if (existingResult['new_draft_date']) {
            setNewDraftDate(new Date(existingResult['new_draft_date']));
          }
        } else {
          console.log('No existing call result found for submission:', submissionId);
        }

        // Always try to fetch lead_vendor from leads table
        try {
          const { data: leadData, error: leadError } = await supabase
            .from('leads')
            .select('lead_vendor')
            .eq('submission_id', submissionId)
            .single();

          if (leadData && !leadError && leadData.lead_vendor) {
            console.log('Loading lead_vendor from leads table:', leadData.lead_vendor);
            setLeadVendor(leadData.lead_vendor);
          }
        } catch (leadError) {
          console.log('Could not fetch lead_vendor from leads table:', leadError);
        }
      } catch (error) {
        console.log('No existing call result found (expected for new entries)');
        
        // Try to fetch lead_vendor from leads table for new entries
        try {
          const { data: leadData, error: leadError } = await supabase
            .from('leads')
            .select('lead_vendor')
            .eq('submission_id', submissionId)
            .single();

          if (leadData && !leadError && leadData.lead_vendor) {
            console.log('Loading lead_vendor from leads table for new entry:', leadData.lead_vendor);
            setLeadVendor(leadData.lead_vendor);
          }
        } catch (leadError) {
          console.log('Could not fetch lead_vendor from leads table for new entry:', leadError);
        }
      }
    };

    loadExistingCallResult();
  }, [submissionId]);

  // Reset related fields when status changes
  useEffect(() => {
    if (status !== "Updated Banking/draft date") {
      setNewDraftDate(undefined);
    }
    // Reset status reason when status changes
    setStatusReason("");
    setNotes("");
  }, [status]);

  const showCarrierApplicationFields = status === "Needs Carrier Application";
  const showSubmittedFields = applicationSubmitted === true;
  const showNotSubmittedFields = applicationSubmitted === false;
  const showStatusReasonDropdown = applicationSubmitted === false && ["⁠DQ", "Needs callback", "Not Interested", "Future Submission Date", "Updated Banking/draft date", "Fulfilled carrier requirements"].includes(status);
  const showNewDraftDateField = applicationSubmitted === false && status === "Updated Banking/draft date" && statusReason;
  const currentReasonOptions = getReasonOptions(status);

  const handleStatusReasonChange = (reason: string) => {
    setStatusReason(reason);
    if (reason && reason !== "Other") {
      // Auto-populate notes with the mapped text using actual customer name
      const clientName = customerName || "[Client Name]";
      if (status === "Updated Banking/draft date") {
        // For this status, we need the draft date to generate the note
        setNotes(getNoteText(status, reason, clientName, newDraftDate));
      } else if (status === "Fulfilled carrier requirements") {
        // Don't auto-populate notes for this status
        setNotes("");
      } else {
        setNotes(getNoteText(status, reason, clientName));
      }
    } else if (reason === "Other") {
      // Clear notes for custom message
      setNotes("");
    }
  };

  const handleNewDraftDateChange = (date: Date | undefined) => {
    setNewDraftDate(date);
    // Update notes if reason is already selected
    if (statusReason && status === "Updated Banking/draft date") {
      const clientName = customerName || "[Client Name]";
      setNotes(getNoteText(status, statusReason, clientName, date));
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
        new_draft_date: status === "Updated Banking/draft date" && newDraftDate ? format(newDraftDate, "yyyy-MM-dd") : null,
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
      
      // Check if we already have a call result for this submission
      const { data: existingResult } = await supabase
        .from('call_results')
        .select('id')
        .eq('submission_id', submissionId)
        .maybeSingle();

      let result;
      if (existingResult) {
        // Update existing record
        result = await supabase
          .from("call_results")
          .update({
            ...callResultData,
            updated_at: new Date().toISOString()
          })
          .eq('submission_id', submissionId);
      } else {
        // Insert new record
        result = await supabase
          .from("call_results")
          .insert({
            ...callResultData,
            agent_id: user?.id
          });
      }

      if (result.error) {
        console.error("Error saving call result:", result.error);
        toast({
          title: "Error",
          description: "Failed to save call result",
          variant: "destructive",
        });
        return;
      }

      // Log the call result event
      try {
        const { customerName: leadCustomerName, leadVendor: leadVendorName } = await getLeadInfo(submissionId);
        
        // Determine which agent to log for
        let loggedAgentId = agentWhoTookCall;
        let loggedAgentType: 'buffer' | 'licensed' = 'licensed';
        let loggedAgentName = agentWhoTookCall;
        
        // If it's a buffer agent workflow, log for buffer agent
        if (bufferAgent && bufferAgent !== 'N/A') {
          // Get buffer agent user_id from agent_status table
          const { data: bufferAgentData } = await supabase
            .from('agent_status')
            .select('user_id')
            .eq('agent_type', 'buffer')
            .single();
          
          if (bufferAgentData?.user_id) {
            loggedAgentId = bufferAgentData.user_id;
            loggedAgentType = 'buffer';
            loggedAgentName = bufferAgent;
          }
        } else if (licensedAgentAccount && licensedAgentAccount !== 'N/A') {
          // For licensed agent, try to get the user_id
          const { data: licensedAgentData } = await supabase
            .from('agent_status')
            .select('user_id')
            .eq('agent_type', 'licensed')
            .single();
          
          if (licensedAgentData?.user_id) {
            loggedAgentId = licensedAgentData.user_id;
            loggedAgentType = 'licensed';
            loggedAgentName = licensedAgentAccount;
          }
        }

        // Determine the event type based on status and submission
        let eventType: 'application_submitted' | 'application_not_submitted' | 'call_disconnected';
        
        if (applicationSubmitted === false && status === "Disconnected") {
          // Special case for disconnected calls by buffer agents
          eventType = 'call_disconnected';
        } else if (applicationSubmitted) {
          eventType = 'application_submitted';
        } else {
          eventType = 'application_not_submitted';
        }
        
        if (loggedAgentId) {
          await logCallUpdate({
            submissionId,
            agentId: loggedAgentId,
            agentType: loggedAgentType,
            agentName: loggedAgentName,
            eventType,
            eventDetails: {
              status: finalStatus,
              carrier: carrier || null,
              monthly_premium: monthlyPremium ? parseFloat(monthlyPremium) : null,
              coverage_amount: coverageAmount ? parseFloat(coverageAmount) : null,
              call_source: callSource,
              dq_reason: showStatusReasonDropdown ? statusReason : null,
              sent_to_underwriting: sentToUnderwriting,
              notes: notes
            },
            customerName: leadCustomerName,
            leadVendor: leadVendorName
          });
        }
      } catch (loggingError) {
        console.error('Failed to log call result:', loggingError);
        // Don't fail the entire process if logging fails
      }

      // Sync daily_deal_flow on form submit
      try {
        const { data: leadData } = await supabase
          .from("leads")
          .select("*")
          .eq("submission_id", submissionId)
          .single();
        if (leadData) {
          const dealFlowData = {
            submission_id: submissionId,
            client_phone_number: leadData.phone_number,
            lead_vendor: leadData.lead_vendor || leadVendor || "N/A",
            date: new Date().toISOString().split('T')[0],
            insured_name: leadData.customer_full_name,
            buffer_agent: bufferAgent,
            agent: agentWhoTookCall,
            licensed_agent_account: licensedAgentAccount,
            status: finalStatus,
            call_result: applicationSubmitted === true
              ? (sentToUnderwriting === true ? "Underwriting" : "Submitted")
              : "Not Submitted",
            carrier: carrier || null,
            product_type: productType || null,
            draft_date: draftDate ? format(draftDate, "yyyy-MM-dd") : null,
            monthly_premium: monthlyPremium ? parseFloat(monthlyPremium) : null,
            face_amount: coverageAmount ? parseFloat(coverageAmount) : null,
            from_callback: callSource === "Agent Callback",
            notes: notes,
            updated_at: new Date().toISOString()
          };
          // TODO: Add daily_deal_flow table support when schema is updated
          // const { error: dealFlowError } = await supabase
          //   .from('daily_deal_flow')
          //   .upsert(dealFlowData, { onConflict: 'submission_id' });
          // if (dealFlowError) console.error('Error syncing daily_deal_flow:', dealFlowError);
        }
      } catch (syncError) {
        console.error('Sync to daily_deal_flow failed:', syncError);
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

      // Update Google Sheets based on Call Source selection
      try {
        const todayDate = new Date().toLocaleDateString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: '2-digit'
        });
        // Fetch lead data for sheet functions
        const { data: leadData, error: leadError } = await supabase
          .from("leads")
          .select("*")
          .eq("submission_id", submissionId)
          .single();

        if (leadError || !leadData) {
          console.error("Error fetching lead data:", leadError);
        } else {
          if (callSource === "First Time Transfer") {
            // Update existing entry in daily deal flow
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
                  face_amount: coverageAmount ? parseFloat(coverageAmount) : null,
                  notes: notes,
                  dq_reason: showStatusReasonDropdown ? statusReason : null,
                  sent_to_underwriting: sentToUnderwriting,
                  from_callback: (callSource as string) === "Agent Callback",
                  call_source: callSource
                }
              }
            });
            if (sheetsError) {
              console.error("Error updating Google Sheets:", sheetsError);
            }
          } else if (callSource === "Reconnected Transfer" || callSource === "Agent Callback") {
            // Prepare lead data with all necessary fields
            const callbackLeadData = {
              ...leadData,
              submission_date: todayDate,
              lead_vendor: leadData.lead_vendor || leadVendor || 'N/A'
            };

            // Prepare call result data
            const callbackCallResult = {
              application_submitted: applicationSubmitted,
              status: finalStatus,
              buffer_agent: bufferAgent || '',
              agent_who_took_call: agentWhoTookCall || '',
              licensed_agent_account: licensedAgentAccount || '',
              carrier: carrier || '',
              product_type: productType || '',
              draft_date: draftDate ? format(draftDate, "yyyy-MM-dd") : null,
              monthly_premium: monthlyPremium ? parseFloat(monthlyPremium) : null,
              face_amount: coverageAmount ? parseFloat(coverageAmount) : null,
              notes: notes || '',
              dq_reason: showStatusReasonDropdown ? statusReason : null,
              sent_to_underwriting: sentToUnderwriting,
              from_callback: callSource === "Agent Callback",
              call_source: callSource
            };

            // Create new entry in daily deal flow with today's date
            const { error: sheetsError } = await supabase.functions.invoke('create-new-callback-sheet', {
              body: {
                leadData: callbackLeadData,
                callResult: callbackCallResult
              }
            });
            
            if (sheetsError) {
              console.error("Error creating new Google Sheets entry:", sheetsError);
            }
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
        description: existingResult ? "Call result updated successfully" : "Call result saved successfully",
      });

      // Call onSuccess callback to navigate to journey page
      if (onSuccess) {
        onSuccess();
      } else {
        // Reset form if no callback provided (only for new entries)
        if (!existingResult) {
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
    <>
      {/* Full Screen Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-lg font-medium">Saving call result...</span>
          </div>
        </div>
      )}
      
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

          {/* Call Source Dropdown - REQUIRED */}
          <div>
            <Label htmlFor="callSource" className="text-base font-semibold">
              Call Source <span className="text-red-500">*</span>
            </Label>
            <Select value={callSource || undefined} onValueChange={setCallSource} required>
              <SelectTrigger className={`${!callSource ? 'border-red-300 focus:border-red-500' : ''}`}>
                <SelectValue placeholder="Select call source (required)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="First Time Transfer">First Time Transfer</SelectItem>
                <SelectItem value="Reconnected Transfer">Reconnected Transfer</SelectItem>
                <SelectItem value="Agent Callback">Agent Callback</SelectItem>
              </SelectContent>
            </Select>
            {!callSource && (
              <p className="text-sm text-red-500 mt-1">Call source is required</p>
            )}
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

              {/* Notes for Submitted Applications */}
              <div>
                <Label htmlFor="notesSubmitted">Notes</Label>
                <Textarea
                  id="notesSubmitted"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional notes about the submitted application..."
                  rows={3}
                />
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
                  <Label htmlFor="agentWhoTookCallNotSubmitted">
                    Agent who took the call <span className="text-red-500">*</span>
                  </Label>
                  <Select value={agentWhoTookCall} onValueChange={setAgentWhoTookCall} required>
                    <SelectTrigger className={`${!agentWhoTookCall ? 'border-red-300 focus:border-red-500' : ''}`}>
                      <SelectValue placeholder="Select agent (required)" />
                    </SelectTrigger>
                    <SelectContent>
                      {agentOptions.map((agent) => (
                        <SelectItem key={agent} value={agent}>
                          {agent}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!agentWhoTookCall && (
                    <p className="text-sm text-red-500 mt-1">Agent who took the call is required</p>
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="status">
                  Status/Stage <span className="text-red-500">*</span>
                </Label>
                <Select value={status} onValueChange={setStatus} required>
                  <SelectTrigger className={`${!status ? 'border-red-300 focus:border-red-500' : ''}`}>
                    <SelectValue placeholder="Select status (required)" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!status && (
                  <p className="text-sm text-red-500 mt-1">Status/Stage is required</p>
                )}
              </div>

              {/* Status Reason dropdown - shows for DQ, Needs Callback, Not Interested, Future Submission Date, Updated Banking/draft date, Fulfilled carrier requirements */}
              {showStatusReasonDropdown && (
                <div>
                  <Label htmlFor="statusReason">
                    {status === "⁠DQ" ? "Reason for DQ" : 
                     status === "Needs callback" ? "Callback Reason" :
                     status === "Not Interested" ? "Reason Not Interested" :
                     status === "Future Submission Date" ? "Future Submission Reason" :
                     status === "Updated Banking/draft date" ? "Update Reason" :
                     status === "Fulfilled carrier requirements" ? "Fulfillment Confirmation" :
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

              {/* New Draft Date field - shows only for Updated Banking/draft date status */}
              {showNewDraftDateField && (
                <div>
                  <Label htmlFor="newDraftDate">New Draft Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newDraftDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newDraftDate ? format(newDraftDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newDraftDate}
                        onSelect={handleNewDraftDateChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <div>
                <Label htmlFor="notes">
                  Notes <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={showStatusReasonDropdown && statusReason && statusReason !== "Other" 
                    ? "Note has been auto-populated. You can edit if needed." 
                    : showStatusReasonDropdown && statusReason === "Other"
                    ? "Please enter a custom message."
                    : "Why the call got dropped or application not get submitted? Please provide the reason (required)"
                  }
                  className={`${!notes.trim() ? 'border-red-300 focus:border-red-500' : ''}`}
                  rows={3}
                  required
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
                {!notes.trim() && (
                  <p className="text-sm text-red-500 mt-1">Notes are required</p>
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
                        value={coverageAmount}
                        onChange={(e) => setCoverageAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Validation message for not submitted applications */}
          {applicationSubmitted === false && (!agentWhoTookCall || !status || !notes.trim()) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">
                Please complete all required fields:
                {!agentWhoTookCall && " Agent who took the call"}
                {!status && " Status/Stage"}
                {!notes.trim() && " Notes"}
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={
                applicationSubmitted === null || 
                !callSource || 
                isSubmitting || 
                (applicationSubmitted === false && (!agentWhoTookCall || !status || !notes.trim()))
              }
              className="min-w-32"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Call Result"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
    </>
  );
};