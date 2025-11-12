# Test script for notify-eligible-agents-with-upline Edge Function
# Tests various carrier/state combinations with Maverick call center

Write-Host "=== Testing notify-eligible-agents-with-upline Edge Function ===" -ForegroundColor Cyan
Write-Host ""

# Test scenarios
$testCases = @(
    @{
        Name = "Test 1: AMAM + California (Override State)"
        Carrier = "AMAM"
        State = "California"
        ExpectedAgents = 2
        Description = "Should return Benjamin and Lydia (Isaac blocked - Abdul lacks CA license)"
    },
    @{
        Name = "Test 2: AMAM + Texas (Override State)"
        Carrier = "AMAM"
        State = "Texas"
        ExpectedAgents = 4
        Description = "Should return Abdul, Isaac, Tatumn, Zack (all have TX+AMAM)"
    },
    @{
        Name = "Test 3: Aetna + Iowa (Override State)"
        Carrier = "Aetna"
        State = "Iowa"
        ExpectedAgents = "1+"
        Description = "Should return agents with Aetna + Iowa licenses (override state)"
    },
    @{
        Name = "Test 4: SBLI + New York (Check if override)"
        Carrier = "SBLI"
        State = "New York"
        ExpectedAgents = "?"
        Description = "Test SBLI carrier with New York state"
    },
    @{
        Name = "Test 5: TransAmerica + Florida"
        Carrier = "TransAmerica"
        State = "Florida"
        ExpectedAgents = "?"
        Description = "Test TransAmerica carrier with Florida state"
    },
    @{
        Name = "Test 6: Invalid Carrier"
        Carrier = "InvalidCarrier"
        State = "Texas"
        ExpectedAgents = 0
        Description = "Should return 0 agents for non-existent carrier"
    },
    @{
        Name = "Test 7: Invalid State"
        Carrier = "AMAM"
        State = "InvalidState"
        ExpectedAgents = 0
        Description = "Should return 0 agents for non-existent state"
    }
)

# Function to call the Edge Function
function Invoke-NotifyFunction {
    param(
        [string]$Carrier,
        [string]$State,
        [string]$LeadVendor = "Maverick"
    )
    
    $body = @{
        carrier = $Carrier
        state = $State
        lead_vendor = $LeadVendor
    } | ConvertTo-Json

    Write-Host "Request Body: $body" -ForegroundColor Gray
    
    try {
        # Note: Replace with your actual Supabase project URL
        $url = "http://localhost:54321/functions/v1/notify-eligible-agents-with-upline"
        
        $response = Invoke-RestMethod -Uri $url `
            -Method POST `
            -Headers @{
                "Content-Type" = "application/json"
                "Authorization" = "Bearer YOUR_ANON_KEY_HERE"
            } `
            -Body $body `
            -ErrorAction Stop
        
        return $response
    }
    catch {
        Write-Host "Error calling function: $_" -ForegroundColor Red
        return $null
    }
}

# Run all test cases
$results = @()
foreach ($test in $testCases) {
    Write-Host "----------------------------------------" -ForegroundColor Yellow
    Write-Host $test.Name -ForegroundColor Cyan
    Write-Host "Description: $($test.Description)" -ForegroundColor Gray
    Write-Host "Carrier: $($test.Carrier), State: $($test.State)" -ForegroundColor White
    Write-Host ""
    
    $result = Invoke-NotifyFunction -Carrier $test.Carrier -State $test.State
    
    if ($result) {
        Write-Host "✅ Function executed successfully" -ForegroundColor Green
        Write-Host "Eligible Agents Count: $($result.eligible_agents_count)" -ForegroundColor Green
        Write-Host "Override State: $($result.override_state)" -ForegroundColor $(if ($result.override_state) { "Yellow" } else { "White" })
        Write-Host "Channel: $($result.channel)" -ForegroundColor White
        
        if ($result.eligible_agents) {
            Write-Host "Eligible Agents:" -ForegroundColor White
            foreach ($agent in $result.eligible_agents) {
                $uplineInfo = if ($agent.upline) { " (upline: $($agent.upline))" } else { " (no upline)" }
                $uplineReqInfo = if ($agent.upline_required) { " [upline req: ✓]" } else { " [upline req: ✗]" }
                Write-Host "  • $($agent.name)$uplineInfo$uplineReqInfo" -ForegroundColor Cyan
            }
        }
        
        $results += @{
            Test = $test.Name
            Success = $true
            AgentCount = $result.eligible_agents_count
            Expected = $test.ExpectedAgents
            OverrideState = $result.override_state
        }
    }
    else {
        Write-Host "❌ Function call failed" -ForegroundColor Red
        $results += @{
            Test = $test.Name
            Success = $false
            AgentCount = 0
            Expected = $test.ExpectedAgents
            OverrideState = $false
        }
    }
    
    Write-Host ""
    Start-Sleep -Milliseconds 500
}

# Summary
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Yellow
foreach ($result in $results) {
    $status = if ($result.Success) { "✅" } else { "❌" }
    $override = if ($result.OverrideState) { "[Override State]" } else { "" }
    Write-Host "$status $($result.Test): $($result.AgentCount) agents (expected: $($result.Expected)) $override"
}
Write-Host ""
Write-Host "Note: To run this script with your actual Supabase instance:" -ForegroundColor Yellow
Write-Host "1. Update the URL in the script with your Supabase project URL" -ForegroundColor Gray
Write-Host "2. Replace 'YOUR_ANON_KEY_HERE' with your actual anon key" -ForegroundColor Gray
Write-Host "3. Ensure the Edge Function is deployed" -ForegroundColor Gray
Write-Host ""
Write-Host "To test locally with Supabase CLI:" -ForegroundColor Yellow
Write-Host "  supabase functions serve notify-eligible-agents-with-upline" -ForegroundColor Gray
