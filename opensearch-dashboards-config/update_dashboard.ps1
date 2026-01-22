$baseUri = "http://localhost:5601/api/saved_objects/dashboard/dashboard-audit-clean?overwrite=true"
$username = "admin"
$password = "S0c!Dash#2025_OpN"
$headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${username}:${password}"))
    "osd-xsrf"      = "true"
    "Content-Type"  = "application/json"
}

# Define the updated dashboard panels JSON
$panelsJson = '[{\"version\":\"7.6.0\",\"gridData\":{\"x\":0,\"y\":0,\"w\":24,\"h\":8,\"i\":\"1\"},\"panelIndex\":\"1\",\"embeddableConfig\":{},\"panelRefName\":\"panel_1\"},{\"version\":\"7.6.0\",\"gridData\":{\"x\":0,\"y\":8,\"w\":48,\"h\":15,\"i\":\"2\"},\"panelIndex\":\"2\",\"embeddableConfig\":{},\"panelRefName\":\"panel_2\"},{\"version\":\"7.6.0\",\"gridData\":{\"x\":24,\"y\":0,\"w\":24,\"h\":8,\"i\":\"3\"},\"panelIndex\":\"3\",\"embeddableConfig\":{},\"panelRefName\":\"panel_3\"},{\"version\":\"7.6.0\",\"gridData\":{\"x\":0,\"y\":23,\"w\":48,\"h\":12,\"i\":\"4\"},\"panelIndex\":\"4\",\"embeddableConfig\":{},\"panelRefName\":\"panel_4\"},{\"version\":\"7.6.0\",\"gridData\":{\"x\":0,\"y\":35,\"w\":48,\"h\":12,\"i\":\"5\"},\"panelIndex\":\"5\",\"embeddableConfig\":{},\"panelRefName\":\"panel_5\"}]'

# Define references
$references = @(
    @{name = "panel_1"; type = "visualization"; id = "vis-audit-total-clean" },
    @{name = "panel_2"; type = "visualization"; id = "vis-audit-timeline-clean" },
    @{name = "panel_3"; type = "visualization"; id = "vis-audit-category-clean" },
    @{name = "panel_4"; type = "search"; id = "search-recent-alerts" },
    @{name = "panel_5"; type = "search"; id = "search-auth-events" }
)

$body = @{
    attributes = @{
        title                 = "BETA - Security Audit Dashboard (Working)"
        description           = "Security audit log monitoring dashboard"
        panelsJSON            = $panelsJson
        optionsJSON           = '{"hidePanelTitles":false,"useMargins":true}'
        version               = 1
        timeRestore           = $true
        timeTo                = "now"
        timeFrom              = "now-7d"
        kibanaSavedObjectMeta = @{
            searchSourceJSON = '{"query":{"query":"","language":"kuery"},"filter":[]}'
        }
    }
    references = $references
} | ConvertTo-Json -Depth 10

try {
    Write-Host "Updating Dashboard..."
    $response = Invoke-RestMethod -Uri $baseUri -Method Put -Headers $headers -Body $body
    Write-Host "Success: $($response | ConvertTo-Json -Depth 5)"
}
catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Resp: $($_.Exception.Response.GetResponseStream() | %{ [char]$_ } | join-string)"
}
