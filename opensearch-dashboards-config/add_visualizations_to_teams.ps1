$headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:admin"))
    "osd-xsrf"      = "true"
    "Content-Type"  = "application/json"
}

Write-Host "Copying visualizations to team dashboards..." -ForegroundColor Cyan

# Panel configuration with the imported visualizations
$panels = @"
[
  {"version":"2.13.0","gridData":{"x":0,"y":0,"w":16,"h":8,"i":"1"},"panelIndex":"1","embeddableConfig":{},"panelRefName":"panel_1"},
  {"version":"2.13.0","gridData":{"x":16,"y":0,"w":32,"h":8,"i":"2"},"panelIndex":"2","embeddableConfig":{},"panelRefName":"panel_2"},
  {"version":"2.13.0","gridData":{"x":0,"y":8,"w":48,"h":15,"i":"3"},"panelIndex":"3","embeddableConfig":{},"panelRefName":"panel_3"}
]
"@

$references = @(
    @{name = "panel_1"; type = "visualization"; id = "total-audit-events-final" }
    @{name = "panel_2"; type = "visualization"; id = "audit-category-final" }
    @{name = "panel_3"; type = "visualization"; id = "audit-timeline-final" }
)

# Update SIEM Overview
$siemBody = @{
    attributes = @{
        title                 = "SIEM - overview"
        description           = "SIEM team overview with visualizations"
        panelsJSON            = $panels
        optionsJSON           = '{"hidePanelTitles":false,"useMargins":true}'
        version               = 1
        timeRestore           = $true
        timeFrom              = "now-24h"
        timeTo                = "now"
        kibanaSavedObjectMeta = @{
            searchSourceJSON = '{"query":{"query":"","language":"kuery"},"filter":[]}'
        }
    }
    references = $references
} | ConvertTo-Json -Depth 10

try {
    Invoke-RestMethod -Uri "http://localhost:5601/api/saved_objects/dashboard/siem-overview?overwrite=true" -Method Put -Headers $headers -Body $siemBody | Out-Null
    Write-Host "  ✓ Updated siem-overview" -ForegroundColor Green
}
catch {
    Write-Host "  ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Update IDS Traffic
$idsBody = $siemBody.Replace('"SIEM - overview"', '"IDS - traffic"').Replace('"SIEM team"', '"IDS team"')
try {
    Invoke-RestMethod -Uri "http://localhost:5601/api/saved_objects/dashboard/ids-traffic?overwrite=true" -Method Put -Headers $headers -Body $idsBody | Out-Null
    Write-Host "  ✓ Updated ids-traffic" -ForegroundColor Green
}
catch {
    Write-Host "  ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Update EDR Endpoints
$edrBody = $siemBody.Replace('"SIEM - overview"', '"EDR - endpoints"').Replace('"SIEM team"', '"EDR team"')
try {
    Invoke-RestMethod -Uri "http://localhost:5601/api/saved_objects/dashboard/edr-endpoints?overwrite=true" -Method Put -Headers $headers -Body $edrBody | Out-Null
    Write-Host "  ✓ Updated edr-endpoints" -ForegroundColor Green
}
catch {
    Write-Host "  ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nDone! Team dashboards now have visualizations." -ForegroundColor Green
Write-Host "Refresh your browser to see the charts and metrics." -ForegroundColor Yellow
