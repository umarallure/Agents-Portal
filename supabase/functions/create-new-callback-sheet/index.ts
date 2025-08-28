import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Helper function to format date as M/d/yy
const formatDate = (date)=>{
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear().toString().slice(-2);
  return `${month}/${day}/${year}`;
};
// Convert column index → letter (1=A, 26=Z, 27=AA)
function numberToColumnLetter(n) {
  let s = "";
  while(n > 0){
    let m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - m) / 26);
  }
  return s;
}
// Normalize a row to a fixed length
function normalizeRow(row, length) {
  const r = [
    ...row
  ];
  while(r.length < length)r.push('');
  if (r.length > length) r.splice(length);
  return r;
}
// Google OAuth credentials
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const GOOGLE_REFRESH_TOKEN = Deno.env.get("GOOGLE_REFRESH_TOKEN");
// Spreadsheet config
const SPREADSHEET_ID = "1nd1kxEj_Vwh7WIoGWcbZ1nm425irkQmvcLiuL9-4XDY";
const SHEET_NAME = "MainSheet";
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const { leadData, callResult } = await req.json();
    if (!leadData) {
      return new Response(JSON.stringify({
        error: 'Lead data is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
      console.error('Missing Google OAuth credentials');
      return new Response(JSON.stringify({
        error: 'Google OAuth credentials not configured'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
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
    // Status mapping
    const mapStatusToSheetValue = (userSelectedStatus)=>{
      const statusMap = {
        "Needs callback": "Needs to be Fixed",
        "Call Never Sent": "Incomplete Transfer",
        "Not Interested": "Returned To Center",
        "DQ": "DQ",
        "⁠DQ": "DQ",
        "Future Submission Date": "Needs Carrier application",
        "Call Back Fix": "NO STAGE CHANGE",
        "Disconnected": "Incomplete transfer",
        "Disconnected - Never Retransferred": "Incomplete transfer"
      };
      return statusMap[userSelectedStatus] || userSelectedStatus;
    };
    // Determine status
    let finalStatus = 'New Callback';
    if (callResult) {
      if (callResult.application_submitted === true) {
        finalStatus = 'Pending Approval';
      } else if (callResult.application_submitted === false) {
        finalStatus = mapStatusToSheetValue(callResult.status || 'Not Submitted');
      }
    }
    // New row
    const newRowData = [
      callResult?.carrier ? 'TRUE' : 'FALSE',
      'FALSE',
      leadData.phone_number || '',
      leadData.lead_vendor || '',
      leadData.submission_date ? leadData.submission_date : formatDate(new Date()),
      leadData.customer_full_name || '',
      callResult?.buffer_agent || '',
      callResult?.agent_who_took_call || '',
      callResult?.licensed_agent_account || '',
      finalStatus,
      callResult?.application_submitted === true ? callResult?.sent_to_underwriting === true ? 'Underwriting' : 'Submitted' : callResult?.application_submitted === false ? 'Not Submitted' : '',
      callResult?.carrier || '',
      callResult?.product_type || '',
      callResult?.draft_date || 'N/A',
      callResult?.monthly_premium != null ? callResult.monthly_premium : 'N/A',
      callResult?.face_amount != null ? callResult.face_amount : 'N/A',
      'TRUE',
      callResult?.notes || '',
      '',
      '',
      '',
      '',
      '',
      leadData.submission_id || ''
    ];
    // Step 2: Read current sheet
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
    // Dynamic width
    const totalColumns = headerRow.length;
    const lastColLetter = numberToColumnLetter(totalColumns);
    // Normalize rows
    const fixedHeaderRow = normalizeRow(headerRow, totalColumns);
    const fixedNewRow = normalizeRow(newRowData, totalColumns);
    const fixedDataRows = dataRows.map((r)=>normalizeRow(r, totalColumns));
    const updatedData = [
      fixedHeaderRow,
      fixedNewRow,
      ...fixedDataRows
    ];
    // Step 3: Update
    const updateResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:${lastColLetter}?valueInputOption=RAW`, {
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
    return new Response(JSON.stringify({
      success: true,
      message: 'New callback entry created in Google Sheets',
      submissionId: leadData.submission_id,
      updatedCells: updateResult.updatedCells
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in create-new-callback-sheet function:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
