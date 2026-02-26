# Aetna Testing Commands
# Test the new Aetna state availability system

## Test 1: Aetna + California (Should return 0 agents - uplines don't have Aetna)
curl.exe -L -X POST 'https://gqhcjqxcvhgwsqfqgekh.supabase.co/functions/v1/notify-eligible-agents-with-upline' `
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaGNqcXhjdmhnd3NxZnFnZWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjAyNjEsImV4cCI6MjA2NzkzNjI2MX0.s4nuUN7hw_XCltM-XY3jC9o0og3froDRq_i80UCQ-rA' `
  -H 'Content-Type: application/json' `
  --data '{\"carrier\":\"Aetna\",\"state\":\"California\",\"lead_vendor\":\"Maverick\"}'

# Expected Result:
# {
#   "success": true,
#   "eligible_agents_count": 0,
#   "message": "No eligible agents found (after upline checks), notification sent",
#   "channel": "#sample-center-transfer-channel"
# }

# ----------------------------------------

## Test 2: Aetna + Texas
curl.exe -L -X POST 'https://gqhcjqxcvhgwsqfqgekh.supabase.co/functions/v1/notify-eligible-agents-with-upline' `
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaGNqcXhjdmhnd3NxZnFnZWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjAyNjEsImV4cCI6MjA2NzkzNjI2MX0.s4nuUN7hw_XCltM-XY3jC9o0og3froDRq_i80UCQ-rA' `
  -H 'Content-Type: application/json' `
  --data '{\"carrier\":\"Aetna\",\"state\":\"Texas\",\"lead_vendor\":\"Maverick\"}'

# ----------------------------------------

## Test 3: Aetna + Iowa
curl.exe -L -X POST 'https://gqhcjqxcvhgwsqfqgekh.supabase.co/functions/v1/notify-eligible-agents-with-upline' `
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaGNqcXhjdmhnd3NxZnFnZWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjAyNjEsImV4cCI6MjA2NzkzNjI2MX0.s4nuUN7hw_XCltM-XY3jC9o0og3froDRq_i80UCQ-rA' `
  -H 'Content-Type: application/json' `
  --data '{\"carrier\":\"Aetna\",\"state\":\"Iowa\",\"lead_vendor\":\"Maverick\"}'

# ----------------------------------------

## Test 4: Aetna + Florida
curl.exe -L -X POST 'https://gqhcjqxcvhgwsqfqgekh.supabase.co/functions/v1/notify-eligible-agents-with-upline' `
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaGNqcXhjdmhnd3NxZnFnZWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjAyNjEsImV4cCI6MjA2NzkzNjI2MX0.s4nuUN7hw_XCltM-XY3jC9o0og3froDRq_i80UCQ-rA' `
  -H 'Content-Type: application/json' `
  --data '{\"carrier\":\"Aetna\",\"state\":\"Florida\",\"lead_vendor\":\"Maverick\"}'

# ----------------------------------------

## Test 5: Aetna + New York
curl.exe -L -X POST 'https://gqhcjqxcvhgwsqfqgekh.supabase.co/functions/v1/notify-eligible-agents-with-upline' `
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaGNqcXhjdmhnd3NxZnFnZWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjAyNjEsImV4cCI6MjA2NzkzNjI2MX0.s4nuUN7hw_XCltM-XY3jC9o0og3froDRq_i80UCQ-rA' `
  -H 'Content-Type: application/json' `
  --data '{\"carrier\":\"Aetna\",\"state\":\"New York\",\"lead_vendor\":\"Maverick\"}'

# ----------------------------------------

## Direct Database Test
# Test the function directly in Supabase SQL Editor:

# SELECT * FROM get_eligible_agents_for_aetna('California');
# SELECT * FROM get_eligible_agents_for_aetna('Texas');
# SELECT * FROM get_eligible_agents_for_aetna('Florida');

# ----------------------------------------

## Check Current Aetna State Availability
# Run in Supabase SQL Editor:

# SELECT 
#   p.display_name as agent,
#   COUNT(*) as total_states,
#   COUNT(*) FILTER (WHERE aasa.is_available = true) as available_states
# FROM aetna_agent_state_availability aasa
# JOIN profiles p ON p.user_id = aasa.agent_user_id
# GROUP BY p.display_name;

# ----------------------------------------

## Check Who Has Aetna Licenses
# Run in Supabase SQL Editor:

# SELECT 
#   p.display_name,
#   c.carrier_name,
#   acl.is_licensed
# FROM agent_carrier_licenses acl
# JOIN carriers c ON c.id = acl.carrier_id
# JOIN profiles p ON p.user_id = acl.agent_user_id
# WHERE LOWER(c.carrier_name) = 'aetna'
# ORDER BY p.display_name;

# ----------------------------------------

## Check Upline Relationships
# Run in Supabase SQL Editor:

# SELECT 
#   p1.display_name as agent,
#   p2.display_name as upline,
#   auh.is_active,
#   EXISTS (
#     SELECT 1 FROM agent_carrier_licenses acl
#     JOIN carriers c ON c.id = acl.carrier_id
#     WHERE acl.agent_user_id = auh.upline_user_id
#     AND LOWER(c.carrier_name) = 'aetna'
#     AND acl.is_licensed = true
#   ) as upline_has_aetna
# FROM agent_upline_hierarchy auh
# JOIN profiles p1 ON p1.user_id = auh.agent_user_id
# JOIN profiles p2 ON p2.user_id = auh.upline_user_id
# ORDER BY p1.display_name;

# ----------------------------------------

## What to Check:

# 1. Response should show:
#    - success: true
#    - eligible_agents_count: 0 (currently, due to upline requirements)
#    - message about no eligible agents
#    - channel: "#sample-center-transfer-channel"

# 2. Check Slack channel #sample-center-transfer-channel for notification

# 3. Check Edge Function logs:
#    supabase functions logs notify-eligible-agents-with-upline

# 4. Should see debug log:
#    "[DEBUG] Using Aetna-specific eligibility function"

# ----------------------------------------

## Current Status:

# Agents with Aetna License: Lydia, Zack
# Agents with Aetna States: Lydia (54), Zack (54)
# 
# Lydia → Upline: Benjamin (NO Aetna) ❌ BLOCKED
# Zack → Upline: Abdul (NO Aetna) ❌ BLOCKED
#
# Result: 0 eligible agents for any Aetna state
#
# To fix: Add Aetna license + states to Benjamin and Abdul
