import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Name normalization utility
const normalizeNameVariations = (inputName: string): string[] => {
  const trimmed = inputName.trim();
  if (!trimmed) return [];

  const nameParts = trimmed.split(/\s+/);
  const variations: string[] = [];

  if (nameParts.length === 1) {
    // Single name
    variations.push(trimmed.toUpperCase());
    variations.push(trimmed.toLowerCase());
    variations.push(trimmed);
  } else if (nameParts.length === 2) {
    const [first, last] = nameParts;
    
    // Monday.com typically uses "LAST, FIRST" format
    variations.push(`${last.toUpperCase()}, ${first.toUpperCase()}`);
    variations.push(`${last.toUpperCase()},${first.toUpperCase()}`);
    
    // Also try "First Last" formats
    variations.push(`${first.toUpperCase()} ${last.toUpperCase()}`);
    variations.push(`${first} ${last}`);
    
    // Mixed case
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    variations.push(`${capitalize(last)}, ${capitalize(first)}`);
    variations.push(`${capitalize(first)} ${capitalize(last)}`);
  } else if (nameParts.length >= 3) {
    const first = nameParts[0];
    const middle = nameParts.slice(1, -1).join(' ');
    const last = nameParts[nameParts.length - 1];
    
    // With middle name
    variations.push(`${last.toUpperCase()}, ${first.toUpperCase()} ${middle.toUpperCase()}`);
    variations.push(`${last.toUpperCase()}, ${first.toUpperCase()}`);
    variations.push(`${first.toUpperCase()} ${middle.toUpperCase()} ${last.toUpperCase()}`);
    variations.push(`${first.toUpperCase()} ${last.toUpperCase()}`);
  }

  // Add original
  variations.push(trimmed);

  // Remove duplicates
  return [...new Set(variations)];
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { name } = await req.json();
    console.log(`[Monday.com Name Search] Received request for name: ${name}`);

    if (!name) {
      return new Response(JSON.stringify({ error: 'Missing name parameter' }), {
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

    // Generate name variations
    const nameVariations = normalizeNameVariations(name);
    console.log(`[Monday.com] Generated ${nameVariations.length} name variations:`, nameVariations);

    // We'll search the "text_mkw44vx" (GHL Name) column using items_page_by_column_values
    // This is more efficient and reliable than fetching all items and filtering
    
    // items_page_by_column_values only supports one value at a time for text columns generally
    
    // We will search for all variations just to be safe
    // But mostly the exact name should match what's in GHL Name column
    
    const searchValues = [name, ...nameVariations].filter((v, i, a) => a.indexOf(v) === i);
    console.log(`[Monday.com] Searching for values in GHL Name column:`, searchValues);

    let allFoundItems: any[] = [];
    
    // We can search for the first variation which is likely the most accurate
    // Or we can try to search for the raw name first
    
    // Let's create a query that searches for the primary name in the specific column
    // Note: items_page_by_column_values treats the list of values as OR usually
    
    // Use the raw name first as primary search key
    const primarySearchValue = name;
    
    const query = `query {
      items_page_by_column_values(
        limit: 50,
        board_id: 18027763264,
        columns: [{
          column_id: "text_mkw44vx",
          column_values: ["${primarySearchValue}"]
        }]
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
        'API-Version': '2023-10'
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
    
    if (mondayData.errors) {
       console.error(`[Monday.com] GraphQL Errors:`, mondayData.errors);
       // If the error is regarding column not supported, we might need to fallback?
       // But text column search is supported in 2023-10
    }

    const foundItems = mondayData.data?.items_page_by_column_values?.items || [];
    console.log(`[Monday.com] Retrieved ${foundItems.length} items from search`);
    
    // If no items found with exact name match on column, try fetching recent items from board (fallback)
    // or try searching by Name column? Monday API doesn't support searching Name column via items_page_by_column_values directly in same way easily
    
    if (foundItems.length === 0) {
      console.log('[Monday.com] No items found by exact column match. Attempting broad board fetch (first 500 items)...');
       
      // Fallback query: Fetch recent 500 items and filter in memory
      // This is what we had before but with higher limit
      const fallbackQuery = `query {
        boards(ids: 18027763264) {
          items_page(limit: 500) {
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
        }
      }`;
      
      const fallbackResponse = await fetch("https://api.monday.com/v2", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': MONDAY_API_KEY,
          'API-Version': '2023-10'
        },
        body: JSON.stringify({ query: fallbackQuery })
      });
      
      const fallbackData = await fallbackResponse.json();
      const allBoardItems = fallbackData.data?.boards?.[0]?.items_page?.items || [];
      console.log(`[Monday.com] Retrieved ${allBoardItems.length} items from fallback board fetch`);
      
      // Filter these items
      const matchedFallbackItems = allBoardItems.filter((item: any) => {
        const itemName = item.name?.trim() || '';
        const ghlNameCol = item.column_values.find((c: any) => c.id === 'text_mkw44vx');
        const ghlName = ghlNameCol ? ghlNameCol.text : '';

        // Check against name or ghl_name
         return nameVariations.some(variation => {
          const varLower = variation.toLowerCase();
          
          // Check Item Name
          if (itemName.toLowerCase().includes(varLower) || varLower.includes(itemName.toLowerCase())) return true;
          
          // Check GHL Name Column
          if (ghlName && (ghlName.toLowerCase().includes(varLower) || varLower.includes(ghlName.toLowerCase()))) return true;
          
          return false;
        });
      });
      
      console.log(`[Monday.com] Found ${matchedFallbackItems.length} items via fallback in-memory filtering`);
      allFoundItems = matchedFallbackItems;
    } else {
      allFoundItems = foundItems;
    }

    return new Response(JSON.stringify({ items: allFoundItems }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in get-monday-policy-by-name function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
