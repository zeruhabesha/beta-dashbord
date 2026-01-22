# First, ensure index pattern exists
$headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:admin"))
    "osd-xsrf"      = "true"
    "Content-Type"  = "application/json"
}

Write-Host "Step 1: Creating index pattern..." -ForegroundColor Cyan

$indexPattern = '{"attributes":{"title":"security-auditlog-*","timeFieldName":"@timestamp"}}'

try {
    Invoke-RestMethod -Uri "http://localhost:5601/api/saved_objects/index-pattern/security-auditlog-*" -Method Post -Headers $headers -Body $indexPattern -ErrorAction Stop | Out-Null
    Write-Host "  ✓ Created index pattern" -ForegroundColor Green
}
catch {
    Write-Host "  Index pattern already exists" -ForegroundColor Gray
}

Write-Host "`nStep 2: Setting as default index pattern..." -ForegroundColor Cyan
try {
    Invoke-RestMethod -Uri "http://localhost:5601/api/opensearch-dashboards/settings/defaultIndex" -Method Post -Headers $headers -Body '{"value":"security-auditlog-*"}' -ErrorAction Stop | Out-Null
    Write-Host "  ✓ Set as default" -ForegroundColor Green
}
catch {
    Write-Host "  Already set as default" -ForegroundColor Gray
}

Write-Host "`nStep 3: You can now manually add visualizations:" -ForegroundColor Yellow
Write-Host "  1. Go to http://localhost:5601" -ForegroundColor White
Write-Host "  2. Click 'Visualize' in the left menu" -ForegroundColor White
Write-Host "  3. Click 'Create visualization'" -ForegroundColor White
Write-Host "  4. Choose visualization type (Metric, Line, Pie, etc.)" -ForegroundColor White
Write-Host "  5. Select 'security-auditlog-*' as the index" -ForegroundColor White
Write-Host "  6. Configure and save your visualization" -ForegroundColor White
Write-Host "  7. Go to your dashboard and click 'Edit'" -ForegroundColor White
Write-Host "  8. Click 'Add' and select your saved visualizations" -ForegroundColor White

Write-Host "`nAlternatively, I can import pre-built visualizations from the saved objects file..." -ForegroundColor Cyan
