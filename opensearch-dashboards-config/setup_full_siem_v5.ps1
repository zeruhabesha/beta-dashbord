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

# 2. DEFINE METRIC VISUALIZATIONS

# Helper for Metric Viz Properties
function New-MetricViz ($title, $label, $filterQuery, $aggType = "count", $field = "") {
    $aggs = @(
        @{id = "1"; enabled = $true; type = $aggType; schema = "metric"; params = @{customLabel = $label } }
    )
    if ($aggType -eq "cardinality") {
        $aggs[0].params.field = $field
    }

    return @{
        attributes = @{
            title                 = $title
            visState              = '{"title":"' + $title + '","type":"metric","params":{"addTooltip":true,"addLegend":false,"type":"metric","metric":{"percentageMode":false,"useRanges":false,"colorSchema":"Green to Red","metricColorMode":"None","colorsRange":[{"from":0,"to":10000}],"labels":{"show":true},"invertColors":false,"style":{"bgFill":"#000","bgColor":false,"labelColor":false,"subText":"","fontSize":40}}},"aggs":' + ($aggs | ConvertTo-Json -Depth 5) + '}'
            uiStateJSON           = "{}"
            description           = "KPI Card for " + $label
            version               = 1
            kibanaSavedObjectMeta = @{ searchSourceJSON = ('{"index":"' + $correctId + '","query":{"query":"' + $filterQuery + '","language":"kuery"},"filter":[]}') }
        }
        references = @(@{name = "kibanaSavedObjectMeta.searchSourceJSON.index"; type = "index-pattern"; id = $correctId })
    }
}

# A. Total Events
$vizTotal = New-MetricViz "KPI - Total Events" "TOTAL EVENTS" ""

# B. Critical Alerts (Simulated with Category for now)
$vizCrit = New-MetricViz "KPI - Critical Alerts" "CRITICAL ALERTS" "audit_category:FAILED_LOGIN or audit_request_status:CRITICAL"

# C. Auth Failures
$vizAuth = New-MetricViz "KPI - Auth Failures" "AUTH FAILURES" "audit_category:FAILED_LOGIN"

# D. Unique Users
$vizUsers = New-MetricViz "KPI - Unique Users" "UNIQUE USERS" "" "cardinality" "audit_request_effective_user.keyword"

# E. Policy Violations
$vizPolicy = New-MetricViz "KPI - Policy Violations" "POLICY VIOLATIONS" "audit_category:SSL_EXCEPTION or audit_category:POLICY"

# 3. CREATE VISUALIZATIONS
Write-Host "Creating KPI Metrics..."
Invoke-RestMethod -Uri "$baseUri/visualization/vis-kpi-total?overwrite=true" -Method Post -Headers $headers -Body ($vizTotal | ConvertTo-Json -Depth 5) | Out-Null
Invoke-RestMethod -Uri "$baseUri/visualization/vis-kpi-critical?overwrite=true" -Method Post -Headers $headers -Body ($vizCrit | ConvertTo-Json -Depth 5) | Out-Null
Invoke-RestMethod -Uri "$baseUri/visualization/vis-kpi-auth?overwrite=true" -Method Post -Headers $headers -Body ($vizAuth | ConvertTo-Json -Depth 5) | Out-Null
Invoke-RestMethod -Uri "$baseUri/visualization/vis-kpi-users?overwrite=true" -Method Post -Headers $headers -Body ($vizUsers | ConvertTo-Json -Depth 5) | Out-Null
Invoke-RestMethod -Uri "$baseUri/visualization/vis-kpi-policy?overwrite=true" -Method Post -Headers $headers -Body ($vizPolicy | ConvertTo-Json -Depth 5) | Out-Null


# 4. UPDATE DASHBOARD LAYOUT (Shift everything down by 8 units)
# Row 0: 5 KPIs (Width 9 approx 48/5 = 9.6 -> let's use 48/5... 
# Grid is 48 units wide? No, usually 48 or 12. Standard is often 48 in these jsons.
# Let's check panel_2 which is w=48.
# So 5 panels: 48/5 = 9.6. We can do 9, 9, 10, 10, 10.
# y=0 for KPIs.
# Previous panels shift down by 8 height.

