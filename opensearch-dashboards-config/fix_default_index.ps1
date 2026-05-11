$baseUri = "http://localhost:5601/api/saved_objects"
$headers = @{
    "osd-xsrf"      = "true"
    "Content-Type"  = "application/json"
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:S0c!Dash#2025_OpN"))
}

# 1. Find existing Index Patterns
Write-Host "Fetching existing index patterns..."
try {
    $response = Invoke-RestMethod -Uri "$baseUri/_find?type=index-pattern&fields=title" -Method Get -Headers $headers
    $patterns = $response.saved_objects

    if ($patterns.Count -eq 0) {
        Write-Error "No index patterns found! Please create one first."
        exit
    }

    Write-Host "Found $($patterns.Count) patterns:"
    $patterns | ForEach-Object { Write-Host " - [$($_.id)] $($_.attributes.title)" }

    # Pick the first one as default (or prefer 'security-auditlog-*')
    $validPattern = $patterns | Where-Object { $_.attributes.title -like "security-auditlog-*" } | Select-Object -First 1
    if (-not $validPattern) {
        $validPattern = $patterns[0]
    }

    $newDefaultId = $validPattern.id
    Write-Host "Selected Valid Pattern ID: $newDefaultId ($($validPattern.attributes.title))"

    # 2. Update Advanced Settings (Configuration)
    Write-Host "Updating defaultIndex to $newDefaultId..."
    
    $configId = "7.6.0" # or whatever version, usually accessible via /api/kibana/settings (legacy) or saved_objects/config
    
    # Try finding the config object first to get the version
    $configFind = Invoke-RestMethod -Uri "$baseUri/_find?type=config" -Method Get -Headers $headers
    if ($configFind.saved_objects.Count -gt 0) {
        $configId = $configFind.saved_objects[0].id
        Write-Host "Found Config ID: $configId"
        
        $body = @{
            attributes = @{
                "defaultIndex" = $newDefaultId
                "dateFormat:tz" = "UTC"
            }
        } | ConvertTo-Json -Depth 5

        # Update the config
        Invoke-RestMethod -Uri "$baseUri/config/$configId" -Method Put -Headers $headers -Body $body | Out-Null
        Write-Host "Successfully updated defaultIndex!" -ForegroundColor Green
        Write-Host "Forced timezone to UTC!" -ForegroundColor Green
    }
    else {
        Write-Warning "Could not find 'config' object to update defaultIndex."
    }

}
catch {
    Write-Error "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Error $reader.ReadToEnd()
    }
}
