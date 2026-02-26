$url = "https://gqhcjqxcvhgwsqfqgekh.supabase.co/functions/v1/notify-eligible-agents"
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaGNqcXhjdmhnd3NxZnFnZWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjAyNjEsImV4cCI6MjA2NzkzNjI2MX0.s4nuUN7hw_XCltM-XY3jC9o0og3froDRq_i80UCQ-rA"

$headers = @{
    "Authorization" = "Bearer $anonKey"
    "Content-Type" = "application/json"
}

Write-Host "Testing Techvated Marketing Exception..." -ForegroundColor Cyan

# Test 1: Techvated Marketing (Should EXCLUDE Lydia)
$body1 = @{
    carrier = "AMAM"
    state = "California"
    lead_vendor = "Techvated Marketing"
} | ConvertTo-Json

Write-Host "`nTest 1: Techvated Marketing (AMAM/CA)"
try {
    $response1 = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body1
    Write-Host "Success: $($response1.success)"
    Write-Host "Eligible Agents Count: $($response1.eligible_agents_count)"
    
    $agents = $response1.eligible_agents | ForEach-Object { $_.name }
    Write-Host "Agents: $($agents -join ', ')"
    
    if ($agents -contains "Lydia Sutton - Insurance Agent") {
        Write-Host "FAIL: Lydia Sutton found in Techvated Marketing list!" -ForegroundColor Red
    } else {
        Write-Host "PASS: Lydia Sutton NOT found in Techvated Marketing list." -ForegroundColor Green
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

# Test 2: Maverick (Should INCLUDE Lydia)
$body2 = @{
    carrier = "AMAM"
    state = "California"
    lead_vendor = "Maverick"
} | ConvertTo-Json

Write-Host "`nTest 2: Maverick (AMAM/CA)"
try {
    $response2 = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body2
    Write-Host "Success: $($response2.success)"
    Write-Host "Eligible Agents Count: $($response2.eligible_agents_count)"
    
    $agents = $response2.eligible_agents | ForEach-Object { $_.name }
    Write-Host "Agents: $($agents -join ', ')"
    
    if ($agents -contains "Lydia Sutton - Insurance Agent") {
        Write-Host "PASS: Lydia Sutton found in Maverick list." -ForegroundColor Green
    } else {
        Write-Host "FAIL: Lydia Sutton NOT found in Maverick list!" -ForegroundColor Red
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
