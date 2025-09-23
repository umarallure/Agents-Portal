import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// EST timezone utility functions
const isDST = (date: Date): boolean => {
  const year = date.getFullYear();
  
  // Second Sunday in March
  const marchSecondSunday = new Date(year, 2, 1);
  marchSecondSunday.setDate(1 + (7 - marchSecondSunday.getDay()) + 7);
  
  // First Sunday in November  
  const novemberFirstSunday = new Date(year, 10, 1);
  novemberFirstSunday.setDate(1 + (7 - novemberFirstSunday.getDay()) % 7);
  
  return date >= marchSecondSunday && date < novemberFirstSunday;
};

const getTodayDateEST = (): string => {
  const now = new Date();
  const estOffset = isDST(now) ? -4 : -5; // DST handling
  const estDate = new Date(now.getTime() + (estOffset * 60 * 60 * 1000));
  return estDate.toISOString().split('T')[0];
};

const getCurrentTimestampEST = (): string => {
  const now = new Date();
  const estOffset = isDST(now) ? -4 : -5; // DST handling
  const estDate = new Date(now.getTime() + (estOffset * 60 * 60 * 1000));
  return estDate.toISOString();
};

// Function to generate new submission ID for callback entries
const generateCallbackSubmissionId = (originalSubmissionId: string): string => {
  const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
  return `CB${randomDigits}${originalSubmissionId}`;
};

// Complete status mapping function (matches CallResultForm statusOptions)
const mapStatusToSheetValue = (userSelectedStatus: string): string => {
  const statusMap: { [key: string]: string } = {
    "Needs callback": "Needs BPO Callback",
    "Call Never Sent": "Incomplete Transfer",
    "Not Interested": "Returned To Center - DQ",
    "DQ": "DQ'd Can't be sold",
    "⁠DQ": "DQ'd Can't be sold", // Handle Unicode character
    "Future Submission Date": "Application Withdrawn",
    "Updated Banking/draft date": "Updated Banking Information",
    "Fulfilled carrier requirements": "Carrier Requirements Met",
    "Call Back Fix": "Call Back Fix",
    "Disconnected": "Incomplete Transfer",
    "Disconnected - Never Retransferred": "Incomplete Transfer"
  };
  
  // Clean the status to handle Unicode characters
  const cleanStatus = userSelectedStatus?.trim().replace(/\u2060/g, ''); // Remove word joiner
  const mappedStatus = statusMap[cleanStatus] || statusMap[userSelectedStatus] || userSelectedStatus;
  
  console.log(`Status mapping: "${userSelectedStatus}" -> "${mappedStatus}"`);
  return mappedStatus;
};

// Function to determine final status based on application submission
const determineFinalStatus = (applicationSubmitted: boolean, sentToUnderwriting: boolean | null, originalStatus: string): string => {
  let finalStatus = "";
  
  if (applicationSubmitted === true) {
    // Always "Pending Approval" for submitted applications
    finalStatus = "Pending Approval";
  } else if (applicationSubmitted === false) {
    finalStatus = mapStatusToSheetValue(originalStatus || 'Not Submitted');
  } else {
    // Handle undefined/null application_submitted
    finalStatus = mapStatusToSheetValue(originalStatus || 'Not Submitted');
  }
  
  console.log(`Final status determination:`, {
    applicationSubmitted,
    sentToUnderwriting,
    originalStatus,
    finalStatus
  });
  
  return finalStatus;
};