$panelsJson = '[
  {"version":"7.6.0","gridData":{"x":0,"y":0,"w":9,"h":6,"i":"101"},"panelIndex":"101","embeddableConfig":{},"panelRefName":"panel_101"},
  {"version":"7.6.0","gridData":{"x":9,"y":0,"w":9,"h":6,"i":"102"},"panelIndex":"102","embeddableConfig":{},"panelRefName":"panel_102"},
  {"version":"7.6.0","gridData":{"x":18,"y":0,"w":10,"h":6,"i":"103"},"panelIndex":"103","embeddableConfig":{},"panelRefName":"panel_103"},
  {"version":"7.6.0","gridData":{"x":28,"y":0,"w":10,"h":6,"i":"104"},"panelIndex":"104","embeddableConfig":{},"panelRefName":"panel_104"},
  {"version":"7.6.0","gridData":{"x":38,"y":0,"w":10,"h":6,"i":"105"},"panelIndex":"105","embeddableConfig":{},"panelRefName":"panel_105"},

  {"version":"7.6.0","gridData":{"x":0,"y":7,"w":24,"h":8,"i":"1"},"panelIndex":"1","embeddableConfig":{},"panelRefName":"panel_1"},
  {"version":"7.6.0","gridData":{"x":0,"y":15,"w":48,"h":15,"i":"2"},"panelIndex":"2","embeddableConfig":{},"panelRefName":"panel_2"},
  {"version":"7.6.0","gridData":{"x":24,"y":7,"w":24,"h":8,"i":"3"},"panelIndex":"3","embeddableConfig":{},"panelRefName":"panel_3"},
  
  {"version":"7.6.0","gridData":{"x":0,"y":46,"w":24,"h":12,"i":"4"},"panelIndex":"4","embeddableConfig":{},"panelRefName":"panel_4"},
  {"version":"7.6.0","gridData":{"x":24,"y":46,"w":24,"h":12,"i":"5"},"panelIndex":"5","embeddableConfig":{},"panelRefName":"panel_5"},
  
  {"version":"7.6.0","gridData":{"x":0,"y":30,"w":48,"h":15,"i":"6"},"panelIndex":"6","embeddableConfig":{},"panelRefName":"panel_6"},
  
  {"version":"7.6.0","gridData":{"x":0,"y":58,"w":16,"h":12,"i":"7"},"panelIndex":"7","embeddableConfig":{},"panelRefName":"panel_7"},
  {"version":"7.6.0","gridData":{"x":16,"y":58,"w":16,"h":12,"i":"8"},"panelIndex":"8","embeddableConfig":{},"panelRefName":"panel_8"},
  {"version":"7.6.0","gridData":{"x":32,"y":58,"w":16,"h":12,"i":"9"},"panelIndex":"9","embeddableConfig":{},"panelRefName":"panel_9"},
  {"version":"7.6.0","gridData":{"x":0,"y":70,"w":48,"h":12,"i":"10"},"panelIndex":"10","embeddableConfig":{},"panelRefName":"panel_10"}
]'

$siemDash = @{
    attributes = @{
        title                 = "SIEM Dedicated Dashboard"
        description           = "Dashboard specifically for the SIEM view"
        panelsJSON            = $panelsJson
        optionsJSON           = '{"hidePanelTitles":true,"useMargins":true}'
        version               = 1
        timeRestore           = $true
        timeTo                = "now"
        timeFrom              = "now-7d"
        kibanaSavedObjectMeta = @{ searchSourceJSON = '{"query":{"query":"","language":"kuery"},"filter":[]}' }
    }
    references = @(
        @{name = "panel_101"; type = "visualization"; id = "vis-kpi-total" },
        @{name = "panel_102"; type = "visualization"; id = "vis-kpi-critical" },
        @{name = "panel_103"; type = "visualization"; id = "vis-kpi-auth" },
        @{name = "panel_104"; type = "visualization"; id = "vis-kpi-users" },
        @{name = "panel_105"; type = "visualization"; id = "vis-kpi-policy" },
        
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

Write-Host "Updating SIEM Dashboard with KPI Metrics..."
Invoke-RestMethod -Uri "$baseUri/dashboard/dashboard-siem-main?overwrite=true" -Method Post -Headers $headers -Body ($siemDash | ConvertTo-Json -Depth 10) | Out-Null
Write-Host "DONE. KPIs Added." -ForegroundColor Green
