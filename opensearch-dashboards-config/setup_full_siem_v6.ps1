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
if (-not $correctId) { Write-Host "Error finding ID"; exit }

# 2. DEFINE VISUALIZATIONS WITH FIXED JSON (Explicit Arrays)
# The issue was PowerShell flattening @(@{...}) to just @{...} when transforming to JSON.
# We will construct the JSON string manually to ensure [ ... ].

# A. Total Events
$vizTotal = @{
    attributes = @{
        title                 = "KPI - Total Events"
        visState              = '{"title":"KPI - Total Events","type":"metric","params":{"addTooltip":true,"addLegend":false,"type":"metric","metric":{"percentageMode":false,"useRanges":false,"colorSchema":"Green to Red","metricColorMode":"None","colorsRange":[{"from":0,"to":10000}],"labels":{"show":true},"invertColors":false,"style":{"bgFill":"#000","bgColor":false,"labelColor":false,"subText":"","fontSize":40}}},"aggs":[{"id":"1","enabled":true,"type":"count","schema":"metric","params":{"customLabel":"TOTAL EVENTS"}}]}'
        uiStateJSON           = "{}"
        description           = "KPI Card"
        version               = 1
        kibanaSavedObjectMeta = @{ searchSourceJSON = ('{"index":"' + $correctId + '","query":{"query":"","language":"kuery"},"filter":[]}') }
    }
    references = @(@{name = "kibanaSavedObjectMeta.searchSourceJSON.index"; type = "index-pattern"; id = $correctId })
}

# B. Critical Alerts
$vizCrit = @{
    attributes = @{
        title                 = "KPI - Critical Alerts"
        visState              = '{"title":"KPI - Critical Alerts","type":"metric","params":{"addTooltip":true,"addLegend":false,"type":"metric","metric":{"percentageMode":false,"useRanges":false,"colorSchema":"Green to Red","metricColorMode":"None","colorsRange":[{"from":0,"to":10000}],"labels":{"show":true},"invertColors":false,"style":{"bgFill":"#000","bgColor":false,"labelColor":false,"subText":"","fontSize":40}}},"aggs":[{"id":"1","enabled":true,"type":"count","schema":"metric","params":{"customLabel":"CRITICAL ALERTS"}}]}'
        uiStateJSON           = "{}"
        description           = "KPI Card"
        version               = 1
        kibanaSavedObjectMeta = @{ searchSourceJSON = ('{"index":"' + $correctId + '","query":{"query":"audit_category:FAILED_LOGIN or audit_request_status:CRITICAL","language":"kuery"},"filter":[]}') }
    }
    references = @(@{name = "kibanaSavedObjectMeta.searchSourceJSON.index"; type = "index-pattern"; id = $correctId })
}

# C. Auth Failures
$vizAuth = @{
    attributes = @{
        title                 = "KPI - Auth Failures"
        visState              = '{"title":"KPI - Auth Failures","type":"metric","params":{"addTooltip":true,"addLegend":false,"type":"metric","metric":{"percentageMode":false,"useRanges":false,"colorSchema":"Green to Red","metricColorMode":"None","colorsRange":[{"from":0,"to":10000}],"labels":{"show":true},"invertColors":false,"style":{"bgFill":"#000","bgColor":false,"labelColor":false,"subText":"","fontSize":40}}},"aggs":[{"id":"1","enabled":true,"type":"count","schema":"metric","params":{"customLabel":"AUTH FAILURES"}}]}'
        uiStateJSON           = "{}"
        description           = "KPI Card"
        version               = 1
        kibanaSavedObjectMeta = @{ searchSourceJSON = ('{"index":"' + $correctId + '","query":{"query":"audit_category:FAILED_LOGIN","language":"kuery"},"filter":[]}') }
    }
    references = @(@{name = "kibanaSavedObjectMeta.searchSourceJSON.index"; type = "index-pattern"; id = $correctId })
}

# D. Shared Users
$vizUsers = @{
    attributes = @{
        title                 = "KPI - Unique Users"
        visState              = '{"title":"KPI - Unique Users","type":"metric","params":{"addTooltip":true,"addLegend":false,"type":"metric","metric":{"percentageMode":false,"useRanges":false,"colorSchema":"Green to Red","metricColorMode":"None","colorsRange":[{"from":0,"to":10000}],"labels":{"show":true},"invertColors":false,"style":{"bgFill":"#000","bgColor":false,"labelColor":false,"subText":"","fontSize":40}}},"aggs":[{"id":"1","enabled":true,"type":"cardinality","schema":"metric","params":{"field":"audit_request_effective_user.keyword","customLabel":"UNIQUE USERS"}}]}'
        uiStateJSON           = "{}"
        description           = "KPI Card"
        version               = 1
        kibanaSavedObjectMeta = @{ searchSourceJSON = ('{"index":"' + $correctId + '","query":{"query":"","language":"kuery"},"filter":[]}') }
    }
    references = @(@{name = "kibanaSavedObjectMeta.searchSourceJSON.index"; type = "index-pattern"; id = $correctId })
}

# E. Policy Violations
$vizPolicy = @{
    attributes = @{
        title                 = "KPI - Policy Violations"
        visState              = '{"title":"KPI - Policy Violations","type":"metric","params":{"addTooltip":true,"addLegend":false,"type":"metric","metric":{"percentageMode":false,"useRanges":false,"colorSchema":"Green to Red","metricColorMode":"None","colorsRange":[{"from":0,"to":10000}],"labels":{"show":true},"invertColors":false,"style":{"bgFill":"#000","bgColor":false,"labelColor":false,"subText":"","fontSize":40}}},"aggs":[{"id":"1","enabled":true,"type":"count","schema":"metric","params":{"customLabel":"POLICY VIOLATIONS"}}]}'
        uiStateJSON           = "{}"
        description           = "KPI Card"
        version               = 1
        kibanaSavedObjectMeta = @{ searchSourceJSON = ('{"index":"' + $correctId + '","query":{"query":"audit_category:SSL_EXCEPTION or audit_category:POLICY","language":"kuery"},"filter":[]}') }
    }
    references = @(@{name = "kibanaSavedObjectMeta.searchSourceJSON.index"; type = "index-pattern"; id = $correctId })
}

# 3. EXECUTE UPDATES
Write-Host "Updating KPI Metrics..."
Invoke-RestMethod -Uri "$baseUri/visualization/vis-kpi-total?overwrite=true" -Method Post -Headers $headers -Body ($vizTotal | ConvertTo-Json -Depth 5) | Out-Null
Invoke-RestMethod -Uri "$baseUri/visualization/vis-kpi-critical?overwrite=true" -Method Post -Headers $headers -Body ($vizCrit | ConvertTo-Json -Depth 5) | Out-Null
Invoke-RestMethod -Uri "$baseUri/visualization/vis-kpi-auth?overwrite=true" -Method Post -Headers $headers -Body ($vizAuth | ConvertTo-Json -Depth 5) | Out-Null
Invoke-RestMethod -Uri "$baseUri/visualization/vis-kpi-users?overwrite=true" -Method Post -Headers $headers -Body ($vizUsers | ConvertTo-Json -Depth 5) | Out-Null
Invoke-RestMethod -Uri "$baseUri/visualization/vis-kpi-policy?overwrite=true" -Method Post -Headers $headers -Body ($vizPolicy | ConvertTo-Json -Depth 5) | Out-Null

Write-Host "DONE. KPIs Fixed." -ForegroundColor Green
