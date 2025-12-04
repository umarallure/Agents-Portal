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

    // We'll search the "name" field of items in the board
    // Monday.com's item "name" is the main identifier
    // We need to search through all items and filter by name
    
    // First, try direct name match in the query
    const primaryVariation = nameVariations[0];
    
    const query = `query {
      boards(ids: 18027763264) {
        items_page {
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
    console.log('[Monday.com] API response received');

    const allItems = mondayData.data?.boards?.[0]?.items_page?.items || [];
    console.log(`[Monday.com] Retrieved ${allItems.length} total items from board`);

    // Filter items by name variations
    const matchedItems = allItems.filter((item: any) => {
      const itemName = item.name?.trim() || '';
      
      // Check if item name matches any of our variations
      return nameVariations.some(variation => {
        const varLower = variation.toLowerCase();
        const itemLower = itemName.toLowerCase();
        
        // Exact match
        if (itemLower === varLower) return true;
        
        // Contains match
        if (itemLower.includes(varLower) || varLower.includes(itemLower)) return true;
        
        // Fuzzy match - compare parts
        const itemParts = itemName.split(/[\s,]+/).filter(p => p.length > 0);
        const varParts = variation.split(/[\s,]+/).filter(p => p.length > 0);
        
        // Check if all parts from variation exist in item name (or vice versa)
        const allVarPartsInItem = varParts.every(vp => 
          itemParts.some(ip => ip.toLowerCase() === vp.toLowerCase())
        );
        const allItemPartsInVar = itemParts.every(ip => 
          varParts.some(vp => vp.toLowerCase() === ip.toLowerCase())
        );
        
        return allVarPartsInItem || allItemPartsInVar;
      });
    });

    console.log(`[Monday.com] Found ${matchedItems.length} matching items after filtering`);

    return new Response(JSON.stringify({ items: matchedItems }), {
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
