import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// The target channel for buffer callback portal notifications
const BUFFER_CALLBACK_CHANNEL = '#sample-center-transfer-channel';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    console.log('[DEBUG] Retention call notification request:', rawBody);

    const {
      type,
      submissionId,
      verificationSessionId,
      bufferAgentId,
      bufferAgentName,
      licensedAgentId,
      licensedAgentName,
      customerName,
      leadVendor,
      notificationId,
      retentionType,
      retentionNotes,
      quoteDetails
    } = JSON.parse(rawBody);

    console.log('[DEBUG] Parsed notificationId:', notificationId);
    console.log('[DEBUG] Type:', type);

    if (!SLACK_BOT_TOKEN) {
      console.error('[ERROR] SLACK_BOT_TOKEN not configured');
      throw new Error('SLACK_BOT_TOKEN not configured');
    }

    // Initialize Supabase client for database operations
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Production URL for the agents portal
    const portalBaseUrl = 'http://localhost:8080';

    if (type === 'buffer_connected') {
      // Buffer agent claimed a retention call - send notification to buffer callback channel
      // with LA-Ready button that redirects directly to the call result update page

      const laReadyUrl = `${portalBaseUrl}/call-result-update?submissionId=${submissionId}&sessionId=${verificationSessionId}&notificationId=${notificationId}`;

      // Build retention details text
      let retentionDetailsText = '';
      if (retentionType) {
        if (retentionType === 'new_sale') {
          retentionDetailsText = '\n\n*Retention Type:* New Sale';
          if (quoteDetails) {
            retentionDetailsText += '\n*Quote Details:*';
            if (quoteDetails.carrier) retentionDetailsText += `\n• Carrier: ${quoteDetails.carrier}`;
            if (quoteDetails.product) retentionDetailsText += `\n• Product: ${quoteDetails.product}`;
            if (quoteDetails.coverage) retentionDetailsText += `\n• Coverage: ${quoteDetails.coverage}`;
            if (quoteDetails.monthlyPremium) retentionDetailsText += `\n• Monthly Premium: ${quoteDetails.monthlyPremium}`;
          }
        } else if (retentionType === 'fixed_payment') {
          retentionDetailsText = '\n\n*Retention Type:* Fixed Failed Payment';
          if (retentionNotes) retentionDetailsText += `\n*Notes:* ${retentionNotes}`;
        } else if (retentionType === 'carrier_requirements') {
          retentionDetailsText = '\n\n*Retention Type:* Fulfilling Carrier Requirements';
          if (retentionNotes) retentionDetailsText += `\n*Notes:* ${retentionNotes}`;
        }
      }

      const slackMessage = {
        channel: BUFFER_CALLBACK_CHANNEL,
        text: `:phone: Retention Call - ${bufferAgentName} connected with ${customerName}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '📞 Retention Call - Agent Connected',
              emoji: true
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Retention Agent:*\n${bufferAgentName || 'N/A'}`
              },
              {
                type: 'mrkdwn',
                text: `*Customer:*\n${customerName || 'N/A'}`
              },
              {
                type: 'mrkdwn',
                text: `*Lead Vendor:*\n${leadVendor || 'N/A'}`
              },
              {
                type: 'mrkdwn',
                text: `*Submission ID:*\n${submissionId}`
              }
            ]
          },
          ...(retentionDetailsText ? [{
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: retentionDetailsText
            }
          }] : []),
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*A Licensed Agent needs to click the button below when ready to take the call:*'
            }
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: '✅ LA - Ready',
                  emoji: true
                },
                style: 'primary',
                url: laReadyUrl,
                action_id: 'la_ready_button'
              }
            ]
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Click the button above to notify the retention agent that you're ready to receive the transfer.`
              }
            ]
          }
        ]
      };

      console.log('[DEBUG] Sending buffer_connected notification to:', BUFFER_CALLBACK_CHANNEL);
      console.log('[DEBUG] Slack message:', JSON.stringify(slackMessage, null, 2));

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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        type: 'buffer_connected',
        messageTs: slackResult.ts,
        channel: BUFFER_CALLBACK_CHANNEL,
        notificationId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (type === 'la_ready') {
      // Licensed Agent clicked "LA - Ready" button from Slack
      // Create a notification in the database for the buffer agent to see

      console.log('[EDGE FUNCTION - LA READY] Starting with params:', {
        submissionId,
        verificationSessionId,
        licensedAgentId,
        licensedAgentName,
        timestamp: new Date().toISOString()
      });

      // Check if an la_ready notification already exists for this session and LA to prevent duplicates
      console.log('[EDGE FUNCTION - LA READY] Checking for existing notifications...');
      const { data: existingNotification, error: existingError } = await supabase
        .from('retention_call_notifications')
        .select('id, created_at')
        .eq('verification_session_id', verificationSessionId)
        .eq('licensed_agent_id', licensedAgentId)
        .eq('notification_type', 'la_ready')
        .single();

      console.log('[EDGE FUNCTION - LA READY] Existing check result:', {
        found: !!existingNotification,
        existingId: existingNotification?.id,
        existingCreatedAt: existingNotification?.created_at,
        error: existingError?.message
      });

      if (existingNotification) {
        console.log('[EDGE FUNCTION - LA READY] DUPLICATE DETECTED - Returning early');
        return new Response(JSON.stringify({
          success: true,
          type: 'la_ready',
          message: 'Notification already exists',
          notification: existingNotification
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log('[EDGE FUNCTION - LA READY] No duplicate found, proceeding with insert');

      // Update the original notification record to mark LA as ready
      if (notificationId) {
        console.log('[EDGE FUNCTION - LA READY] Updating original notification:', notificationId);
        const { error: updateError } = await supabase
          .from('retention_call_notifications')
          .update({
            licensed_agent_id: licensedAgentId,
            licensed_agent_name: licensedAgentName,
            notification_type: 'la_ready',
            la_ready_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', notificationId);

        if (updateError) {
          console.error('[EDGE FUNCTION - LA READY] Failed to update notification:', updateError);
        } else {
          console.log('[EDGE FUNCTION - LA READY] Original notification updated successfully');
        }
      }

      // Create a new la_ready notification for the buffer agent
      console.log('[EDGE FUNCTION - LA READY] Creating new la_ready notification...');
      const { data: newNotification, error: insertError } = await supabase
        .from('retention_call_notifications')
        .insert({
          verification_session_id: verificationSessionId,
          submission_id: submissionId,
          buffer_agent_id: bufferAgentId,
          buffer_agent_name: bufferAgentName,
          licensed_agent_id: licensedAgentId,
          licensed_agent_name: licensedAgentName,
          customer_name: customerName,
          lead_vendor: leadVendor,
          notification_type: 'la_ready',
          status: 'pending',
          la_ready_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('[EDGE FUNCTION - LA READY] Insert failed:', insertError);
        throw insertError;
      }

      console.log('[EDGE FUNCTION - LA READY] New notification created:', {
        id: newNotification.id,
        created_at: newNotification.created_at
      });

      // Send confirmation to buffer callback channel
      console.log('[EDGE FUNCTION - LA READY] Sending Slack confirmation...');
      const confirmationMessage = {
        channel: BUFFER_CALLBACK_CHANNEL,
        text: `:white_check_mark: *${licensedAgentName}* is ready to take the call for *${customerName}*`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:white_check_mark: *${licensedAgentName}* is ready to take the call for *${customerName}*`
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Buffer Agent: ${bufferAgentName} | Submission ID: ${submissionId}`
              }
            ]
          }
        ]
      };

      await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(confirmationMessage)
      });

      return new Response(JSON.stringify({
        success: true,
        type: 'la_ready',
        notification: newNotification
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else {
      return new Response(JSON.stringify({
        success: false,
        message: `Unknown notification type: ${type}`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('[ERROR] Exception in retention-call-notification:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
      debug: error
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
