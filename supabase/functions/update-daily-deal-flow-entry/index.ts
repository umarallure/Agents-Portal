import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
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
      from_callback
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

    if (call_source === 'First Time Transfer') {
      // Update existing row, don't change date
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
          from_callback
        })
        .eq('submission_id', submission_id)
        .select()
        .single();

      if (error) {
        console.error('Error updating daily deal flow:', error);
        throw new Error(`Failed to update entry: ${error.message}`);
      }

      operation = 'updated';
      result = data;

    } else if (call_source === 'Reconnected Transfer') {
      // Check if entry exists
      const { data: existingEntry } = await supabase
        .from('daily_deal_flow')
        .select('id')
        .eq('submission_id', submission_id)
        .maybeSingle();

      if (existingEntry) {
        // Update existing
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
            from_callback
          })
          .eq('submission_id', submission_id)
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to update entry: ${error.message}`);
        }

        operation = 'updated';
        result = data;
      } else {
        // Insert new with lead data and today's date
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
          throw new Error(`Failed to insert entry: ${error.message}`);
        }

        operation = 'inserted';
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
      data: result
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
      error: error.message
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});