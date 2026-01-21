import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN');

// Helper function to format dates in New York timezone format (MM/DD/YYYY)
const formatDateNewYork = (dateString: string | null | undefined): string => {
  if (!dateString || dateString === 'N/A' || dateString.trim() === '') {
    return 'N/A';
  }
  
  const trimmed = dateString.trim();
  
  try {
    let date: Date;
    
    // If in YYYY-MM-DD format (ISO), parse it
    const yyyymmddPattern = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
    if (yyyymmddPattern.test(trimmed)) {
      // Parse as UTC and convert to New York timezone
      const match = trimmed.match(yyyymmddPattern)!;
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // Month is 0-indexed
      const day = parseInt(match[3], 10);
      date = new Date(year, month, day);
    } else {
      // Try to parse as a date string
      date = new Date(trimmed);
      if (isNaN(date.getTime())) {
        // If parsing fails, return the original string
        return trimmed;
      }
    }
    
    // Format in New York timezone as MM/DD/YYYY
    return date.toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    // If any error occurs, return the original string
    return trimmed;
  }
};
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
      "Argon Comm": "#orbit-team-argon-comm",
      "Care Solutions": "#unlimited-team-care-solutions",
      "Cutting Edge": "#unlimited-team-cutting-edge",
      "Next Era": "#unlimited-team-next-era",
      "Rock BPO": "#orbit-team-rock-bpo",
      "Avenue Consultancy": "#orbit-team-avenue-consultancy",
      "Crown Connect BPO": "#orbit-team-crown-connect-bpo",
      "Networkize": "#orbit-team-networkize",
      "LightVerse BPO": "#orbit-team-lightverse-bpo",
      "Leads BPO": "#orbit-team-leads-bpo",
      "Helix BPO": "#orbit-team-helix-bpo",
      "CrossNotch": "#orbit-team-crossnotch",
      "TechPlanet": "#orbit-team-techplanet",
      "Exito BPO": "#orbit-team-exito-bpo",
      "StratiX BPO": "#orbit-team-stratix-bpo",
      "Lumenix BPO": "#orbit-team-lumenix-bpo",
      "All-Star BPO": "#orbit-team-allstar-bpo",
      "DownTown BPO": "#orbit-team-downtown-bpo",
      "Livik BPO": "#orbit-team-livik-bpo",
      "NexGen BPO": "#orbit-team-nexgen-bpo",
      "Quoted-Leads BPO": "#orbit-team-quotedleads-bpo",
      "SellerZ BPO": "#orbit-team-sellerz-bpo",
      "Venom BPO": "#orbit-team-venom-bpo",
      "WinBPO": "#orbit-team-win-bpo",
      "TechPlanet": "#orbit-team-techplanet",
      "Techvated Marketing": "#orbit-team-techvated-marketing",
      "Core Marketing":"#orbit-team-core-marketing",
      "Everest BPO":"#orbit-team-everest-bpo",
      "Riztech BPO":"#orbit-team-riztech-bpo",
      "Tekelec BPO": "#orbit-team-tekelec-bpo",
      "Alternative BPO":"#orbit-team-alternative-bpo",
      "Unified Systems BPO":"#orbit-team-unified-systems-bpo"
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
        channel: '#submission-portal',
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
              text: `*${callResult.buffer_agent || 'N/A'}* - *${callResult.agent_who_took_call || 'N/A'}* - *${callResult.lead_vendor || 'N/A'}* - *${leadData.customer_full_name || 'N/A'}* - *${callResult.carrier || 'N/A'}* - *${callResult.product_type || 'N/A'}* - *${formatDateNewYork(callResult.draft_date)}* - *$${callResult.monthly_premium || 'N/A'}* - *$${callResult.face_amount || 'N/A'}* - *${statusDisplay}*`
            }
          }
        ]
      };
    } else {
      // No notification for new leads, only log
      console.log('Skipping notification - only submitted applications trigger Slack messages');
    }
    // Only send Slack message if we have one (for submitted applications)
    let slackResult = {
      ok: false
    };
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
        // Calculate status display for vendor message
        const sentToUnderwriting = callResult.sent_to_underwriting === true ? "Yes" : "No";
        const vendorSlackMessage = {
          channel: vendorChannel,
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
                text: `*${leadData.customer_full_name || 'N/A'}*\n\nCarrier: ${callResult.carrier || 'N/A'}\nProduct Type: ${callResult.product_type || 'N/A'}\nDraft Date: ${formatDateNewYork(callResult.draft_date)}\nMonthly Premium: $${callResult.monthly_premium || 'N/A'}\nCoverage Amount: $${callResult.face_amount || 'N/A'}\nSent to Underwriting: ${sentToUnderwriting}`
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
