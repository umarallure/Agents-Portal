import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface CarrierSuggestion {
  carrier_id: string;
  carrier_name: string;
  agent_count: number;
  eligible_agents: {
    user_id: string;
    display_name: string;
    agent_code: string;
    slack_user_id: string | null;
    has_upline: boolean;
    upline_name: string | null;
  }[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { state, original_carrier } = await req.json();

    if (!state) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'State is required'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[INFO] Finding alternative carriers for state: ${state}, original carrier: ${original_carrier || 'N/A'}`);

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Step 1: Get the state_id
    const { data: stateData, error: stateError } = await supabase
      .from('states')
      .select('id, state_name')
      .ilike('state_name', state)
      .single();

    if (stateError || !stateData) {
      console.error('[ERROR] State not found:', stateError);
      return new Response(
        JSON.stringify({
          success: false,
          message: `State "${state}" not found`
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[INFO] Found state: ${stateData.state_name} (ID: ${stateData.id})`);

    // Step 2: Check if state is "Aetna" to use special Aetna logic
    const isAetnaQuery = original_carrier?.toLowerCase() === 'aetna';

    let carrierSuggestions: CarrierSuggestion[] = [];

    if (isAetnaQuery) {
      console.log('[INFO] Using Aetna-specific query for alternative carriers');
      
      // For Aetna, we need to check aetna_agent_state_availability table
      // But since user wants alternatives, we'll look at regular carriers
      // Get all carriers except Aetna
      const { data: carriers, error: carriersError } = await supabase
        .from('carriers')
        .select('id, name')
        .neq('name', 'Aetna');

      if (carriersError || !carriers) {
        console.error('[ERROR] Failed to fetch carriers:', carriersError);
        throw new Error('Failed to fetch carriers');
      }

      // For each carrier, find eligible agents
      for (const carrier of carriers) {
        const { data: eligibleAgents, error: agentsError } = await supabase
          .rpc('get_eligible_agents_with_upline_check', {
            p_carrier_name: carrier.name,
            p_state_name: stateData.state_name
          });

        if (!agentsError && eligibleAgents && eligibleAgents.length > 0) {
          carrierSuggestions.push({
            carrier_id: carrier.id,
            carrier_name: carrier.name,
            agent_count: eligibleAgents.length,
            eligible_agents: eligibleAgents.map((agent: any) => ({
              user_id: agent.user_id,
              display_name: agent.display_name,
              agent_code: agent.agent_code,
              slack_user_id: agent.slack_user_id,
              has_upline: agent.has_upline,
              upline_name: agent.upline_name
            }))
          });
        }
      }
    } else {
      console.log('[INFO] Using regular carrier query including Aetna as alternative');

      // Get all carriers
      const { data: carriers, error: carriersError } = await supabase
        .from('carriers')
        .select('id, name');

      if (carriersError || !carriers) {
        console.error('[ERROR] Failed to fetch carriers:', carriersError);
        throw new Error('Failed to fetch carriers');
      }

      // For each carrier, find eligible agents
      for (const carrier of carriers) {
        let eligibleAgents: any[] = [];
        let agentsError: any = null;

        // Check if this is Aetna carrier
        if (carrier.name.toLowerCase() === 'aetna') {
          // Use Aetna-specific function
          const result = await supabase
            .rpc('get_eligible_agents_for_aetna', {
              p_state_name: stateData.state_name
            });
          
          eligibleAgents = result.data || [];
          agentsError = result.error;
        } else {
          // Use regular function
          const result = await supabase
            .rpc('get_eligible_agents_with_upline_check', {
              p_carrier_name: carrier.name,
              p_state_name: stateData.state_name
            });
          
          eligibleAgents = result.data || [];
          agentsError = result.error;
        }

        // Exclude original carrier from suggestions if provided
        if (original_carrier && carrier.name.toLowerCase() === original_carrier.toLowerCase()) {
          console.log(`[INFO] Skipping original carrier: ${carrier.name}`);
          continue;
        }

        if (!agentsError && eligibleAgents && eligibleAgents.length > 0) {
          carrierSuggestions.push({
            carrier_id: carrier.id,
            carrier_name: carrier.name,
            agent_count: eligibleAgents.length,
            eligible_agents: eligibleAgents.map((agent: any) => ({
              user_id: agent.user_id,
              display_name: agent.display_name,
              agent_code: agent.agent_code,
              slack_user_id: agent.slack_user_id,
              has_upline: agent.has_upline || false,
              upline_name: agent.upline_name || null
            }))
          });
        }
      }
    }

    // Step 3: Sort by agent_count (descending) to get carrier with most agents
    carrierSuggestions.sort((a, b) => b.agent_count - a.agent_count);

    console.log(`[INFO] Found ${carrierSuggestions.length} alternative carrier options`);
    
    if (carrierSuggestions.length > 0) {
      const topSuggestion = carrierSuggestions[0];
      console.log(`[INFO] Top suggestion: ${topSuggestion.carrier_name} with ${topSuggestion.agent_count} agents`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        state: stateData.state_name,
        original_carrier: original_carrier || null,
        total_alternatives: carrierSuggestions.length,
        suggested_carrier: carrierSuggestions.length > 0 ? carrierSuggestions[0] : null,
        all_alternatives: carrierSuggestions,
        message: carrierSuggestions.length > 0 
          ? `Found ${carrierSuggestions.length} alternative carrier(s) for ${stateData.state_name}. Suggested: ${carrierSuggestions[0].carrier_name} with ${carrierSuggestions[0].agent_count} eligible agent(s).`
          : `No alternative carriers found with eligible agents for ${stateData.state_name}`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[ERROR] Suggest alternative carrier error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const errorString = error instanceof Error ? error.toString() : String(error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: errorMessage,
        error: errorString
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
