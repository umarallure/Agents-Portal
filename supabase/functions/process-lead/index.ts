import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// EST timezone utility functions
const isDST = (date: Date): boolean => {
  // DST in US: second Sunday in March to first Sunday in November
  const year = date.getFullYear();
  const marchSecondSunday = new Date(year, 2, 8 + (7 - new Date(year, 2, 8).getDay()) % 7);
  const novemberFirstSunday = new Date(year, 10, 1 + (7 - new Date(year, 10, 1).getDay()) % 7);
  
  return date >= marchSecondSunday && date < novemberFirstSunday;
};

const getCurrentTimestampEST = (): string => {
  const now = new Date();
  const estOffset = isDST(now) ? -4 : -5; // DST handling
  const estDate = new Date(now.getTime() + (estOffset * 60 * 60 * 1000));
  return estDate.toISOString();
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const JOTFORM_API_KEY = Deno.env.get('JOTFORM_API_KEY');
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  // Get 'center' from URL parameters or request body
  const url = new URL(req.url);
  let center = url.searchParams.get('center');
  const { submissionId, formId, center: bodyCenter } = await req.json();
  if (!center && bodyCenter) center = bodyCenter;
    if (!submissionId) {
      throw new Error('Missing submissionId');
    }
    if (!JOTFORM_API_KEY) {
      throw new Error('JOTFORM_API_KEY not configured');
    }
    console.log('Processing lead for submission:', submissionId);
    // Check if lead already exists
    const { data: existingLead } = await supabase.from('leads').select('id').eq('submission_id', submissionId).maybeSingle();
    if (existingLead) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Lead already processed',
        leadId: existingLead.id,
        submissionId: submissionId
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Fetch submission data from JotForm API
    let jotformData;
    if (formId) {
      // If we have formId, get specific submission
      const response = await fetch(`https://api.jotform.com/submission/${submissionId}?apiKey=${JOTFORM_API_KEY}`);
      if (!response.ok) {
        throw new Error(`JotForm API error: ${response.status}`);
      }
      jotformData = await response.json();
    } else {
      // Try to get submission directly by ID
      const response = await fetch(`https://api.jotform.com/submission/${submissionId}?apiKey=${JOTFORM_API_KEY}`);
      if (!response.ok) {
        throw new Error(`JotForm API error: ${response.status}`);
      }
      jotformData = await response.json();
    }
    const submission = jotformData.content;
    const answers = submission.answers || {};
    // Helper to extract string from Jotform answer
    const getStringAnswer = (ans)=>{
      if (!ans) return '';
      if (typeof ans === 'string') return ans;
      if (typeof ans === 'object') {
        // Try common keys
        if (ans.full) return ans.full;
        if (ans.first && ans.last) return `${ans.first} ${ans.last}`;
        if (ans.addr_line1) return ans.addr_line1;
        if (ans.email) return ans.email;
        if (ans.city) return ans.city;
        if (ans.state) return ans.state;
        if (ans.postal) return ans.postal;
        if (ans.datetime) return ans.datetime;
        // Fallback: stringify
        return JSON.stringify(ans);
      }
      return '';
    };
    // Map JotForm answers to lead data structure
    // Helper to extract email from additional info
    const extractEmail = (str)=>{
      if (!str || typeof str !== 'string') return '';
      const match = str.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      return match ? match[0] : '';
    };
    // Helper to parse and validate dates
    const parseDate = (dateStr)=>{
      if (!dateStr || typeof dateStr !== 'string') return null;
      // If it's just a number like "4", return null
      if (/^\d+$/.test(dateStr.trim())) return null;
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;
        return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
      } catch  {
        return null;
      }
    };
    const leadData = {
      submission_id: submissionId,
      submission_date: submission.created_at ? new Date(submission.created_at).toISOString() : getCurrentTimestampEST(),
      customer_full_name: answers['4']?.answer ? `${answers['4'].answer.first} ${answers['4'].answer.last}` : '',
      street_address: answers['5']?.answer?.addr_line1 || '',
      city: answers['5']?.answer?.city || '',
      state: answers['5']?.answer?.state || '',
      zip_code: answers['5']?.answer?.postal || '',
      phone_number: answers['6']?.answer?.full || '',
      email: answers['7']?.answer || extractEmail(answers['28']?.answer),
      birth_state: answers['8']?.answer || '',
      date_of_birth: parseDate(answers['10']?.answer?.datetime?.split(' ')[0]),
      age: answers['9']?.answer ? parseInt(answers['9'].answer) : null,
      social_security: answers['11']?.answer || '',
      driver_license: answers['33']?.answer || '',
      existing_coverage: answers['34']?.answer || '',
      previous_applications: answers['35']?.answer || '',
      height: answers['12']?.answer || '',
      weight: answers['13']?.answer || '',
      doctors_name: answers['14']?.answer || '',
      tobacco_use: answers['15']?.answer || '',
      health_conditions: answers['16']?.answer || '',
      medications: answers['17']?.answer || '',
      carrier: answers['20']?.answer || '',
      product_type: '',
      coverage_amount: answers['19']?.answer ? parseFloat(answers['19'].answer) : null,
      monthly_premium: answers['18']?.answer ? parseFloat(answers['18'].answer) : null,
      draft_date: answers['22']?.answer || '',
      future_draft_date: answers['27']?.answer || '',
      beneficiary_information: answers['23']?.answer || '',
      institution_name: answers['24']?.answer || '',
      beneficiary_routing: answers['25']?.answer || '',
      beneficiary_account: answers['26']?.answer || '',
      additional_notes: answers['28']?.answer || '',
      lead_vendor: center || null,
      buffer_agent: '',
      agent: answers['23']?.answer || ''
    };
    // Store lead in database
    const { data, error } = await supabase.from('leads').insert([
      leadData
    ]).select().single();
    if (error) {
      console.error('Error storing lead:', error);
      throw error;
    }
    console.log('Lead stored successfully:', data);
    return new Response(JSON.stringify({
      success: true,
      leadId: data.id,
      submissionId: data.submission_id,
      message: 'Lead processed and stored successfully'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in process-lead:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