// Function to determine call result status
const determineCallResultStatus = (applicationSubmitted: boolean, sentToUnderwriting: boolean | null): string => {
  let callResultStatus = "";
  
  if (applicationSubmitted === true) {
    callResultStatus = sentToUnderwriting === true ? "Underwriting" : "Submitted";
  } else {
    callResultStatus = "Not Submitted";
  }
  
  return callResultStatus;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  let requestBody: any = {};
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get parameters from request body
    requestBody = await req.json();
    const {
      submission_id,
      call_source,
      buffer_agent,
      agent,
      licensed_agent_account,
      status,
      call_result,
      carrier,
      product_type,
      draft_date,
      monthly_premium,
      face_amount,
      notes,
      policy_number,
      carrier_audit,
      product_type_carrier,
      level_or_gi,
      from_callback,
      create_new_entry = false,
      original_submission_id = null,
      // Add these for proper status determination
      application_submitted = null,
      sent_to_underwriting = null
    } = requestBody;

    // Validate required fields
    if (!submission_id) {
      throw new Error('Missing required field: submission_id');
    }

    if (!call_source) {
      throw new Error('Missing required field: call_source');
    }

    console.log('Updating daily deal flow for submission:', submission_id, 'call source:', call_source);

    // Get today's date in EST YYYY-MM-DD format
    const todayDate = getTodayDateEST();

    // Fetch lead data for insertions
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('customer_full_name, phone_number, lead_vendor')
      .eq('submission_id', submission_id)
      .single();

    if (leadError && call_source !== 'First Time Transfer') {
      console.error('Error fetching lead data:', leadError);
      throw new Error('Failed to fetch lead data');
    }

    let operation = '';
    let result = null;
    let finalSubmissionId = submission_id;

    // Determine the final status using our mapping functions
    const finalStatus = determineFinalStatus(application_submitted, sent_to_underwriting, status);

    if (call_source === 'First Time Transfer') {
      // Check existing entry and decide whether to create new or update
      const { data: existingEntry, error: existingError } = await supabase
        .from('daily_deal_flow')
        .select('date')
        .eq('submission_id', submission_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let shouldCreateNew = false;

      if (existingEntry && existingEntry.date && existingEntry.date !== todayDate) {
        finalSubmissionId = generateCallbackSubmissionId(submission_id);
        shouldCreateNew = true;
        console.log(`Creating new daily deal flow entry for First Time Transfer: ${submission_id} -> ${finalSubmissionId}`);
      }

      if (shouldCreateNew) {
        // Create new entry with today's date
        const { data: leadData, error: leadError } = await supabase
          .from('leads')
          .select('customer_full_name, phone_number, lead_vendor')
          .eq('submission_id', submission_id)
          .single();

        if (leadError) {
          console.error('Error fetching lead data for new entry:', leadError);
          throw new Error('Failed to fetch lead data for new entry');
        }

        const { data, error } = await supabase
          .from('daily_deal_flow')
          .insert({
            submission_id: finalSubmissionId,
            lead_vendor: leadData?.lead_vendor,
            insured_name: leadData?.customer_full_name,
            client_phone_number: leadData?.phone_number,
            date: todayDate,
            buffer_agent,
            agent,
            licensed_agent_account,
            status,
            call_result,
            carrier,
            product_type,
            draft_date,
            monthly_premium,
            face_amount,
            notes,
            policy_number,
            carrier_audit,
            product_type_carrier,
            level_or_gi,
            from_callback
          })
          .select()
          .single();

        if (error) {
          console.error('Error inserting new daily deal flow entry:', error);
          throw new Error(`Failed to create new entry: ${error.message}`);
        }

        operation = 'inserted';
        result = data;
      } else {
        if (existingEntry) {
          // Update the most recent existing entry
          const { data: mostRecentEntry, error: fetchError } = await supabase
            .from('daily_deal_flow')
            .select('id')
            .eq('submission_id', submission_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (fetchError) {
            console.error('Error finding most recent entry:', fetchError);
            throw new Error(`Failed to find existing entry: ${fetchError.message}`);
          }

          const { data, error } = await supabase
            .from('daily_deal_flow')
            .update({
              buffer_agent,
              agent,
              licensed_agent_account,
              status,
              call_result,
              carrier,
              product_type,
              draft_date,
              monthly_premium,
              face_amount,
              notes,
              policy_number,
              carrier_audit,
              product_type_carrier,
              level_or_gi,
              from_callback,
              updated_at: getCurrentTimestampEST()
            })
            .eq('id', mostRecentEntry.id)
            .select()
            .single();

          if (error) {
            console.error('Error updating daily deal flow:', error);
            throw new Error(`Failed to update entry: ${error.message}`);
          }

          operation = 'updated';
          result = data;
        } else {
          // Create new entry
          const { data, error } = await supabase
            .from('daily_deal_flow')
            .insert({
              submission_id,
              lead_vendor: leadData?.lead_vendor,
              insured_name: leadData?.customer_full_name,
              client_phone_number: leadData?.phone_number,
              date: todayDate,
              buffer_agent,
              agent,
              licensed_agent_account,
              status,
              call_result,
              carrier,
              product_type,
              draft_date,
              monthly_premium,
              face_amount,
              notes,
              policy_number,
              carrier_audit,
              product_type_carrier,
              level_or_gi,
              from_callback
            })
            .select()
            .single();

          if (error) {
            console.error('Error inserting daily deal flow:', error);
            throw new Error(`Failed to create entry: ${error.message}`);
          }

          operation = 'inserted';
          result = data;
        }
      }

    } else if (call_source === 'Reconnected Transfer') {
      // Check existing entry and decide whether to create new or update (same logic as First Time Transfer)
      const { data: existingEntry, error: existingError } = await supabase
        .from('daily_deal_flow')
        .select('date')
        .eq('submission_id', submission_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let shouldCreateNew = false;

      if (existingEntry && existingEntry.date && existingEntry.date !== todayDate) {
        finalSubmissionId = generateCallbackSubmissionId(submission_id);
        shouldCreateNew = true;
        console.log(`Creating new daily deal flow entry for Reconnected Transfer: ${submission_id} -> ${finalSubmissionId}`);
      }

      if (shouldCreateNew) {
        // Create new entry with today's date
        const { data: leadData, error: leadError } = await supabase
          .from('leads')
          .select('customer_full_name, phone_number, lead_vendor')
          .eq('submission_id', submission_id)
          .single();

        if (leadError) {
          console.error('Error fetching lead data for new entry:', leadError);
          throw new Error('Failed to fetch lead data for new entry');
        }

        const { data, error } = await supabase
          .from('daily_deal_flow')
          .insert({
            submission_id: finalSubmissionId,
            lead_vendor: leadData?.lead_vendor,
            insured_name: leadData?.customer_full_name,
            client_phone_number: leadData?.phone_number,
            date: todayDate,
            buffer_agent,
            agent,
            licensed_agent_account,
            status,
            call_result,
            carrier,
            product_type,
            draft_date,
            monthly_premium,
            face_amount,
            notes,
            policy_number,
            carrier_audit,
            product_type_carrier,
            level_or_gi,
            from_callback
          })
          .select()
          .single();

        if (error) {
          console.error('Error inserting new daily deal flow entry:', error);
          throw new Error(`Failed to create new entry: ${error.message}`);
        }

        operation = 'inserted';
        result = data;
      } else {
        if (existingEntry) {
          // Update the most recent existing entry
          const { data: mostRecentEntry, error: fetchError } = await supabase
            .from('daily_deal_flow')
            .select('id')
            .eq('submission_id', submission_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (fetchError) {
            console.error('Error finding most recent entry:', fetchError);
            throw new Error(`Failed to find existing entry: ${fetchError.message}`);
          }

          const { data, error } = await supabase
            .from('daily_deal_flow')
            .update({
              buffer_agent,
              agent,
              licensed_agent_account,
              status,
              call_result,
              carrier,
              product_type,
              draft_date,
              monthly_premium,
              face_amount,
              notes,
              policy_number,
              carrier_audit,
              product_type_carrier,
              level_or_gi,
              from_callback,
              updated_at: getCurrentTimestampEST()
            })
            .eq('id', mostRecentEntry.id)
            .select()
            .single();

          if (error) {
            console.error('Error updating daily deal flow:', error);
            throw new Error(`Failed to update entry: ${error.message}`);
          }

          operation = 'updated';
          result = data;
        } else {
          // Create new entry
          const { data, error } = await supabase
            .from('daily_deal_flow')
            .insert({
              submission_id,
              lead_vendor: leadData?.lead_vendor,
              insured_name: leadData?.customer_full_name,
              client_phone_number: leadData?.phone_number,
              date: todayDate,
              buffer_agent,
              agent,
              licensed_agent_account,
              status,
              call_result,
              carrier,
              product_type,
              draft_date,
              monthly_premium,
              face_amount,
              notes,
              policy_number,
              carrier_audit,
              product_type_carrier,
              level_or_gi,
              from_callback
            })
            .select()
            .single();

          if (error) {
            console.error('Error inserting daily deal flow:', error);
            throw new Error(`Failed to create entry: ${error.message}`);
          }

          operation = 'inserted';
          result = data;
        }
      }

    } else if (call_source === 'Agent Callback') {
      // Always insert new entry with lead data and today's date
      const { data, error } = await supabase
        .from('daily_deal_flow')
        .insert({
          submission_id,
          lead_vendor: leadData?.lead_vendor,
          insured_name: leadData?.customer_full_name,
          client_phone_number: leadData?.phone_number,
          date: todayDate,
          buffer_agent,
          agent,
          licensed_agent_account,
          status,
          call_result,
          carrier,
          product_type,
          draft_date,
          monthly_premium,
          face_amount,
          notes,
          policy_number,
          carrier_audit,
          product_type_carrier,
          level_or_gi,
          from_callback
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting daily deal flow entry:', error);
        throw new Error(`Failed to insert entry: ${error.message}`);
      }

      operation = 'inserted';
      result = data;

    } else {
      throw new Error('Invalid call_source. Must be First Time Transfer, Reconnected Transfer, or Agent Callback');
    }

    console.log(`Successfully ${operation} daily deal flow entry:`, result.id);

    return new Response(JSON.stringify({
      success: true,
      message: `Entry ${operation} successfully`,
      operation,
      data: result,
      submission_id: finalSubmissionId
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error in update-daily-deal-flow-entry function:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      submission_id: requestBody?.submission_id || 'unknown'
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});