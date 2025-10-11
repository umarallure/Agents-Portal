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
    console.log('[DEBUG] Callback notification request:', rawBody);
    const { submission_id, customer_name, phone_number, lead_vendor, request_type, notes, carrier, state } = JSON.parse(rawBody);
    if (!SLACK_BOT_TOKEN) {
      console.error('[ERROR] SLACK_BOT_TOKEN not configured');
      throw new Error('SLACK_BOT_TOKEN not configured');
    }
    // Center mapping for different lead vendors (same as center-transfer-notification)
    const leadVendorCenterMapping = {
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
    if (!lead_vendor) {
      console.error('[ERROR] No lead vendor specified');
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
    const centerChannel = leadVendorCenterMapping[lead_vendor];
    if (!centerChannel) {
      console.error(`[ERROR] No center channel mapping for vendor: ${lead_vendor}`);
      return new Response(JSON.stringify({
        success: false,
        message: `No center channel mapping for vendor: ${lead_vendor}`
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Build the call result update URL - use production URL instead of localhost
    const callResultUrl = `https://agents-portal-zeta.vercel.app/call-result-update?submissionId=${submission_id}`;
    // Build Slack message with rich formatting
    const slackText = `:phone: *Callback Request from ${lead_vendor}*\n*${request_type}* - ${customer_name}`;
    const slackMessage = {
      channel: centerChannel,
      text: slackText,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📞 Callback Request',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Request Type:*\n${request_type}`
            },
            {
              type: 'mrkdwn',
              text: `*Call Center:*\n${lead_vendor}`
            },
            {
              type: 'mrkdwn',
              text: `*Customer Name:*\n${customer_name}`
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
            text: `*Notes:*\n${notes}`
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '📋 Update Call Result',
                emoji: true
              },
              url: callResultUrl,
              style: 'primary',
              action_id: 'update_call_result'
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Submission ID: ${submission_id}`
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
    console.error('[ERROR] Exception in callback-notification function:', error);
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
