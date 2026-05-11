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

$objects = @(
    @{ Id = 'visualization:ids-network-flows-total'; Kind = 'metric'; Title = 'Flow Records'; Description = 'All flow-oriented records.'; Query = '(_index:"logs-*-suricata-flow" or _index:"logs-*-zeek-conn")'; Subtitle = 'All flows' },
    @{ Id = 'visualization:ids-network-flows-suricata-count'; Kind = 'metric'; Title = 'Suricata Flow'; Description = 'Suricata flow records.'; Query = '_index:"logs-*-suricata-flow"'; Subtitle = 'Suricata' },
    @{ Id = 'visualization:ids-network-flows-zeek-count'; Kind = 'metric'; Title = 'Zeek Conn'; Description = 'Zeek connection records.'; Query = '_index:"logs-*-zeek-conn"'; Subtitle = 'Zeek' },
    @{ Id = 'visualization:ids-network-flows-proto-chart'; Kind = 'pie'; Title = 'Flows By Protocol'; Description = 'Protocol split for flow records.'; Query = '(_index:"logs-*-suricata-flow" or _index:"logs-*-zeek-conn")'; Field = 'proto.keyword'; Size = 8 },
    @{ Id = 'visualization:ids-network-flows-tenant-chart'; Kind = 'pie'; Title = 'Flows By Tenant'; Description = 'Tenant split for flow records.'; Query = '(_index:"logs-*-suricata-flow" or _index:"logs-*-zeek-conn")'; Field = 'tenant_id.keyword'; Size = 8 }
)

foreach ($object in $objects) {
    if ($object.Kind -eq 'metric') {
        Invoke-OpenSearchDocumentUpsert -DocumentId $object.Id -JsonBody (New-MetricVisualizationDocument -Title $object.Title -Description $object.Description -Query $object.Query -Subtitle $object.Subtitle)
    } else {
        Invoke-OpenSearchDocumentUpsert -DocumentId $object.Id -JsonBody (New-PieVisualizationDocument -Title $object.Title -Description $object.Description -Query $object.Query -Field $object.Field -Size $object.Size)
    }
}

Invoke-OpenSearchDocumentUpsert -DocumentId 'search:ids-network-flows-overview' -JsonBody (New-SavedSearchDocument -Title 'IDS Network Flows Overview' -Description 'Combined Suricata flow and Zeek connection stream.' -Query '(_index:"logs-*-suricata-flow" or _index:"logs-*-zeek-conn")' -Columns @('timestamp', 'tenant_id', 'source_type', 'proto', 'app_proto', 'src_ip', 'dest_ip', 'id.orig_h', 'id.resp_h', '_index'))
Invoke-OpenSearchDocumentUpsert -DocumentId 'search:ids-network-flows-suricata' -JsonBody (New-SavedSearchDocument -Title 'Suricata Flow Stream' -Description 'Focused view of Suricata flow events.' -Query '_index:"logs-*-suricata-flow"' -Columns @('timestamp', 'tenant_id', 'event_type', 'proto', 'app_proto', 'src_ip', 'src_port', 'dest_ip', 'dest_port', 'flow.state'))
Invoke-OpenSearchDocumentUpsert -DocumentId 'search:ids-network-flows-zeek' -JsonBody (New-SavedSearchDocument -Title 'Zeek Connection Stream' -Description 'Focused view of Zeek connection records.' -Query '_index:"logs-*-zeek-conn"' -Columns @('timestamp', 'tenant_id', 'source', 'proto', 'id.orig_h', 'id.orig_p', 'id.resp_h', 'id.resp_p', 'conn_state', 'uid'))

