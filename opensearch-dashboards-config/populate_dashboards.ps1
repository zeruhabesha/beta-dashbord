# Script to create visualizations and populate dashboards
$baseUri = "http://localhost:5601/api/saved_objects"
$headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:admin"))
    "osd-xsrf"      = "true"
    "Content-Type"  = "application/json"
}

Write-Host "Creating visualizations..." -ForegroundColor Cyan

# 1. Total Events Metric
$totalEventsVis = @{
    attributes = @{
        title                 = "Total Events"
        visState              = '{"title":"Total Events","type":"metric","aggs":[{"id":"1","enabled":true,"type":"count","params":{},"schema":"metric"}],"params":{"addTooltip":true,"addLegend":false,"type":"metric","metric":{"percentageMode":false,"useRanges":false,"colorSchema":"Green to Red","metricColorMode":"None","colorsRange":[{"from":0,"to":10000}],"labels":{"show":true},"invertColors":false,"style":{"bgFill":"#000","bgColor":false,"labelColor":false,"subText":"","fontSize":60}}}}'
        uiStateJSON           = "{}"
        description           = "Total event count"
        version               = 1
        kibanaSavedObjectMeta = @{
            searchSourceJSON = '{"index":"security-auditlog-*","query":{"query":"","language":"kuery"},"filter":[]}'
        }
    }
    references = @(
        @{ name = "kibanaSavedObjectMeta.searchSourceJSON.index"; type = "index-pattern"; id = "security-auditlog-*" }
    )
} | ConvertTo-Json -Depth 10

try {
    Invoke-RestMethod -Uri "$baseUri/visualization/vis-total-events" -Method Post -Headers $headers -Body $totalEventsVis | Out-Null
    Write-Host "  ✓ Created: Total Events metric" -ForegroundColor Green
}
catch {
    Write-Host "  Skip: Total Events (exists)" -ForegroundColor Gray
}

# 2. Events Over Time (Timeline)
$timelineVis = @{
    attributes = @{
        title                 = "Events Over Time"
        visState              = '{"title":"Events Over Time","type":"histogram","aggs":[{"id":"1","enabled":true,"type":"count","params":{},"schema":"metric"},{"id":"2","enabled":true,"type":"date_histogram","params":{"field":"@timestamp","timeRange":{"from":"now-24h","to":"now"},"useNormalizedEsInterval":true,"scaleMetricValues":false,"interval":"auto","drop_partials":false,"min_doc_count":1,"extended_bounds":{}},"schema":"segment"}],"params":{"type":"histogram","grid":{"categoryLines":false},"categoryAxes":[{"id":"CategoryAxis-1","type":"category","position":"bottom","show":true,"style":{},"scale":{"type":"linear"},"labels":{"show":true,"filter":true,"truncate":100},"title":{}}],"valueAxes":[{"id":"ValueAxis-1","name":"LeftAxis-1","type":"value","position":"left","show":true,"style":{},"scale":{"type":"linear","mode":"normal"},"labels":{"show":true,"rotate":0,"filter":false,"truncate":100},"title":{"text":"Count"}}],"seriesParams":[{"show":true,"type":"histogram","mode":"stacked","data":{"label":"Count","id":"1"},"valueAxis":"ValueAxis-1","drawLinesBetweenPoints":true,"lineWidth":2,"showCircles":true}],"addTooltip":true,"addLegend":true,"legendPosition":"right","times":[],"addTimeMarker":false,"labels":{"show":false},"thresholdLine":{"show":false,"value":10,"width":1,"style":"full","color":"#E7664C"}}}'
        uiStateJSON           = "{}"
        description           = "Event timeline"
        version               = 1
        kibanaSavedObjectMeta = @{
            searchSourceJSON = '{"index":"security-auditlog-*","query":{"query":"","language":"kuery"},"filter":[]}'
        }
    }
    references = @(
        @{ name = "kibanaSavedObjectMeta.searchSourceJSON.index"; type = "index-pattern"; id = "security-auditlog-*" }
    )
} | ConvertTo-Json -Depth 10

try {
    Invoke-RestMethod -Uri "$baseUri/visualization/vis-events-timeline" -Method Post -Headers $headers -Body $timelineVis | Out-Null
    Write-Host "  ✓ Created: Events Over Time chart" -ForegroundColor Green
}
catch {
    Write-Host "  Skip: Events Over Time (exists)" -ForegroundColor Gray
}

