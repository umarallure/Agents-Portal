import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// State name to abbreviation mapping
const stateMap: { [key: string]: string } = {
  "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR", "california": "CA",
  "colorado": "CO", "connecticut": "CT", "delaware": "DE", "florida": "FL", "georgia": "GA",
  "hawaii": "HI", "idaho": "ID", "illinois": "IL", "indiana": "IN", "iowa": "IA",
  "kansas": "KS", "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
  "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS", "missouri": "MO",
  "montana": "MT", "nebraska": "NE", "nevada": "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", "ohio": "OH",
  "oklahoma": "OK", "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT", "vermont": "VT",
  "virginia": "VA", "washington": "WA", "west virginia": "WV", "wisconsin": "WI", "wyoming": "WY",
  "district of columbia": "DC", "puerto rico": "PR", "guam": "GU", "american samoa": "AS",
  "virgin islands": "VI", "northern mariana islands": "MP"
};

function normalizeState(state: string): string {
  if (!state) return "";
  
  // If already a 2-letter code, return as-is (uppercase)
  if (state.length === 2) {
    return state.toUpperCase();
  }
  
  // Try to map full name to abbreviation
  const normalized = state.toLowerCase().trim();
  return stateMap[normalized] || state.toUpperCase().substring(0, 2);
}

// Clean street address by removing city, state, zip if they're included
function cleanStreetAddress(street: string, city: string, state: string, zip: string): string {
  if (!street) return "";
  
  let cleaned = street.trim();
  
  // First, detect and remove duplicated content (e.g., "123 Main St 123 Main St")
  // Split by common separators and check for duplicates
  const parts = cleaned.split(/[,;]+/).map(p => p.trim()).filter(p => p);
  if (parts.length > 1) {
    // Check if first part is duplicated
    const firstPart = parts[0];
    const duplicates = parts.filter(p => p === firstPart);
    if (duplicates.length > 1) {
      // Remove duplicates, keep only one
      cleaned = firstPart;
    }
  }
  
  // Also check for space-separated duplication (like "125 WESTHAVEN DR TROY OH 125 WESTHAVEN DR TROY OH")
  // Split in half and see if both halves are identical
  const words = cleaned.split(/\s+/);
  if (words.length > 2 && words.length % 2 === 0) {
    const halfLength = words.length / 2;
    const firstHalf = words.slice(0, halfLength).join(' ');
    const secondHalf = words.slice(halfLength).join(' ');
    if (firstHalf === secondHalf) {
      cleaned = firstHalf;
    }
  }
  
  // Remove zip code if present
  if (zip) {
    cleaned = cleaned.replace(new RegExp(`\\b${zip}\\b`, "gi"), "").trim();
  }
  
  // Remove state name or abbreviation if present
  if (state) {
    const stateAbbr = normalizeState(state);
    // Remove state abbreviation
    cleaned = cleaned.replace(new RegExp(`\\b${stateAbbr}\\b`, "gi"), "").trim();
    // Remove full state name if different
    if (state.length > 2) {
      cleaned = cleaned.replace(new RegExp(`\\b${state}\\b`, "gi"), "").trim();
    }
  }
  
  // Remove city if present
  if (city) {
    cleaned = cleaned.replace(new RegExp(`\\b${city}\\b`, "gi"), "").trim();
  }
  
  // Remove multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Remove trailing commas and spaces
  cleaned = cleaned.replace(/[,\s]+$/, "").trim();
  
  return cleaned;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { street_address, city, state, zip_code } = await req.json();
    
    // Clean the street address to remove any city/state/zip that might be included
    const cleanedStreet = cleanStreetAddress(street_address || "", city || "", state || "", zip_code || "");

    // In a real deployment, these would come from Deno.env.get()
    // For now, we'll use the provided credentials or check for env vars
    const CONSUMER_KEY = Deno.env.get("USPS_CONSUMER_KEY") || "qwag1DEtnCE0q0MCY7boSP6muW96dG1BRuY8u1sYvg6v3aWe";
    const CONSUMER_SECRET = Deno.env.get("USPS_CONSUMER_SECRET") || "GK0ZAMXSKHkDArKchJc2BbIwDK04jHS7cB2oOXArnwfA0TtLCcJhPMUZ6c4aKBhd";

    // 1. Get Access Token
    const tokenUrl = "https://apis.usps.com/oauth2/v3/token";
    
    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: CONSUMER_KEY,
        client_secret: CONSUMER_SECRET
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
        throw new Error(`Failed to get access token: ${tokenResponse.status} ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
        throw new Error("No access token received from USPS");
    }

    // 2. Validate Address
    const normalizedState = normalizeState(state);
    
    console.log("Sending to USPS:", {
      street: cleanedStreet,
      city,
      state: normalizedState,
      zip: zip_code
    });
    
    const addressUrl = new URL("https://apis.usps.com/addresses/v3/address");
    addressUrl.searchParams.append("streetAddress", cleanedStreet);
    addressUrl.searchParams.append("city", city || "");
    addressUrl.searchParams.append("state", normalizedState);
    addressUrl.searchParams.append("ZIPCode", zip_code || "");

    const validateResponse = await fetch(addressUrl.toString(), {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json"
      }
    });

    if (!validateResponse.ok) {
         const errorText = await validateResponse.text();
         
         // Try to parse error for better message
         try {
           const errorData = JSON.parse(errorText);
           if (errorData.error) {
             const errorMsg = errorData.error.message || "Address validation failed";
             const errorCode = errorData.error.code;
             
             // Provide user-friendly messages for common errors
             if (errorMsg.includes("Address Not Found") || errorCode === "010005") {
               throw new Error("Address not found. Please verify the address and try again.");
             } else if (errorMsg.includes("Invalid")) {
               throw new Error("Invalid address format. Please check the address details.");
             } else {
               throw new Error(`Address validation failed: ${errorMsg}`);
             }
           }
         } catch (parseError) {
           // If we can't parse, show generic message
           if (validateResponse.status === 400) {
             throw new Error("Unable to validate this address. Please verify the address is correct.");
           }
           throw new Error(`USPS Validation API error: ${validateResponse.status}`);
         }
    }

    const validateData = await validateResponse.json();

    // Check for "error" property in response just in case
    if (validateData.error) {
        const errorMsg = validateData.error.message || "USPS returned an error";
        if (errorMsg.includes("Address Not Found")) {
          throw new Error("Address not found. Please verify the address and try again.");
        }
        throw new Error(errorMsg);
    }

    // Extract standardized address
    // Based on your test output, the structure is validateData.address
    const address = validateData.address;
    
    if (!address) {
        throw new Error("No address returned from validation");
    }

    const result = {
        // Construct standard response format for frontend
        address1: address.secondaryAddress || "", // Apt/Suite
        address2: address.streetAddress || "",    // Street
        city: address.city || "",
        state: address.state || "",
        zip5: address.ZIPCode || "",
        zip4: address.ZIPPlus4 || "",
    };
    
    return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Function error:", error);
    // Return 200 status with error in body so Supabase client can parse it
    // This ensures our custom error messages are properly displayed
    return new Response(JSON.stringify({ error: error.message || "Address validation failed" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
