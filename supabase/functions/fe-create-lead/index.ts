import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const payload = await req.json();

    // Required fields validation
    const requiredFields = ['first_name', 'last_name', 'phone_number', 'state'];
    const missingFields = requiredFields.filter(field => !payload[field]);
    
    if (missingFields.length > 0) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields', 
        missing: missingFields 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Generate submission_id
    const submissionId = payload.submission_id || `FE-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const fullName = `${payload.first_name} ${payload.last_name}`;
    const leadVendor = payload.lead_vendor || null;

    // Prepare lead data
    const leadData = {
      submission_id: submissionId,
      submission_date: new Date().toISOString(),
      customer_full_name: fullName,
      street_address: payload.street_address || null,
      city: payload.city || null,
      state: payload.state || null,
      zip_code: payload.zip_code || null,
      phone_number: payload.phone_number,
      email: payload.email || null,
      date_of_birth: payload.date_of_birth || null,
      age: payload.age ? parseInt(payload.age) : null,
      social_security: payload.social_security || null,
      birth_state: payload.birth_state || null,
      driver_license: payload.driver_license || null,
      health_conditions: payload.health_conditions || null,
      carrier: payload.carrier || null,
      product_type: payload.product_type || null,
      coverage_amount: payload.coverage_amount ? parseFloat(payload.coverage_amount) : null,
      monthly_premium: payload.monthly_premium ? parseFloat(payload.monthly_premium) : null,
      draft_date: payload.draft_date || null,
      future_draft_date: payload.future_draft_date || null,
      beneficiary_routing: payload.routing_number || null,
      beneficiary_account: payload.account_number || null,
      additional_notes: payload.additional_notes || null,
      lead_vendor: leadVendor,
      buffer_agent: payload.buffer_agent || null,
      agent: payload.agent || null,
      existing_coverage: payload.existing_coverage || null,
      previous_applications: payload.previous_applications || null,
      height: payload.height || null,
      weight: payload.weight || null,
      doctors_name: payload.doctor_name || null,
      tobacco_use: payload.tobacco_use || null,
      medications: payload.medications || null,
      beneficiary_information: payload.beneficiary_information || null,
      beneficiary_phone: payload.beneficiary_phone || null,
      institution_name: payload.institution_name || null,
      account_type: payload.account_type || null,
      is_callback: payload.is_callback || false,
      is_retention_call: payload.is_retention_call || false,
      customer_buying_motives: payload.customer_buying_motives || null,
    };

    // Insert lead into database
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert(leadData)
      .select()
      .single();

    if (leadError) {
      throw new Error(leadError.message);
    }

    // Send Slack notifications if lead_vendor is provided
    if (leadVendor) {
      try {
        // Fetch center config to get slack_channel
        const { data: centerData } = await supabase
          .from('centers')
          .select('center_name, slack_channel')
          .eq('lead_vendor', leadVendor)
          .maybeSingle();

        const centerName = centerData?.center_name || leadVendor;
        const centerSlackChannel = centerData?.slack_channel || null;

        // Format date/time in EST
        const now = new Date();
        const estDateTime = new Date(now.getTime() - (4 * 60 * 60 * 1000)).toISOString();

        // Send notification to #transfer-portal
        await fetch(Deno.env.get('SUPABASE_URL') + '/functions/v1/fe-slack-notification', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify({
            channel: '#transfer-portal',
            message: `A new Application Submission :\nCall Center Name: ${centerName}\nCustomer Name: ${fullName}\nCustomer Number: ${payload.phone_number}\nDate & Time (EST) : ${estDateTime}`
          })
        });

        // Send notification to center's slack channel if configured
        if (centerSlackChannel) {
          const agentPortalUrl = `${Deno.env.get('SITE_URL') || 'https://agents-portal-zeta.vercel.app'}/call-result-update?submissionId=${submissionId}&center=${encodeURIComponent(centerName)}`;
          
          const centerMessage = `New Application Submission:\n\nSubmission ID: ${submissionId}\nCall Center Name: ${centerName}\nCustomer Name: ${fullName}\nCustomer State: ${payload.state}\nQuoted Carrier: ${payload.carrier || 'N/A'}\nDate & Time (EST): ${new Date(estDateTime).toISOString()}`;

          const centerBlocks = [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*New Application Submission:*\n\n*Submission ID:* ${submissionId}\n*Call Center Name:* ${centerName}\n*Customer Name:* ${fullName}\n*Customer State:* ${payload.state}\n*Quoted Carrier:* ${payload.carrier || 'N/A'}\n*Date & Time (EST):* ${new Date(estDateTime).toISOString()}`
              }
            },
            {
              type: "actions",
              elements: [
                {
                  type: "button",
                  text: {
                    type: "plain_text",
                    text: "Update Call Result"
                  },
                  url: agentPortalUrl,
                  style: "primary"
                }
              ]
            }
          ];
          
          await fetch(Deno.env.get('SUPABASE_URL') + '/functions/v1/fe-slack-notification', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({
              channel: centerSlackChannel,
              message: centerMessage,
              blocks: centerBlocks
            })
          });

          // Trigger notify-eligible-agents to alert agents about this new lead
          if (payload.carrier && payload.state && leadVendor) {
            try {
              console.log('[DEBUG] Calling notify-eligible-agents with:', {
                carrier: payload.carrier,
                state: payload.state,
                lead_vendor: leadVendor
              });
              
              const notifyResponse = await fetch(Deno.env.get('SUPABASE_URL') + '/functions/v1/notify-eligible-agents', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
                },
                body: JSON.stringify({
                  carrier: payload.carrier,
                  state: payload.state,
                  lead_vendor: leadVendor,
                  language: 'English'
                })
              });
              
              const notifyResult = await notifyResponse.json();
              console.log('[DEBUG] notify-eligible-agents response:', notifyResult);
            } catch (notifyError) {
              console.error('[ERROR] Error triggering notify-eligible-agents:', notifyError);
            }
          }

          // Create entry in daily_deal_flow
          await supabase.from('daily_deal_flow').insert({
            submission_id: submissionId,
            client_phone_number: payload.phone_number,
            lead_vendor: leadVendor,
            date: new Date().toISOString().split('T')[0],
            insured_name: fullName
          });
        }
      } catch (slackError) {
        console.error('Error sending Slack notifications:', slackError);
        // Don't fail the submission if Slack fails
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data: {
        submission_id: submissionId,
        lead_id: lead?.id
      }
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
