$url = "http://localhost:5601/api/saved_objects/_import?overwrite=true"
$filePath = "c:\opensearch-standalone\opensearch-dashboards-config\team-homes.ndjson"
$username = "admin"
$password = "S0c!Dash#2025_OpN"

# Create Authorization Header
$base64AuthInfo = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(("{0}:{1}" -f $username, $password)))
$headers = @{
    "Authorization" = ("Basic {0}" -f $base64AuthInfo)
    "osd-xsrf"      = "true"
}

# Read File Content
$fileBytes = [System.IO.File]::ReadAllBytes($filePath)
$fileEnc = [System.Text.Encoding]::GetEncoding('ISO-8859-1').GetString($fileBytes)

# Construct Multipart Form Data manually (Invoke-RestMethod -Form is newer PS, let's be safe)
$boundary = "----WebKitFormBoundary" + [Guid]::NewGuid().ToString()
$LF = "`r`n"

$bodyLines = (
    "--$boundary",
    "Content-Disposition: form-data; name=`"file`"; filename=`"siem-dashboard-tables.ndjson`"",
    "Content-Type: application/x-ndjson",
    "",
    $fileEnc,
    "--$boundary--"
) -join $LF

$headers.Add("Content-Type", "multipart/form-data; boundary=$boundary")

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $bodyLines
    Write-Host "Import Success: $($response | ConvertTo-Json -Depth 5)"
}
catch {
    Write-Host "Import Failed: $_"
    Write-Host "Response: $($_.Exception.Response.GetResponseStream() | %{ $_.ReadByte() } | %{ [char]$_ } | join-string)"
}
