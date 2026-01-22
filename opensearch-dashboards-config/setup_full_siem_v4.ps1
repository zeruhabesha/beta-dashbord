$baseUri = "http://localhost:5601/api/saved_objects"
$username = "admin"
$password = "S0c!Dash#2025_OpN"
$headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${username}:${password}"))
    "osd-xsrf"      = "true"
    "Content-Type"  = "application/json"
}

# 1. FIND CORRECT INDEX PATTERN ID
Write-Host "Finding index pattern..."
$findRes = Invoke-RestMethod -Uri "$baseUri/_find?type=index-pattern&search_fields=title&search=security-auditlog-*" -Method Get -Headers $headers
$correctId = $findRes.saved_objects[0].id
if (-not $correctId) { Write-Host "Error finding index pattern"; exit }

# 2. DEFINE INVESTIGATION VISUALIZATIONS

# A. User Activity Timeline (Line Chart split by User)
$visUserTime = @{
    attributes = @{
        title                 = "User Activity Timeline (Investigate)"
        visState              = '{"title":"User Activity Timeline","type":"line","params":{"type":"line","addTooltip":true,"addLegend":true,"legendPosition":"right"},"aggs":[{"id":"1","enabled":true,"type":"count","schema":"metric","params":{}},{"id":"2","enabled":true,"type":"date_histogram","schema":"segment","params":{"field":"@timestamp","interval":"auto"}},{"id":"3","enabled":true,"type":"terms","schema":"group","params":{"field":"audit_request_effective_user.keyword","size":5,"order":"desc","orderBy":"1"}}]}'
        uiStateJSON           = "{}"
        description           = "Activity by top users over time"
        version               = 1
        kibanaSavedObjectMeta = @{ searchSourceJSON = ('{"index":"' + $correctId + '","query":{"query":"","language":"kuery"},"filter":[]}') }
    }
    references = @(@{name = "kibanaSavedObjectMeta.searchSourceJSON.index"; type = "index-pattern"; id = $correctId })
}

# B. IP Reputation / High Risk IPs (Table)
$visIpRep = @{
    attributes = @{
        title                 = "Suspicious IP Lookup (Investigate)"
        visState              = '{"title":"Suspicious IP Lookup","type":"table","params":{"perPage":10,"showPartialRows":false,"showMetricsAtAllLevels":false,"sort":{"columnIndex":null,"direction":null},"showTotal":false,"totalFunc":"sum"},"aggs":[{"id":"1","enabled":true,"type":"count","schema":"metric","params":{}},{"id":"2","enabled":true,"type":"terms","schema":"bucket","params":{"field":"audit_request_remote_address.keyword","size":10,"order":"desc","orderBy":"1","customLabel":"High Risk Source IPs"}}]}'
        uiStateJSON           = "{}"
        description           = "IPs generating most events (Proxy for Reputation)"
        version               = 1
        kibanaSavedObjectMeta = @{ searchSourceJSON = ('{"index":"' + $correctId + '","query":{"query":"","language":"kuery"},"filter":[]}') }
    }
    references = @(@{name = "kibanaSavedObjectMeta.searchSourceJSON.index"; type = "index-pattern"; id = $correctId })
}

# C. Geo Map (Region Map - safer than Coordinate if no geo_point)
$visGeo = @{
    attributes = @{
        title                 = "Geo-Location Map (Investigate)"
        visState              = '{"title":"Geo-Location Map","type":"region_map","params":{"legendPosition":"bottomright","addTooltip":true,"colorSchema":"Yellow to Red","selectedLayerId":"osd_map_0","isLayerTOCOpen":false,"mapLayerXY":{"url":"https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png","attribution":"...","tms":false}},"aggs":[{"id":"1","enabled":true,"type":"count","schema":"metric","params":{}},{"id":"2","enabled":true,"type":"terms","schema":"segment","params":{"field":"audit_request_remote_address.keyword","size":5,"order":"desc","orderBy":"1"}}]}' 
        # Note: Using IP as segment for Region Map is distinct, usually needs Country Code. 
        # But we'll try 'Remote Address' as a placeholder if GeoIP lacking. 
        uiStateJSON           = "{}"
        description           = ""
        version               = 1
        kibanaSavedObjectMeta = @{ searchSourceJSON = ('{"index":"' + $correctId + '","query":{"query":"","language":"kuery"},"filter":[]}') }
    }
    references = @(@{name = "kibanaSavedObjectMeta.searchSourceJSON.index"; type = "index-pattern"; id = $correctId })
}

# D. Rule Explanation (Markdown)
$visRules = @{
    attributes = @{
        title                 = "Rule Explanation Panel (Investigate)"
        visState              = '{"title":"Rule Explanation Panel","type":"markdown","params":{"markdown":"### 🛡️ Active Security Rules\n\n**1. User Login Failure**\n- **Severity**: High\n- **Desc**: Multiple failed attempts detected.\n- **Action**: Verify user identity.\n\n**2. Policy Violation**\n- **Severity**: Medium\n- **Desc**: Access to restricted resource.\n- **Mapping**: _Privilege Escalation_"}}'
        uiStateJSON           = "{}"
        description           = ""
        version               = 1
        kibanaSavedObjectMeta = @{ searchSourceJSON = ('{"index":"' + $correctId + '","query":{"query":"","language":"kuery"},"filter":[]}') }
    }
    references = @(@{name = "kibanaSavedObjectMeta.searchSourceJSON.index"; type = "index-pattern"; id = $correctId })
}

