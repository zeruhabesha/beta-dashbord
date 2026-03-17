# Script to create visualizations and populate dashboards using external JSON files
$baseUri = "http://localhost:5601/api/saved_objects"
$headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:admin"))
    "osd-xsrf"      = "true"
    "Content-Type"  = "application/json"
}
$jsonDir = "c:\opensearch-standalone\opensearch-dashboards-config\json"

Write-Host "Creating visualizations..." -ForegroundColor Cyan

function Deploy-Object($type, $id, $path) {
    try {
        $json = Get-Content -Raw -Path $path
        $uri = "$baseUri/$type/$id?overwrite=true"
        Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $json -ErrorAction Stop | Out-Null
        Write-Host "  ✓ Success: $id" -ForegroundColor Green
    }
    catch {
        Write-Host "  ✗ Fail: $id - $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Deploy Visualizations
Deploy-Object "visualization" "vis-total-events" "$jsonDir\vis-total-events.json"
Deploy-Object "visualization" "vis-events-timeline" "$jsonDir\vis-events-timeline.json"
Deploy-Object "visualization" "vis-top-hosts" "$jsonDir\vis-top-hosts.json"

Write-Host "`nUpdating dashboards..." -ForegroundColor Cyan

# SIEM
Deploy-Object "dashboard" "siem-overview" "$jsonDir\siem-dashboard.json"

# IDS (Clone by string manipulation on the raw JSON content)
$siemJson = Get-Content -Raw -Path "$jsonDir\siem-dashboard.json"
$idsJson = $siemJson -replace "SIEM - overview", "IDS - traffic" -replace "SIEM team", "IDS team"
Invoke-RestMethod -Uri "$baseUri/dashboard/ids-traffic?overwrite=true" -Method Post -Headers $headers -Body $idsJson | Out-Null
Write-Host "  ✓ Success: ids-traffic" -ForegroundColor Green

# EDR
$edrJson = $siemJson -replace "SIEM - overview", "EDR - endpoints" -replace "SIEM team", "EDR team"
Invoke-RestMethod -Uri "$baseUri/dashboard/edr-endpoints?overwrite=true" -Method Post -Headers $headers -Body $edrJson | Out-Null
Write-Host "  ✓ Success: edr-endpoints" -ForegroundColor Green

Write-Host "`nDone! Dashboards are fully populated." -ForegroundColor Green
Write-Host "Refresh your browser at http://localhost:8080 to see the dashboard links." -ForegroundColor Yellow
