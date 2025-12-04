import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN');
const RETENTION_CHANNEL = '#retention-team-portal';
const CALLBACK_PORTAL_CHANNEL = '#callback-portal';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    const body = await req.json();
    const { 
      type,
      submissionId, 
      agentName,
      customerName,
      leadVendor,
      retentionAgent,
      carrier,
      productType,
      draftDate,
      monthlyPremium,
      coverageAmount,
      newDraftDate,
      isRetentionCall,
      retentionType,
      retentionNotes,
      quoteDetails
    } = body;

    if (!SLACK_BOT_TOKEN) {
      throw new Error('SLACK_BOT_TOKEN not configured');
    }

    let message;
    let targetChannel = RETENTION_CHANNEL;

    switch (type) {
      case 'buffer_connected':
        // New workflow: Retention agent connected - send to callback portal with LA Ready button
        targetChannel = CALLBACK_PORTAL_CHANNEL;
        
        let detailsText = '';
        if (retentionType === 'new_sale') {
          detailsText = `*Type:* New Sale\n`;
          if (quoteDetails) {
            detailsText += `*Quote Details:*\n`;
            if (quoteDetails.carrier) detailsText += `  • Carrier: ${quoteDetails.carrier}\n`;
            if (quoteDetails.product) detailsText += `  • Product: ${quoteDetails.product}\n`;
            if (quoteDetails.coverage) detailsText += `  • Coverage: ${quoteDetails.coverage}\n`;
            if (quoteDetails.monthlyPremium) detailsText += `  • Monthly Premium: ${quoteDetails.monthlyPremium}\n`;
          }
        } else if (retentionType === 'fixed_payment') {
          detailsText = `*Type:* Fixed Failed Payment\n*Notes:* ${retentionNotes || 'N/A'}\n`;
        } else if (retentionType === 'carrier_requirements') {
          detailsText = `*Type:* Fulfilling Carrier Requirements\n*Notes:* ${retentionNotes || 'N/A'}\n`;
        }
        
        message = {
          channel: targetChannel,
          text: `🔔 Retention Call Connected - ${agentName}`,
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: "🔔 Retention Call Connected",
                emoji: true
              }
            },
            {
              type: "section",
              fields: [
                {
                  type: "mrkdwn",
                  text: `*Agent:*\n${agentName || 'N/A'}`
                },
                {
                  type: "mrkdwn",
                  text: `*Customer:*\n${customerName || 'N/A'}`
                },
                {
                  type: "mrkdwn",
                  text: `*Lead Vendor:*\n${leadVendor || 'N/A'}`
                },
                {
                  type: "mrkdwn",
                  text: `*Submission ID:*\n${submissionId || 'N/A'}`
                }
              ]
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: detailsText
              }
            },
            {
              type: "actions",
              elements: [
                {
                  type: "button",
                  text: {
                    type: "plain_text",
                    text: "LA Ready ✓",
                    emoji: true
                  },
                  style: "primary",
                  value: `la_ready_${submissionId}`,
                  action_id: "la_ready_button"
                }
              ]
            }
          ]
        };
        break;

      case 'application_submitted':
        // Only send if it's a retention call
        if (!isRetentionCall) {
          console.log('Not a retention call, skipping notification');
          return new Response(JSON.stringify({
            success: true,
            message: 'Not a retention call, no notification sent'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Format: ✅ Application Submitted! - [Customer Name] - N/A - Isaac - WinBPO - Charles Birosel - MOH - Level - 2026-01-03 - $23.66 - $3000 - Submitted
        message = {
          channel: RETENTION_CHANNEL,
          text: `✅ Application Submitted! - ${customerName || 'N/A'} - N/A - ${retentionAgent || agentName || 'N/A'} - ${leadVendor || 'N/A'} - ${customerName || 'N/A'} - ${carrier || 'N/A'} - ${productType || 'N/A'} - ${draftDate || 'N/A'} - $${monthlyPremium || '0.00'} - $${coverageAmount || '0'} - Submitted`
        };
        break;

      case 'fixed_banking':
        if (!isRetentionCall) {
          console.log('Not a retention call, skipping notification');
          return new Response(JSON.stringify({
            success: true,
            message: 'Not a retention call, no notification sent'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Format: 🏦 Failed Payment Fix! - [Customer Name] - [Retention Agent] - Updated banking info/draft date w/ [Carrier Name] - New Draft Date: [Draft date]
        message = {
          channel: RETENTION_CHANNEL,
          text: `🏦 Failed Payment Fix! - ${customerName || 'N/A'} - ${retentionAgent || agentName || 'N/A'} - Updated banking info/draft date w/ ${carrier || 'N/A'} - New Draft Date: ${newDraftDate || 'N/A'}`
        };
        break;

      case 'fulfilled_carrier_requirements':
        if (!isRetentionCall) {
          console.log('Not a retention call, skipping notification');
          return new Response(JSON.stringify({
            success: true,
            message: 'Not a retention call, no notification sent'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Format: 📣 Fulfilled Carrier Requirement! - [Customer Name] - [Retention Agent] - Fulfilled carrier requirement w/ [carrier name] - Lead will be moved back to pending approval!
        message = {
          channel: RETENTION_CHANNEL,
          text: `📣 Fulfilled Carrier Requirement! - ${customerName || 'N/A'} - ${retentionAgent || agentName || 'N/A'} - Fulfilled carrier requirement w/ ${carrier || 'N/A'} - Lead will be moved back to pending approval!`
        };
        break;

      default:
        console.log(`Unknown notification type: ${type}`);
        return new Response(JSON.stringify({
          success: false,
          message: `Unknown notification type: ${type}`
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
    }

    console.log(`Sending retention team notification to ${targetChannel} for type: ${type}`);

    const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    });

    const slackResult = await slackResponse.json();
    console.log(`Retention Team Slack API Response:`, JSON.stringify(slackResult, null, 2));

    if (!slackResult.ok) {
      console.error(`Slack API error: ${slackResult.error}`);
      throw new Error(`Slack API error: ${slackResult.error}`);
    }

    console.log(`Retention team notification sent successfully`);

    return new Response(JSON.stringify({
      success: true,
      messageTs: slackResult.ts,
      channel: targetChannel,
      type: type
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error in retention-team-notification:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
