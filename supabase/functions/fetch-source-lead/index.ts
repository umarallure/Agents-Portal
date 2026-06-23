import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { ghlName } = await req.json();

    if (!ghlName) {
      return new Response(JSON.stringify({ error: 'Missing ghlName' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const nameParts = ghlName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    let lead = null;

    if (lastName) {
      const { data: leads, error } = await supabase
        .from('leads')
        .select('first_name, last_name, date_of_birth, social, state, street1, street2, city, zip_code, phone, submission_id')
        .ilike('first_name', firstName)
        .ilike('last_name', lastName)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (leads && leads.length > 0) {
        const l = leads[0];
        const streetParts = [l.street1, l.street2].filter(Boolean);
        lead = {
          customer_full_name: `${l.first_name} ${l.last_name}`.trim(),
          date_of_birth: l.date_of_birth,
          social_security: l.social,
          state: l.state,
          street_address: streetParts.length > 0 ? streetParts.join(', ') : null,
          city: l.city,
          zip_code: l.zip_code,
          phone_number: l.phone,
          submission_id: l.submission_id,
        };
      }
    }

    return new Response(JSON.stringify({ lead }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('fetch-source-lead error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
