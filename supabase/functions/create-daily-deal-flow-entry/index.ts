import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    // Get parameters from request body
    const { 
      lead_vendor, 
      insured_name, 
      phone_number, 
      submission_id, 
      date, 
      ghl_location_id, 
      ghl_opportunity_id,
      ghl_contact_id 
    } = await req.json();
    
    // Validate required fields
    if (!submission_id) {
      throw new Error('Missing required field: submission_id');
    }
    if (!date) {
      throw new Error('Missing required field: date');
    }
    
    console.log('Creating daily deal flow entry for submission:', submission_id);
    
    // Log GHL fields if provided
    if (ghl_location_id) {
      console.log('GHL Location ID:', ghl_location_id);
    }
    if (ghl_opportunity_id) {
      console.log('GHL Opportunity ID:', ghl_opportunity_id);
    }
    if (ghl_contact_id) {
      console.log('GHL Contact ID:', ghl_contact_id);
    }
    // Check if entry already exists
    const { data: existingEntry } = await supabase.from('daily_deal_flow').select('id').eq('submission_id', submission_id).maybeSingle();
    if (existingEntry) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Entry already exists',
        id: existingEntry.id,
        submission_id: submission_id
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Insert new entry
    const { data, error } = await supabase.from('daily_deal_flow').insert({
      submission_id,
      lead_vendor,
      insured_name,
      client_phone_number: phone_number,
      date,
      ghl_location_id,
      ghl_opportunity_id,
      ghlcontactid: ghl_contact_id,
      // Other fields will be NULL initially
      buffer_agent: null,
      agent: null,
      licensed_agent_account: null,
      status: null,
      call_result: null,
      carrier: null,
      product_type: null,
      draft_date: null,
      monthly_premium: null,
      face_amount: null,
      from_callback: null,
      notes: null,
      policy_number: null,
      carrier_audit: null,
      product_type_carrier: null,
      level_or_gi: null
    }).select().single();
    if (error) {
      console.error('Error inserting daily deal flow entry:', error);
      throw new Error(`Failed to create entry: ${error.message}`);
    }
    console.log('Successfully created daily deal flow entry:', data.id);
    return new Response(JSON.stringify({
      success: true,
      message: 'Entry created successfully',
      data: data
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in create-daily-deal-flow-entry function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
