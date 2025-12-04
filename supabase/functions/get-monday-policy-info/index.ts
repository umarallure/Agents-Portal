import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();
    console.log(`[Monday.com] Received request for phone: ${phone}`);

    if (!phone) {
      return new Response(JSON.stringify({ error: 'Missing phone number' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const MONDAY_API_KEY = Deno.env.get('MONDAY_API_KEY');
    if (!MONDAY_API_KEY) {
      console.error('[Monday.com] MONDAY_API_KEY environment variable not set.');
      throw new Error('MONDAY_API_KEY environment variable not set.');
    }
    console.log('[Monday.com] API Key loaded successfully.');

    // Normalize phone number: remove non-digits and prepend '1'
    const normalizedPhone = `1${phone.replace(/\D/g, '')}`;
    console.log(`[Monday.com] Normalized phone to: ${normalizedPhone}`);

    const query = `query {
      items_page_by_column_values(
        board_id: 18027763264,
        columns: [{column_id: "text_mkq268v3", column_values: ["${normalizedPhone}"]}]
      ) {
        cursor
        items {
          id
          name
          column_values(ids: [
            "subitems", "text_mkw44vx", "text_mkwjexhw", "status", "date1",
            "text_mkpx3j6w", "color_mknkq2qd", "numbers", "numeric_mkw47t5d",
            "text_mknk5m2r", "color_mkp5sj20", "pulse_updated_mknkqf59",
            "color_mkq0rkaw", "text_mkwwrq3b", "text_mkq196kp", "date_mkq1d86z",
            "dropdown_mkq2x0kx", "text_mkq268v3", "date_mkw9tyc9", "date_mkw94jj0",
            "text_mkw9mq04", "text_mkxdrsg2"
          ]) {
            id
            text
            value
          }
        }
      }
    }`;
    
    console.log(`[Monday.com] Executing query...`);

    const response = await fetch("https://api.monday.com/v2", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': MONDAY_API_KEY,
      },
      body: JSON.stringify({ query })
    });

    console.log(`[Monday.com] API response status: ${response.status}`);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Monday.com] API Error Body: ${errorBody}`);
      throw new Error(`Monday.com API Error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const mondayData = await response.json();
    console.log('[Monday.com] API response data:', JSON.stringify(mondayData, null, 2));

    const items = mondayData.data?.items_page_by_column_values?.items || [];
    console.log(`[Monday.com] Found ${items.length} items.`);

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in get-monday-policy-info function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});