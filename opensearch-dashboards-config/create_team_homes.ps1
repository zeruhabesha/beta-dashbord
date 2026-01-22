# Create team-specific home dashboards with navigation
$headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:admin"))
    "osd-xsrf"      = "true"
    "Content-Type"  = "application/json"
}

Write-Host "Creating team home dashboards..." -ForegroundColor Cyan

# SIEM Home Dashboard
$siemMarkdown = @"
# SIEM Operations Center

## Quick Access
- [Overview Dashboard](http://localhost:5601/app/dashboards#/view/siem-overview)
- [Malware Detection](http://localhost:5601/app/dashboards#/view/siem-malware)
- [File Integrity Monitoring](http://localhost:5601/app/dashboards#/view/siem-fim)
- [Configuration Assessment](http://localhost:5601/app/dashboards#/view/siem-config-assessment)

## Threat Intelligence
- [Threat Hunting](http://localhost:5601/app/dashboards#/view/siem-hunting)
- [Vulnerability Detection](http://localhost:5601/app/dashboards#/view/siem-vuln-detect)
- [MITRE ATT&CK](http://localhost:5601/app/dashboards#/view/siem-mitre)

## Compliance
- [IT Hygiene](http://localhost:5601/app/dashboards#/view/siem-hygiene)
- [PCI DSS](http://localhost:5601/app/dashboards#/view/siem-pci)
- [GDPR](http://localhost:5601/app/dashboards#/view/siem-gdpr)
- [HIPAA](http://localhost:5601/app/dashboards#/view/siem-hipaa)
- [NIST 800-53](http://localhost:5601/app/dashboards#/view/siem-nist)

## Cloud Security
- [Docker](http://localhost:5601/app/dashboards#/view/siem-docker)
- [AWS Security](http://localhost:5601/app/dashboards#/view/siem-aws)
- [Google Cloud](http://localhost:5601/app/dashboards#/view/siem-gcp)
- [Azure / M365](http://localhost:5601/app/dashboards#/view/siem-azure)

## Management
- [Ruleset](http://localhost:5601/app/dashboards#/view/siem-rules)
- [Decoders](http://localhost:5601/app/dashboards#/view/siem-decoders)
- [System Logs](http://localhost:5601/app/dashboards#/view/siem-logs)
"@

$siemVis = "{`"attributes`":{`"title`":`"SIEM Navigation`",`"visState`":`"{\\`"title\\`":\\`"SIEM Navigation\\`",\\`"type\\`":\\`"markdown\\`",\\`"params\\`":{\\`"fontSize\\`":12,\\`"openLinksInNewTab\\`":false,\\`"markdown\\`":\\`"$($siemMarkdown -replace '`n','\\n' -replace '"','\\\"')\\`"},\\`"aggs\\`":[]}`",`"uiStateJSON`":`"{}`",`"description`":`"SIEM team navigation`",`"version`":1,`"kibanaSavedObjectMeta`":{`"searchSourceJSON`":`"{}`"}},`"id`":`"siem-nav-vis`",`"type`":`"visualization`"}"

try {
    Invoke-RestMethod -Uri "http://localhost:5601/api/saved_objects/visualization/siem-nav-vis" -Method Post -Headers $headers -Body $siemVis | Out-Null
    Write-Host "  ✓ Created SIEM navigation visualization" -ForegroundColor Green
}
catch {
    Write-Host "  Skip: SIEM nav (exists)" -ForegroundColor Gray
}

# IDS Home Dashboard  
$idsMarkdown = @"
# IDS / IPS Analysis Center

## Quick Access
- [Traffic Overview](http://localhost:5601/app/dashboards#/view/ids-traffic)
- [Blocked Threats](http://localhost:5601/app/dashboards#/view/ids-blocked)
- [Intrusion Alerts](http://localhost:5601/app/dashboards#/view/ids-ids-alerts)

## Analysis
- [Signatures](http://localhost:5601/app/dashboards#/view/ids-signatures)
- [Network Flows](http://localhost:5601/app/dashboards#/view/ids-flows)

## Tools
- [Discover - Packet Analysis](http://localhost:5601/app/discover)
- [Geo Attack Map](http://localhost:5601/app/maps-dashboards)
"@

$idsVis = "{`"attributes`":{`"title`":`"IDS Navigation`",`"visState`":`"{\\`"title\\`":\\`"IDS Navigation\\`",\\`"type\\`":\\`"markdown\\`",\\`"params\\`":{\\`"fontSize\\`":12,\\`"openLinksInNewTab\\`":false,\\`"markdown\\`":\\`"$($idsMarkdown -replace '`n','\\n' -replace '"','\\\"')\\`"},\\`"aggs\\`":[]}`",`"uiStateJSON`":`"{}`",`"description`":`"IDS team navigation`",`"version`":1,`"kibanaSavedObjectMeta`":{`"searchSourceJSON`":`"{}`"}},`"id`":`"ids-nav-vis`",`"type`":`"visualization`"}"

try {
    Invoke-RestMethod -Uri "http://localhost:5601/api/saved_objects/visualization/ids-nav-vis" -Method Post -Headers $headers -Body $idsVis | Out-Null
    Write-Host "  ✓ Created IDS navigation visualization" -ForegroundColor Green
}
catch {
    Write-Host "  Skip: IDS nav (exists)" -ForegroundColor Gray
}

# EDR Home Dashboard
$edrMarkdown = @"
# EDR Analysis Center

## Quick Access
- [Endpoint Status](http://localhost:5601/app/dashboards#/view/edr-endpoints)
- [Active Threats](http://localhost:5601/app/dashboards#/view/edr-active-threats)
- [Malware Analysis](http://localhost:5601/app/dashboards#/view/edr-malware)

## Response
- [Host Isolation](http://localhost:5601/app/dashboards#/view/edr-isolation)

## Forensics
- [Process Tree](http://localhost:5601/app/dashboards#/view/edr-process-tree)
- [File Integrity](http://localhost:5601/app/dashboards#/view/edr-file-integrity)
- [Threat Hunting](http://localhost:5601/app/dashboards#/view/edr-hunting)
"@

$edrVis = "{`"attributes`":{`"title`":`"EDR Navigation`",`"visState`":`"{\\`"title\\`":\\`"EDR Navigation\\`",\\`"type\\`":\\`"markdown\\`",\\`"params\\`":{\\`"fontSize\\`":12,\\`"openLinksInNewTab\\`":false,\\`"markdown\\`":\\`"$($edrMarkdown -replace '`n','\\n' -replace '"','\\\"')\\`"},\\`"aggs\\`":[]}`",`"uiStateJSON`":`"{}`",`"description`":`"EDR team navigation`",`"version`":1,`"kibanaSavedObjectMeta`":{`"searchSourceJSON`":`"{}`"}},`"id`":`"edr-nav-vis`",`"type`":`"visualization`"}"

try {
    Invoke-RestMethod -Uri "http://localhost:5601/api/saved_objects/visualization/edr-nav-vis" -Method Post -Headers $headers -Body $edrVis | Out-Null
    Write-Host "  ✓ Created EDR navigation visualization" -ForegroundColor Green
}
catch {
    Write-Host "  Skip: EDR nav (exists)" -ForegroundColor Gray
}

Write-Host "`nCreating home dashboards..." -ForegroundColor Cyan

# Create SIEM Home Dashboard
$siemHome = "{`"attributes`":{`"title`":`"SIEM - Home`",`"description`":`"SIEM team home page`",`"panelsJSON`":`"[{\\`"version\\`":\\`"2.13.0\\`",\\`"gridData\\`":{\\`"x\\`":0,\\`"y\\`":0,\\`"w\\`":48,\\`"h\\`":30,\\`"i\\`":\\`"1\\`"},\\`"panelIndex\\`":\\`"1\\`",\\`"embeddableConfig\\`":{},\\`"panelRefName\\`":\\`"panel_1\\`"}]`",`"optionsJSON`":`"{\\`"hidePanelTitles\\`":true,\\`"useMargins\\`":true}`",`"version`":1,`"timeRestore`":false},`"references`":[{`"name`":`"panel_1`",`"type`":`"visualization`",`"id`":`"siem-nav-vis`"}]}"

try {
    Invoke-RestMethod -Uri "http://localhost:5601/api/saved_objects/dashboard/siem-home?overwrite=true" -Method Put -Headers $headers -Body $siemHome | Out-Null
    Write-Host "  ✓ Created siem-home dashboard" -ForegroundColor Green
}
catch {
    Write-Host "  ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Create IDS Home Dashboard
$idsHome = "{`"attributes`":{`"title`":`"IDS - Home`",`"description`":`"IDS team home page`",`"panelsJSON`":`"[{\\`"version\\`":\\`"2.13.0\\`",\\`"gridData\\`":{\\`"x\\`":0,\\`"y\\`":0,\\`"w\\`":48,\\`"h\\`":20,\\`"i\\`":\\`"1\\`"},\\`"panelIndex\\`":\\`"1\\`",\\`"embeddableConfig\\`":{},\\`"panelRefName\\`":\\`"panel_1\\`"}]`",`"optionsJSON`":`"{\\`"hidePanelTitles\\`":true,\\`"useMargins\\`":true}`",`"version`":1,`"timeRestore`":false},`"references`":[{`"name`":`"panel_1`",`"type`":`"visualization`",`"id`":`"ids-nav-vis`"}]}"

try {
    Invoke-RestMethod -Uri "http://localhost:5601/api/saved_objects/dashboard/ids-home?overwrite=true" -Method Put -Headers $headers -Body $idsHome | Out-Null
    Write-Host "  ✓ Created ids-home dashboard" -ForegroundColor Green
}
catch {
    Write-Host "  ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Create EDR Home Dashboard
$edrHome = "{`"attributes`":{`"title`":`"EDR - Home`",`"description`":`"EDR team home page`",`"panelsJSON`":`"[{\\`"version\\`":\\`"2.13.0\\`",\\`"gridData\\`":{\\`"x\\`":0,\\`"y\\`":0,\\`"w\\`":48,\\`"h\\`":20,\\`"i\\`":\\`"1\\`"},\\`"panelIndex\\`":\\`"1\\`",\\`"embeddableConfig\\`":{},\\`"panelRefName\\`":\\`"panel_1\\`"}]`",`"optionsJSON`":`"{\\`"hidePanelTitles\\`":true,\\`"useMargins\\`":true}`",`"version`":1,`"timeRestore`":false},`"references`":[{`"name`":`"panel_1`",`"type`":`"visualization`",`"id`":`"edr-nav-vis`"}]}"

try {
    Invoke-RestMethod -Uri "http://localhost:5601/api/saved_objects/dashboard/edr-home?overwrite=true" -Method Put -Headers $headers -Body $edrHome | Out-Null
    Write-Host "  ✓ Created edr-home dashboard" -ForegroundColor Green
}
catch {
    Write-Host "  ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nDone! Team home dashboards created." -ForegroundColor Green