# E. MITRE ATT&CK Heatmap (Category vs Node)
$visMitre = @{
    attributes = @{
        title                 = "MITRE ATT&CK Mapping (Investigate)"
        visState              = '{"title":"MITRE ATT&CK Mapping","type":"heatmap","params":{"addTooltip":true,"addLegend":true,"enableHover":false,"legendPosition":"right","times":[],"colorsNumber":4,"colorSchema":"Green to Red","setColorRange":false,"colorsRange":[]},"aggs":[{"id":"1","enabled":true,"type":"count","schema":"metric","params":{}},{"id":"2","enabled":true,"type":"terms","schema":"segment","params":{"field":"audit_category.keyword","size":5,"order":"desc","orderBy":"1","customLabel":"Tactic / Category"}},{"id":"3","enabled":true,"type":"terms","schema":"group","params":{"field":"audit_node_name.keyword","size":5,"order":"desc","orderBy":"1","customLabel":"Target Node"}}]}'
        uiStateJSON           = "{}"
        description           = "Heatmap of Tactics"
        version               = 1
        kibanaSavedObjectMeta = @{ searchSourceJSON = ('{"index":"' + $correctId + '","query":{"query":"","language":"kuery"},"filter":[]}') }
    }
    references = @(@{name = "kibanaSavedObjectMeta.searchSourceJSON.index"; type = "index-pattern"; id = $correctId })
}


# 3. CREATE/UPDATE VISUALIZATIONS
Write-Host "Creating Investigation Visualizations..."
Invoke-RestMethod -Uri "$baseUri/visualization/vis-user-timeline?overwrite=true" -Method Post -Headers $headers -Body ($visUserTime | ConvertTo-Json -Depth 5) | Out-Null
Invoke-RestMethod -Uri "$baseUri/visualization/vis-ip-reputation?overwrite=true" -Method Post -Headers $headers -Body ($visIpRep | ConvertTo-Json -Depth 5) | Out-Null
Invoke-RestMethod -Uri "$baseUri/visualization/vis-geo-map?overwrite=true" -Method Post -Headers $headers -Body ($visGeo | ConvertTo-Json -Depth 5) | Out-Null
Invoke-RestMethod -Uri "$baseUri/visualization/vis-rule-explainer?overwrite=true" -Method Post -Headers $headers -Body ($visRules | ConvertTo-Json -Depth 5) | Out-Null
Invoke-RestMethod -Uri "$baseUri/visualization/vis-mitre-heatmap?overwrite=true" -Method Post -Headers $headers -Body ($visMitre | ConvertTo-Json -Depth 5) | Out-Null


# 4. UPDATE SIEM DASHBOARD WITH NEW PANELS
# Refined Layout: Metric (Panel 1) on Top, Charts Below
$panelsJson = '[
  {"version":"7.6.0","gridData":{"x":0,"y":0,"w":12,"h":6,"i":"1"},"panelIndex":"1","embeddableConfig":{},"panelRefName":"panel_1"},
  
  {"version":"7.6.0","gridData":{"x":0,"y":6,"w":24,"h":12,"i":"2"},"panelIndex":"2","embeddableConfig":{},"panelRefName":"panel_2"},
  {"version":"7.6.0","gridData":{"x":24,"y":6,"w":24,"h":12,"i":"3"},"panelIndex":"3","embeddableConfig":{},"panelRefName":"panel_3"},
  
  {"version":"7.6.0","gridData":{"x":0,"y":18,"w":48,"h":12,"i":"6"},"panelIndex":"6","embeddableConfig":{},"panelRefName":"panel_6"},
  
  {"version":"7.6.0","gridData":{"x":0,"y":30,"w":24,"h":12,"i":"9"},"panelIndex":"9","embeddableConfig":{},"panelRefName":"panel_9"},
  {"version":"7.6.0","gridData":{"x":24,"y":30,"w":24,"h":12,"i":"10"},"panelIndex":"10","embeddableConfig":{},"panelRefName":"panel_10"},
  
  {"version":"7.6.0","gridData":{"x":0,"y":42,"w":24,"h":12,"i":"7"},"panelIndex":"7","embeddableConfig":{},"panelRefName":"panel_7"},
  {"version":"7.6.0","gridData":{"x":24,"y":42,"w":24,"h":12,"i":"8"},"panelIndex":"8","embeddableConfig":{},"panelRefName":"panel_8"},
  
  {"version":"7.6.0","gridData":{"x":0,"y":54,"w":24,"h":12,"i":"4"},"panelIndex":"4","embeddableConfig":{},"panelRefName":"panel_4"},
  {"version":"7.6.0","gridData":{"x":24,"y":54,"w":24,"h":12,"i":"5"},"panelIndex":"5","embeddableConfig":{},"panelRefName":"panel_5"}
]'

$siemDash = @{
    attributes = @{
        title                 = "BETA - SIEM Overview"
        description           = "Dashboard specifically for the SIEM view with tables and investigation tools"
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
        @{name = "panel_5"; type = "search"; id = "search-auth-events" },
        
        @{name = "panel_6"; type = "visualization"; id = "vis-user-timeline" },
        @{name = "panel_7"; type = "visualization"; id = "vis-ip-reputation" },
        @{name = "panel_8"; type = "visualization"; id = "vis-rule-explainer" },
        @{name = "panel_9"; type = "visualization"; id = "vis-geo-map" },
        @{name = "panel_10"; type = "visualization"; id = "vis-mitre-heatmap" }
    )
}

Write-Host "Updating SIEM Dashboard with Investigation Content..."
Invoke-RestMethod -Uri "$baseUri/dashboard/beta-page-overview?overwrite=true" -Method Post -Headers $headers -Body ($siemDash | ConvertTo-Json -Depth 10) | Out-Null
Write-Host "DONE. Investigation Content Added." -ForegroundColor Green
