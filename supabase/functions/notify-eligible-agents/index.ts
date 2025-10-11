import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    // Log incoming request for debugging
    const rawBody = await req.text();
    console.log('[DEBUG] Notify eligible agents request:', rawBody);

    const { carrier, state, lead_vendor } = JSON.parse(rawBody);

    if (!SLACK_BOT_TOKEN) {
      console.error('[ERROR] SLACK_BOT_TOKEN not configured');
      throw new Error('SLACK_BOT_TOKEN not configured');
    }

    if (!carrier || !state || !lead_vendor) {
      console.error('[ERROR] Missing required fields: carrier, state, or lead_vendor');
      return new Response(JSON.stringify({
        success: false,
        message: 'Missing required fields: carrier, state, or lead_vendor'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Center mapping for different lead vendors
    const leadVendorCenterMapping: Record<string, string> = {
      "Ark Tech": "#orbit-team-ark-tech",
      "GrowthOnics BPO": "#orbit-team-growthonics-bpo",
      "Maverick": "#sample-center-transfer-channel",
      "Omnitalk BPO": "#orbit-team-omnitalk-bpo",
      "Vize BPO": "#orbit-team-vize-bpo",
      "Corebiz": "#orbit-team-corebiz-bpo",
      "Digicon": "#orbit-team-digicon-bpo",
      "Ambition": "#orbit-team-ambition-bpo",
      "AJ BPO": "#orbit-team-aj-bpo",
      "Pro Solutions BPO": "#orbit-team-pro-solutions-bpo",
      "Emperor BPO": "#orbit-team-emperor-bpo",
      "Benchmark": "#orbit-team-benchmark-bpo",
      "Poshenee": "#orbit-team-poshenee-tech-bpo",
      "Plexi": "#orbit-team-plexi-bpo",
      "Gigabite": "#orbit-team-gigabite-bpo",
      "Everline solution": "#orbit-team-everline-bpo",
      "Progressive BPO": "#orbit-team-progressive-bpo",
      "Cerberus BPO": "#orbit-team-cerberus-bpo",
      "NanoTech": "#orbit-team-nanotech-bpo",
      "Optimum BPO": "#orbit-team-optimum-bpo",
      "Ethos BPO": "#orbit-team-ethos-bpo",
      "Trust Link": "#orbit-team-trust-link",
      "Quotes BPO": "#obit-team-quotes-bpo",
      "Zupax Marketing": "#orbit-team-zupax-marketing",
      "Argon Communications": "#orbit-team-argon-communications",
      "Care Solutions": "#test-bpo",
      "Cutting Edge": "#test-bpo",
      "Next Era": "#test-bpo",
      "Rock BPO": "#orbit-team-rock-bpo",
      "Avenue Consultancy": "#orbit-team-avenue-consultancy",
      "Crown Connect BPO": "#orbit-team-crown-connect-bpo",
      "Networkize": "#orbit-team-networkize",
      "LightVerse BPO": "#orbit-team-lightverse-bpo",
      "Leads BPO": "#orbit-team-leads-bpo",
      "Helix BPO": "#orbit-team-helix-bpo",
      "Exito BPO": "#orbit-team-exito-bpo",
      "Test": "#test-bpo"
    };

    // Agent Slack ID mapping with full display names
    const agentSlackIdMapping: Record<string, { slackId: string; displayName: string }> = {
      "Benjamin": { slackId: "U07ULU99VD4", displayName: "Benjamin Wunder - Sales Manager" },
      "Noah": { slackId: "U09AWBNGBQF", displayName: "Noah - Agent" },
      "Lydia": { slackId: "U08216BSGE4", displayName: "Lydia Sutton - Insurance Agent" },
      "Tatumn": { slackId: "U09FKU50KFT", displayName: "Tatumn - Agent" },
      "Isaac": { slackId: "U099W0RKYDB", displayName: "Isaac Reed - Insurance Agent" }
    };

    const centerChannel = leadVendorCenterMapping[lead_vendor];
    if (!centerChannel) {
      console.error(`[ERROR] No center channel mapping for vendor: ${lead_vendor}`);
      return new Response(JSON.stringify({
        success: false,
        message: `No center channel mapping for vendor: ${lead_vendor}`
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Get eligible agents from database
    console.log(`[DEBUG] Fetching eligible agents for carrier: ${carrier}, state: ${state}`);
    
    const { data: eligibleAgents, error: agentsError } = await supabase
      .rpc('get_eligible_agents', {
        p_carrier_name: carrier,
        p_state_name: state
      });

    if (agentsError) {
      console.error('[ERROR] Failed to fetch eligible agents:', agentsError);
      throw new Error(`Failed to fetch eligible agents: ${agentsError.message}`);
    }

    console.log(`[DEBUG] Found ${eligibleAgents?.length || 0} eligible agents:`, eligibleAgents);

    if (!eligibleAgents || eligibleAgents.length === 0) {
      console.log('[INFO] No eligible agents found for this carrier/state combination');
      
      // Send notification anyway but indicate no eligible agents
      const noAgentsMessage = {
        channel: centerChannel,
        text: `🚨 *New Lead Available* - No eligible agents found for ${carrier} in ${state}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🚨 New Lead Available',
              emoji: true
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Call Center:*\n${lead_vendor}`
              },
              {
                type: 'mrkdwn',
                text: `*Carrier:*\n${carrier}`
              },
              {
                type: 'mrkdwn',
                text: `*State:*\n${state}`
              }
            ]
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '⚠️ *No eligible agents found for this carrier/state combination*'
            }
          }
        ]
      };

      const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(noAgentsMessage)
      });

      const slackResult = await slackResponse.json();
      console.log('[DEBUG] Slack API response (no agents):', slackResult);

      return new Response(JSON.stringify({
        success: true,
        eligible_agents_count: 0,
        message: 'No eligible agents found, notification sent',
        channel: centerChannel
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Build agent mentions for Slack with full display names
    const agentMentions = eligibleAgents.map((agent: any) => {
      const agentInfo = agentSlackIdMapping[agent.agent_name];
      if (agentInfo) {
        return `• <@${agentInfo.slackId}> (${agent.agent_name})`;
      }
      return `• ${agent.agent_name}`;
    }).join('\n');

    // Build the Slack message
    const slackText = `🔔 *New Lead Available for ${carrier} in ${state}*`;
    
    const slackMessage = {
      channel: centerChannel,
      text: slackText,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🔔 New Lead Available',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Call Center:*\n${lead_vendor}`
            },
            {
              type: 'mrkdwn',
              text: `*Carrier:*\n${carrier}`
            },
            {
              type: 'mrkdwn',
              text: `*State:*\n${state}`
            }
          ]
        },
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Agents who can take this call:*\n${agentMentions}`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `${eligibleAgents.length} eligible agent(s)`
            }
          ]
        }
      ]
    };

    console.log('[DEBUG] Slack message payload:', JSON.stringify(slackMessage, null, 2));

    const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(slackMessage)
    });

    const slackResult = await slackResponse.json();
    console.log('[DEBUG] Slack API response:', slackResult);

    if (!slackResult.ok) {
      console.error('[ERROR] Slack API error:', slackResult);
      return new Response(JSON.stringify({
        success: false,
        message: slackResult.error,
        debug: slackResult
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      eligible_agents_count: eligibleAgents.length,
      eligible_agents: eligibleAgents.map((a: any) => a.agent_name),
      messageTs: slackResult.ts,
      channel: centerChannel,
      debug: slackResult
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('[ERROR] Exception in notify-eligible-agents function:', error);
    return new Response(JSON.stringify({
      error: (error as Error).message,
      debug: String(error)
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
