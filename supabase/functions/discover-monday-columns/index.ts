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
    const MONDAY_API_KEY = Deno.env.get('MONDAY_API_KEY');
    if (!MONDAY_API_KEY) {
      console.error('[Monday.com] MONDAY_API_KEY environment variable not set.');
      throw new Error('MONDAY_API_KEY environment variable not set.');
    }

    const BOARD_ID = "18027763264";

    console.log(`[Monday.com Discovery] Fetching all columns for board: ${BOARD_ID}`);

    const query = `query {
      boards(ids: ${BOARD_ID}) {
        id
        name
        description
        columns {
          id
          title
          type
          settings_str
        }
        items_page(limit: 1) {
          items {
            id
            name
            column_values {
              id
              text
              value
              type
            }
          }
        }
      }
    }`;
    
    console.log(`[Monday.com Discovery] Executing query...`);

    const response = await fetch("https://api.monday.com/v2", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': MONDAY_API_KEY,
      },
      body: JSON.stringify({ query })
    });

    console.log(`[Monday.com Discovery] API response status: ${response.status}`);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Monday.com Discovery] API Error Body: ${errorBody}`);
      throw new Error(`Monday.com API Error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const mondayData = await response.json();
    
    const board = mondayData.data?.boards?.[0];
    
    if (!board) {
      throw new Error('Board not found');
    }

    // Format the response for easy reading
    const result = {
      board: {
        id: board.id,
        name: board.name,
        description: board.description
      },
      columns: board.columns.map((col: any) => ({
        id: col.id,
        title: col.title,
        type: col.type,
        settings: col.settings_str
      })),
      sampleItem: board.items_page?.items?.[0] || null,
      summary: {
        totalColumns: board.columns.length,
        columnIds: board.columns.map((col: any) => col.id),
        columnTitles: board.columns.reduce((acc: any, col: any) => {
          acc[col.id] = col.title;
          return acc;
        }, {})
      }
    };

    console.log('[Monday.com Discovery] Successfully retrieved board structure');
    console.log('Column IDs:', result.summary.columnIds);

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in discover-monday-columns function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
