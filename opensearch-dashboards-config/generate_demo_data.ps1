$indexName = "security-auditlog-$(Get-Date -Format 'yyyy.MM.dd')"
$baseUri = "http://localhost:9200/$indexName/_doc"
$username = "admin"
$password = "S0c!Dash#2025_OpN"
$headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${username}:${password}"))
    "Content-Type"  = "application/json"
}

Write-Host "Generating Dense Demo Data (1 per minute) for: $indexName"

$users = @("admin", "jdoe", "alice", "bob", "system")
$actions = @("login_success", "login_failed", "file_access", "process_start", "network_connection", "data_exfil_attempt")
$categories = @("authentication", "file_integrity", "process", "network", "threat")
$ips = @("192.168.1.10", "10.0.0.5", "172.16.0.23", "45.33.22.11", "192.168.1.105")

# Generate 300 events (Last 5 hours, 1 per minute)
for ($i = 0; $i -le 300; $i++) {
    $timestamp = (Get-Date).AddMinutes(-$i).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    
    $user = $users | Get-Random
    $action = $actions | Get-Random
    $category = $categories | Get-Random
    $ip = $ips | Get-Random
    
    # Logic for correlation
    if ($action -eq "login_failed") { $category = "authentication"; $severity = "high" }
    elseif ($action -eq "data_exfil_attempt") { $category = "threat"; $severity = "critical" }
    else { $severity = "low" }

    if ($action -eq "login_failed") { $user = "unknown" } 

    $doc = @{
        "@timestamp"                   = $timestamp
        "audit_request_effective_user" = $user
        "audit_category"               = $category
        "audit_request_remote_address" = $ip
        "audit_node_name"              = "node-1"
        "audit_request_action"         = $action
        "severity"                     = $severity
        "message"                      = "Detected $action by $user from $ip"
    }

    try {
        Invoke-RestMethod -Uri $baseUri -Method Post -Headers $headers -Body ($doc | ConvertTo-Json) | Out-Null
        if ($i % 50 -eq 0) { Write-Host -NoNewline "." }
    }
    catch {
        Write-Error "Failed to index doc: $($_.Exception.Message)"
    }
}
Write-Host "`nDone. Added 300 dense sample documents." -ForegroundColor Green
