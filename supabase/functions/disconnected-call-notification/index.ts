import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN');

serve(async (req) => {
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

    // Only send notifications for disconnected calls or dropped calls
    const isDisconnected = callResult && (
      callResult.status === "Disconnected" ||
      callResult.status === "Disconnected - Never Retransferred"
    );
    const isDropped = callResult && (
      callResult.status === "Call Never Sent" ||
      callResult.status === "Call Back Fix" ||
      callResult.status === "Call Dropped" ||
      (callResult.status === "Not Submitted" && callResult.notes?.toLowerCase().includes("dropped"))
    );

    if (!isDisconnected && !isDropped) {
      console.log('Skipping disconnected call notification - not a disconnected or dropped call');
      return new Response(JSON.stringify({
        success: true,
        message: 'No notification sent - not a disconnected or dropped call'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    console.log('Debug - callResult data:', JSON.stringify(callResult, null, 2));
    console.log('Debug - leadData:', JSON.stringify(leadData, null, 2));

    // Single channel for all disconnected/dropped call notifications
    const disconnectedChannel = "#disconnected-calls"; // Change this to your desired channel

    // Create the notification message
    const statusText = callResult.status || 'Disconnected';
    const customerName = leadData.customer_full_name || 'Unknown Customer';
    const phoneNumber = leadData.phone_number || 'No phone number';
    const email = leadData.email || 'No email';
    const leadVendor = callResult?.lead_vendor || leadData?.lead_vendor || 'N/A';
    const agentName = callResult.agent_who_took_call || 'N/A';
    const bufferAgent = callResult.buffer_agent || 'N/A';
    const notesText = callResult.notes || 'No additional notes';

    // Format the message with appropriate emoji
    let statusEmoji = '❌';
    let notificationType = 'Disconnected Call';

    if (isDisconnected) {
      statusEmoji = '❌';
      notificationType = 'Disconnected Call';
    } else if (isDropped) {
      statusEmoji = '📞';
      notificationType = 'Dropped Call';
    }

    const slackMessage = {
      channel: disconnectedChannel,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${statusEmoji} ${notificationType} - ${customerName}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Customer:* ${customerName}\n*Phone:* ${phoneNumber}\n*Email:* ${email}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Status:* ${statusText}\n*Lead Vendor:* ${leadVendor}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Agent:* ${agentName}\n*Buffer Agent:* ${bufferAgent}`
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
              text: `Submission ID: ${submissionId} | Time: ${new Date().toLocaleString()}`
            }
          ]
        }
      ]
    };

    console.log(`Sending disconnected call notification to ${disconnectedChannel}`);

    const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(slackMessage)
    });

    const slackResult = await slackResponse.json();
    console.log(`Slack API Response for ${disconnectedChannel}:`, JSON.stringify(slackResult, null, 2));

    if (!slackResult.ok) {
      console.error(`Slack API error: ${slackResult.error}`);
      if (slackResult.error === 'channel_not_found') {
        console.log(`Channel ${disconnectedChannel} not found, please create it or invite the bot`);
        return new Response(JSON.stringify({
          success: false,
          message: `Channel ${disconnectedChannel} not found`,
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

    console.log(`Disconnected call notification sent to ${disconnectedChannel} successfully`);

    return new Response(JSON.stringify({
      success: true,
      messageTs: slackResult.ts,
      channel: disconnectedChannel,
      notificationType: notificationType,
      customerName: customerName,
      status: statusText
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error in disconnected-call-notification:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});