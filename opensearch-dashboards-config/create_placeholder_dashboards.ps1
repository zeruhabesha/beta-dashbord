$baseUri = "http://localhost:5601/api/saved_objects"
$headers = @{
    "osd-xsrf"      = "true"
    "Content-Type"  = "application/json"
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:S0c!Dash#2025_OpN"))
}

# List of missing SIEM dashboard IDs referenced in App.jsx/ModuleConfig
$missingDashboards = @(
    "beta-page-config-assessment",
    "beta-page-malware",
    "beta-page-fim",
    "beta-page-hunting",
    "beta-page-vuln-detect",
    "beta-page-mitre",
    "beta-page-hygiene",
    "beta-page-pci",
    "beta-page-gdpr",
    "beta-page-hipaa",
    "beta-page-nist",
    "beta-page-docker",
    "beta-page-aws",
    "beta-page-gcp",
    "beta-page-azure",
    "beta-page-rules",
    "beta-page-decoders",
    "beta-page-logs"
)

foreach ($dashId in $missingDashboards) {
    # Check if exists
    try {
        $check = Invoke-RestMethod -Uri "$baseUri/dashboard/$dashId" -Method Get -Headers $headers -ErrorAction Stop
        Write-Host "Dashboard $dashId already exists." -ForegroundColor Gray
    }
    catch {
        # Create Placeholder
        $title = $dashId.Replace("beta-page-", "").Replace("-", " ").ToUpper()
        Write-Host "Creating placeholder dashboard: $title ($dashId)..."
        
        $body = @{
            attributes = @{
                title       = "BETA - $title"
                description = "Placeholder dashboard for $title"
                panelsJSON  = "[]"
                optionsJSON = '{"useMargins":true,"hidePanelTitles":false}'
                version     = 1
            }
        } | ConvertTo-Json -Depth 5
        
        Invoke-RestMethod -Uri "$baseUri/dashboard/$dashId" -Method Post -Headers $headers -Body $body | Out-Null
        Write-Host "Created $dashId" -ForegroundColor Green
    }
}
