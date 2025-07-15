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
const SHEET_NAME = "AgentPortalSheetTesting";

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { submissionId, callResult }: { submissionId: string; callResult: CallResultData } = await req.json();

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
    for (let i = 1; i < rows.length; i++) { // Start from 1 to skip header
      if (rows[i][23] === submissionId) { // Column X (SubmissionId) is index 23
        rowIndex = i + 1; // Sheets are 1-indexed
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error(`Submission ID ${submissionId} not found in spreadsheet`);
    }

    // Status mapping function (same as create-new-callback-sheet)
    const mapStatusToSheetValue = (userSelectedStatus: string): string => {
      const statusMap: { [key: string]: string } = {
        "Needs callback": "Needs to be Fixed",
        "Not Interested": "Return to Center",
        "DQ": "DQ",
        "⁠DQ": "DQ", // Handle the special character version
        "Future Submission Date": "Needs Carrier application",
        "Call Back Fix": "NO STAGE CHANGE",
        "Disconnected": "Incomplete transfer",
        "Disconnected - Never Retransferred": "Incomplete transfer"
      };
      
      return statusMap[userSelectedStatus] || userSelectedStatus;
    };

    // Determine status based on call result data (same logic as create-new-callback-sheet)
    let finalStatus = "";
    if (callResult.application_submitted === true) {
      finalStatus = callResult.sent_to_underwriting === true ? "Underwriting" : "Submitted";
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
    const updatedNotes = [existingNotes, callResult.notes || ""].filter(Boolean).join(" | ");

    // Step 4: Prepare individual cell updates for specific columns
    // Column mapping: G=6, H=7, I=8, J=9, K=10, L=11, M=12, N=13, O=14, P=15, Q=16, R=17
    const updates = [
      {
        range: `${SHEET_NAME}!G${rowIndex}`, // Buffer Agent
        values: [[callResult.buffer_agent || ""]]
      },
      {
        range: `${SHEET_NAME}!H${rowIndex}`, // Agent
        values: [[callResult.agent_who_took_call || ""]]
      },
      {
        range: `${SHEET_NAME}!I${rowIndex}`, // Licensed agent account
        values: [[callResult.licensed_agent_account || ""]]
      },
      {
        range: `${SHEET_NAME}!J${rowIndex}`, // Status
        values: [[finalStatus]]
      },
      {
        range: `${SHEET_NAME}!K${rowIndex}`, // Call Result
        values: [[callResultStatus]]
      },
      {
        range: `${SHEET_NAME}!L${rowIndex}`, // Carrier
        values: [[callResult.carrier || ""]]
      },
      {
        range: `${SHEET_NAME}!M${rowIndex}`, // Product Type
        values: [[callResult.product_type || ""]]
      },
      {
        range: `${SHEET_NAME}!N${rowIndex}`, // Draft Date
        values: [[callResult.draft_date || ""]]
      },
      {
        range: `${SHEET_NAME}!O${rowIndex}`, // MP (Monthly Premium)
        values: [[callResult.monthly_premium || ""]]
      },
      {
        range: `${SHEET_NAME}!P${rowIndex}`, // Face amount
        values: [[callResult.face_amount || ""]]
      },
      {
        range: `${SHEET_NAME}!Q${rowIndex}`, // From Callback? (keep as TRUE if already set)
        values: [[rows[rowIndex - 1][16] || "TRUE"]]
      },
      {
        range: `${SHEET_NAME}!R${rowIndex}`, // Notes
        values: [[updatedNotes]]
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
