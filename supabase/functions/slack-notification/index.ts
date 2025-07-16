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