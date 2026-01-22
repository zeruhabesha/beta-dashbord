$date = Get-Date -Format "yyyy.MM.dd"
Write-Host "Creating team-specific data..." -ForegroundColor Cyan

# SIEM Data
Write-Host "`nSIEM Team Data..." -ForegroundColor Yellow
$siemBulk = ""
for ($i = 1; $i -le 100; $i++) {
    $timestamp = (Get-Date).AddMinutes(-$i).ToString("o")
    $eventType = @("malware_detection", "file_integrity_violation", "config_change", "compliance_alert")[(Get-Random -Maximum 4)]
    $severity = @("low", "medium", "high", "critical")[(Get-Random -Maximum 4)]
    $sourceIp = "192.168.1.$((Get-Random -Maximum 254))"
    $user = "user$((Get-Random -Maximum 50))"
    $framework = @("PCI-DSS", "GDPR", "HIPAA", "NIST")[(Get-Random -Maximum 4)]
    
    $siemBulk += "{`"index`":{`"_index`":`"siem-events-$date`"}}`n"
    $siemBulk += "{`"@timestamp`":`"$timestamp`",`"team`":`"siem`",`"event_type`":`"$eventType`",`"severity`":`"$severity`",`"source_ip`":`"$sourceIp`",`"user`":`"$user`",`"description`":`"SIEM event $i`",`"compliance_framework`":`"$framework`"}`n"
}

Invoke-RestMethod -Uri "http://localhost:9200/_bulk" -Method Post -Body $siemBulk -ContentType "application/x-ndjson" | Out-Null
Write-Host "  ✓ Created 100 SIEM events" -ForegroundColor Green

# IDS Data
Write-Host "`nIDS Team Data..." -ForegroundColor Yellow
$idsBulk = ""
for ($i = 1; $i -le 100; $i++) {
    $timestamp = (Get-Date).AddMinutes(-$i).ToString("o")
    $eventType = @("intrusion_attempt", "port_scan", "ddos_attack", "blocked_connection")[(Get-Random -Maximum 4)]
    $severity = @("low", "medium", "high", "critical")[(Get-Random -Maximum 4)]
    $sourceIp = "10.0.0.$((Get-Random -Maximum 254))"
    $destIp = "10.0.1.$((Get-Random -Maximum 254))"
    $port = (Get-Random -Minimum 1 -Maximum 65535)
    $protocol = @("TCP", "UDP", "ICMP")[(Get-Random -Maximum 3)]
    
    $idsBulk += "{`"index`":{`"_index`":`"ids-traffic-$date`"}}`n"
    $idsBulk += "{`"@timestamp`":`"$timestamp`",`"team`":`"ids`",`"event_type`":`"$eventType`",`"severity`":`"$severity`",`"source_ip`":`"$sourceIp`",`"dest_ip`":`"$destIp`",`"port`":$port,`"protocol`":`"$protocol`",`"description`":`"IDS event $i`"}`n"
}

Invoke-RestMethod -Uri "http://localhost:9200/_bulk" -Method Post -Body $idsBulk -ContentType "application/x-ndjson" | Out-Null
Write-Host "  ✓ Created 100 IDS events" -ForegroundColor Green

# EDR Data
Write-Host "`nEDR Team Data..." -ForegroundColor Yellow
$edrBulk = ""
for ($i = 1; $i -le 100; $i++) {
    $timestamp = (Get-Date).AddMinutes(-$i).ToString("o")
    $eventType = @("process_execution", "file_modification", "registry_change", "network_connection")[(Get-Random -Maximum 4)]
    $severity = @("low", "medium", "high", "critical")[(Get-Random -Maximum 4)]
    $hostname = "endpoint-$((Get-Random -Maximum 100))"
    $process = @("chrome.exe", "powershell.exe", "cmd.exe", "explorer.exe")[(Get-Random -Maximum 4)]
    $user = "user$((Get-Random -Maximum 50))"
    
    $edrBulk += "{`"index`":{`"_index`":`"edr-endpoints-$date`"}}`n"
    $edrBulk += "{`"@timestamp`":`"$timestamp`",`"team`":`"edr`",`"event_type`":`"$eventType`",`"severity`":`"$severity`",`"hostname`":`"$hostname`",`"process_name`":`"$process`",`"user`":`"$user`",`"description`":`"EDR event $i`"}`n"
}

Invoke-RestMethod -Uri "http://localhost:9200/_bulk" -Method Post -Body $edrBulk -ContentType "application/x-ndjson" | Out-Null
Write-Host "  ✓ Created 100 EDR events" -ForegroundColor Green

# Create Index Patterns
Write-Host "`nCreating index patterns..." -ForegroundColor Cyan
$headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:admin"))
    "osd-xsrf"      = "true"
    "Content-Type"  = "application/json"
}

try {
    Invoke-RestMethod -Uri "http://localhost:5601/api/saved_objects/index-pattern/siem-events-*" -Method Post -Headers $headers -Body '{"attributes":{"title":"siem-events-*","timeFieldName":"@timestamp"}}' | Out-Null
    Write-Host "  ✓ siem-events-* pattern" -ForegroundColor Green
}
catch { Write-Host "  siem-events-* exists" -ForegroundColor Gray }

try {
    Invoke-RestMethod -Uri "http://localhost:5601/api/saved_objects/index-pattern/ids-traffic-*" -Method Post -Headers $headers -Body '{"attributes":{"title":"ids-traffic-*","timeFieldName":"@timestamp"}}' | Out-Null
    Write-Host "  ✓ ids-traffic-* pattern" -ForegroundColor Green
}
catch { Write-Host "  ids-traffic-* exists" -ForegroundColor Gray }

try {
    Invoke-RestMethod -Uri "http://localhost:5601/api/saved_objects/index-pattern/edr-endpoints-*" -Method Post -Headers $headers -Body '{"attributes":{"title":"edr-endpoints-*","timeFieldName":"@timestamp"}}' | Out-Null
    Write-Host "  ✓ edr-endpoints-* pattern" -ForegroundColor Green
}
catch { Write-Host "  edr-endpoints-* exists" -ForegroundColor Gray }

Write-Host "`nDone! Each team has separate data:" -ForegroundColor Green
Write-Host "  SIEM: siem-events-* (100 events)" -ForegroundColor White
Write-Host "  IDS: ids-traffic-* (100 events)" -ForegroundColor White
Write-Host "  EDR: edr-endpoints-* (100 events)" -ForegroundColor White
