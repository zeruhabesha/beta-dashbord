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

# 2. Filter Duplicates & Categorize
$uniqueVis = @{}
foreach ($vis in $allVis.saved_objects) {
    $title = $vis.attributes.title
    # Normalize title: remove "(Clean)" or similar suffixes to detect "duplicates" loosely?
    # Or strict duplicate check? Let's do strict title based for now, keeping the LATEST updated one if multiple exist?
    # Actually, simpler: Just keep the one with shorter name if "Clean" is involved, or just unique ID.
    
    # Strategy: Deduplicate by exact Title. 
    if (-not $uniqueVis.ContainsKey($title)) {
        $uniqueVis[$title] = $vis
    }
}

$metrics = @()
$charts = @()

foreach ($vis in $uniqueVis.Values) {
    $visState = $vis.attributes.visState | ConvertFrom-Json
    if ($visState.type -eq "metric") {
        $metrics += $vis
    }
    else {
        $charts += $vis
    }
}

Write-Host "Found $($metrics.Count) metrics and $($charts.Count) charts."

# 3. Build Panels JSON
$panels = @()
$i = 1

# A. Place Metrics (Top, Small)
$x = 0
$y = 0
$h = 6  # Small Height
$w = 12 # 4 per row (Total 48 grid width)

foreach ($vis in $metrics) {
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
    
    # Next position
    $x += $w
    if ($x -ge 48) {
        $x = 0
        $y += $h
    }
    $i++
}

# Reset X for charts, ensure Y is below metrics
if ($x -gt 0) {
    $y += $h # Move to next line if row wasn't finished
    $x = 0
}

# B. Place Charts (Bottom, Larger)
$h_chart = 15
$w_chart = 24 # 2 per row

foreach ($vis in $charts) {
    $panel = @{
        version          = "7.6.0"
        gridData         = @{
            x = $x
            y = $y
            w = $w_chart
            h = $h_chart
            i = "$i"
        }
        panelIndex       = "$i"
        embeddableConfig = @{}
        panelRefName     = "panel_$i"
    }
    $panels += $panel

    # Next position
    $x += $w_chart
    if ($x -ge 48) {
        $x = 0
        $y += $h_chart
    }
    $i++
}


# 4. Build References
$references = @()
foreach ($panel in $panels) {
    # Find the vis object matching this panel index
    # We need to re-find the vis ID based on the order we processed
    # Recalculating is tricky. Let's rebuild lists in order.
    # Refactor: Store ref directly in loop.
}

# RE-LOOP cleanly to build refs matching the panels list order
$orderedVis = $metrics + $charts
$references = @()
$refIdx = 1
foreach ($vis in $orderedVis) {
    $ref = @{
        name = "panel_$refIdx"
        type = "visualization"
        id   = $vis.id
    }
    $references += $ref
    $refIdx++
}


# 5. Push Dashboard
$finalDash = @{
    attributes = @{
        title                 = "BETA - All Visualizations"
        description           = "Refined Gallery: Metrics on top, Charts below."
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

Write-Host "Updating 'beta-page-visualize' dashboard..."
try {
    Invoke-RestMethod -Uri "$baseUri/dashboard/beta-page-visualize?overwrite=true" -Method Post -Headers $headers -Body ($finalDash | ConvertTo-Json -Depth 10) | Out-Null
    Write-Host "SUCCESS: Layout Refined!" -ForegroundColor Green
}
catch {
    Write-Error "Failed: $($_.Exception.Message)"
}
