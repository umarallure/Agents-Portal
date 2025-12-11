
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env file
const envPath = path.resolve(__dirname, '../.env');
let MONDAY_API_TOKEN = '';
let BOARD_ID = '18027763264';

try {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const match = line.match(/^VITE_MONDAY_API_TOKEN=(.*)$/);
    if (match) {
      MONDAY_API_TOKEN = match[1].trim();
    }
    const matchBoard = line.match(/^VITE_MONDAY_RETENTION_BOARD_ID=(.*)$/);
    if (matchBoard) {
      BOARD_ID = matchBoard[1].trim();
    }
  }
} catch (e) {
  console.error('Error reading .env file:', e);
  process.exit(1);
}

if (!MONDAY_API_TOKEN) {
  console.error('VITE_MONDAY_API_TOKEN not found in .env');
  process.exit(1);
}

const MONDAY_API_ENDPOINT = 'https://api.monday.com/v2';
const TEST_NAME = "Myles Mcswiney";

// Column IDs (copied from src/lib/mondayRetentionApi.ts)
const MONDAY_COLUMNS = {
  GHL_NAME: 'text_mkw44vx',
  POLICY_NUMBER: 'text_mkpx3j6w',
  CARRIER: 'color_mknkq2qd',
  PREMIUM: 'numbers',
  AGENT: 'color_mkq0rkaw',
  STATUS: 'status',
  PRODUCT_TYPE: 'text_mkxdrsg2',
  PHONE: 'text_mkq268v3',
  VENDOR: 'dropdown_mkq2x0kx'
};

async function testMondayRetention() {
  console.log(`Testing Monday.com API for name: "${TEST_NAME}"`);
  console.log(`Board ID: ${BOARD_ID}`);
  
  const query = `
    query {
      items_page_by_column_values(
        limit: 50
        board_id: ${BOARD_ID}
        columns: [{
          column_id: "${MONDAY_COLUMNS.GHL_NAME}"
          column_values: ["${TEST_NAME}"]
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
      throw new Error(`Monday.com API request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result.errors) {
      console.error('Monday API Errors:', JSON.stringify(result.errors, null, 2));
      return;
    }

    const items = result.data?.items_page_by_column_values?.items || [];
    console.log(`Found ${items.length} items.`);

    items.forEach((item: any) => {
      console.log('\n--- Item Found ---');
      console.log(`ID: ${item.id}`);
      console.log(`Name: ${item.name}`);
      
      const columns: Record<string, string> = {};
      item.column_values.forEach((col: any) => {
        columns[col.id] = col.text;
      });

      console.log(`GHL Name: ${columns[MONDAY_COLUMNS.GHL_NAME]}`);
      console.log(`Policy #: ${columns[MONDAY_COLUMNS.POLICY_NUMBER]}`);
      console.log(`Carrier: ${columns[MONDAY_COLUMNS.CARRIER]}`);
      console.log(`Premium: ${columns[MONDAY_COLUMNS.PREMIUM]}`);
      console.log(`Agent: ${columns[MONDAY_COLUMNS.AGENT]}`);
      console.log(`Status: ${columns[MONDAY_COLUMNS.STATUS]}`);
      console.log(`Product: ${columns[MONDAY_COLUMNS.PRODUCT_TYPE]}`);
      console.log(`Vendor: ${columns[MONDAY_COLUMNS.VENDOR]}`);
    });

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testMondayRetention();
