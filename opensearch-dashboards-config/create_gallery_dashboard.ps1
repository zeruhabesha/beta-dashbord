$baseUri = "http://localhost:5601/api/saved_objects"
$username = "admin"
$password = "S0c!Dash#2025_OpN"
$headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${username}:${password}"))
    "osd-xsrf"      = "true"
    "Content-Type"  = "application/json"
}

# 1. Fetch all visualizations
Write-Host "Fetching all visualizations..."
$allVis = Invoke-RestMethod -Uri "$baseUri/_find?type=visualization&per_page=100" -Method Get -Headers $headers

if ($allVis.total -eq 0) {
    Write-Warning "No visualizations found!"
    exit
}

Write-Host "Found $($allVis.total) visualizations."

# 2. Build Panels JSON
$panels = @()
$y = 0
$h = 12 # Start with standard height
$w = 24 # Half width (total is 48)
$x = 0
$i = 1

foreach ($vis in $allVis.saved_objects) {
    # Simple grid layout: 2 columns
    # x=0 or x=24
    
    $panel = @{
        version          = "7.6.0"
        gridData         = @{
            x = $x
            y = $y
            w = $w
            h = $h
            i = "$i"
        }
        panelIndex       = "$i"
        embeddableConfig = @{}
        panelRefName     = "panel_$i"
    }
    
    $panels += $panel

    # Prepare for next panel
    # Toggle X between 0 and 24
    if ($x -eq 0) {
        $x = 24
    }
    else {
        $x = 0
        $y += $h # Move down only after filling the row
    }
    $i++
}

# 3. Build References
$references = @()
$refIndex = 1
foreach ($vis in $allVis.saved_objects) {
    $ref = @{
        name = "panel_$refIndex"
        type = "visualization"
        id   = $vis.id
    }
    $references += $ref
    $refIndex++
}

# 4. Create Dashboard Object
$galleryDash = @{
    attributes = @{
        title                 = "BETA - All Visualizations"
        description           = "Auto-generated gallery of all system visualizations"
        panelsJSON            = ($panels | ConvertTo-Json -Depth 10 -Compress)
        optionsJSON           = '{"hidePanelTitles":false,"useMargins":true}'
        version               = 1
        timeRestore           = $true
        timeTo                = "now"
        timeFrom              = "now-7d"
        kibanaSavedObjectMeta = @{ searchSourceJSON = '{"query":{"query":"","language":"kuery"},"filter":[]}' }
    }
    references = $references
}

# 5. Push to OpenSearch
Write-Host "Creating 'beta-page-visualize' dashboard..."
$jsonBody = $galleryDash | ConvertTo-Json -Depth 10

try {
    Invoke-RestMethod -Uri "$baseUri/dashboard/beta-page-visualize?overwrite=true" -Method Post -Headers $headers -Body $jsonBody | Out-Null
    Write-Host "SUCCESS: Gallery Dashboard Created (ID: beta-page-visualize)" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Details: $($_.Exception.Response.GetResponseStream() | %{ [char]$_ } | join-string)"
}
