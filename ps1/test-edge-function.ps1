# Test notify-eligible-agents-with-upline Edge Function
# Tests various carrier/state combinations with Maverick call center

Write-Host "=== Testing notify-eligible-agents-with-upline Edge Function ===" -ForegroundColor Cyan
Write-Host ""

# Test Case 1: AMAM + California (Override State)
Write-Host "Test 1: AMAM + California (Override State)" -ForegroundColor Yellow
Write-Host "Expected: 2 agents (Benjamin, Lydia) - Isaac blocked" -ForegroundColor Gray

$response1 = curl.exe -L -X POST 'https://gqhcjqxcvhgwsqfqgekh.supabase.co/functions/v1/notify-eligible-agents-with-upline' `
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaGNqcXhjdmhnd3NxZnFnZWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjAyNjEsImV4cCI6MjA2NzkzNjI2MX0.s4nuUN7hw_XCltM-XY3jC9o0og3froDRq_i80UCQ-rA' `
  -H 'Content-Type: application/json' `
  --data '{\"carrier\":\"AMAM\",\"state\":\"California\",\"lead_vendor\":\"Maverick\"}'

Write-Host $response1
Write-Host ""
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host ""
Start-Sleep -Seconds 2

# Test Case 2: AMAM + Texas (Override State)
Write-Host "Test 2: AMAM + Texas (Override State)" -ForegroundColor Yellow
Write-Host "Expected: 4 agents (Abdul, Isaac, Tatumn, Zack)" -ForegroundColor Gray

$response2 = curl.exe -L -X POST 'https://gqhcjqxcvhgwsqfqgekh.supabase.co/functions/v1/notify-eligible-agents-with-upline' `
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaGNqcXhjdmhnd3NxZnFnZWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjAyNjEsImV4cCI6MjA2NzkzNjI2MX0.s4nuUN7hw_XCltM-XY3jC9o0og3froDRq_i80UCQ-rA' `
  -H 'Content-Type: application/json' `
  --data '{\"carrier\":\"AMAM\",\"state\":\"Texas\",\"lead_vendor\":\"Maverick\"}'

Write-Host $response2
Write-Host ""
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host ""
Start-Sleep -Seconds 2

# Test Case 3: Aetna + Iowa (Override State)
Write-Host "Test 3: Aetna + Iowa (Override State)" -ForegroundColor Yellow
Write-Host "Expected: At least 1 agent (Zack)" -ForegroundColor Gray

$response3 = curl.exe -L -X POST 'https://gqhcjqxcvhgwsqfqgekh.supabase.co/functions/v1/notify-eligible-agents-with-upline' `
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaGNqcXhjdmhnd3NxZnFnZWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjAyNjEsImV4cCI6MjA2NzkzNjI2MX0.s4nuUN7hw_XCltM-XY3jC9o0og3froDRq_i80UCQ-rA' `
  -H 'Content-Type: application/json' `
  --data '{\"carrier\":\"Aetna\",\"state\":\"Iowa\",\"lead_vendor\":\"Maverick\"}'

Write-Host $response3
Write-Host ""
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host ""
Start-Sleep -Seconds 2

# Test Case 4: SBLI + New York
Write-Host "Test 4: SBLI + New York" -ForegroundColor Yellow
Write-Host "Expected: Check if override state" -ForegroundColor Gray

$response4 = curl.exe -L -X POST 'https://gqhcjqxcvhgwsqfqgekh.supabase.co/functions/v1/notify-eligible-agents-with-upline' `
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaGNqcXhjdmhnd3NxZnFnZWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjAyNjEsImV4cCI6MjA2NzkzNjI2MX0.s4nuUN7hw_XCltM-XY3jC9o0og3froDRq_i80UCQ-rA' `
  -H 'Content-Type: application/json' `
  --data '{\"carrier\":\"SBLI\",\"state\":\"New York\",\"lead_vendor\":\"Maverick\"}'

Write-Host $response4
Write-Host ""
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host ""
Start-Sleep -Seconds 2

# Test Case 5: TransAmerica + Florida
Write-Host "Test 5: TransAmerica + Florida" -ForegroundColor Yellow
Write-Host "Expected: Check eligible agents" -ForegroundColor Gray

$response5 = curl.exe -L -X POST 'https://gqhcjqxcvhgwsqfqgekh.supabase.co/functions/v1/notify-eligible-agents-with-upline' `
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaGNqcXhjdmhnd3NxZnFnZWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjAyNjEsImV4cCI6MjA2NzkzNjI2MX0.s4nuUN7hw_XCltM-XY3jC9o0og3froDRq_i80UCQ-rA' `
  -H 'Content-Type: application/json' `
  --data '{\"carrier\":\"TransAmerica\",\"state\":\"Florida\",\"lead_vendor\":\"Maverick\"}'

Write-Host $response5
Write-Host ""
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host ""
Start-Sleep -Seconds 2

# Test Case 6: Invalid Carrier
Write-Host "Test 6: Invalid Carrier" -ForegroundColor Yellow
Write-Host "Expected: 0 agents, notification sent" -ForegroundColor Gray

$response6 = curl.exe -L -X POST 'https://gqhcjqxcvhgwsqfqgekh.supabase.co/functions/v1/notify-eligible-agents-with-upline' `
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaGNqcXhjdmhnd3NxZnFnZWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjAyNjEsImV4cCI6MjA2NzkzNjI2MX0.s4nuUN7hw_XCltM-XY3jC9o0og3froDRq_i80UCQ-rA' `
  -H 'Content-Type: application/json' `
  --data '{\"carrier\":\"InvalidCarrier\",\"state\":\"Texas\",\"lead_vendor\":\"Maverick\"}'

Write-Host $response6
Write-Host ""
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host ""
Start-Sleep -Seconds 2

# Test Case 7: Invalid State
Write-Host "Test 7: Invalid State" -ForegroundColor Yellow
Write-Host "Expected: 0 agents, notification sent" -ForegroundColor Gray

$response7 = curl.exe -L -X POST 'https://gqhcjqxcvhgwsqfqgekh.supabase.co/functions/v1/notify-eligible-agents-with-upline' `
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaGNqcXhjdmhnd3NxZnFnZWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjAyNjEsImV4cCI6MjA2NzkzNjI2MX0.s4nuUN7hw_XCltM-XY3jC9o0og3froDRq_i80UCQ-rA' `
  -H 'Content-Type: application/json' `
  --data '{\"carrier\":\"AMAM\",\"state\":\"InvalidState\",\"lead_vendor\":\"Maverick\"}'

Write-Host $response7
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ All tests completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📬 Check Slack channel #sample-center-transfer-channel for notifications" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: Each response includes:" -ForegroundColor Yellow
Write-Host "  - eligible_agents_count: Number of agents found" -ForegroundColor Gray
Write-Host "  - eligible_agents: Array with agent names and upline info" -ForegroundColor Gray
Write-Host "  - override_state: Whether upline checking was required" -ForegroundColor Gray
Write-Host "  - channel: The Slack channel where notification was sent" -ForegroundColor Gray
