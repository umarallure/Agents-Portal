import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
// Google OAuth credentials
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const GOOGLE_REFRESH_TOKEN = Deno.env.get("GOOGLE_REFRESH_TOKEN");
// Hardcoded spreadsheet ID and sheet name
const SPREADSHEET_ID = "1nd1kxEj_Vwh7WIoGWcbZ1nm425irkQmvcLiuL9-4XDY";
const SHEET_NAME = "MainSheet";
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const { submissionId, callResult } = await req.json();
    if (!submissionId || !callResult) {
      throw new Error("submissionId and callResult are required");
    }
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
      throw new Error("Google OAuth credentials not configured");
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
    const rows = readData.values || [];
    // Step 3: Find the row with matching submissionId (column X, index 23)
    let rowIndex = -1;
    for(let i = 1; i < rows.length; i++){
      if (rows[i][23] === submissionId) {
        rowIndex = i + 1; // Sheets are 1-indexed
        break;
      }
    }
    if (rowIndex === -1) {
      throw new Error(`Submission ID ${submissionId} not found in spreadsheet`);
    }
    // Status mapping function (same as create-new-callback-sheet)
    const mapStatusToSheetValue = (userSelectedStatus)=>{
      const statusMap = {
        "Needs callback": "Needs to be Fixed",
        "Call Never Sent": "Incomplete Transfer",
        "Not Interested": "Returned To Center",
        "DQ": "DQ'd Can't be sold",
        "⁠DQ": "DQ'd Can't be sold",
        "Future Submission Date": "Needs Carrier Application",
        "Call Back Fix": "Call Back Fix",
        "Disconnected": "Incomplete Transfer",
        "Disconnected - Never Retransferred": "Incomplete Transfer"
      };
      return statusMap[userSelectedStatus] || userSelectedStatus;
    };
    // Determine status based on call result data (same logic as create-new-callback-sheet)
    let finalStatus = "";
    if (callResult.application_submitted === true) {
      finalStatus = callResult.sent_to_underwriting === true ? "Pending Approval" : "Pending Approval";
    } else if (callResult.application_submitted === false) {
      finalStatus = mapStatusToSheetValue(callResult.status || 'Not Submitted');
    }
    // Determine call result status
    let callResultStatus = "";
    if (callResult.application_submitted === true) {
      callResultStatus = callResult.sent_to_underwriting === true ? "Underwriting" : "Submitted";
    } else if (callResult.application_submitted === false) {
      callResultStatus = "Not Submitted";
    }
    // Prepare notes with existing content
    const existingNotes = rows[rowIndex - 1][17] || ""; // Column R (Notes) is index 17
    const updatedNotes = [
      existingNotes,
      callResult.notes || ""
    ].filter(Boolean).join(" | ");
    // Step 4: Prepare individual cell updates for specific columns
    // Column mapping: G=6, H=7, I=8, J=9, K=10, L=11, M=12, N=13, O=14, P=15, Q=16, R=17
    const updates = [
      {
        range: `${SHEET_NAME}!G${rowIndex}`,
        values: [
          [
            callResult.buffer_agent || ""
          ]
        ]
      },
      {
        range: `${SHEET_NAME}!H${rowIndex}`,
        values: [
          [
            callResult.agent_who_took_call || ""
          ]
        ]
      },
      {
        range: `${SHEET_NAME}!I${rowIndex}`,
        values: [
          [
            callResult.licensed_agent_account || ""
          ]
        ]
      },
      {
        range: `${SHEET_NAME}!J${rowIndex}`,
        values: [
          [
            finalStatus
          ]
        ]
      },
      {
        range: `${SHEET_NAME}!K${rowIndex}`,
        values: [
          [
            callResultStatus
          ]
        ]
      },
      {
        range: `${SHEET_NAME}!L${rowIndex}`,
        values: [
          [
            callResult.carrier || "N/A"
          ]
        ]
      },
      {
        range: `${SHEET_NAME}!M${rowIndex}`,
        values: [
          [
            callResult.product_type || "N/A"
          ]
        ]
      },
      {
        range: `${SHEET_NAME}!N${rowIndex}`,
        values: [
          [
            callResult.draft_date || "N/A"
          ]
        ]
      },
      {
        range: `${SHEET_NAME}!O${rowIndex}`,
        values: [
          [
            callResult.monthly_premium != null ? callResult.monthly_premium : "N/A"
          ]
        ]
      },
      {
        range: `${SHEET_NAME}!P${rowIndex}`,
        values: [
          [
            callResult.face_amount != null ? callResult.face_amount : "N/A"
          ]
        ]
      },
      {
        range: `${SHEET_NAME}!Q${rowIndex}`,
        values: [
          [
            rows[rowIndex - 1][16] || "FALSE"
          ]
        ]
      },
      {
        range: `${SHEET_NAME}!R${rowIndex}`,
        values: [
          [
            updatedNotes
          ]
        ]
      }
    ];
    // Step 5: Batch update all cells
    const batchUpdateResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        valueInputOption: "RAW",
        data: updates
      })
    });
    if (!batchUpdateResponse.ok) {
      const errText = await batchUpdateResponse.text();
      throw new Error(`Failed to update spreadsheet: ${errText}`);
    }
    const updateResult = await batchUpdateResponse.json();
    console.log(`Successfully updated row ${rowIndex} for submission ID: ${submissionId}`);
    return new Response(JSON.stringify({
      success: true,
      updatedCells: updateResult.totalUpdatedCells,
      rowIndex,
      submissionId,
      finalStatus,
      callResultStatus
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error in google-sheets-update:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
