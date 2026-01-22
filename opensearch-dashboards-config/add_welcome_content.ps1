$headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:admin"))
    "osd-xsrf"      = "true"
    "Content-Type"  = "application/json"
}

Write-Host "Creating team-specific markdown visualizations..." -ForegroundColor Cyan

# SIEM Markdown
$siemMd = "# Welcome to SIEM Operations`n`n## Your Team`nYou are viewing the **SIEM Operations** dashboard.`n`n## Quick Links`n- Overview`n- Malware Detection`n- File Integrity Monitoring`n- Threat Hunting`n`n---`n*This is the SIEM team workspace*"
$siemBody = "{`"attributes`":{`"title`":`"SIEM Welcome`",`"visState`":`"{\\`"title\\`":\\`"SIEM Welcome\\`",\\`"type\\`":\\`"markdown\\`",\\`"params\\`":{\\`"fontSize\\`":16,\\`"openLinksInNewTab\\`":false,\\`"markdown\\`":\\`"$($siemMd -replace '`n','\\n')\\`"},\\`"aggs\\`":[]}`",`"uiStateJSON`":`"{}`",`"version`":1,`"kibanaSavedObjectMeta`":{`"searchSourceJSON`":`"{}`"}},`"id`":`"siem-welcome-md`",`"type`":`"visualization`"}"

try {
    Invoke-RestMethod -Uri "http://localhost:5601/api/saved_objects/visualization/siem-welcome-md" -Method Post -Headers $headers -Body $siemBody | Out-Null
    Write-Host "  Created SIEM welcome" -ForegroundColor Green
}
catch {
    Write-Host "  SIEM welcome exists" -ForegroundColor Gray
}

# IDS Markdown
$idsMd = "# Welcome to IDS/IPS Analysis`n`n## Your Team`nYou are viewing the **IDS/IPS Analysis** dashboard.`n`n## Quick Links`n- Traffic Overview`n- Blocked Threats`n- Intrusion Alerts`n- Network Flows`n`n---`n*This is the IDS team workspace*"
$idsBody = "{`"attributes`":{`"title`":`"IDS Welcome`",`"visState`":`"{\\`"title\\`":\\`"IDS Welcome\\`",\\`"type\\`":\\`"markdown\\`",\\`"params\\`":{\\`"fontSize\\`":16,\\`"openLinksInNewTab\\`":false,\\`"markdown\\`":\\`"$($idsMd -replace '`n','\\n')\\`"},\\`"aggs\\`":[]}`",`"uiStateJSON`":`"{}`",`"version`":1,`"kibanaSavedObjectMeta`":{`"searchSourceJSON`":`"{}`"}},`"id`":`"ids-welcome-md`",`"type`":`"visualization`"}"

try {
    Invoke-RestMethod -Uri "http://localhost:5601/api/saved_objects/visualization/ids-welcome-md" -Method Post -Headers $headers -Body $idsBody | Out-Null
    Write-Host "  Created IDS welcome" -ForegroundColor Green
}
catch {
    Write-Host "  IDS welcome exists" -ForegroundColor Gray
}

# EDR Markdown
$edrMd = "# Welcome to EDR Analysis`n`n## Your Team`nYou are viewing the **EDR Analysis** dashboard.`n`n## Quick Links`n- Endpoint Status`n- Active Threats`n- Malware Analysis`n- Host Isolation`n`n---`n*This is the EDR team workspace*"
$edrBody = "{`"attributes`":{`"title`":`"EDR Welcome`",`"visState`":`"{\\`"title\\`":\\`"EDR Welcome\\`",\\`"type\\`":\\`"markdown\\`",\\`"params\\`":{\\`"fontSize\\`":16,\\`"openLinksInNewTab\\`":false,\\`"markdown\\`":\\`"$($edrMd -replace '`n','\\n')\\`"},\\`"aggs\\`":[]}`",`"uiStateJSON`":`"{}`",`"version`":1,`"kibanaSavedObjectMeta`":{`"searchSourceJSON`":`"{}`"}},`"id`":`"edr-welcome-md`",`"type`":`"visualization`"}"

try {
    Invoke-RestMethod -Uri "http://localhost:5601/api/saved_objects/visualization/edr-welcome-md" -Method Post -Headers $headers -Body $edrBody | Out-Null
    Write-Host "  Created EDR welcome" -ForegroundColor Green
}
catch {
    Write-Host "  EDR welcome exists" -ForegroundColor Gray
}

Write-Host "`nUpdating home dashboards with welcome panels..." -ForegroundColor Cyan

# Update SIEM Home
$siemDash = "{`"attributes`":{`"title`":`"SIEM - Home`",`"description`":`"SIEM team home`",`"panelsJSON`":`"[{\\`"version\\`":\\`"2.13.0\\`",\\`"gridData\\`":{\\`"x\\`":0,\\`"y\\`":0,\\`"w\\`":48,\\`"h\\`":15,\\`"i\\`":\\`"1\\`"},\\`"panelIndex\\`":\\`"1\\`",\\`"embeddableConfig\\`":{},\\`"panelRefName\\`":\\`"panel_1\\`"}]`",`"optionsJSON`":`"{\\`"hidePanelTitles\\`":true,\\`"useMargins\\`":true}`",`"version`":1,`"timeRestore`":false},`"references`":[{`"name`":`"panel_1`",`"type`":`"visualization`",`"id`":`"siem-welcome-md`"}]}"

try {
    Invoke-RestMethod -Uri "http://localhost:5601/api/saved_objects/dashboard/siem-home?overwrite=true" -Method Put -Headers $headers -Body $siemDash | Out-Null
    Write-Host "  Updated siem-home" -ForegroundColor Green
}
catch {
    Write-Host "  Error updating siem-home" -ForegroundColor Red
}

# Update IDS Home
$idsDash = "{`"attributes`":{`"title`":`"IDS - Home`",`"description`":`"IDS team home`",`"panelsJSON`":`"[{\\`"version\\`":\\`"2.13.0\\`",\\`"gridData\\`":{\\`"x\\`":0,\\`"y\\`":0,\\`"w\\`":48,\\`"h\\`":15,\\`"i\\`":\\`"1\\`"},\\`"panelIndex\\`":\\`"1\\`",\\`"embeddableConfig\\`":{},\\`"panelRefName\\`":\\`"panel_1\\`"}]`",`"optionsJSON`":`"{\\`"hidePanelTitles\\`":true,\\`"useMargins\\`":true}`",`"version`":1,`"timeRestore`":false},`"references`":[{`"name`":`"panel_1`",`"type`":`"visualization`",`"id`":`"ids-welcome-md`"}]}"

try {
    Invoke-RestMethod -Uri "http://localhost:5601/api/saved_objects/dashboard/ids-home?overwrite=true" -Method Put -Headers $headers -Body $idsDash | Out-Null
    Write-Host "  Updated ids-home" -ForegroundColor Green
}
catch {
    Write-Host "  Error updating ids-home" -ForegroundColor Red
}

# Update EDR Home
$edrDash = "{`"attributes`":{`"title`":`"EDR - Home`",`"description`":`"EDR team home`",`"panelsJSON`":`"[{\\`"version\\`":\\`"2.13.0\\`",\\`"gridData\\`":{\\`"x\\`":0,\\`"y\\`":0,\\`"w\\`":48,\\`"h\\`":15,\\`"i\\`":\\`"1\\`"},\\`"panelIndex\\`":\\`"1\\`",\\`"embeddableConfig\\`":{},\\`"panelRefName\\`":\\`"panel_1\\`"}]`",`"optionsJSON`":`"{\\`"hidePanelTitles\\`":true,\\`"useMargins\\`":true}`",`"version`":1,`"timeRestore`":false},`"references`":[{`"name`":`"panel_1`",`"type`":`"visualization`",`"id`":`"edr-welcome-md`"}]}"

try {
    Invoke-RestMethod -Uri "http://localhost:5601/api/saved_objects/dashboard/edr-home?overwrite=true" -Method Put -Headers $headers -Body $edrDash | Out-Null
    Write-Host "  Updated edr-home" -ForegroundColor Green
}
catch {
    Write-Host "  Error updating edr-home" -ForegroundColor Red
}

Write-Host "`nDone! Each team now has unique home dashboard content." -ForegroundColor Green
Write-Host "Refresh your browser and switch teams to see the difference." -ForegroundColor Yellow
