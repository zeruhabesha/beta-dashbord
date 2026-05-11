# Ensure index pattern exists and is set as default
$baseUri = "http://localhost:5601/api/saved_objects"
$headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:admin"))
    "osd-xsrf"      = "true"
    "Content-Type"  = "application/json"
}

Write-Host "Step 1: Creating index pattern..." -ForegroundColor Cyan

$indexPattern = '{"attributes":{"title":"tenant-01-siem-*","timeFieldName":"@timestamp"}}'

try {
    Invoke-RestMethod -Uri "http://localhost:5601/api/saved_objects/index-pattern/tenant-01-siem-*" -Method Post -Headers $headers -Body $indexPattern -ErrorAction Stop | Out-Null
    Write-Host "  Created index pattern" -ForegroundColor Green
}
catch {
    Write-Host "  Already exists" -ForegroundColor Gray
}

Write-Host "`nStep 2: Updating Dashboards config..." -ForegroundColor Cyan
try {
    $configFind = Invoke-RestMethod -Uri "$baseUri/_find?type=config" -Method Get -Headers $headers -ErrorAction Stop
    if ($configFind.saved_objects.Count -gt 0) {
        $configId = $configFind.saved_objects[0].id
        $body = @{
            attributes = @{
                "defaultIndex" = "tenant-01-siem-*"
                "dateFormat:tz" = "UTC"
            }
        } | ConvertTo-Json -Depth 5

        Invoke-RestMethod -Uri "$baseUri/config/$configId" -Method Put -Headers $headers -Body $body -ErrorAction Stop | Out-Null
        Write-Host "  Set default index and timezone to UTC" -ForegroundColor Green
    }
    else {
        Write-Warning "  Could not find a config object to update."
    }
}
catch {
    Write-Warning "  Could not update Dashboards config: $($_.Exception.Message)"
}

Write-Host "`nSetup complete!" -ForegroundColor Green
