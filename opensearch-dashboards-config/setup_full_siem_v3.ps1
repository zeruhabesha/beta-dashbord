$baseUri = "http://localhost:5601/api/saved_objects"
$username = "admin"
$password = "S0c!Dash#2025_OpN"
$headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${username}:${password}"))
    "osd-xsrf"      = "true"
    "Content-Type"  = "application/json"
}

# 1. FIND CORRECT INDEX PATTERN ID
Write-Host "Finding 'security-auditlog-*' index pattern..."
$findRes = Invoke-RestMethod -Uri "$baseUri/_find?type=index-pattern&search_fields=title&search=security-auditlog-*" -Method Get -Headers $headers
$correctId = $findRes.saved_objects[0].id

if (-not $correctId) {
    Write-Host "ERROR: Could not find index pattern 'security-auditlog-*'!" -ForegroundColor Red
    exit
}
Write-Host "Found Correct ID: $correctId" -ForegroundColor Green

# 2. DEFINITIONS (NOW INCLUDING SEARCHES)

# Visualizations
$viz1 = @{
    attributes = @{
        title                 = "Total Audit Events (Clean)"
        visState              = '{"title":"Total Audit Events","type":"metric","params":{"addTooltip":true,"addLegend":false,"type":"metric","metric":{"percentageMode":false,"useRanges":false,"colorSchema":"Green to Red","metricColorMode":"None","colorsRange":[{"from":0,"to":10000}],"labels":{"show":true},"invertColors":false,"style":{"bgFill":"#000","bgColor":false,"labelColor":false,"subText":"","fontSize":60}}},"aggs":[{"id":"1","enabled":true,"type":"count","schema":"metric","params":{}}]}'
        uiStateJSON           = "{}"
        description           = ""
        version               = 1
        kibanaSavedObjectMeta = @{ searchSourceJSON = ('{"index":"' + $correctId + '","query":{"query":"","language":"kuery"},"filter":[]}') }
    }
    references = @(@{name = "kibanaSavedObjectMeta.searchSourceJSON.index"; type = "index-pattern"; id = $correctId })
}

$viz2 = @{
    attributes = @{
        title                 = "Audit Events by Category (Clean)"
        visState              = '{"title":"Audit Events by Category","type":"pie","params":{"type":"pie","addTooltip":true,"addLegend":true,"legendPosition":"right","isDonut":true,"labels":{"show":false,"values":true,"last_level":true,"truncate":100}},"aggs":[{"id":"1","enabled":true,"type":"count","schema":"metric","params":{}},{"id":"2","enabled":true,"type":"terms","schema":"segment","params":{"field":"audit_category.keyword","orderBy":"1","order":"desc","size":10,"otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing"}}]}'
        uiStateJSON           = "{}"
        description           = ""
        version               = 1
        kibanaSavedObjectMeta = @{ searchSourceJSON = ('{"index":"' + $correctId + '","query":{"query":"","language":"kuery"},"filter":[]}') }
    }
    references = @(@{name = "kibanaSavedObjectMeta.searchSourceJSON.index"; type = "index-pattern"; id = $correctId })
}

$viz3 = @{
    attributes = @{
        title                 = "Audit Timeline (Clean)"
        visState              = '{"title":"Audit Timeline","type":"line","params":{"type":"line","grid":{"categoryLines":false},"categoryAxes":[{"id":"CategoryAxis-1","type":"category","position":"bottom","show":true,"style":{},"scale":{"type":"linear"},"labels":{"show":true,"filter":true,"truncate":100},"title":{}}],"valueAxes":[{"id":"ValueAxis-1","name":"LeftAxis-1","type":"value","position":"left","show":true,"style":{},"scale":{"type":"linear","mode":"normal"},"labels":{"show":true,"rotate":0,"filter":false,"truncate":100},"title":{"text":"Count"}}],"seriesParams":[{"show":true,"type":"line","mode":"normal","data":{"label":"Count","id":"1"},"valueAxis":"ValueAxis-1","drawLinesBetweenPoints":true,"lineWidth":2,"showCircles":true}],"addTooltip":true,"addLegend":true,"legendPosition":"right","times":[],"addTimeMarker":false,"thresholdLine":{"show":false,"value":10,"width":1,"style":"full","color":"#E7664C"}},"aggs":[{"id":"1","enabled":true,"type":"count","schema":"metric","params":{}},{"id":"2","enabled":true,"type":"date_histogram","schema":"segment","params":{"field":"@timestamp","timeRange":{"from":"now-7d","to":"now"},"useNormalizedEsInterval":true,"scaleMetricValues":false,"interval":"auto","drop_partials":false,"min_doc_count":1,"extended_bounds":{}}}]}'
        uiStateJSON           = "{}"
        description           = ""
        version               = 1
        kibanaSavedObjectMeta = @{ searchSourceJSON = ('{"index":"' + $correctId + '","query":{"query":"","language":"kuery"},"filter":[]}') }
    }
    references = @(@{name = "kibanaSavedObjectMeta.searchSourceJSON.index"; type = "index-pattern"; id = $correctId })
}

