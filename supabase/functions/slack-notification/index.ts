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
    // Lead vendor to Slack channel mapping
    const leadVendorChannelMapping = {
      "Ark Tech": "#orbit-team-ark-tech",
      "GrowthOnline BPO": "#orbit-team-growthonics-bpo",
      "Maverick": "#orbit-team-maverick-comm",
      "Orbit Insurance x Om": "#orbit-team-omnitalk-bpo",
      "Vize BPO": "#orbit-team-vize-bpo",
      "Vyn BPO": "#test-bpo",
      "Cyberleads": "#test-bpo",
      "Corebiz": "#orbit-team-corebiz-bpo",
      "Digicon": "#orbit-team-digicon-bpo",
      "Ambition": "#orbit-team-ambition-bpo",
      "Benchmark": "#orbit-team-benchmark-bpo",
      "Poahenee": "#orbit-team-poshenee-tech-bpo",
      "Plexi": "#orbit-team-plexi-bpo",
      "Gigabite": "#orbit-team-gigabite-bpo",
      "Everline solution": "#orbit-team-everline-bpo",
      "Capital Zone Comm": "#test-bpo",
      "BroTech": "#test-bpo",
      "Progressive BPO": "#orbit-team-progressive-bpo",
      "Cerberus BPO": "#test-bpo",
      "TM Global": "#orbit-team-tm-global-bpo",
      "Optimum BPO": "#orbit-team-optimum-bpo"
    };
    
    const isSubmittedApplication = callResult && callResult.application_submitted === true;
    let slackMessage;
    
    // Only send notifications for submitted applications
    if (isSubmittedApplication) {
      // Determine final status based on underwriting field
      let finalStatus = callResult.status || 'Submitted';
      if (callResult.application_submitted === true) {
        finalStatus = callResult.sent_to_underwriting === true ? "Underwriting" : "Submitted";
      }
      
      // Add status display text
      const statusDisplay = finalStatus === "Underwriting" ? "Sent to Underwriting" : finalStatus;
      
      // Template for submitted applications
      slackMessage = {
        channel: '#submission-portal', // Changed from #test-zaps to #general as it's more likely to exist
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '✅ Application Submitted!'
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${callResult.buffer_agent || 'N/A'}* - *${callResult.agent_who_took_call || 'N/A'}* - *${callResult.lead_vendor || 'N/A'}* - *${leadData.customer_full_name || 'N/A'}* - *${callResult.carrier || 'N/A'}* - *${callResult.product_type || 'N/A'}* - *${callResult.draft_date || 'N/A'}* - *$${callResult.monthly_premium || 'N/A'}* - *$${callResult.face_amount || 'N/A'}* - *${statusDisplay}*`
            }
          }
        ]
      };
    } else {
      // No notification for new leads, only log
      console.log('Skipping notification - only submitted applications trigger Slack messages');
    }
    // Only send Slack message if we have one (for submitted applications)
    let slackResult: any = { ok: false };
    if (slackMessage) {
      const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(slackMessage)
      });
      slackResult = await slackResponse.json();
      
      console.log('Slack API Response:', JSON.stringify(slackResult, null, 2));
      
      if (!slackResult.ok) {
        console.error(`Slack API error: ${slackResult.error}`);
        // If the main channel fails, try with a direct message instead
        if (slackResult.error === 'channel_not_found') {
          console.log('Channel not found, skipping main notification');
          // Don't throw error, just log and continue
        } else {
          throw new Error(`Slack API error: ${slackResult.error}`);
        }
      } else {
        console.log('Slack message sent successfully');
      }
    }
    // Debug logging to check the received data
    console.log('Debug - callResult data:', JSON.stringify(callResult, null, 2));
    console.log('Debug - isSubmittedApplication:', isSubmittedApplication);
    console.log('Debug - callResult.lead_vendor:', callResult?.lead_vendor);
    // Send additional notification to lead vendor specific channel if application is submitted
    if (isSubmittedApplication && callResult.lead_vendor) {
      const vendorChannel = leadVendorChannelMapping[callResult.lead_vendor];
      console.log(`Debug - Looking for vendor: "${callResult.lead_vendor}"`);
      console.log(`Debug - Found channel: ${vendorChannel}`);
      if (vendorChannel) {
        const vendorSlackMessage = {
          channel: vendorChannel,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `${leadData.customer_full_name || 'N/A'} SUBMITTED`
              }
            }
          ]
        };
        
        try {
          const vendorSlackResponse = await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(vendorSlackMessage)
          });
          const vendorSlackResult = await vendorSlackResponse.json();
          
          console.log(`Vendor Slack API Response for ${vendorChannel}:`, JSON.stringify(vendorSlackResult, null, 2));
          
          if (vendorSlackResult.ok) {
            console.log(`Vendor notification sent to ${vendorChannel} successfully`);
          } else {
            console.error(`Failed to send vendor notification to ${vendorChannel}: ${vendorSlackResult.error}`);
            if (vendorSlackResult.error === 'channel_not_found') {
              console.log(`Channel ${vendorChannel} not found, vendor may need to create it or invite the bot`);
            }
          }
        } catch (vendorError) {
          console.error(`Error sending vendor notification to ${vendorChannel}:`, vendorError);
        }
      } else {
        console.log(`No channel mapping found for lead vendor: "${callResult.lead_vendor}"`);
      }
    } else {
      console.log('Debug - Vendor notification not sent because:');
      console.log(`  - isSubmittedApplication: ${isSubmittedApplication}`);
      console.log(`  - callResult.lead_vendor exists: ${!!callResult?.lead_vendor}`);
      console.log(`  - callResult.lead_vendor value: "${callResult?.lead_vendor}"`);
    }
    return new Response(JSON.stringify({
      success: true,
      messageTs: slackResult?.ts,
      mainChannelSuccess: slackResult?.ok || false,
      vendorNotificationAttempted: isSubmittedApplication && !!callResult?.lead_vendor,
      vendorChannel: isSubmittedApplication && callResult?.lead_vendor ? leadVendorChannelMapping[callResult.lead_vendor] : null
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in slack-notification:', error);
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
