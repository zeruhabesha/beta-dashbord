$baseUri = "http://localhost:5601/api/saved_objects"
$username = "admin"
$password = "S0c!Dash#2025_OpN"
$headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${username}:${password}"))
    "osd-xsrf"      = "true"
    "Content-Type"  = "application/json"
}

# 1. Find the CORRECT Index Pattern ID
Write-Host "Finding correct index pattern..."
$findRes = Invoke-RestMethod -Uri "$baseUri/_find?type=index-pattern&search_fields=title&search=security-auditlog-*" -Method Get -Headers $headers
if ($findRes.total -eq 0) {
    Write-Error "Could not find any index pattern matching 'security-auditlog-*'"
    exit
}
$correctId = $findRes.saved_objects[0].id
Write-Host "Found Correct Index Pattern ID: $correctId" -ForegroundColor Green

# 2. Fetch ALL Visualizations
Write-Host "Fetching all visualizations..."
$allVis = Invoke-RestMethod -Uri "$baseUri/_find?type=visualization&per_page=100" -Method Get -Headers $headers

if ($allVis.total -eq 0) {
    Write-Warning "No visualizations found!"
    exit
}

# 3. Fix Visualizations
foreach ($vis in $allVis.saved_objects) {
    $updated = $false
    $visTitle = $vis.attributes.title
    
    # Check 1: Update kibanaSavedObjectMeta.searchSourceJSON
    if ($vis.attributes.kibanaSavedObjectMeta.searchSourceJSON) {
        try {
            $sourceJson = $vis.attributes.kibanaSavedObjectMeta.searchSourceJSON | ConvertFrom-Json
            
            # If it has an index property and it's NOT the correct one (or is the specific broken one)
            if ($sourceJson.index -and $sourceJson.index -ne $correctId) {
                Write-Host "Fixing index in visualization '$visTitle' (was $($sourceJson.index))..."
                $sourceJson.index = $correctId
                $vis.attributes.kibanaSavedObjectMeta.searchSourceJSON = ($sourceJson | ConvertTo-Json -Compress)
                $updated = $true
            }
        }
        catch {
            Write-Warning "Failed to parse JSON for $visTitle"
        }
    }

    # Check 2: Update References
    if ($vis.references) {
        $newRefs = @()
        foreach ($ref in $vis.references) {
            if ($ref.type -eq "index-pattern" -and $ref.id -ne $correctId) {
                Write-Host "Fixing reference in visualization '$visTitle' (was $($ref.id))..."
                $ref.id = $correctId
                $updated = $true
            }
            $newRefs += $ref
        }
        $vis.references = $newRefs
    }

    # 4. Save Update if changes were made
    if ($updated) {
        try {
            $body = @{
                attributes = $vis.attributes
                references = $vis.references
            } | ConvertTo-Json -Depth 10

            Invoke-RestMethod -Uri "$baseUri/visualization/$($vis.id)?overwrite=true" -Method Put -Headers $headers -Body $body | Out-Null
            Write-Host "Successfully repaired: $visTitle" -ForegroundColor Cyan
        }
        catch {
            Write-Error "Failed to update $visTitle : $($_.Exception.Message)"
        }
    }
}

Write-Host "Repair Complete." -ForegroundColor Green
