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
    const { submissionId, leadData, callResult } = await req.json();
    if (!SLACK_BOT_TOKEN) {
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
      "TM Global": "#orbit-team-tm-global-bpo",
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
      "Crown Connect BPO": "#orbit-team-crown-connect-bpo"
    };
    // Only send notifications for NOT submitted applications
    const isNotSubmitted = callResult && callResult.application_submitted === false;
    if (!isNotSubmitted) {
      console.log('Skipping center notification - only for not submitted applications');
      return new Response(JSON.stringify({
        success: true,
        message: 'No notification sent - application was submitted'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('Debug - callResult data:', JSON.stringify(callResult, null, 2));
    console.log('Debug - leadData:', JSON.stringify(leadData, null, 2));
    // Get the lead vendor from callResult or leadData
    const leadVendor = callResult?.lead_vendor || leadData?.lead_vendor;
    if (!leadVendor) {
      console.log('No lead vendor found, cannot determine center channel');
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
      console.log(`No center channel mapping found for lead vendor: "${leadVendor}"`);
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
    // Create the notification message with notes and reason
    const statusText = callResult.status || 'Not Submitted';
    const reasonText = callResult.dq_reason || 'No specific reason provided';
    const notesText = callResult.notes || 'No additional notes';
    const customerName = leadData.customer_full_name || 'Unknown Customer';
    const phoneNumber = leadData.phone_number || 'No phone number';
    const email = leadData.email || 'No email';
    // Format the message with status emoji
    let statusEmoji = '✅';
    switch(callResult.status){
      case '⁠DQ':
        statusEmoji = '🚫';
        break;
      case 'Needs callback':
        statusEmoji = '📞';
        break;
      case 'Not Interested':
        statusEmoji = '🙅‍♂️';
        break;
      case 'Future Submission Date':
        statusEmoji = '📅';
        break;
      default:
        statusEmoji = '✅';
    }
    const centerSlackMessage = {
      channel: centerChannel,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${statusEmoji} - ${statusText}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Customer Name:* ${customerName}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Status:* ${statusText}\n*Reason:* ${reasonText}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Notes:*\n${notesText}`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Lead Vendor: ${leadVendor} | Agent: ${callResult.agent_who_took_call || 'N/A'} | Buffer: ${callResult.buffer_agent || 'N/A'}`
            }
          ]
        }
      ]
    };
    console.log(`Sending center notification to ${centerChannel} for vendor ${leadVendor}`);
    const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(centerSlackMessage)
    });
    const slackResult = await slackResponse.json();
    console.log(`Center Slack API Response for ${centerChannel}:`, JSON.stringify(slackResult, null, 2));
    if (!slackResult.ok) {
      console.error(`Slack API error: ${slackResult.error}`);
      if (slackResult.error === 'channel_not_found') {
        console.log(`Channel ${centerChannel} not found, center may need to create it or invite the bot`);
        return new Response(JSON.stringify({
          success: false,
          message: `Channel ${centerChannel} not found`,
          error: slackResult.error
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } else {
        throw new Error(`Slack API error: ${slackResult.error}`);
      }
    }
    console.log(`Center notification sent to ${centerChannel} successfully`);
    return new Response(JSON.stringify({
      success: true,
      messageTs: slackResult.ts,
      channel: centerChannel,
      leadVendor: leadVendor,
      status: statusText,
      reason: reasonText
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in center-notification:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
