import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { v4 as uuidv4 } from 'uuid';

// Supabase configuration - will be initialized in main()
let supabase: any = null;

// CSV Column mapping - Update this based on your CSV headers
const COLUMN_MAPPING = {
  // CSV Column Name -> daily_deal_flow Column Name
  'SubmissionId': 'submission_id',
  'Date': 'date',
  'INSURED NAME': 'insured_name',
  'Lead Vender': 'lead_vendor',
  'Client Phone Number': 'client_phone_number',
  'Buffer Agent': 'buffer_agent',
  'Agent': 'agent',
  'Licensed agent account': 'licensed_agent_account',
  'Status': 'status',
  'Call Result': 'call_result',
  'Carrier': 'carrier',
  'Product Type': 'product_type',
  'Draft Date': 'draft_date',
  'MP': 'monthly_premium',
  'Face amount': 'face_amount',
  'From Callback?': 'from_callback',
  'Notes': 'notes',
  'Policy Number': 'policy_number',
  'Carrier Audit': 'carrier_audit',
  'ProductTypeCarrier': 'product_type_carrier',
  'Level Or GI': 'level_or_gi'
};

function generateRandomSubmissionId(): string {
  return `IMPORT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function fixDuplicateSubmissionIds(batch: any[]): Promise<any[]> {
  // When there are duplicates, regenerate ALL submission_ids in the batch to ensure uniqueness
  console.log(`Regenerating all submission_ids in batch to avoid conflicts...`);
  return batch.map(record => ({
    ...record,
    submission_id: generateRandomSubmissionId()
  }));
}

function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.toLowerCase() === 'n/a' || dateStr.trim() === '') {
    return null;
  }

  // Handle MM/DD/YYYY format specifically
  const dateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dateMatch) {
    const [, month, day, year] = dateMatch;
    // Format as YYYY-MM-DD directly to avoid timezone issues
    const monthPadded = month.padStart(2, '0');
    const dayPadded = day.padStart(2, '0');
    return `${year}-${monthPadded}-${dayPadded}`;
  }

  // Fallback to original method for other formats
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    console.warn(`Invalid date format: ${dateStr}`);
    return null;
  }

  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

function parseBoolean(value: string): boolean | null {
  if (!value || value.toLowerCase() === 'n/a' || value.trim() === '') {
    return null;
  }

  const lowerValue = value.toLowerCase().trim();
  if (lowerValue === 'true' || lowerValue === 'yes' || lowerValue === '1') {
    return true;
  }
  if (lowerValue === 'false' || lowerValue === 'no' || lowerValue === '0') {
    return false;
  }

  return null;
}

function parseNumber(value: string): number | null {
  if (!value || value.toLowerCase() === 'n/a' || value.trim() === '') {
    return null;
  }

  const num = parseFloat(value.replace(/[$,]/g, ''));
  return isNaN(num) ? null : num;
}

function transformRow(csvRow: any): any {
  const transformedRow: any = {};

  // Map CSV columns to database columns
  for (const [csvColumn, dbColumn] of Object.entries(COLUMN_MAPPING)) {
    const csvValue = csvRow[csvColumn];

    if (csvValue === undefined || csvValue === null) {
      // Column doesn't exist in CSV, set to null
      transformedRow[dbColumn] = null;
      continue;
    }

    const stringValue = String(csvValue).trim();

    // Handle different data types based on column
    switch (dbColumn) {
      case 'submission_id':
        transformedRow[dbColumn] = stringValue || generateRandomSubmissionId();
        break;

      case 'date':
      case 'draft_date':
        transformedRow[dbColumn] = parseDate(stringValue);
        break;

      case 'from_callback':
        transformedRow[dbColumn] = parseBoolean(stringValue);
        break;

      case 'monthly_premium':
      case 'face_amount':
        transformedRow[dbColumn] = parseNumber(stringValue);
        break;

      default:
        // Text fields - replace empty/N/A with null
        transformedRow[dbColumn] = (stringValue.toLowerCase() === 'n/a' || stringValue === '')
          ? null
          : stringValue;
        break;
    }
  }

  // Set default values for required fields
  if (!transformedRow.submission_id) {
    transformedRow.submission_id = generateRandomSubmissionId();
  }

  // Set current timestamp for created_at/updated_at
  transformedRow.created_at = new Date().toISOString();
  transformedRow.updated_at = new Date().toISOString();

  return transformedRow;
}

async function importCSV(csvFilePath: string): Promise<void> {
  try {
    console.log('Reading CSV file...');

    // Read CSV file
    const csvContent = fs.readFileSync(csvFilePath, 'utf-8');

    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    console.log(`Found ${records.length} rows in CSV`);

    if (records.length === 0) {
      console.log('No data to import');
      return;
    }

    // Show CSV columns for verification
    const csvColumns = Object.keys(records[0]);
    console.log('CSV Columns:', csvColumns);

    // Transform data
    const transformedData = records.map(transformRow);

    console.log('Sample transformed row:', JSON.stringify(transformedData[0], null, 2));
    console.log(`Transformed ${transformedData.length} rows successfully`);

    // Import in batches to avoid timeout
    const batchSize = 100; // Full batch size
    let importedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < transformedData.length; i += batchSize) {
      const batch = transformedData.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1} with ${batch.length} records`);

      try {
        const { data, error } = await supabase
          .from('daily_deal_flow')
          .insert(batch)
          .select();

        if (error) {
          if (error.code === '23505' && error.message.includes('submission_id')) {
            // Handle duplicate submission_id by generating new ones
            console.log(`Handling duplicates in batch ${Math.floor(i/batchSize) + 1}, regenerating submission_ids...`);
            const fixedBatch = await fixDuplicateSubmissionIds(batch);
            const { data: retryData, error: retryError } = await supabase
              .from('daily_deal_flow')
              .insert(fixedBatch)
              .select();

            if (retryError) {
              console.error(`Error importing fixed batch ${Math.floor(i/batchSize) + 1}:`, retryError);
              errorCount += batch.length;
            } else {
              importedCount += batch.length;
              console.log(`✅ Imported fixed batch ${Math.floor(i/batchSize) + 1}: ${batch.length} records`);
            }
          } else {
            console.error(`Error importing batch ${Math.floor(i/batchSize) + 1}:`, error);
            errorCount += batch.length;
          }
        } else {
          importedCount += batch.length;
          console.log(`✅ Imported batch ${Math.floor(i/batchSize) + 1}: ${batch.length} records`);
        }
      } catch (batchError) {
        console.error(`Batch ${Math.floor(i/batchSize) + 1} failed:`, batchError);
        errorCount += batch.length;
      }
    }

    console.log(`\nImport completed:`);
    console.log(`✅ Successfully imported: ${importedCount} records`);
    console.log(`❌ Failed to import: ${errorCount} records`);
    console.log(`📊 Total processed: ${records.length} records`);

  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
}

// Main execution
async function main() {
  const csvFilePath = process.argv[2];

  if (!csvFilePath) {
    console.error('Usage: npm run import-csv <path-to-csv-file>');
    console.error('Example: npm run import-csv ./data/daily_deal_flow_data.csv');
    process.exit(1);
  }

  if (!fs.existsSync(csvFilePath)) {
    console.error(`CSV file not found: ${csvFilePath}`);
    process.exit(1);
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase environment variables');
    console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Initialize Supabase client
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    await importCSV(csvFilePath);
    console.log('\n🎉 Import completed successfully!');
  } catch (error) {
    console.error('\n💥 Import failed:', error);
    process.exit(1);
  }
}

// Call main directly
main().catch(console.error);

export { importCSV, transformRow, COLUMN_MAPPING };