$panels = @(
    @{ version = '7.9.3'; gridData = @{ x = 0; y = 0; w = 16; h = 8; i = '1' }; panelIndex = '1'; embeddableConfig = @{}; panelRefName = 'panel_0'; type = 'visualization' },
    @{ version = '7.9.3'; gridData = @{ x = 16; y = 0; w = 16; h = 8; i = '2' }; panelIndex = '2'; embeddableConfig = @{}; panelRefName = 'panel_1'; type = 'visualization' },
    @{ version = '7.9.3'; gridData = @{ x = 32; y = 0; w = 16; h = 8; i = '3' }; panelIndex = '3'; embeddableConfig = @{}; panelRefName = 'panel_2'; type = 'visualization' },
    @{ version = '7.9.3'; gridData = @{ x = 0; y = 8; w = 24; h = 14; i = '4' }; panelIndex = '4'; embeddableConfig = @{}; panelRefName = 'panel_3'; type = 'visualization' },
    @{ version = '7.9.3'; gridData = @{ x = 24; y = 8; w = 24; h = 14; i = '5' }; panelIndex = '5'; embeddableConfig = @{}; panelRefName = 'panel_4'; type = 'visualization' },
    @{ version = '7.9.3'; gridData = @{ x = 0; y = 22; w = 48; h = 12; i = '6' }; panelIndex = '6'; embeddableConfig = @{}; panelRefName = 'panel_5'; type = 'search' },
    @{ version = '7.9.3'; gridData = @{ x = 0; y = 34; w = 24; h = 12; i = '7' }; panelIndex = '7'; embeddableConfig = @{}; panelRefName = 'panel_6'; type = 'search' },
    @{ version = '7.9.3'; gridData = @{ x = 24; y = 34; w = 24; h = 12; i = '8' }; panelIndex = '8'; embeddableConfig = @{}; panelRefName = 'panel_7'; type = 'search' }
) | ConvertTo-Json -Compress -Depth 8

$dashboardBody = @{
    dashboard = @{
        title = 'IDS Network Flows'
        description = 'OpenSearch dashboard for cross-tenant flow inspection with counters, charts, and detailed streams.'
        hits = 0
        panelsJSON = $panels
        optionsJSON = '{"hidePanelTitles":false,"useMargins":true}'
        version = 1
        timeRestore = $false
        kibanaSavedObjectMeta = @{ searchSourceJSON = '{"query":{"language":"kuery","query":""},"filter":[]}' }
    }
    type = 'dashboard'
    references = @(
        @{ name = 'panel_0'; type = 'visualization'; id = 'ids-network-flows-total' },
        @{ name = 'panel_1'; type = 'visualization'; id = 'ids-network-flows-suricata-count' },
        @{ name = 'panel_2'; type = 'visualization'; id = 'ids-network-flows-zeek-count' },
        @{ name = 'panel_3'; type = 'visualization'; id = 'ids-network-flows-proto-chart' },
        @{ name = 'panel_4'; type = 'visualization'; id = 'ids-network-flows-tenant-chart' },
        @{ name = 'panel_5'; type = 'search'; id = 'ids-network-flows-overview' },
        @{ name = 'panel_6'; type = 'search'; id = 'ids-network-flows-suricata' },
        @{ name = 'panel_7'; type = 'search'; id = 'ids-network-flows-zeek' }
    )
    migrationVersion = @{ dashboard = '7.9.3' }
    updated_at = (Get-Date).ToUniversalTime().ToString('o')
} | ConvertTo-Json -Compress -Depth 12

docker exec $kindNode kubectl --kubeconfig=/etc/kubernetes/admin.conf exec -n $opensearchNamespace $opensearchPod -- curl -s -X DELETE "http://localhost:9200/$kibanaIndex/_doc/=true?refresh=true" | Out-Null
Invoke-OpenSearchDocumentUpsert -DocumentId 'dashboard:ids-network-flows' -JsonBody $dashboardBody
docker exec $kindNode kubectl --kubeconfig=/etc/kubernetes/admin.conf exec -n $opensearchNamespace $opensearchPod -- curl -s "http://localhost:9200/$kibanaIndex/_search?q=type:dashboard%20AND%20dashboard.title:IDS%20Network%20Flows&size=5"
