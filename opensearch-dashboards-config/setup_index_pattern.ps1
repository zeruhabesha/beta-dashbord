# Ensure index pattern exists and is set as default
$headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:admin"))
    "osd-xsrf"      = "true"
    "Content-Type"  = "application/json"
}

Write-Host "Step 1: Creating index pattern..." -ForegroundColor Cyan

$indexPattern = '{"attributes":{"title":"tenant-01-siem-*","timeFieldName":"@timestamp"}}'

try {
    Invoke-RestMethod -Uri "http://localhost:5601/api/saved_objects/index-pattern/tenant-01-siem-*" -Method Post -Headers $headers -Body $indexPattern -ErrorAction Stop | Out-Null
    Write-Host "  ✓ Created index pattern" -ForegroundColor Green
}
catch {
    Write-Host "  Already exists" -ForegroundColor Gray
}

Write-Host "`nStep 2: Setting as default index pattern..." -ForegroundColor Cyan
try {
    Invoke-RestMethod -Uri "http://localhost:5601/api/opensearch-dashboards/settings/defaultIndex" -Method Post -Headers $headers -Body '{"value":"tenant-01-siem-*"}' -ErrorAction Stop | Out-Null
    Write-Host "  ✓ Set as default" -ForegroundColor Green
}
catch {
    Write-Host "  Already set as default" -ForegroundColor Gray
}

Write-Host "`nSetup complete!" -ForegroundColor Green
