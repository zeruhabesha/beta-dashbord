$ErrorActionPreference = 'Stop'

$kindNode = 'tenant-ids-dev-control-plane'
$opensearchNamespace = 'logging'
$opensearchPod = 'opensearch-cluster-master-0'
$kibanaIndex = '.kibana_1'
$dataViewId = '6647bee0-21f8-11f1-aa59-ff5e5c7b4fa7'

function Invoke-OpenSearchDocumentUpsert {
    param([string]$DocumentId, [string]$JsonBody)
    $command = "cat >/tmp/payload.json && curl -s -H 'Content-Type: application/json' -X PUT 'http://localhost:9200/$kibanaIndex/_doc/${DocumentId}?refresh=true' --data-binary @/tmp/payload.json"
    $JsonBody | docker exec -i $kindNode kubectl --kubeconfig=/etc/kubernetes/admin.conf exec -i -n $opensearchNamespace $opensearchPod -- sh -lc $command | Out-Null
}

function New-SavedSearchDocument {
    param([string]$Title, [string]$Description, [string]$Query, [string[]]$Columns)
    return @{
        search = @{
            title = $Title
            description = $Description
            columns = $Columns
            sort = @('timestamp', 'desc')
            kibanaSavedObjectMeta = @{
                searchSourceJSON = (@{
                    index = $dataViewId
                    query = @{ language = 'kuery'; query = $Query }
                    filter = @()
                } | ConvertTo-Json -Compress -Depth 8)
            }
        }
        type = 'search'
        references = @()
        migrationVersion = @{ search = '7.9.3' }
        updated_at = (Get-Date).ToUniversalTime().ToString('o')
    } | ConvertTo-Json -Compress -Depth 12
}

function New-MetricVisualizationDocument {
    param([string]$Title, [string]$Description, [string]$Query, [string]$Subtitle)
    $visState = @{
        title = $Title
        type = 'metric'
        aggs = @(@{ id = '1'; enabled = $true; type = 'count'; schema = 'metric'; params = @{} })
        params = @{
            addTooltip = $true
            addLegend = $false
            type = 'metric'
            metric = @{
                percentageMode = $false
                useRanges = $false
                colorSchema = 'Green to Red'
                metricColorMode = 'None'
                colorsRange = @(@{ from = 0; to = 10000 })
                labels = @{ show = $true }
                invertColors = $false
                style = @{ bgFill = '#0f172a'; bgColor = $false; labelColor = $false; subText = $Subtitle; fontSize = 42 }
            }
        }
    } | ConvertTo-Json -Compress -Depth 12

    return @{
        visualization = @{
            title = $Title
            description = $Description
            visState = $visState
            uiStateJSON = '{}'
            version = 1
            kibanaSavedObjectMeta = @{
                searchSourceJSON = (@{
                    query = @{ language = 'kuery'; query = $Query }
                    filter = @()
                    indexRefName = 'kibanaSavedObjectMeta.searchSourceJSON.index'
                } | ConvertTo-Json -Compress -Depth 8)
            }
        }
        type = 'visualization'
        references = @(@{ name = 'kibanaSavedObjectMeta.searchSourceJSON.index'; type = 'index-pattern'; id = $dataViewId })
        migrationVersion = @{ visualization = '7.10.0' }
        updated_at = (Get-Date).ToUniversalTime().ToString('o')
    } | ConvertTo-Json -Compress -Depth 12
}

function New-PieVisualizationDocument {
    param([string]$Title, [string]$Description, [string]$Query, [string]$Field, [int]$Size)
    $visState = @{
        title = $Title
        type = 'pie'
        aggs = @(
            @{ id = '1'; enabled = $true; type = 'count'; schema = 'metric'; params = @{} },
            @{ id = '2'; enabled = $true; type = 'terms'; schema = 'segment'; params = @{ field = $Field; size = $Size; order = 'desc'; orderBy = '1'; otherBucket = $false; missingBucket = $false } }
        )
        params = @{ addTooltip = $true; addLegend = $true; legendPosition = 'right'; isDonut = $true; labels = @{ show = $false; values = $true; last_level = $true; truncate = 100 } }
    } | ConvertTo-Json -Compress -Depth 12

    return @{
        visualization = @{
            title = $Title
            description = $Description
            visState = $visState
            uiStateJSON = '{}'
            version = 1
            kibanaSavedObjectMeta = @{
                searchSourceJSON = (@{
                    query = @{ language = 'kuery'; query = $Query }
                    filter = @()
                    indexRefName = 'kibanaSavedObjectMeta.searchSourceJSON.index'
                } | ConvertTo-Json -Compress -Depth 8)
            }
        }
        type = 'visualization'
        references = @(@{ name = 'kibanaSavedObjectMeta.searchSourceJSON.index'; type = 'index-pattern'; id = $dataViewId })
        migrationVersion = @{ visualization = '7.10.0' }
        updated_at = (Get-Date).ToUniversalTime().ToString('o')
    } | ConvertTo-Json -Compress -Depth 12
}

