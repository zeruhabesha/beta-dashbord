$baseUri = "http://localhost:5601/api/saved_objects/dashboard"
$username = "admin"
$password = "admin" # Security is disabled anyway, but headers might be needed if re-enabled
$headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${username}:${password}"))
    "osd-xsrf"      = "true"
    "Content-Type"  = "application/json"
}

# List of all view IDs that need a dashboard (excluding native apps like discover, visualize)
$viewIds = @(
    "overview", "visualize",
    "config-assessment", "malware", "fim",
    "hunting", "vuln-detect", "mitre",
    "hygiene", "pci", "gdpr", "hipaa", "nist",
    "docker", "aws", "gcp", "azure",
    "rules", "decoders", "logs",
    "traffic", "blocked", "ids-alerts", "signatures", "flows",
    "endpoints", "active-threats", "isolation", "process-tree", "file-integrity"
)

foreach ($id in $viewIds) {
    $dashboardId = "beta-page-$id"
    $title = "BETA View: $id"
    
    # Check if exists
    try {
        Invoke-RestMethod -Uri "http://localhost:5601/api/saved_objects/dashboard/$dashboardId" -Method Get -Headers $headers -ErrorAction Stop | Out-Null
        Write-Host "Skip: $dashboardId already exists." -ForegroundColor Gray
    }
    catch {
        # Create it
        Write-Host "Creating: $dashboardId ..." -ForegroundColor Cyan
        
        $body = @{
            attributes = @{
                title       = $title
                description = "Auto-generated dashboard for $id"
                panelsJSON  = "[]" # Empty dashboard
                optionsJSON = '{"hidePanelTitles":false,"useMargins":true}'
                version     = 1
                timeRestore = $false
            }
        } | ConvertTo-Json -Depth 5

        try {
            Invoke-RestMethod -Uri "$baseUri/$dashboardId" -Method Post -Headers $headers -Body $body | Out-Null
            Write-Host "Success: Created $dashboardId" -ForegroundColor Green
        }
        catch {
            Write-Host "Error creating $dashboardId : $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}
