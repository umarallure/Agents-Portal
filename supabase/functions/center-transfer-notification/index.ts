import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN');
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    // Log incoming request for debugging
    const rawBody = await req.text();
    console.log('[DEBUG] Incoming request body:', rawBody);
  const { type, submissionId, leadData, bufferAgentName, licensedAgentName, agentName } = JSON.parse(rawBody);
    if (!SLACK_BOT_TOKEN) {
      console.error('[ERROR] SLACK_BOT_TOKEN not configured');
      throw new Error('SLACK_BOT_TOKEN not configured');
    }
    // Center mapping for different lead vendors
    const leadVendorCenterMapping = {
      "Ark Tech": "#orbit-team-ark-tech",
      "GrowthOnics BPO": "#orbit-team-growthonics-bpo",
      "Maverick": "#orbit-team-maverick-comm",
      "Omnitalk BPO": "#orbit-team-omnitalk-bpo",
      "Vize BPO": "#orbit-team-vize-bpo",
      "Corebiz": "#orbit-team-corebiz-bpo",
      "Digicon": "#orbit-team-digicon-bpo",
      "Ambition": "#orbit-team-ambition-bpo",
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
      "Avenue Consultancy": "#test-bpo",
      "Crown Connect BPO": "#orbit-team-crown-connect-bpo"
    };
    const leadVendor = leadData?.lead_vendor;
    if (!leadVendor) {
      console.error('[ERROR] No lead vendor specified in payload:', leadData);
      return new Response(JSON.stringify({
        success: false,
        message: 'No lead vendor specified'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const centerChannel = leadVendorCenterMapping[leadVendor];
    if (!centerChannel) {
      console.error(`[ERROR] No center channel mapping for vendor: ${leadVendor}`);
      return new Response(JSON.stringify({
        success: false,
        message: `No center channel mapping for vendor: ${leadVendor}`
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Notification message logic
    let slackText = '';
    if (type === 'call_dropped') {
      slackText = `:red_circle: Call with *${leadData.customer_full_name || 'Unknown Customer'}* dropped. Need to reconnect.`;
    } else if (type === 'transfer_to_la') {
      slackText = `:arrow_right: *${bufferAgentName || 'Buffer Agent'}* has transferred *${leadData.customer_full_name || 'Unknown Customer'}* to *${licensedAgentName || 'Licensed Agent'}*.`;
    } else if (type === 'verification_started') {
      // Debug log for verification_started
      console.log('[DEBUG] Verification started payload:', {
        type,
        submissionId,
        leadData,
        bufferAgentName,
        licensedAgentName
      });
      // Prefer explicit agentName if provided, otherwise fall back to specific roles
      const startedAgent = agentName || bufferAgentName || licensedAgentName;
      if (startedAgent && leadData?.customer_full_name) {
        slackText = `:white_check_mark: *${startedAgent}* is connected to *${leadData.customer_full_name}*`;
      } else {
        slackText = `:white_check_mark: Agent is connected to *${leadData?.customer_full_name || 'Unknown Customer'}*`;
      }
    } else if (type === 'reconnected') {
      // Notification for agent claim and reconnect after dropped call
      const effectiveAgentName = agentName || bufferAgentName || licensedAgentName || 'Agent';
      // Copy requested phrasing: "Agent name get connected with <Customer>"
      slackText = `*${effectiveAgentName}* get connected with *${leadData?.customer_full_name || 'Unknown Customer'}*`;
    } else {
      slackText = 'Notification.';
    }
    const slackMessage = {
      channel: centerChannel,
      text: slackText,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: slackText
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Submission ID: ${submissionId}`
            }
          ]
        }
      ]
    };
    console.log('[DEBUG] Slack message payload:', slackMessage);
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
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    return new Response(JSON.stringify({
      success: true,
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
    console.error('[ERROR] Exception in function:', error);
    return new Response(JSON.stringify({
      error: error.message,
      debug: error
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
