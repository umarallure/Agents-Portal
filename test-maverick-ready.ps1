# Ready-to-Use Test Script for notify-eligible-agents-with-upline
# Tests with Maverick call center and your Supabase instance

$projectUrl = "https://gqhcjqxcvhgwsqfqgekh.supabase.co"
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaGNqcXhjdmhnd3NxZnFnZWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNjAyNjEsImV4cCI6MjA2NzkzNjI2MX0.s4nuUN7hw_XCltM-XY3jC9o0og3froDRq_i80UCQ-rA"

Write-Host "=== Testing notify-eligible-agents-with-upline Edge Function ===" -ForegroundColor Cyan
Write-Host "Project: $projectUrl" -ForegroundColor Gray
Write-Host "Call Center: Maverick" -ForegroundColor Gray
Write-Host "Slack Channel: #sample-center-transfer-channel" -ForegroundColor Gray
Write-Host ""

# Test scenarios
$testCases = @(
    @{
        Name = "Test 1: AMAM + California (Override State)"
        Carrier = "AMAM"
        State = "California"
        ExpectedAgents = 2
        ExpectedNames = @("Benjamin", "Lydia")
        Description = "Should return Benjamin and Lydia (Isaac blocked)"
    },
    @{
        Name = "Test 2: AMAM + Texas (Override State)"
        Carrier = "AMAM"
        State = "Texas"
        ExpectedAgents = 4
        ExpectedNames = @("Abdul", "Isaac", "Tatumn", "Zack")
        Description = "Should return Abdul, Isaac, Tatumn, Zack"
    },
    @{
        Name = "Test 3: Aetna + Iowa (Override State)"
        Carrier = "Aetna"
        State = "Iowa"
        ExpectedAgents = 1
        ExpectedNames = @("Zack")
        Description = "Test Aetna carrier with Iowa state"
    },
    @{
        Name = "Test 4: SBLI + New York"
        Carrier = "SBLI"
        State = "New York"
        ExpectedAgents = "?"
        ExpectedNames = @()
        Description = "Test SBLI carrier"
    },
    @{
        Name = "Test 5: Invalid Carrier"
        Carrier = "InvalidCarrier"
        State = "Texas"
        ExpectedAgents = 0
        ExpectedNames = @()
        Description = "Should return 0 agents and send notification"
    },
    @{
        Name = "Test 6: Invalid State"
        Carrier = "AMAM"
        State = "InvalidState"
        ExpectedAgents = 0
        ExpectedNames = @()
        Description = "Should return 0 agents and send notification"
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

    Write-Host "  📤 Sending request..." -ForegroundColor Gray
    
    try {
        $url = "$projectUrl/functions/v1/notify-eligible-agents-with-upline"
        
        $response = Invoke-RestMethod -Uri $url `
            -Method POST `
            -Headers @{
                "Content-Type" = "application/json"
                "Authorization" = "Bearer $anonKey"
            } `
            -Body $body `
            -ErrorAction Stop
        
        return $response
    }
    catch {
        $errorDetails = $_.ErrorDetails.Message
        if ($errorDetails) {
            try {
                $errorJson = $errorDetails | ConvertFrom-Json
                return @{
                    error = $true
                    message = $errorJson.message
                    details = $errorJson
                }
            }
            catch {
                return @{
                    error = $true
                    message = $errorDetails
                }
            }
        }
        return @{
            error = $true
            message = $_.Exception.Message
        }
    }
}

# Run all test cases
$results = @()
$testNumber = 0

foreach ($test in $testCases) {
    $testNumber++
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║ Test $testNumber of $($testCases.Count)" -ForegroundColor Yellow
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📋 $($test.Name)" -ForegroundColor Cyan
    Write-Host "   $($test.Description)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Carrier: $($test.Carrier)" -ForegroundColor White
    Write-Host "   State: $($test.State)" -ForegroundColor White
    Write-Host "   Lead Vendor: Maverick" -ForegroundColor White
    Write-Host ""
    
    $result = Invoke-NotifyFunction -Carrier $test.Carrier -State $test.State
    
    if ($result -and $result.error) {
        Write-Host "  ❌ Error calling function" -ForegroundColor Red
        Write-Host "  $($result.message)" -ForegroundColor Red
        
        $results += @{
            Test = $test.Name
            Success = $false
            Error = $result.message
            AgentCount = 0
            Expected = $test.ExpectedAgents
        }
    }
    elseif ($result -and $result.success) {
        Write-Host "  ✅ Function executed successfully" -ForegroundColor Green
        Write-Host ""
        Write-Host "  📊 Results:" -ForegroundColor White
        Write-Host "     Eligible Agents: $($result.eligible_agents_count)" -ForegroundColor Cyan
        Write-Host "     Override State: $(if ($result.override_state) { '⚠️  Yes' } else { '✓ No' })" -ForegroundColor $(if ($result.override_state) { "Yellow" } else { "Green" })
        Write-Host "     Slack Channel: $($result.channel)" -ForegroundColor Gray
        
        if ($result.eligible_agents -and $result.eligible_agents.Count -gt 0) {
            Write-Host ""
            Write-Host "  👥 Eligible Agents:" -ForegroundColor White
            foreach ($agent in $result.eligible_agents) {
                $uplineInfo = if ($agent.upline) { " → upline: $($agent.upline)" } else { " (no upline)" }
                $uplineReqBadge = if ($agent.upline_required) { " [🔐 upline req]" } else { "" }
                Write-Host "     • $($agent.name)$uplineInfo$uplineReqBadge" -ForegroundColor Cyan
            }
        }
        else {
            Write-Host ""
            Write-Host "  ℹ️  No eligible agents found" -ForegroundColor Yellow
            Write-Host "     Slack notification sent explaining no agents available" -ForegroundColor Gray
        }
        
        # Validation
        $passed = $true
        if ($test.ExpectedAgents -ne "?" -and $result.eligible_agents_count -ne $test.ExpectedAgents) {
            Write-Host ""
            Write-Host "  ⚠️  Warning: Expected $($test.ExpectedAgents) agents, got $($result.eligible_agents_count)" -ForegroundColor Yellow
            $passed = $false
        }
        
        if ($test.ExpectedNames.Count -gt 0) {
            $actualNames = $result.eligible_agents | ForEach-Object { $_.name }
            $missing = $test.ExpectedNames | Where-Object { $actualNames -notcontains $_ }
            $extra = $actualNames | Where-Object { $test.ExpectedNames -notcontains $_ }
            
            if ($missing -or $extra) {
                Write-Host ""
                if ($missing) {
                    Write-Host "  ⚠️  Missing expected agents: $($missing -join ', ')" -ForegroundColor Yellow
                }
                if ($extra) {
                    Write-Host "  ℹ️  Additional agents: $($extra -join ', ')" -ForegroundColor Cyan
                }
                $passed = $false
            }
        }
        
        if ($passed) {
            Write-Host ""
            Write-Host "  ✅ Test validation: PASSED" -ForegroundColor Green
        }
        
        $results += @{
            Test = $test.Name
            Success = $true
            Passed = $passed
            AgentCount = $result.eligible_agents_count
            Expected = $test.ExpectedAgents
            OverrideState = $result.override_state
            Agents = ($result.eligible_agents | ForEach-Object { $_.name }) -join ", "
        }
    }
    else {
        Write-Host "  ❌ Unexpected response format" -ForegroundColor Red
        $results += @{
            Test = $test.Name
            Success = $false
            Error = "Unexpected response"
            AgentCount = 0
            Expected = $test.ExpectedAgents
        }
    }
    
    Write-Host ""
    Start-Sleep -Milliseconds 1000
}

# Summary
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                        TEST SUMMARY                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$successCount = ($results | Where-Object { $_.Success -and ($_.Passed -eq $true -or $_.Passed -eq $null) }).Count
$totalCount = $results.Count

foreach ($result in $results) {
    if ($result.Success) {
        $status = if ($result.Passed -eq $false) { "⚠️ " } else { "✅" }
        $override = if ($result.OverrideState) { " [Override State]" } else { "" }
        $agentInfo = if ($result.Agents) { " → $($result.Agents)" } else { "" }
        Write-Host "$status $($result.Test): $($result.AgentCount) agents$override$agentInfo"
    }
    else {
        Write-Host "❌ $($result.Test): ERROR - $($result.Error)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Results: $successCount/$totalCount tests passed" -ForegroundColor $(if ($successCount -eq $totalCount) { "Green" } else { "Yellow" })
Write-Host ""
Write-Host "📬 Check Slack channel #sample-center-transfer-channel for notifications!" -ForegroundColor Cyan
Write-Host ""
Write-Host "To view function logs:" -ForegroundColor Gray
Write-Host "  supabase functions logs notify-eligible-agents-with-upline" -ForegroundColor DarkGray
