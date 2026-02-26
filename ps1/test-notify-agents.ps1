# PowerShell script to test notify-eligible-agents function

$url = "https://gqhcjqxcvhgwsqfqgekh.supabase.co/functions/v1/notify-eligible-agents"
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaGNqcXhjdmhnd3NxZnFnZWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjAyNjEsImV4cCI6MjA2NzkzNjI2MX0.s4nuUN7hw_XCltM-XY3jC9o0og3froDRq_i80UCQ-rA"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Test Case 1: Liberty Bankers in Alabama (should tag Ben, Isaac, and Lydia)
Write-Host "`n=== Test 1: Liberty Bankers in Alabama ===" -ForegroundColor Cyan
$body1 = @{
    submission_id = "TEST-001"
    carrier = "Liberty Bankers"
    state = "Alabama"
    lead_vendor = "Cutting Edge"
    customer_name = "John Test Customer"
} | ConvertTo-Json

try {
    $response1 = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body1
    Write-Host "Success!" -ForegroundColor Green
    Write-Host "Eligible Agents Count: $($response1.eligible_agents_count)" -ForegroundColor Yellow
    Write-Host "Eligible Agents: $($response1.eligible_agents -join ', ')" -ForegroundColor Yellow
    Write-Host "Channel: $($response1.channel)" -ForegroundColor Yellow
    Write-Host "Response:" -ForegroundColor Gray
    $response1 | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error:" -ForegroundColor Red
    $_.Exception.Message
}

Start-Sleep -Seconds 2

# Test Case 2: Liberty Bankers in California (should tag Ben and Lydia, NOT Isaac)
Write-Host "`n=== Test 2: Liberty Bankers in California ===" -ForegroundColor Cyan
$body2 = @{
    submission_id = "TEST-002"
    carrier = "Liberty Bankers"
    state = "California"
    lead_vendor = "Cutting Edge"
    customer_name = "Jane Test Customer"
} | ConvertTo-Json

try {
    $response2 = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body2
    Write-Host "Success!" -ForegroundColor Green
    Write-Host "Eligible Agents Count: $($response2.eligible_agents_count)" -ForegroundColor Yellow
    Write-Host "Eligible Agents: $($response2.eligible_agents -join ', ')" -ForegroundColor Yellow
    Write-Host "Channel: $($response2.channel)" -ForegroundColor Yellow
    Write-Host "Response:" -ForegroundColor Gray
    $response2 | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error:" -ForegroundColor Red
    $_.Exception.Message
}

Start-Sleep -Seconds 2

# Test Case 3: Aetna in Alabama (should tag Ben and Lydia, NOT Isaac or Tatum or Noah)
Write-Host "`n=== Test 3: Aetna in Alabama ===" -ForegroundColor Cyan
$body3 = @{
    submission_id = "TEST-003"
    carrier = "Aetna"
    state = "Alabama"
    lead_vendor = "Cutting Edge"
    customer_name = "Bob Test Customer"
} | ConvertTo-Json

try {
    $response3 = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body3
    Write-Host "Success!" -ForegroundColor Green
    Write-Host "Eligible Agents Count: $($response3.eligible_agents_count)" -ForegroundColor Yellow
    Write-Host "Eligible Agents: $($response3.eligible_agents -join ', ')" -ForegroundColor Yellow
    Write-Host "Channel: $($response3.channel)" -ForegroundColor Yellow
    Write-Host "Response:" -ForegroundColor Gray
    $response3 | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error:" -ForegroundColor Red
    $_.Exception.Message
}

Start-Sleep -Seconds 2

# Test Case 4: TransAmerica in Texas (should tag multiple agents)
Write-Host "`n=== Test 4: TransAmerica in Texas ===" -ForegroundColor Cyan
$body4 = @{
    submission_id = "TEST-004"
    carrier = "TransAmerica"
    state = "Texas"
    lead_vendor = "Cutting Edge"
    customer_name = "Alice Test Customer"
} | ConvertTo-Json

try {
    $response4 = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body4
    Write-Host "Success!" -ForegroundColor Green
    Write-Host "Eligible Agents Count: $($response4.eligible_agents_count)" -ForegroundColor Yellow
    Write-Host "Eligible Agents: $($response4.eligible_agents -join ', ')" -ForegroundColor Yellow
    Write-Host "Channel: $($response4.channel)" -ForegroundColor Yellow
    Write-Host "Response:" -ForegroundColor Gray
    $response4 | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error:" -ForegroundColor Red
    $_.Exception.Message
}

Write-Host "`n=== All Tests Complete ===" -ForegroundColor Green
