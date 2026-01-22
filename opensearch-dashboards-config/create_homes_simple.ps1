$headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:admin"))
    "osd-xsrf"      = "true"
    "Content-Type"  = "application/json"
}

Write-Host "Creating team home dashboards..." -ForegroundColor Cyan

# Create empty home dashboards for each team
$teams = @("siem", "ids", "edr")

foreach ($team in $teams) {
    $dashboardId = "$team-home"
    $title = "$($team.ToUpper()) - Home"
    
    $body = "{`"attributes`":{`"title`":`"$title`",`"description`":`"$team team home page`",`"panelsJSON`":`"[]`",`"optionsJSON`":`"{}`",`"version`":1,`"timeRestore`":false}}"
    
    try {
        Invoke-RestMethod -Uri "http://localhost:5601/api/saved_objects/dashboard/$dashboardId" -Method Post -Headers $headers -Body $body -ErrorAction Stop | Out-Null
        Write-Host "  Created: $dashboardId" -ForegroundColor Green
    }
    catch {
        Write-Host "  Skip: $dashboardId (already exists)" -ForegroundColor Gray
    }
}

Write-Host "`nDone! Home dashboards created." -ForegroundColor Green
Write-Host "Refresh your browser to see the changes." -ForegroundColor Yellow
