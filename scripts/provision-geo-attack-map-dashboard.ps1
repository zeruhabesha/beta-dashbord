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
    @{ Id = 'visualization:ids-geo-total'; Kind = 'metric'; Title = 'Geo-Ready Records'; Description = 'All IP-origin and destination records available for geo analysis.'; Query = 'src_ip:* or id.orig_h:*'; Subtitle = 'All geo-ready logs' },
    @{ Id = 'visualization:ids-geo-source'; Kind = 'metric'; Title = 'Source Origins'; Description = 'Records with source IP context.'; Query = 'src_ip:* or id.orig_h:*'; Subtitle = 'Source side' },
    @{ Id = 'visualization:ids-geo-destination'; Kind = 'metric'; Title = 'Destinations'; Description = 'Records with destination IP context.'; Query = 'dest_ip:* or id.resp_h:*'; Subtitle = 'Destination side' },
    @{ Id = 'visualization:ids-geo-tenant-chart'; Kind = 'pie'; Title = 'Geo Records By Tenant'; Description = 'Tenant distribution of geo-ready logs.'; Query = 'tenant_id:*'; Field = 'tenant_id.keyword'; Size = 8 },
    @{ Id = 'visualization:ids-geo-source-chart'; Kind = 'pie'; Title = 'Geo Records By Source'; Description = 'Source distribution of geo-ready logs.'; Query = 'source_type:*'; Field = 'source_type.keyword'; Size = 6 }
)

foreach ($visualization in $visualizations) {
    if ($visualization.Kind -eq 'metric') {
        Invoke-OpenSearchDocumentUpsert -DocumentId $visualization.Id -JsonBody (New-MetricVisualizationDocument -Title $visualization.Title -Description $visualization.Description -Query $visualization.Query -Subtitle $visualization.Subtitle)
    } else {
        Invoke-OpenSearchDocumentUpsert -DocumentId $visualization.Id -JsonBody (New-PieVisualizationDocument -Title $visualization.Title -Description $visualization.Description -Query $visualization.Query -Field $visualization.Field -Size $visualization.Size)
    }
}

Invoke-OpenSearchDocumentUpsert -DocumentId 'search:ids-geo-attack-map-overview' -JsonBody (New-SavedSearchDocument -Title 'Geo Attack Overview' -Description 'Geo-ready IP activity overview.' -Query 'src_ip:* or id.orig_h:*' -Columns @('timestamp', 'tenant_id', 'source_type', 'src_ip', 'dest_ip', 'id.orig_h', 'id.resp_h', 'proto', 'app_proto', '_index'))
Invoke-OpenSearchDocumentUpsert -DocumentId 'search:ids-geo-attack-map-sources' -JsonBody (New-SavedSearchDocument -Title 'Source IP Stream' -Description 'Source-oriented IP stream.' -Query 'src_ip:* or id.orig_h:*' -Columns @('timestamp', 'tenant_id', 'src_ip', 'id.orig_h', 'src_port', 'id.orig_p', 'proto', '_index'))
Invoke-OpenSearchDocumentUpsert -DocumentId 'search:ids-geo-attack-map-destinations' -JsonBody (New-SavedSearchDocument -Title 'Destination IP Stream' -Description 'Destination-oriented IP stream.' -Query 'dest_ip:* or id.resp_h:*' -Columns @('timestamp', 'tenant_id', 'dest_ip', 'id.resp_h', 'dest_port', 'id.resp_p', 'proto', '_index'))

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
        title = 'IDS Geo Attack Map'
        description = 'Geo-ready dashboard with count cards, distribution charts, and source/destination pivots.'
        hits = 0
        panelsJSON = $panels
        optionsJSON = '{"hidePanelTitles":false,"useMargins":true}'
        version = 1
        timeRestore = $false
        kibanaSavedObjectMeta = @{ searchSourceJSON = '{"query":{"language":"kuery","query":""},"filter":[]}' }
    }
    type = 'dashboard'
    references = @(
        @{ name = 'panel_0'; type = 'visualization'; id = 'ids-geo-total' },
        @{ name = 'panel_1'; type = 'visualization'; id = 'ids-geo-source' },
        @{ name = 'panel_2'; type = 'visualization'; id = 'ids-geo-destination' },
        @{ name = 'panel_3'; type = 'visualization'; id = 'ids-geo-tenant-chart' },
        @{ name = 'panel_4'; type = 'visualization'; id = 'ids-geo-source-chart' },
        @{ name = 'panel_5'; type = 'search'; id = 'ids-geo-attack-map-overview' },
        @{ name = 'panel_6'; type = 'search'; id = 'ids-geo-attack-map-sources' },
        @{ name = 'panel_7'; type = 'search'; id = 'ids-geo-attack-map-destinations' }
    )
    migrationVersion = @{ dashboard = '7.9.3' }
    updated_at = (Get-Date).ToUniversalTime().ToString('o')
} | ConvertTo-Json -Compress -Depth 12

Invoke-OpenSearchDocumentUpsert -DocumentId 'dashboard:ids-geo-attack-map' -JsonBody $dashboardBody
docker exec $kindNode kubectl --kubeconfig=/etc/kubernetes/admin.conf exec -n $opensearchNamespace $opensearchPod -- curl -s "http://localhost:9200/$kibanaIndex/_search?q=type:dashboard%20AND%20dashboard.title:IDS%20Geo%20Attack%20Map&size=5"
