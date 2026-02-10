import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
);

async function insertLead(payload) {
  // 1. LOOKUP CALL CENTER ID
  // We match the 'lead_vendor' from the payload against the 'name' in call_centers
  let callCenterId = payload.call_center_id || null;
  
  if (payload.lead_vendor && !callCenterId) {
    const { data: center } = await supabase
      .from('call_centers')
      .select('id')
      .ilike('name', payload.lead_vendor) // ilike makes it case-insensitive
      .maybeSingle();
    
    if (center) {
      callCenterId = center.id;
    }
  }

  // 2. Name Splitting Logic
  let firstName = payload.first_name || '';
  let lastName = payload.last_name || '';
  if (payload.customer_full_name && !firstName) {
    const parts = payload.customer_full_name.trim().split(/\s+/);
    firstName = parts[0];
    lastName = parts.slice(1).join(' ');
  }

  // 3. Comprehensive Mapping
  const newLead = {
    // Identifiers & Foreign Keys
    submission_id: payload.submission_id || null,
    call_center_id: callCenterId, // Use the ID we just looked up
    user_id: payload.user_id || null,
    assigned_agent_id: payload.assigned_agent_id || null,
    buffer_agent_id: payload.buffer_agent_id || null,
    pipeline_id: payload.pipeline_id || '49244d9b-9563-4da4-b536-a3cffc6bcda5',
    stage_id: payload.stage_id || '9c8407cc-6c6e-4145-9a97-7b72d61bc424',

    // Personal Info
    first_name: firstName,
    last_name: lastName,
    date_of_birth: payload.date_of_birth || null,
    age: payload.age ? parseInt(payload.age) : null,
    ssn: payload.ssn || null,
    phone_number: payload.phone_number || null,
    email: payload.email || null,
    
    // Address info
    address: payload.address || payload.street_address || null,
    city: payload.city || null,
    state: payload.state || null,
    zip_code: payload.zip_code || null,
    birth_state: payload.birth_state || null,
    driver_license: payload.driver_license || null,

    // Health & Physical
    height: payload.height || null,
    weight: payload.weight || null,
    tobacco_use: payload.tobacco_use === true || payload.tobacco_use === 'true',
    health_conditions: payload.health_conditions || null,
    medications: payload.medications || null,
    doctor_name: payload.doctor_name || null,

    // Financials & Product
    desired_coverage: payload.desired_coverage ? parseFloat(payload.desired_coverage) : null,
    monthly_budget: payload.monthly_budget ? parseFloat(payload.monthly_budget) : null,
    lead_value: payload.lead_value ? parseFloat(payload.lead_value) : 0,
    existing_coverage: payload.existing_coverage || null,
    quoted_product: payload.quoted_product || null,
    carrier: payload.carrier || null,
    product_type: payload.product_type || null,
    ma_product_name: payload.ma_product_name || null,
    ma_product_price: payload.ma_product_price || null,

    // Banking & Logistics
    draft_date: payload.draft_date || null,
    future_draft_date: payload.future_draft_date || null,
    bank_name: payload.bank_name || null,
    routing_number: payload.routing_number || null,
    account_number: payload.account_number || null,
    account_type: payload.account_type || null,
    
    // Metadata
    submission_date: payload.submission_date || new Date().toISOString(),
    lead_vendor: payload.lead_vendor || null,
    additional_notes: payload.additional_notes || null,
    previous_applications: payload.previous_applications || null,
    last_contacted_at: payload.last_contacted_at || null,
    updated_at: new Date().toISOString(),
    
    // ===== MEDALERT-SPECIFIC COLUMNS =====
    // Source & Version
    source: payload.source || null,
    form_version: payload.form_version || null,
    
    // Product Information (Medalert)
    company_name: payload.company_name || null,
    device_cost: payload.device_cost ? parseFloat(payload.device_cost) : null,
    original_device_cost: payload.original_device_cost ? parseFloat(payload.original_device_cost) : null,
    discounted_device_cost: payload.discounted_device_cost ? parseFloat(payload.discounted_device_cost) : null,
    shipping_cost: payload.shipping_cost ? parseFloat(payload.shipping_cost) : null,
    monthly_subscription: payload.monthly_subscription ? parseFloat(payload.monthly_subscription) : null,
    protection_plan_cost: payload.protection_plan_cost ? parseFloat(payload.protection_plan_cost) : null,
    protection_plan_included: payload.protection_plan_included === true || payload.protection_plan_included === 'true',
    total_upfront_cost: payload.total_upfront_cost ? parseFloat(payload.total_upfront_cost) : null,
    total_monthly_cost: payload.total_monthly_cost ? parseFloat(payload.total_monthly_cost) : null,
    
    // Primary User Information
    primary_user_same_as_client: payload.primary_user_same_as_client === true || payload.primary_user_same_as_client === 'true',
    primary_user_first_name: payload.primary_user_first_name || null,
    primary_user_last_name: payload.primary_user_last_name || null,
    
    // Client Account Info
    client_password: payload.client_password || null,
    
    // Center User Info
    center_user_name: payload.center_user_name || null,
    
    // Payment Information
    payment_method: payload.payment_method || null,
    card_number_last_four: payload.card_number_last_four || null,
    card_expiry: payload.card_expiry || null,
    cardholder_name: payload.cardholder_name || null,
    account_holder_name: payload.account_holder_name || null,
    account_number_last_four: payload.account_number_last_four || null,
    
    // JSONB Data
    beneficiary_info: payload.beneficiary_info || { raw_payload: payload }
  };

  const { data, error } = await supabase
    .from('leads')
    .insert([newLead])
    .select()
    .single();

  if (error) throw error;
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (req.method !== 'POST') throw new Error('Method not allowed');
    const payload = await req.json();
    
    if (!payload.phone_number && !payload.submission_id) {
      return new Response(JSON.stringify({ error: 'Missing identifier' }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const data = await insertLead(payload);
    return new Response(JSON.stringify({ success: true, data }), { 
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
