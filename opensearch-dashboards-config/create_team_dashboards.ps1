# SIEM Team Dashboards
$siemViews = "overview", "config-assessment", "malware", "fim", "hunting", "vuln-detect", "mitre", "hygiene", "pci", "gdpr", "hipaa", "nist", "docker", "aws", "gcp", "azure", "rules", "decoders", "logs"

# IDS Team Dashboards  
$idsViews = "traffic", "blocked", "ids-alerts", "signatures", "flows"

# EDR Team Dashboards
$edrViews = "endpoints", "active-threats", "isolation", "malware", "process-tree", "file-integrity", "hunting"

$headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:admin"))
    "osd-xsrf"      = "true"
    "Content-Type"  = "application/json"
}

Write-Host "Creating SIEM dashboards..." -ForegroundColor Cyan
foreach ($view in $siemViews) {
    $id = "siem-$view"
    $body = "{`"attributes`":{`"title`":`"SIEM - $view`",`"description`":`"SIEM team dashboard`",`"panelsJSON`":`"[]`",`"optionsJSON`":`"{}`",`"version`":1,`"timeRestore`":false}}"
    try {
        Invoke-RestMethod -Uri "http://localhost:5601/api/saved_objects/dashboard/$id" -Method Post -Headers $headers -Body $body -ErrorAction Stop | Out-Null
        Write-Host "  Created: $id" -ForegroundColor Green
    }
    catch {
        Write-Host "  Skip: $id (already exists)" -ForegroundColor Gray
    }
}

Write-Host "`nCreating IDS dashboards..." -ForegroundColor Cyan
foreach ($view in $idsViews) {
    $id = "ids-$view"
    $body = "{`"attributes`":{`"title`":`"IDS - $view`",`"description`":`"IDS team dashboard`",`"panelsJSON`":`"[]`",`"optionsJSON`":`"{}`",`"version`":1,`"timeRestore`":false}}"
    try {
        Invoke-RestMethod -Uri "http://localhost:5601/api/saved_objects/dashboard/$id" -Method Post -Headers $headers -Body $body -ErrorAction Stop | Out-Null
        Write-Host "  Created: $id" -ForegroundColor Green
    }
    catch {
        Write-Host "  Skip: $id (already exists)" -ForegroundColor Gray
    }
}

Write-Host "`nCreating EDR dashboards..." -ForegroundColor Cyan
foreach ($view in $edrViews) {
    $id = "edr-$view"
    $body = "{`"attributes`":{`"title`":`"EDR - $view`",`"description`":`"EDR team dashboard`",`"panelsJSON`":`"[]`",`"optionsJSON`":`"{}`",`"version`":1,`"timeRestore`":false}}"
    try {
        Invoke-RestMethod -Uri "http://localhost:5601/api/saved_objects/dashboard/$id" -Method Post -Headers $headers -Body $body -ErrorAction Stop | Out-Null
        Write-Host "  Created: $id" -ForegroundColor Green
    }
    catch {
        Write-Host "  Skip: $id (already exists)" -ForegroundColor Gray
    }
}

Write-Host "`nDone! Created team-specific dashboards." -ForegroundColor Green
