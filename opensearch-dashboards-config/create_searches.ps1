$baseUri = "http://localhost:5601/api/saved_objects/search"
$username = "admin"
$password = "S0c!Dash#2025_OpN"
$headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${username}:${password}"))
    "osd-xsrf"      = "true"
    "Content-Type"  = "application/json"
}

# 1. Recent Alerts
$body1 = @{
    attributes = @{
        title                 = "Recent SIEM Alerts (Clean)"
        columns               = @("timestamp", "audit_node_name", "audit_category", "audit_request_effective_user", "audit_request_remote_address")
        sort                  = @(@("timestamp", "desc"))
        kibanaSavedObjectMeta = @{
            searchSourceJSON = '{"index":"13c1840","query":{"query":"","language":"kuery"},"filter":[]}'
        }
    }
} | ConvertTo-Json -Depth 5

# 2. Auth Events
$body2 = @{
    attributes = @{
        title                 = "Authentication Events (Clean)"
        columns               = @("timestamp", "audit_request_effective_user", "audit_category", "audit_request_remote_address")
        sort                  = @(@("timestamp", "desc"))
        kibanaSavedObjectMeta = @{
            searchSourceJSON = '{"index":"13c1840","query":{"query":"audit_category:FAILED_LOGIN OR audit_category:LOGIN","language":"kuery"},"filter":[]}'
        }
    }
} | ConvertTo-Json -Depth 5

# Execute
Write-Host "Creating Recent Alerts..."
try {
    Invoke-RestMethod -Uri "$baseUri/search-recent-alerts?overwrite=true" -Method Post -Headers $headers -Body $body1
    Write-Host "Success: Recent Alerts"
}
catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Resp: $($_.Exception.Response.GetResponseStream() | %{ [char]$_ } | join-string)"
}

Write-Host "Creating Auth Events..."
try {
    Invoke-RestMethod -Uri "$baseUri/search-auth-events?overwrite=true" -Method Post -Headers $headers -Body $body2
    Write-Host "Success: Auth Events"
}
catch {
    Write-Host "Error: $($_.Exception.Message)"
}
