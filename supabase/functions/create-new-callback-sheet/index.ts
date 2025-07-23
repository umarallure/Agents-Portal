import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to format date as M/d/yy
const formatDate = (date: Date): string => {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear().toString().slice(-2);
  return `${month}/${day}/${year}`;
}

// Google OAuth credentials (same as your existing function)
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const GOOGLE_REFRESH_TOKEN = Deno.env.get("GOOGLE_REFRESH_TOKEN");

// Hardcoded spreadsheet ID and sheet name (same as your existing function)
const SPREADSHEET_ID = "1nd1kxEj_Vwh7WIoGWcbZ1nm425irkQmvcLiuL9-4XDY";
const SHEET_NAME = "MainSheet";

interface LeadData {
  submission_id: string;
  submission_date: string;
  customer_full_name: string;
  phone_number: string;
  email?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  date_of_birth?: string;
  age?: number;
  social_security?: string;
  health_conditions?: string;
  lead_vendor: string;
  additional_notes?: string;
}

interface CallResultData {
  application_submitted?: boolean;
  status?: string;
  buffer_agent?: string;
  agent_who_took_call?: string;
  licensed_agent_account?: string;
  carrier?: string;
  product_type?: string;
  draft_date?: string;
  monthly_premium?: number;
  face_amount?: number;
  notes?: string;
  sent_to_underwriting?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { leadData, callResult }: { leadData: LeadData; callResult?: CallResultData } = await req.json()

    if (!leadData) {
      return new Response(
        JSON.stringify({ error: 'Lead data is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
      console.error('Missing Google OAuth credentials')
      return new Response(
        JSON.stringify({ error: 'Google OAuth credentials not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Step 1: Get access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: GOOGLE_REFRESH_TOKEN,
        grant_type: "refresh_token"
      })
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      throw new Error(`Failed to refresh access token: ${errText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Prepare the row data for Google Sheets
    // Map to your exact sheet structure (24 columns A-X):
    // A: Found in Carrier?, B: Updated in GHL?, C: Client Phone Number, D: Lead Vender, E: Date, F: INSURED NAME, 
    // G: Buffer Agent, H: Agent, I: Licensed agent account, J: Status, K: Call Result, L: Carrier, 
    // M: Product Type, N: Draft Date, O: MP, P: Face amount, Q: From Callback?, R: Notes, 
    // S: Policy Number, T: Carrier Audit, U: ProductTypeCarrier, V: Level Or GI, W: LeadCode, X: SubmissionId
    
    // Status mapping function
    const mapStatusToSheetValue = (userSelectedStatus: string): string => {
      const statusMap: { [key: string]: string } = {
        "Needs callback": "Needs to be Fixed",
        "Call Never Sent":"Incomplete Transfer",
        "Not Interested": "Returned To Center", 
        "DQ": "DQ",
        "⁠DQ": "DQ", // Handle the special character version
        "Future Submission Date": "Needs Carrier application",
        "Call Back Fix": "NO STAGE CHANGE",
        "Disconnected": "Incomplete transfer",
        "Disconnected - Never Retransferred": "Incomplete transfer"
      };
      
      return statusMap[userSelectedStatus] || userSelectedStatus;
    };
    
    // Determine status based on call result data
    let finalStatus = 'New Callback'; // Default for new callbacks
    if (callResult) {
      if (callResult.application_submitted === true) {
        finalStatus = 'Pending Approval'; // Will be "Underwriting" or "Submitted"
      } else if (callResult.application_submitted === false) {
        // Map the user-selected status to the sheet value
        finalStatus = mapStatusToSheetValue(callResult.status || 'Not Submitted');
      }
    }

    const newRowData = [
      callResult?.carrier ? 'TRUE' : 'FALSE', // A: Found in Carrier?
      'FALSE', // B: Updated in GHL?
      leadData.phone_number || '', // C: Client Phone Number
      leadData.lead_vendor || '', // D: Lead Vender
      leadData.submission_date ? leadData.submission_date : formatDate(new Date()), // E: Date
      leadData.customer_full_name || '', // F: INSURED NAME
      callResult?.buffer_agent || '', // G: Buffer Agent
      callResult?.agent_who_took_call || '', // H: Agent
      callResult?.licensed_agent_account || '', // I: Licensed agent account
      finalStatus, // J: Status
      callResult?.application_submitted === true 
        ? (callResult?.sent_to_underwriting === true ? 'Underwriting' : 'Submitted')
        : callResult?.application_submitted === false 
          ? 'Not Submitted' 
          : '', // K: Call Result
      callResult?.carrier || '', // L: Carrier
      callResult?.product_type || '', // M: Product Type
      callResult?.draft_date || 'N/A', // N: Draft Date
      callResult?.monthly_premium != null ? callResult.monthly_premium : 'N/A', // O: MP
      callResult?.face_amount != null ? callResult.face_amount : 'N/A', // P: Face amount
      'TRUE', // Q: From Callback?
      [
        leadData.additional_notes || '',
        callResult?.notes || '',
        leadData.email ? `Email: ${leadData.email}` : '',
        leadData.street_address ? `Address: ${leadData.street_address}` : '',
        leadData.city && leadData.state ? `${leadData.city}, ${leadData.state}` : '',
        leadData.zip_code ? `ZIP: ${leadData.zip_code}` : '',
        leadData.date_of_birth ? `DOB: ${leadData.date_of_birth}` : '',
        leadData.age ? `Age: ${leadData.age}` : '',
        leadData.social_security ? `SSN: ${leadData.social_security}` : '',
        leadData.health_conditions ? `Health: ${leadData.health_conditions}` : ''
      ].filter(Boolean).join(' | '), // R: Notes
      '', // S: Policy Number
      '', // T: Carrier Audit
      '', // U: ProductTypeCarrier
      '', // V: Level Or GI
      '', // W: LeadCode
      leadData.submission_id || '' // X: SubmissionId
    ]

    // Debug: Log array length to ensure it's exactly 24 elements
    console.log(`newRowData length: ${newRowData.length}`);
    if (newRowData.length !== 24) {
      console.warn(`Expected 24 columns but got ${newRowData.length}. This may cause column alignment issues.`);
    }

    // Ensure we have exactly 24 elements (trim or pad if necessary)
    while (newRowData.length < 24) {
      newRowData.push('');
    }
    if (newRowData.length > 24) {
      newRowData.splice(24);
    }

    // Step 2: Read current sheet data
    const readResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!readResponse.ok) {
      const errorText = await readResponse.text();
      throw new Error(`Failed to read spreadsheet: ${errorText}`);
    }

    const readData = await readResponse.json();
    const existingRows = readData.values || [];
    const headerRow = existingRows[0] || [];
    const dataRows = existingRows.slice(1) || [];
    
    // Insert new row at the top of data (position 2, after header)
    const updatedData = [headerRow, newRowData, ...dataRows];

    // Step 3: Update the entire sheet with new data (limit to columns A-X)
    const updateResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:X?valueInputOption=RAW`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        values: updatedData
      })
    });

    if (!updateResponse.ok) {
      const errText = await updateResponse.text();
      throw new Error(`Failed to update spreadsheet: ${errText}`);
    }

    const updateResult = await updateResponse.json();

    console.log('Successfully created new callback entry in Google Sheets');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'New callback entry created in Google Sheets',
        submissionId: leadData.submission_id,
        updatedCells: updateResult.updatedCells 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in create-new-callback-sheet function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
