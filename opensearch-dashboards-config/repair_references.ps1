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
    Write-Host "ERROR: Could not find index pattern!" -ForegroundColor Red
    exit
}
Write-Host "Found Correct ID: $correctId" -ForegroundColor Green

# 2. LIST OF OBJECTS TO FIX
$objectsToFix = @(
    @{type = "visualization"; id = "vis-audit-total-clean" },
    @{type = "visualization"; id = "vis-audit-category-clean" },
    @{type = "visualization"; id = "vis-audit-timeline-clean" },
    @{type = "search"; id = "search-recent-alerts" },
    @{type = "search"; id = "search-auth-events" },
    @{type = "dashboard"; id = "dashboard-audit-clean" },
    @{type = "dashboard"; id = "dashboard-siem-main" }
)

# 3. LOOP AND UPDATE
foreach ($objKey in $objectsToFix) {
    $type = $objKey.type
    $id = $objKey.id
    
    Write-Host "Processing $type : $id ..."
    
    try {
        # Fetch existing
        $obj = Invoke-RestMethod -Uri "$baseUri/$type/$id" -Method Get -Headers $headers
        
        # Replace ID in 'references'
        if ($obj.references) {
            foreach ($ref in $obj.references) {
                if ($ref.type -eq "index-pattern") {
                    $ref.id = $correctId
                }
            }
        }
        
        # Replace ID in 'searchSourceJSON' (escaped JSON)
        if ($obj.attributes.kibanaSavedObjectMeta.searchSourceJSON) {
            $json = $obj.attributes.kibanaSavedObjectMeta.searchSourceJSON
            # Regex or simply replace known bad ID if we knew it, but easier to use regex or logic
            # Since we don't know the exact "bad" ID currently in there (could be anything), 
            # we blindly replace `\"index\":\"<ANY_ID>\"` with correct ID.
            $fixedJson = $json -replace '\\"index\\":\\"[^\\"]+\\"', "\\`"index\\`":\\`"$correctId\\`""
            $obj.attributes.kibanaSavedObjectMeta.searchSourceJSON = $fixedJson
        }

        # Prepare Update Body (attributes + references)
        $updateBody = @{
            attributes = $obj.attributes
            references = $obj.references
        } | ConvertTo-Json -Depth 10

        # PUT Update
        Invoke-RestMethod -Uri "$baseUri/$type/$id?overwrite=true" -Method Put -Headers $headers -Body $updateBody | Out-Null
        Write-Host "  -> FIXED" -ForegroundColor Green
        
    }
    catch {
        Write-Host "  -> FAILED: $($_.Exception.Message)" -ForegroundColor Red
    }
}
