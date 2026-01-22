$baseUri = "http://localhost:5601/api/saved_objects"
$headers = @{
    "osd-xsrf"      = "true"
    "Content-Type"  = "application/json"
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:S0c!Dash#2025_OpN"))
}

# 1. Get the Valid Index Pattern ID
Write-Host "Fetching valid index pattern..."
$patterns = Invoke-RestMethod -Uri "$baseUri/_find?type=index-pattern&fields=title" -Method Get -Headers $headers
$validPattern = $patterns.saved_objects | Where-Object { $_.attributes.title -like "security-auditlog-*" } | Select-Object -First 1

if (-not $validPattern) {
    Write-Error "No valid 'security-auditlog-*' pattern found!"
    exit
}
$validId = $validPattern.id
Write-Host "Valid Pattern ID: $validId" -ForegroundColor Green

# 2. Get All Visualizations
Write-Host "Fetching all visualizations..."
$visResponse = Invoke-RestMethod -Uri "$baseUri/_find?type=visualization&per_page=100" -Method Get -Headers $headers

foreach ($vis in $visResponse.saved_objects) {
    $needsUpdate = $false
    $visState = $vis.attributes.visState # JSON string
    $searchSource = $vis.attributes.kibanaSavedObjectMeta.searchSourceJSON # JSON string
    
    # Check Reference in 'references' array (Modern OpenSearch)
    $newRefs = @()
    if ($vis.references) {
        foreach ($ref in $vis.references) {
            if ($ref.type -eq "index-pattern") {
                if ($ref.id -ne $validId) {
                    Write-Host " -> Fixing reference in $($vis.attributes.title): $($ref.id) -> $validId"
                    $ref.id = $validId
                    $needsUpdate = $true
                }
            }
            $newRefs += $ref
        }
    }

    # Check searchSourceJSON (Legacy/Mixed)
    if ($searchSource -match '"index":"([^"]+)"') {
        $currentRef = $matches[1]
        if ($currentRef -ne $validId) {
            Write-Host " -> Fixing searchSourceJSON in $($vis.attributes.title)"
            $searchSource = $searchSource -replace '"index":"[^"]+"', """index"":""$validId"""
            $needsUpdate = $true
        }
    }
    
    if ($needsUpdate) {
        $body = @{
            attributes = @{
                kibanaSavedObjectMeta = @{
                    searchSourceJSON = $searchSource
                }
            }
            references = $newRefs
        } | ConvertTo-Json -Depth 10
        
        Invoke-RestMethod -Uri "$baseUri/visualization/$($vis.id)" -Method Put -Headers $headers -Body $body | Out-Null
        Write-Host "Updated $($vis.attributes.title)" -ForegroundColor Cyan
    }
}
Write-Host "Repair Complete."