# 3. Top Hosts Pie Chart
$topHostsVis = @{
    attributes = @{
        title                 = "Top Hosts"
        visState              = '{"title":"Top Hosts","type":"pie","aggs":[{"id":"1","enabled":true,"type":"count","params":{},"schema":"metric"},{"id":"2","enabled":true,"type":"terms","params":{"field":"audit_node_name","orderBy":"1","order":"desc","size":10,"otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing"},"schema":"segment"}],"params":{"type":"pie","addTooltip":true,"addLegend":true,"legendPosition":"right","isDonut":true,"labels":{"show":false,"values":true,"last_level":true,"truncate":100}}}'
        uiStateJSON           = "{}"
        description           = "Top hosts by event count"
        version               = 1
        kibanaSavedObjectMeta = @{
            searchSourceJSON = '{"index":"security-auditlog-*","query":{"query":"","language":"kuery"},"filter":[]}'
        }
    }
    references = @(
        @{ name = "kibanaSavedObjectMeta.searchSourceJSON.index"; type = "index-pattern"; id = "security-auditlog-*" }
    )
} | ConvertTo-Json -Depth 10

try {
    Invoke-RestMethod -Uri "$baseUri/visualization/vis-top-hosts" -Method Post -Headers $headers -Body $topHostsVis | Out-Null
    Write-Host "  ✓ Created: Top Hosts pie chart" -ForegroundColor Green
}
catch {
    Write-Host "  Skip: Top Hosts (exists)" -ForegroundColor Gray
}

Write-Host "`nAdding visualizations to dashboards..." -ForegroundColor Cyan

# Update SIEM Overview Dashboard
$siemPanels = '[{"version":"2.13.0","gridData":{"x":0,"y":0,"w":12,"h":8,"i":"1"},"panelIndex":"1","embeddableConfig":{},"panelRefName":"panel_1"},{"version":"2.13.0","gridData":{"x":0,"y":8,"w":48,"h":15,"i":"2"},"panelIndex":"2","embeddableConfig":{},"panelRefName":"panel_2"},{"version":"2.13.0","gridData":{"x":12,"y":0,"w":12,"h":8,"i":"3"},"panelIndex":"3","embeddableConfig":{},"panelRefName":"panel_3"}]'

$siemDashboard = @{
    attributes = @{
        title                 = "SIEM - overview"
        description           = "SIEM team overview dashboard with visualizations"
        panelsJSON            = $siemPanels
        optionsJSON           = '{"hidePanelTitles":false,"useMargins":true}'
        version               = 1
        timeRestore           = $true
        timeFrom              = "now-24h"
        timeTo                = "now"
        kibanaSavedObjectMeta = @{
            searchSourceJSON = '{"query":{"query":"","language":"kuery"},"filter":[]}'
        }
    }
    references = @(
        @{ name = "panel_1"; type = "visualization"; id = "vis-total-events" }
        @{ name = "panel_2"; type = "visualization"; id = "vis-events-timeline" }
        @{ name = "panel_3"; type = "visualization"; id = "vis-top-hosts" }
    )
} | ConvertTo-Json -Depth 10

try {
    Invoke-RestMethod -Uri "$baseUri/dashboard/siem-overview?overwrite=true" -Method Put -Headers $headers -Body $siemDashboard | Out-Null
    Write-Host "  ✓ Updated: siem-overview dashboard" -ForegroundColor Green
}
catch {
    Write-Host "  ✗ Error updating siem-overview: $($_.Exception.Message)" -ForegroundColor Red
}

# Update IDS Traffic Dashboard
try {
    Invoke-RestMethod -Uri "$baseUri/dashboard/ids-traffic?overwrite=true" -Method Put -Headers $headers -Body $siemDashboard.Replace('"SIEM - overview"', '"IDS - traffic"').Replace('"SIEM team"', '"IDS team"') | Out-Null
    Write-Host "  ✓ Updated: ids-traffic dashboard" -ForegroundColor Green
}
catch {
    Write-Host "  ✗ Error updating ids-traffic: $($_.Exception.Message)" -ForegroundColor Red
}

# Update EDR Endpoints Dashboard
try {
    Invoke-RestMethod -Uri "$baseUri/dashboard/edr-endpoints?overwrite=true" -Method Put -Headers $headers -Body $siemDashboard.Replace('"SIEM - overview"', '"EDR - endpoints"').Replace('"SIEM team"', '"EDR team"') | Out-Null
    Write-Host "  ✓ Updated: edr-endpoints dashboard" -ForegroundColor Green
}
catch {
    Write-Host "  ✗ Error updating edr-endpoints: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nDone! Dashboards now have visualizations." -ForegroundColor Green
Write-Host "Refresh your browser to see the changes." -ForegroundColor Yellow
