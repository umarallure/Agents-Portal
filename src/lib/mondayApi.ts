/**
 * Monday.com API Integration
 * 
 * Fetches policy placement data using items_page_by_column_values
 * API Endpoint: https://api.monday.com/v2
 * Authentication: Bearer token in Authorization header
 */

const MONDAY_API_ENDPOINT = 'https://api.monday.com/v2';
const MONDAY_API_TOKEN = import.meta.env.VITE_MONDAY_API_TOKEN || '';
const BOARD_ID = import.meta.env.VITE_MONDAY_BOARD_ID || '18027763264';

interface BoardItem {
  id: string;
  name: string;
  column_values?: Array<{
    id: string;
    text: string;
    value: string;
  }>;
}

interface ParsedPolicyItem extends BoardItem {}

interface ItemsPageResponse {
  cursor: string | null;
  items: BoardItem[];
}

/**
 * Fetches items filtered by Sales Agent using items_page_by_column_values
 * 
 * @param salesAgent - Sales agent name to filter by (e.g., "Isaac Reed")
 * @param boardId - The Monday.com board ID (defaults to 8595002703)
 * @param limit - Items per page (default 500, max 500)
 */
export async function fetchBoardItems(
  salesAgent?: string,
  boardId: string = BOARD_ID,
  limit: number = 500
): Promise<ParsedPolicyItem[]> {
  console.log(`[Monday API] Fetching items from board: ${boardId}${salesAgent ? ` filtered by agent: ${salesAgent}` : ''}`);
  
  let allItems: BoardItem[] = [];
  let cursor: string | null = null;
  let pageCount = 0;

  do {
    pageCount++;
    console.log(`[Monday API] Fetching page ${pageCount}${cursor ? ` (cursor: ${cursor.substring(0, 20)}...)` : ' (first page)'}`);

    let query: string;
    
    if (salesAgent && salesAgent !== 'all') {
      // Filter by sales agent using items_page_by_column_values
      // IMPORTANT: Only include 'columns' on first request, 'cursor' on subsequent requests
      if (cursor) {
        // Paginated request - cursor only (but board_id still required!)
        query = `
          query {
            items_page_by_column_values(
              limit: ${limit}
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
        `;
      } else {
        // Initial request - columns filter only
        query = `
          query {
            items_page_by_column_values(
              limit: ${limit}
              board_id: ${boardId}
              columns: [{
                column_id: "color_mkq0rkaw"
                column_values: ["${salesAgent}"]
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
      }
    } else {
      // Fetch all items without filter
      query = `
        query {
          boards(ids: [${boardId}]) {
            items_page(limit: ${limit}${cursor ? `, cursor: "${cursor}"` : ''}) {
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
        }
      `;
    }

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
        throw new Error(`Monday.com API request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (result.errors && result.errors.length > 0) {
        console.error('Monday.com API Errors:', result.errors);
        throw new Error(result.errors[0].message);
      }

      let itemsPage: ItemsPageResponse | null = null;

      if (salesAgent && salesAgent !== 'all') {
        itemsPage = result.data?.items_page_by_column_values;
      } else {
        itemsPage = result.data?.boards?.[0]?.items_page;
      }

      if (!itemsPage) {
        console.warn('[Monday API] No items_page found in response');
        break;
      }

      const items = itemsPage.items || [];
      console.log(`[Monday API] Page ${pageCount}: fetched ${items.length} items`);
      
      allItems = allItems.concat(items);
      cursor = itemsPage.cursor;

      // If no cursor returned or no items, we're done
      if (!cursor || items.length === 0) {
        break;
      }

    } catch (error) {
      console.error('Monday.com API Error:', error);
      throw error;
    }

  } while (cursor);

  console.log(`[Monday API] ✓ Fetched total of ${allItems.length} items across ${pageCount} pages`);

  return allItems as ParsedPolicyItem[];
}

/**
 * Type guard to check if Monday.com API token is configured
 */
export function isMondayApiConfigured(): boolean {
  return !!MONDAY_API_TOKEN && MONDAY_API_TOKEN.length > 0;
}

/**
 * Get the configured board ID
 */
export function getBoardId(): string {
  return BOARD_ID;
}

export type { BoardItem, ParsedPolicyItem };