# Saved Searches (THE FIX)
$search1 = @{
    attributes = @{
        title                 = "Recent SIEM Alerts (Clean)"
        columns               = @("timestamp", "audit_node_name", "audit_category", "audit_request_effective_user", "audit_request_remote_address")
        sort                  = @(@("timestamp", "desc"))
        kibanaSavedObjectMeta = @{
            searchSourceJSON = ('{"index":"' + $correctId + '","highlightAll":true,"version":true,"query":{"query":"","language":"kuery"},"filter":[]}')
        }
    }
    references = @(@{name = "kibanaSavedObjectMeta.searchSourceJSON.index"; type = "index-pattern"; id = $correctId })
}

$search2 = @{
    attributes = @{
        title                 = "Authentication Events (Clean)"
        columns               = @("timestamp", "audit_request_effective_user", "audit_category", "audit_request_remote_address")
        sort                  = @(@("timestamp", "desc"))
        kibanaSavedObjectMeta = @{
            searchSourceJSON = ('{"index":"' + $correctId + '","highlightAll":true,"version":true,"query":{"query":"audit_category:FAILED_LOGIN OR audit_category:LOGIN","language":"kuery"},"filter":[]}')
        }
    }
    references = @(@{name = "kibanaSavedObjectMeta.searchSourceJSON.index"; type = "index-pattern"; id = $correctId })
}

# 3. EXECUTE UPDATES
Write-Host "Updating Visualizations..."
Invoke-RestMethod -Uri "$baseUri/visualization/vis-audit-total-clean?overwrite=true" -Method Post -Headers $headers -Body ($viz1 | ConvertTo-Json -Depth 5) | Out-Null
Invoke-RestMethod -Uri "$baseUri/visualization/vis-audit-category-clean?overwrite=true" -Method Post -Headers $headers -Body ($viz2 | ConvertTo-Json -Depth 5) | Out-Null
Invoke-RestMethod -Uri "$baseUri/visualization/vis-audit-timeline-clean?overwrite=true" -Method Post -Headers $headers -Body ($viz3 | ConvertTo-Json -Depth 5) | Out-Null

Write-Host "Updating Saved Searches..."
Invoke-RestMethod -Uri "$baseUri/search/search-recent-alerts?overwrite=true" -Method Post -Headers $headers -Body ($search1 | ConvertTo-Json -Depth 5) | Out-Null
Invoke-RestMethod -Uri "$baseUri/search/search-auth-events?overwrite=true" -Method Post -Headers $headers -Body ($search2 | ConvertTo-Json -Depth 5) | Out-Null


# 4. RE-APPLY DASHBOARD (Just to be sure)
$panelsJson = '[{"version":"7.6.0","gridData":{"x":0,"y":0,"w":24,"h":8,"i":"1"},"panelIndex":"1","embeddableConfig":{},"panelRefName":"panel_1"},{"version":"7.6.0","gridData":{"x":0,"y":8,"w":48,"h":15,"i":"2"},"panelIndex":"2","embeddableConfig":{},"panelRefName":"panel_2"},{"version":"7.6.0","gridData":{"x":24,"y":0,"w":24,"h":8,"i":"3"},"panelIndex":"3","embeddableConfig":{},"panelRefName":"panel_3"},{"version":"7.6.0","gridData":{"x":0,"y":23,"w":48,"h":12,"i":"4"},"panelIndex":"4","embeddableConfig":{},"panelRefName":"panel_4"},{"version":"7.6.0","gridData":{"x":0,"y":35,"w":48,"h":12,"i":"5"},"panelIndex":"5","embeddableConfig":{},"panelRefName":"panel_5"}]'

$siemDash = @{
    attributes = @{
        title                 = "SIEM Dedicated Dashboard"
        description           = "Dashboard specifically for the SIEM view with tables"
        panelsJSON            = $panelsJson
        optionsJSON           = '{"hidePanelTitles":false,"useMargins":true}'
        version               = 1
        timeRestore           = $true
        timeTo                = "now"
        timeFrom              = "now-7d"
        kibanaSavedObjectMeta = @{ searchSourceJSON = '{"query":{"query":"","language":"kuery"},"filter":[]}' }
    }
    references = @(
        @{name = "panel_1"; type = "visualization"; id = "vis-audit-total-clean" },
        @{name = "panel_2"; type = "visualization"; id = "vis-audit-timeline-clean" },
        @{name = "panel_3"; type = "visualization"; id = "vis-audit-category-clean" },
        @{name = "panel_4"; type = "search"; id = "search-recent-alerts" },
        @{name = "panel_5"; type = "search"; id = "search-auth-events" }
    )
}

Write-Host "Updating SIEM Dashboard..."
$res = Invoke-RestMethod -Uri "$baseUri/dashboard/dashboard-siem-main?overwrite=true" -Method Post -Headers $headers -Body ($siemDash | ConvertTo-Json -Depth 10)
Write-Host "DONE. All objects updated with correct ID: $correctId" -ForegroundColor Green
