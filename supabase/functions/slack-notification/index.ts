import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
      "Visa BPO": "#orbit-team-vize-bpo",
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

    const portalUrl = `${Deno.env.get('SUPABASE_URL')?.replace('gqhcjqxcvhgwsqfqgekh.supabase.co', 'agents-portal-zeta.vercel.app')}/call-result-update?submissionId=${submissionId}`;

    // Check if this is a submitted application notification
    const isSubmittedApplication = callResult && callResult.application_submitted === true;

    let slackMessage;

    if (isSubmittedApplication) {
      // Template for submitted applications
      slackMessage = {
        channel: '#test-zaps', // Change to your channel at the end of development
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
              text: `*${callResult.buffer_agent || 'N/A'}* - *${callResult.agent_who_took_call || 'N/A'}* - *${leadData.customer_full_name || 'N/A'}* - *${callResult.carrier || 'N/A'}* - *${callResult.product_type || 'N/A'}* - *${callResult.draft_date || 'N/A'}* - *$${callResult.monthly_premium || 'N/A'}* - *$${callResult.face_amount || 'N/A'}*`
            }
          },
          
        ]
      };
    } else {
      // Original template for new leads
      slackMessage = {
        channel: '#test-zaps', // Change to your channel at the end of development
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🔔 New Lead Received!'
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Name:* ${leadData.customer_full_name || 'N/A'}`
              },
              {
                type: 'mrkdwn',
                text: `*Phone:* ${leadData.phone_number || 'N/A'}`
              },
              {
                type: 'mrkdwn',
                text: `*Email:* ${leadData.email || 'N/A'}`
              },
              {
                type: 'mrkdwn',
                text: `*Submission ID:* ${submissionId}`
              }
            ]
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: '📋 Process Lead'
                },
                style: 'primary',
                url: portalUrl
              }
            ]
          }
        ]
      };
    }

    const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slackMessage),
    });

    const slackResult = await slackResponse.json();
    
    if (!slackResult.ok) {
      throw new Error(`Slack API error: ${slackResult.error}`);
    }

    console.log('Slack message sent successfully');

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

        const vendorSlackResponse = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(vendorSlackMessage),
        });

        const vendorSlackResult = await vendorSlackResponse.json();
        
        if (vendorSlackResult.ok) {
          console.log(`Vendor notification sent to ${vendorChannel} successfully`);
        } else {
          console.error(`Failed to send vendor notification: ${vendorSlackResult.error}`);
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
      messageTs: slackResult.ts 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in slack-notification:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});