$visualizations = @(
    @{ Id = 'visualization:ids-signatures-total'; Kind = 'metric'; Title = 'Signature Records'; Description = 'All signature-oriented records.'; Query = '(_index:"logs-*-suricata-dns" or _index:"logs-*-suricata-http" or _index:"logs-*-suricata-fileinfo" or _index:"logs-*-zeek-http")'; Subtitle = 'All signature data' },
    @{ Id = 'visualization:ids-signatures-dns-count'; Kind = 'metric'; Title = 'DNS Records'; Description = 'DNS signature records.'; Query = '_index:"logs-*-suricata-dns"'; Subtitle = 'DNS' },
    @{ Id = 'visualization:ids-signatures-http-count'; Kind = 'metric'; Title = 'HTTP Records'; Description = 'HTTP signature records.'; Query = '(_index:"logs-*-suricata-http" or _index:"logs-*-zeek-http")'; Subtitle = 'HTTP' },
    @{ Id = 'visualization:ids-signatures-source-chart'; Kind = 'pie'; Title = 'Signatures By Source'; Description = 'Source split for signature records.'; Query = '(_index:"logs-*-suricata-dns" or _index:"logs-*-suricata-http" or _index:"logs-*-suricata-fileinfo" or _index:"logs-*-zeek-http")'; Field = 'source_type.keyword'; Size = 6 },
    @{ Id = 'visualization:ids-signatures-tenant-chart'; Kind = 'pie'; Title = 'Signatures By Tenant'; Description = 'Tenant split for signature records.'; Query = 'tenant_id:*'; Field = 'tenant_id.keyword'; Size = 8 }
)

foreach ($visualization in $visualizations) {
    if ($visualization.Kind -eq 'metric') {
        Invoke-OpenSearchDocumentUpsert -DocumentId $visualization.Id -JsonBody (New-MetricVisualizationDocument -Title $visualization.Title -Description $visualization.Description -Query $visualization.Query -Subtitle $visualization.Subtitle)
    } else {
        Invoke-OpenSearchDocumentUpsert -DocumentId $visualization.Id -JsonBody (New-PieVisualizationDocument -Title $visualization.Title -Description $visualization.Description -Query $visualization.Query -Field $visualization.Field -Size $visualization.Size)
    }
}

Invoke-OpenSearchDocumentUpsert -DocumentId 'search:ids-signatures-overview' -JsonBody (New-SavedSearchDocument -Title 'IDS Signature Overview' -Description 'Combined signature-oriented telemetry.' -Query '(_index:"logs-*-suricata-dns" or _index:"logs-*-suricata-http" or _index:"logs-*-suricata-fileinfo" or _index:"logs-*-zeek-http")' -Columns @('timestamp', 'tenant_id', 'source_type', 'event_type', 'dns.rrname', 'http.hostname', 'http.url', 'src_ip', 'dest_ip', '_index'))
Invoke-OpenSearchDocumentUpsert -DocumentId 'search:ids-signatures-dns' -JsonBody (New-SavedSearchDocument -Title 'DNS Signature Events' -Description 'Domain lookups and query artifacts.' -Query '_index:"logs-*-suricata-dns"' -Columns @('timestamp', 'tenant_id', 'dns.type', 'dns.rrname', 'dns.rrtype', 'src_ip', 'dest_ip', 'proto', '_index'))
Invoke-OpenSearchDocumentUpsert -DocumentId 'search:ids-signatures-http' -JsonBody (New-SavedSearchDocument -Title 'HTTP Signature Events' -Description 'HTTP request metadata from Suricata and Zeek.' -Query '(_index:"logs-*-suricata-http" or _index:"logs-*-zeek-http")' -Columns @('timestamp', 'tenant_id', 'http.hostname', 'http.http_method', 'http.url', 'http.status', 'src_ip', 'dest_ip', 'http.http_user_agent', '_index'))
Invoke-OpenSearchDocumentUpsert -DocumentId 'search:ids-signatures-fileinfo' -JsonBody (New-SavedSearchDocument -Title 'File Signature Artifacts' -Description 'File-related telemetry extracted from Suricata fileinfo events.' -Query '_index:"logs-*-suricata-fileinfo"' -Columns @('timestamp', 'tenant_id', 'fileinfo.filename', 'fileinfo.magic', 'fileinfo.size', 'fileinfo.state', 'http.hostname', 'http.url', 'src_ip', 'dest_ip', '_index'))
Invoke-OpenSearchDocumentUpsert -DocumentId 'search:ids-signatures-zeek-http' -JsonBody (New-SavedSearchDocument -Title 'Zeek HTTP Correlation' -Description 'Connection-level HTTP correlation from Zeek.' -Query '_index:"logs-*-zeek-http"' -Columns @('timestamp', 'tenant_id', 'service', 'proto', 'id.orig_h', 'id.orig_p', 'id.resp_h', 'id.resp_p', 'conn_state', 'uid', '_index'))

