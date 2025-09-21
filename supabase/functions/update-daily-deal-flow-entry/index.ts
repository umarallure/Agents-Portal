import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Function to generate new submission ID for callback entries
const generateCallbackSubmissionId = (originalSubmissionId: string): string => {
  const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
  return `CB${randomDigits}${originalSubmissionId}`;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get parameters from request body
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
      original_submission_id = null
    } = await req.json();

    // Validate required fields
    if (!submission_id) {
      throw new Error('Missing required field: submission_id');
    }

    if (!call_source) {
      throw new Error('Missing required field: call_source');
    }

    console.log('Updating daily deal flow for submission:', submission_id, 'call source:', call_source);

    // Get today's date in UTC YYYY-MM-DD format
    const todayDate = new Date().toISOString().split('T')[0];

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
        // Update existing row or create new if none exists
        const { data, error } = await supabase
          .from('daily_deal_flow')
          .upsert({
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
          }, { onConflict: 'submission_id' })
          .select()
          .single();

        if (error) {
          console.error('Error upserting daily deal flow:', error);
          throw new Error(`Failed to upsert entry: ${error.message}`);
        }

        operation = existingEntry ? 'updated' : 'inserted';
        result = data;
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
        // Update existing row or create new if none exists
        const { data, error } = await supabase
          .from('daily_deal_flow')
          .upsert({
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
          }, { onConflict: 'submission_id' })
          .select()
          .single();

        if (error) {
          console.error('Error upserting daily deal flow:', error);
          throw new Error(`Failed to upsert entry: ${error.message}`);
        }

        operation = existingEntry ? 'updated' : 'inserted';
        result = data;
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
      submission_id: submission_id
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});