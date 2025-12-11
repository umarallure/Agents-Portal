/**
 * Monday.com Retention API Integration
 * 
 * Fetches policy data filtering by GHL Name
 * API Endpoint: https://api.monday.com/v2
 * Authentication: Bearer token in Authorization header
 */

const MONDAY_API_ENDPOINT = 'https://api.monday.com/v2';
const MONDAY_API_TOKEN = import.meta.env.VITE_MONDAY_API_TOKEN || '';
const DEFAULT_BOARD_ID = import.meta.env.VITE_MONDAY_RETENTION_BOARD_ID || '18027763264';

// Column IDs based on PolicyLookupSection.tsx
// These can be overridden if the board structure changes
export const MONDAY_COLUMNS = {
  GHL_NAME: 'text_mkw44vx',
  POLICY_NUMBER: 'text_mkpx3j6w',
  CARRIER: 'color_mknkq2qd',
  PREMIUM: 'numbers',
  AGENT: 'color_mkq0rkaw',
  STATUS: 'status',
  PRODUCT_TYPE: 'text_mkxdrsg2',
  PHONE: 'text_mkq268v3',
  VENDOR: 'dropdown_mkq2x0kx', // Call Center
  WRITING_NUMBER: 'text_mkwwrq3b'
};

export interface MondayPolicyItem {
  id: string;
  name: string; // Item Name (usually same as GHL Name or similar)
  ghl_name?: string;
  policy_number?: string;
  carrier?: string;
  premium?: string;
  agent?: string;
  status?: string;
  product_type?: string;
  phone?: string;
  vendor?: string;
  writing_number?: string;
  raw_columns: Record<string, string>;
}

interface BoardItem {
  id: string;
  name: string;
  column_values: Array<{
    id: string;
    text: string;
    value: string;
  }>;
}

/**
 * Fetches items filtered by GHL Name using items_page_by_column_values
 * 
 * @param ghlNames - List of GHL Names to filter by
 * @param boardId - The Monday.com board ID
 */
export async function fetchPoliciesByGhlName(
  ghlNames: string[],
  boardId: string = DEFAULT_BOARD_ID
): Promise<MondayPolicyItem[]> {
  if (!ghlNames || ghlNames.length === 0) return [];
  
  console.log(`[Monday Retention API] Fetching items for names: ${ghlNames.join(', ')} from board: ${boardId}`);
  
  // Monday API items_page_by_column_values only supports one value at a time for some column types,
  // or a list for others. For text columns, it usually supports exact match.
  // We might need to make parallel requests if we have multiple names and the API doesn't support OR logic easily in one go for text columns.
  // However, let's try passing the list. If it fails or only returns one, we might need to loop.
  // Documentation says: "column_values: A list of values to search for."
  
  let allItems: BoardItem[] = [];
  
  // We'll fetch for each name to be safe, or try to batch if possible.
  // For simplicity and reliability with text columns, let's fetch for each name in parallel.
  
  const promises = ghlNames.map(async (name) => {
    let cursor: string | null = null;
    let pageItems: BoardItem[] = [];
    
    do {
      const query = cursor 
        ? `
          query {
            items_page_by_column_values(
              limit: 500
              board_id: ${boardId}
              cursor: "${cursor}"
            ) {
              cursor
              items {
                id
                name
                column_values {
                  id
                  text
                  value
                }
              }
            }
          }
        `
        : `
          query {
            items_page_by_column_values(
              limit: 500
              board_id: ${boardId}
              columns: [{
                column_id: "${MONDAY_COLUMNS.GHL_NAME}"
                column_values: ["${name}"]
              }]
            ) {
              cursor
              items {
                id
                name
                column_values {
                  id
                  text
                  value
                }
              }
            }
          }
        `;

      try {
        const response = await fetch(MONDAY_API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Authorization': MONDAY_API_TOKEN,
            'Content-Type': 'application/json',
            'API-Version': '2023-10',
          },
          body: JSON.stringify({ query }),
        });

        if (!response.ok) {
          throw new Error(`Monday.com API request failed: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.errors) {
          console.error('Monday API Errors:', result.errors);
          throw new Error(result.errors[0].message);
        }

        const data = result.data?.items_page_by_column_values;
        if (data) {
          pageItems = pageItems.concat(data.items || []);
          cursor = data.cursor;
        } else {
          cursor = null;
        }
      } catch (error) {
        console.error(`Error fetching for name ${name}:`, error);
        cursor = null;
      }
    } while (cursor);
    
    return pageItems;
  });

  const results = await Promise.all(promises);
  allItems = results.flat();

  // Deduplicate by ID
  const uniqueItems = Array.from(new Map(allItems.map(item => [item.id, item])).values());

  return uniqueItems.map(parseBoardItem);
}

function parseBoardItem(item: BoardItem): MondayPolicyItem {
  const columns: Record<string, string> = {};
  
  item.column_values.forEach(col => {
    columns[col.id] = col.text;
  });

  return {
    id: item.id,
    name: item.name,
    ghl_name: columns[MONDAY_COLUMNS.GHL_NAME],
    policy_number: columns[MONDAY_COLUMNS.POLICY_NUMBER],
    carrier: columns[MONDAY_COLUMNS.CARRIER],
    premium: columns[MONDAY_COLUMNS.PREMIUM],
    agent: columns[MONDAY_COLUMNS.AGENT],
    status: columns[MONDAY_COLUMNS.STATUS],
    product_type: columns[MONDAY_COLUMNS.PRODUCT_TYPE],
    phone: columns[MONDAY_COLUMNS.PHONE],
    vendor: columns[MONDAY_COLUMNS.VENDOR],
    writing_number: columns[MONDAY_COLUMNS.WRITING_NUMBER],
    raw_columns: columns
  };
}
