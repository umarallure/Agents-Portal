# Individual Test Commands for notify-eligible-agents-with-upline
# Copy and paste these into PowerShell to test different scenarios

## Test 1: AMAM + California (Override State)
## Expected: 2 agents (Benjamin, Lydia) - Isaac blocked because Abdul lacks CA license

curl.exe -L -X POST 'https://gqhcjqxcvhgwsqfqgekh.supabase.co/functions/v1/notify-eligible-agents-with-upline' `
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaGNqcXhjdmhnd3NxZnFnZWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjAyNjEsImV4cCI6MjA2NzkzNjI2MX0.s4nuUN7hw_XCltM-XY3jC9o0og3froDRq_i80UCQ-rA' `
  -H 'Content-Type: application/json' `
  --data '{\"carrier\":\"AMAM\",\"state\":\"California\",\"lead_vendor\":\"Maverick\"}'

# ----------------------------------------

## Test 2: AMAM + Texas (Override State)
## Expected: 4 agents (Abdul, Isaac, Tatumn, Zack) - All have AMAM + Texas

curl.exe -L -X POST 'https://gqhcjqxcvhgwsqfqgekh.supabase.co/functions/v1/notify-eligible-agents-with-upline' `
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaGNqcXhjdmhnd3NxZnFnZWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjAyNjEsImV4cCI6MjA2NzkzNjI2MX0.s4nuUN7hw_XCltM-XY3jC9o0og3froDRq_i80UCQ-rA' `
  -H 'Content-Type: application/json' `
  --data '{\"carrier\":\"AMAM\",\"state\":\"Texas\",\"lead_vendor\":\"Maverick\"}'

# ----------------------------------------

## Test 3: Aetna + Iowa (Override State)
## Expected: At least 1 agent (Zack has Aetna + Iowa)

curl.exe -L -X POST 'https://gqhcjqxcvhgwsqfqgekh.supabase.co/functions/v1/notify-eligible-agents-with-upline' `
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaGNqcXhjdmhnd3NxZnFnZWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjAyNjEsImV4cCI6MjA2NzkzNjI2MX0.s4nuUN7hw_XCltM-XY3jC9o0og3froDRq_i80UCQ-rA' `
  -H 'Content-Type: application/json' `
  --data '{\"carrier\":\"Aetna\",\"state\":\"Iowa\",\"lead_vendor\":\"Maverick\"}'

# ----------------------------------------

## Test 4: SBLI + New York
## Expected: Check eligible agents for SBLI in NY

curl.exe -L -X POST 'https://gqhcjqxcvhgwsqfqgekh.supabase.co/functions/v1/notify-eligible-agents-with-upline' `
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaGNqcXhjdmhnd3NxZnFnZWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjAyNjEsImV4cCI6MjA2NzkzNjI2MX0.s4nuUN7hw_XCltM-XY3jC9o0og3froDRq_i80UCQ-rA' `
  -H 'Content-Type: application/json' `
  --data '{\"carrier\":\"SBLI\",\"state\":\"New York\",\"lead_vendor\":\"Maverick\"}'

# ----------------------------------------

## Test 5: TransAmerica + Florida
## Expected: Check eligible agents for TransAmerica in FL

curl.exe -L -X POST 'https://gqhcjqxcvhgwsqfqgekh.supabase.co/functions/v1/notify-eligible-agents-with-upline' `
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaGNqcXhjdmhnd3NxZnFnZWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjAyNjEsImV4cCI6MjA2NzkzNjI2MX0.s4nuUN7hw_XCltM-XY3jC9o0og3froDRq_i80UCQ-rA' `
  -H 'Content-Type: application/json' `
  --data '{\"carrier\":\"TransAmerica\",\"state\":\"Florida\",\"lead_vendor\":\"Maverick\"}'

# ----------------------------------------

## Test 6: Royal Neighbors + Illinois
## Expected: Check eligible agents for Royal Neighbors

curl.exe -L -X POST 'https://gqhcjqxcvhgwsqfqgekh.supabase.co/functions/v1/notify-eligible-agents-with-upline' `
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaGNqcXhjdmhnd3NxZnFnZWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjAyNjEsImV4cCI6MjA2NzkzNjI2MX0.s4nuUN7hw_XCltM-XY3jC9o0og3froDRq_i80UCQ-rA' `
  -H 'Content-Type: application/json' `
  --data '{\"carrier\":\"Royal Neighbors\",\"state\":\"Illinois\",\"lead_vendor\":\"Maverick\"}'

# ----------------------------------------

## Test 7: Liberty Bankers + Georgia
## Expected: Check eligible agents for Liberty Bankers

curl.exe -L -X POST 'https://gqhcjqxcvhgwsqfqgekh.supabase.co/functions/v1/notify-eligible-agents-with-upline' `
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaGNqcXhjdmhnd3NxZnFnZWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjAyNjEsImV4cCI6MjA2NzkzNjI2MX0.s4nuUN7hw_XCltM-XY3jC9o0og3froDRq_i80UCQ-rA' `
  -H 'Content-Type: application/json' `
  --data '{\"carrier\":\"Liberty Bankers\",\"state\":\"Georgia\",\"lead_vendor\":\"Maverick\"}'

# ----------------------------------------

## Test 8: Invalid Carrier (Error Test)
## Expected: 0 agents, notification sent about no agents

curl.exe -L -X POST 'https://gqhcjqxcvhgwsqfqgekh.supabase.co/functions/v1/notify-eligible-agents-with-upline' `
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaGNqcXhjdmhnd3NxZnFnZWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjAyNjEsImV4cCI6MjA2NzkzNjI2MX0.s4nuUN7hw_XCltM-XY3jC9o0og3froDRq_i80UCQ-rA' `
  -H 'Content-Type: application/json' `
  --data '{\"carrier\":\"InvalidCarrier\",\"state\":\"Texas\",\"lead_vendor\":\"Maverick\"}'

# ----------------------------------------

## Test 9: Invalid State (Error Test)
## Expected: 0 agents, notification sent about no agents

curl.exe -L -X POST 'https://gqhcjqxcvhgwsqfqgekh.supabase.co/functions/v1/notify-eligible-agents-with-upline' `
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaGNqcXhjdmhnd3NxZnFnZWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjAyNjEsImV4cCI6MjA2NzkzNjI2MX0.s4nuUN7hw_XCltM-XY3jC9o0og3froDRq_i80UCQ-rA' `
  -H 'Content-Type: application/json' `
  --data '{\"carrier\":\"AMAM\",\"state\":\"InvalidState\",\"lead_vendor\":\"Maverick\"}'

# ----------------------------------------

## What to check in the response:
## - success: true/false
## - eligible_agents_count: Number of agents found
## - eligible_agents: Array with name, upline, upline_required
## - override_state: true if upline checking was performed
## - channel: "#sample-center-transfer-channel" (Maverick's Slack channel)
## - messageTs: Slack message timestamp (proof notification was sent)

## Also check Slack channel #sample-center-transfer-channel for the actual notifications!