$panels = @(
    @{ version = '7.9.3'; gridData = @{ x = 0; y = 0; w = 16; h = 8; i = '1' }; panelIndex = '1'; embeddableConfig = @{}; panelRefName = 'panel_0'; type = 'visualization' },
    @{ version = '7.9.3'; gridData = @{ x = 16; y = 0; w = 16; h = 8; i = '2' }; panelIndex = '2'; embeddableConfig = @{}; panelRefName = 'panel_1'; type = 'visualization' },
    @{ version = '7.9.3'; gridData = @{ x = 32; y = 0; w = 16; h = 8; i = '3' }; panelIndex = '3'; embeddableConfig = @{}; panelRefName = 'panel_2'; type = 'visualization' },
    @{ version = '7.9.3'; gridData = @{ x = 0; y = 8; w = 24; h = 14; i = '4' }; panelIndex = '4'; embeddableConfig = @{}; panelRefName = 'panel_3'; type = 'visualization' },
    @{ version = '7.9.3'; gridData = @{ x = 24; y = 8; w = 24; h = 14; i = '5' }; panelIndex = '5'; embeddableConfig = @{}; panelRefName = 'panel_4'; type = 'visualization' },
    @{ version = '7.9.3'; gridData = @{ x = 0; y = 22; w = 48; h = 12; i = '6' }; panelIndex = '6'; embeddableConfig = @{}; panelRefName = 'panel_5'; type = 'search' },
    @{ version = '7.9.3'; gridData = @{ x = 0; y = 34; w = 24; h = 12; i = '7' }; panelIndex = '7'; embeddableConfig = @{}; panelRefName = 'panel_6'; type = 'search' },
    @{ version = '7.9.3'; gridData = @{ x = 24; y = 34; w = 24; h = 12; i = '8' }; panelIndex = '8'; embeddableConfig = @{}; panelRefName = 'panel_7'; type = 'search' },
    @{ version = '7.9.3'; gridData = @{ x = 0; y = 46; w = 24; h = 12; i = '9' }; panelIndex = '9'; embeddableConfig = @{}; panelRefName = 'panel_8'; type = 'search' },
    @{ version = '7.9.3'; gridData = @{ x = 24; y = 46; w = 24; h = 12; i = '10' }; panelIndex = '10'; embeddableConfig = @{}; panelRefName = 'panel_9'; type = 'search' }
) | ConvertTo-Json -Compress -Depth 8

$dashboardBody = @{
    dashboard = @{
        title = 'IDS Signatures'
        description = 'Deep OpenSearch dashboard for signature telemetry with metric cards, charts, and protocol pivots.'
        hits = 0
        panelsJSON = $panels
        optionsJSON = '{"hidePanelTitles":false,"useMargins":true}'
        version = 1
        timeRestore = $false
        kibanaSavedObjectMeta = @{ searchSourceJSON = '{"query":{"language":"kuery","query":""},"filter":[]}' }
    }
    type = 'dashboard'
    references = @(
        @{ name = 'panel_0'; type = 'visualization'; id = 'ids-signatures-total' },
        @{ name = 'panel_1'; type = 'visualization'; id = 'ids-signatures-dns-count' },
        @{ name = 'panel_2'; type = 'visualization'; id = 'ids-signatures-http-count' },
        @{ name = 'panel_3'; type = 'visualization'; id = 'ids-signatures-source-chart' },
        @{ name = 'panel_4'; type = 'visualization'; id = 'ids-signatures-tenant-chart' },
        @{ name = 'panel_5'; type = 'search'; id = 'ids-signatures-overview' },
        @{ name = 'panel_6'; type = 'search'; id = 'ids-signatures-dns' },
        @{ name = 'panel_7'; type = 'search'; id = 'ids-signatures-http' },
        @{ name = 'panel_8'; type = 'search'; id = 'ids-signatures-fileinfo' },
        @{ name = 'panel_9'; type = 'search'; id = 'ids-signatures-zeek-http' }
    )
    migrationVersion = @{ dashboard = '7.9.3' }
    updated_at = (Get-Date).ToUniversalTime().ToString('o')
} | ConvertTo-Json -Compress -Depth 12

Invoke-OpenSearchDocumentUpsert -DocumentId 'dashboard:ids-signatures' -JsonBody $dashboardBody
docker exec $kindNode kubectl --kubeconfig=/etc/kubernetes/admin.conf exec -n $opensearchNamespace $opensearchPod -- curl -s "http://localhost:9200/$kibanaIndex/_search?q=type:dashboard%20AND%20dashboard.title:IDS%20Signatures&size=5"
