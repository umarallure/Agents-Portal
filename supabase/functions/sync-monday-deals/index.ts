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
    const sourceSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const DEST_URL = Deno.env.get('DEST_SUPABASE_URL');
    const DEST_KEY = Deno.env.get('DEST_SERVICE_ROLE_KEY');

    if (!DEST_URL || !DEST_KEY) {
      throw new Error('Destination project credentials not configured. Set DEST_SUPABASE_URL and DEST_SERVICE_ROLE_KEY secrets.');
    }

    const destSupabase = createClient(DEST_URL, DEST_KEY);

    const { data: sourceRows, error: sourceError } = await sourceSupabase
      .from('deal_tracker')
      .select('*')
      .eq('carrier', 'AMAM')
      .in('policy_status', ['Issued Paid', 'Issued Not Paid', 'Pending', 'Pending Lapse']);

    if (sourceError) throw sourceError;

    if (!sourceRows || sourceRows.length === 0) {
      return new Response(JSON.stringify({ message: 'No matching records found in source', inserted: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const { data: existingRows } = await destSupabase
      .from('monday_com_deals')
      .select('policy_number, carrier')
      .eq('carrier', 'AMAM');

    const existingSet = new Set((existingRows || []).map(r => `${r.policy_number}|${r.carrier}`));

    const newRows = sourceRows
      .filter(r => !existingSet.has(`${r.policy_number}|${r.carrier}`))
      .map(r => ({
        deal_name: r.name,
        tasks: r.tasks,
        ghl_name: r.ghl_name,
        ghl_stage: r.ghl_stage,
        policy_status: r.policy_status,
        deal_creation_date: r.deal_creation_date,
        policy_number: r.policy_number,
        deal_value: r.deal_value,
        cc_value: r.cc_value,
        notes: r.notes,
        status: r.status,
        last_updated: r.last_updated,
        sales_agent: r.sales_agent,
        writing_no: r.writing_number,
        commission_type: r.commission_type,
        effective_date: r.effective_date,
        call_center: r.call_center,
        phone_number: r.phone_number,
        cc_pmt_ws: r.cc_pmt_ws,
        cc_cb_ws: r.cc_cb_ws,
        carrier_status: r.carrier_status,
        policy_type: r.policy_type,
        carrier: r.carrier,
        is_active: true,
        lock_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

    if (newRows.length === 0) {
      return new Response(JSON.stringify({ message: 'All records already synced', inserted: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const batchSize = 100;
    let insertedCount = 0;
    for (let i = 0; i < newRows.length; i += batchSize) {
      const batch = newRows.slice(i, i + batchSize);
      const { error: insertError } = await destSupabase
        .from('monday_com_deals')
        .insert(batch);
      if (insertError) throw insertError;
      insertedCount += batch.length;
    }

    return new Response(JSON.stringify({
      message: `Synced ${insertedCount} new policies`,
      total_in_source: sourceRows.length,
      inserted: insertedCount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Sync error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
