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

    // Get lead data from request body (from Zapier)
    const leadData = await req.json();

    // Required field validation
    if (!leadData.submission_id) {
      throw new Error('Missing submission_id');
    }

    console.log('Processing lead for submission:', leadData.submission_id);

    // Check if lead already exists
    const { data: existingLead } = await supabase.from('leads').select('id').eq('submission_id', leadData.submission_id).maybeSingle();
    if (existingLead) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Lead already processed',
        leadId: existingLead.id,
        submissionId: leadData.submission_id
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Prepare lead data for insertion (use provided data directly)
    const processedLeadData = {
      submission_id: leadData.submission_id,
      submission_date: leadData.submission_date || new Date().toISOString(),
      customer_full_name: leadData.customer_full_name || '',
      street_address: leadData.street_address || '',
      city: leadData.city || '',
      state: leadData.state || '',
      zip_code: leadData.zip_code || '',
      phone_number: leadData.phone_number || '',
      email: leadData.email || '',
      birth_state: leadData.birth_state || '',
      date_of_birth: leadData.date_of_birth || null,
      age: leadData.age ? parseInt(leadData.age) : null,
      social_security: leadData.social_security || '',
      driver_license: leadData.driver_license || '',
      existing_coverage: leadData.existing_coverage || '',
      previous_applications: leadData.previous_applications || '',
      height: leadData.height || '',
      weight: leadData.weight || '',
      doctors_name: leadData.doctors_name || '',
      tobacco_use: leadData.tobacco_use || '',
      health_conditions: leadData.health_conditions || '',
      medications: leadData.medications || '',
      carrier: leadData.carrier || '',
      product_type: leadData.product_type || '',
      coverage_amount: leadData.coverage_amount ? parseFloat(leadData.coverage_amount) : null,
      monthly_premium: leadData.monthly_premium ? parseFloat(leadData.monthly_premium) : null,
      draft_date: leadData.draft_date || '',
      future_draft_date: leadData.future_draft_date || '',
      beneficiary_information: leadData.beneficiary_information || '',
      institution_name: leadData.institution_name || '',
      beneficiary_routing: leadData.beneficiary_routing || '',
      beneficiary_account: leadData.beneficiary_account || '',
      additional_notes: leadData.additional_notes || '',
      lead_vendor: leadData.lead_vendor || null,
      account_type: leadData.account_type || ''
    };
    // Store lead in database
    const { data, error } = await supabase.from('leads').insert([
      processedLeadData
    ]).select().single();
    if (error) {
      console.error('Error storing lead:', error);
      throw error;
    }
    console.log('Lead stored successfully:', data);
    return new Response(JSON.stringify({
      success: true,
      leadId: data.id,
      submissionId: data.submission_id,
      message: 'Lead processed and stored successfully'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in process-lead:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
