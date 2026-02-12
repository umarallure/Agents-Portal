import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const REALVALIDITO_API_KEY = Deno.env.get('REALVALIDITO_API_KEY') || '';
const REALVALIDITO_API_SECRET = Deno.env.get('REALVALIDITO_API_SECRET') || '';

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: corsHeaders,
      status: 405,
    });
  }

  try {
    const { mobileNumber } = await req.json();
    
    if (!mobileNumber || !/^[0-9]{10}$/.test(mobileNumber)) {
      return new Response(JSON.stringify({ error: "Invalid mobile number. Must be 10 digits." }), {
        headers: corsHeaders,
        status: 400,
      });
    }

    console.log('Checking DNC for number:', mobileNumber);

    const response = await fetch("https://app.realvalidito.com/dnclookup/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: REALVALIDITO_API_KEY,
        api_secret: REALVALIDITO_API_SECRET,
        numbers: [mobileNumber],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('RealValidito API error:', errorText);
      throw new Error(`RealValidito API error: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('RealValidito Response:', JSON.stringify(result, null, 2));

    // Ensure we return a consistent structure
    // RealValidito returns results array with phone details
    const formattedResult = {
      success: true,
      results: result.results || result.data || [result],
      raw: result // Include raw response for debugging
    };

    return new Response(JSON.stringify(formattedResult), {
      headers: corsHeaders,
      status: 200,
    });

  } catch (error) {
    console.error('DNC lookup error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || "DNC lookup failed",
      success: false 
    }), {
      headers: corsHeaders,
      status: 500,
    });
  }
});
