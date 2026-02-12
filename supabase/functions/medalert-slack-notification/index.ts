import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Create Supabase client with auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify the user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({
        success: false,
        message: 'Unauthorized - Please log in',
        error: authError?.message
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    console.log('Authenticated user:', user.id);

    const { leadData } = await req.json();
    
    if (!SLACK_BOT_TOKEN) {
      throw new Error('SLACK_BOT_TOKEN not configured');
    }

    // Center mapping for different lead vendors
    const leadVendorCenterMapping: Record<string, string> = {
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
      "Techvated Marketing": "#orbit-team-techvated-marketing",
      "Core Marketing": "#orbit-team-core-marketing",
      "Everest BPO": "#orbit-team-everest-bpo",
      "Riztech BPO": "#orbit-team-riztech-bpo",
      "Tekelec BPO": "#orbit-team-tekelec-bpo",
      "Alternative BPO": "#orbit-team-alternative-bpo",
      "Broker Leads BPO": "#orbit-team-broker-leads-bpo",
      "Hexa Affiliates": "#orbit-team-hexa-affiliates",
      "Unified Systems BPO": "#orbit-team-unified-systems-bpo",
      "Lavish BPO": "#orbit-team-lavish-bpo",
      "Winners Limited": "#orbit-team-winners-limited",
      "Test": "#medalert-test-channel" // Added for testing - UPDATE THIS TO YOUR TEST CHANNEL
    };

    console.log('Debug - leadData:', JSON.stringify(leadData, null, 2));
    console.log('Debug - Looking for lead_vendor in:', leadData);

    // Get the lead vendor - check multiple possible field names
    const leadVendor = leadData?.lead_vendor || leadData?.leadVendor || leadData?.center_user_name || leadData?.centerUserName;
    
    if (!leadVendor) {
      console.log('No lead vendor found in leadData. Available fields:', Object.keys(leadData || {}));
      return new Response(JSON.stringify({
        success: false,
        message: 'No lead vendor specified',
        debug: { availableFields: Object.keys(leadData || {}), leadData }
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
      console.log('Available mappings:', Object.keys(leadVendorCenterMapping));
      return new Response(JSON.stringify({
        success: false,
        message: `No center channel mapping for vendor: ${leadVendor}`,
        debug: { 
          receivedVendor: leadVendor,
          availableVendors: Object.keys(leadVendorCenterMapping)
        }
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Format the notification message
    const customerName = `${leadData.first_name} ${leadData.last_name}`;
    const phoneNumber = leadData.phone_number || 'No phone number';
    const productName = leadData.quoted_product || 'SOS All-In-One 2';
    const companyName = leadData.company_name || 'Bay Alarm Alert';
    const upfrontCost = leadData.total_upfront_cost ? `$${leadData.total_upfront_cost.toFixed(2)}` : 'N/A';
    const monthlyCost = leadData.total_monthly_cost ? `$${leadData.total_monthly_cost.toFixed(2)}/mo` : 'N/A';
    const paymentMethod = leadData.payment_method === 'credit_card' ? 'Credit Card' : 'ACH/Bank Transfer';
    const submissionId = leadData.submission_id || 'N/A';
    const centerUser = leadData.center_user_name || leadVendor;

    const slackMessage = {
      channel: centerChannel,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚨 NEW MEDALERT LEAD - TRANSFER CALL'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*A new Medalert lead has been submitted and requires call transfer.*`
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Customer Name:*\n${customerName}`
            },
            {
              type: 'mrkdwn',
              text: `*Phone Number:*\n${phoneNumber}`
            },
            {
              type: 'mrkdwn',
              text: `*Product:*\n${productName}`
            },
            {
              type: 'mrkdwn',
              text: `*Company:*\n${companyName}`
            },
            {
              type: 'mrkdwn',
              text: `*Upfront Cost:*\n${upfrontCost}`
            },
            {
              type: 'mrkdwn',
              text: `*Monthly Cost:*\n${monthlyCost}`
            },
            {
              type: 'mrkdwn',
              text: `*Payment Method:*\n${paymentMethod}`
            },
            {
              type: 'mrkdwn',
              text: `*Submission ID:*\n${submissionId}`
            }
          ]
        },
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*📍 Address:*\n${leadData.address}\n${leadData.city}, ${leadData.state} ${leadData.zip_code}`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Submitted by: ${centerUser} | Lead Vendor: ${leadVendor} | Time: ${new Date().toLocaleString()}`
            }
          ]
        }
      ]
    };

    console.log(`Sending Medalert lead notification to ${centerChannel} for vendor ${leadVendor}`);
    
    const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(slackMessage)
    });

    const slackResult = await slackResponse.json();
    console.log(`Slack API Response for ${centerChannel}:`, JSON.stringify(slackResult, null, 2));

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

    console.log(`Medalert lead notification sent to ${centerChannel} successfully`);
    
    return new Response(JSON.stringify({
      success: true,
      messageTs: slackResult.ts,
      channel: centerChannel,
      leadVendor: leadVendor
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error in medalert-slack-notification:', error);
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
