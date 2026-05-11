$ErrorActionPreference = 'Stop'

$kindNode = 'tenant-ids-dev-control-plane'
$opensearchNamespace = 'logging'
$opensearchPod = 'opensearch-cluster-master-0'
$kibanaIndex = '.kibana_1'
$dataViewId = '6647bee0-21f8-11f1-aa59-ff5e5c7b4fa7'

function Invoke-OpenSearchDocumentUpsert {
    param(
        [Parameter(Mandatory = $true)]
        [string]$DocumentId,
        [Parameter(Mandatory = $true)]
        [string]$JsonBody
    )

    $command = "cat >/tmp/payload.json && curl -s -H 'Content-Type: application/json' -X PUT 'http://localhost:9200/$kibanaIndex/_doc/${DocumentId}?refresh=true' --data-binary @/tmp/payload.json"
    $JsonBody | docker exec -i $kindNode kubectl --kubeconfig=/etc/kubernetes/admin.conf exec -i -n $opensearchNamespace $opensearchPod -- sh -lc $command | Out-Null
}

function New-SavedSearchDocument {
    param(
        [string]$Title,
        [string]$Description,
        [string]$Query,
        [string[]]$Columns
    )

    return @{
        search = @{
            title = $Title
            description = $Description
            columns = $Columns
            sort = @('timestamp', 'desc')
            kibanaSavedObjectMeta = @{
                searchSourceJSON = (@{
                    index = $dataViewId
                    query = @{
                        language = 'kuery'
                        query = $Query
                    }
                    filter = @()
                } | ConvertTo-Json -Compress -Depth 8)
            }
        }
        type = 'search'
        references = @()
        migrationVersion = @{
            search = '7.9.3'
        }
        updated_at = (Get-Date).ToUniversalTime().ToString('o')
    } | ConvertTo-Json -Compress -Depth 12
}

function New-MetricVisualizationDocument {
    param(
        [string]$Title,
        [string]$Description,
        [string]$Query,
        [string]$Subtitle
    )

    $visState = @{
        title = $Title
        type = 'metric'
        aggs = @(
            @{
                id = '1'
                enabled = $true
                type = 'count'
                schema = 'metric'
                params = @{}
            }
        )
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
                style = @{
                    bgFill = '#0f172a'
                    bgColor = $false
                    labelColor = $false
                    subText = $Subtitle
                    fontSize = 42
                }
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
                    query = @{
                        language = 'kuery'
                        query = $Query
                    }
                    filter = @()
                    indexRefName = 'kibanaSavedObjectMeta.searchSourceJSON.index'
                } | ConvertTo-Json -Compress -Depth 8)
            }
        }
        type = 'visualization'
        references = @(
            @{
                name = 'kibanaSavedObjectMeta.searchSourceJSON.index'
                type = 'index-pattern'
                id = $dataViewId
            }
        )
        migrationVersion = @{
            visualization = '7.10.0'
        }
        updated_at = (Get-Date).ToUniversalTime().ToString('o')
    } | ConvertTo-Json -Compress -Depth 12
}

function New-PieVisualizationDocument {
    param(
        [string]$Title,
        [string]$Description,
        [string]$Query,
        [string]$Field,
        [int]$Size
    )

    $visState = @{
        title = $Title
        type = 'pie'
        aggs = @(
            @{
                id = '1'
                enabled = $true
                type = 'count'
                schema = 'metric'
                params = @{}
            },
            @{
                id = '2'
                enabled = $true
                type = 'terms'
                schema = 'segment'
                params = @{
                    field = $Field
                    size = $Size
                    order = 'desc'
                    orderBy = '1'
                    otherBucket = $false
                    missingBucket = $false
                }
            }
        )
        params = @{
            addTooltip = $true
            addLegend = $true
            legendPosition = 'right'
            isDonut = $true
            labels = @{
                show = $false
                values = $true
                last_level = $true
                truncate = 100
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
                    query = @{
                        language = 'kuery'
                        query = $Query
                    }
                    filter = @()
                    indexRefName = 'kibanaSavedObjectMeta.searchSourceJSON.index'
                } | ConvertTo-Json -Compress -Depth 8)
            }
        }
        type = 'visualization'
        references = @(
            @{
                name = 'kibanaSavedObjectMeta.searchSourceJSON.index'
                type = 'index-pattern'
                id = $dataViewId
            }
        )
        migrationVersion = @{
            visualization = '7.10.0'
        }
        updated_at = (Get-Date).ToUniversalTime().ToString('o')
    } | ConvertTo-Json -Compress -Depth 12
}

function New-LineVisualizationDocument {
    param(
        [string]$Title,
        [string]$Description,
        [string]$Query,
        [string]$Field
    )

    $visState = @{
        title = $Title
        type = 'line'
        aggs = @(
            @{
                id = '1'
                enabled = $true
                type = 'count'
                schema = 'metric'
                params = @{}
            },
            @{
                id = '2'
                enabled = $true
                type = 'date_histogram'
                schema = 'segment'
                params = @{
                    field = $Field
                    interval = 'auto'
                    customInterval = '2h'
                    min_doc_count = 1
                    extended_bounds = @{}
                }
            }
        )
        params = @{
            addTooltip = $true
            addLegend = $false
            legendPosition = 'right'
            categoryAxes = @(
                @{
                    id = 'CategoryAxis-1'
                    type = 'category'
                    position = 'bottom'
                    show = $true
                    style = @{}
                    scale = @{ type = 'linear' }
                    labels = @{
                        show = $true
                        truncate = 100
                    }
                    title = @{ text = 'Time' }
                }
            )
            valueAxes = @(
                @{
                    id = 'ValueAxis-1'
                    name = 'LeftAxis-1'
                    type = 'value'
                    position = 'left'
                    show = $true
                    style = @{}
                    scale = @{
                        type = 'linear'
                        mode = 'normal'
                    }
                    labels = @{
                        show = $true
                        rotate = 0
                        filter = $false
                        truncate = 100
                    }
                    title = @{ text = 'Events' }
                }
            )
            seriesParams = @(
                @{
                    show = $true
                    type = 'line'
                    mode = 'normal'
                    data = @{
                        id = '1'
                        label = 'Events'
                    }
                    valueAxis = 'ValueAxis-1'
                    drawLinesBetweenPoints = $true
                    showCircles = $true
                }
            )
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
                    query = @{
                        language = 'kuery'
                        query = $Query
                    }
                    filter = @()
                    indexRefName = 'kibanaSavedObjectMeta.searchSourceJSON.index'
                } | ConvertTo-Json -Compress -Depth 8)
            }
        }
        type = 'visualization'
        references = @(
            @{
                name = 'kibanaSavedObjectMeta.searchSourceJSON.index'
                type = 'index-pattern'
                id = $dataViewId
            }
        )
        migrationVersion = @{
            visualization = '7.10.0'
        }
        updated_at = (Get-Date).ToUniversalTime().ToString('o')
    } | ConvertTo-Json -Compress -Depth 12
}

function New-GaugeVisualizationDocument {
    param(
        [string]$Title,
        [string]$Description,
        [string]$Query,
        [string]$Subtitle
    )

    $visState = @{
        title = $Title
        type = 'gauge'
        aggs = @(
            @{
                id = '1'
                enabled = $true
                type = 'count'
                schema = 'metric'
                params = @{}
            }
        )
        params = @{
            addTooltip = $true
            addLegend = $false
            type = 'gauge'
            gauge = @{
                style = @{
                    bgWidth = 0.9
                    width = 0.9
                    mask = $false
                    bgMask = $false
                }
                type = 'arc'
                orientation = 'vertical'
                colorSchema = 'Green to Red'
                gaugeColorMode = 'Labels'
                backStyle = $false
                scale = @{
                    show = $true
                    labels = $false
                    color = $false
                }
                labels = @{ show = $true }
            }
            metric = @{
                percentageMode = $false
                useRanges = $true
                colorSchema = 'Green to Red'
                metricColorMode = 'None'
                colorsRange = @(
                    @{ from = 0; to = 2000 },
                    @{ from = 2000; to = 6000 },
                    @{ from = 6000; to = 12000 }
                )
                labels = @{ show = $true }
                invertColors = $false
                style = @{
                    bgFill = '#0f172a'
                    bgColor = $false
                    labelColor = $false
                    subText = $Subtitle
                    fontSize = 28
                }
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
                    query = @{
                        language = 'kuery'
                        query = $Query
                    }
                    filter = @()
                    indexRefName = 'kibanaSavedObjectMeta.searchSourceJSON.index'
                } | ConvertTo-Json -Compress -Depth 8)
            }
        }
        type = 'visualization'
        references = @(
            @{
                name = 'kibanaSavedObjectMeta.searchSourceJSON.index'
                type = 'index-pattern'
                id = $dataViewId
            }
        )
        migrationVersion = @{
            visualization = '7.10.0'
        }
        updated_at = (Get-Date).ToUniversalTime().ToString('o')
    } | ConvertTo-Json -Compress -Depth 12
}

function New-DashboardDocument {
    param(
        [string]$Title,
        [string]$Description,
        [array]$Panels
    )

    $references = @()
    $panelObjects = foreach ($index in 0..($Panels.Count - 1)) {
        $panelNumber = $index + 1
        $panelRef = "panel_$index"
        $panel = $Panels[$index]

        $references += @{
            name = $panelRef
            type = $panel.Type
            id = $panel.SavedObjectShortId
        }

        @{
            version = '7.9.3'
            gridData = @{
                x = $panel.x
                y = $panel.y
                w = $panel.w
                h = $panel.h
                i = "$panelNumber"
            }
            panelIndex = "$panelNumber"
            embeddableConfig = @{}
            panelRefName = $panelRef
            type = $panel.Type
        }
    }

    return @{
        dashboard = @{
            title = $Title
            description = $Description
            hits = 0
            panelsJSON = ($panelObjects | ConvertTo-Json -Compress -Depth 8)
            optionsJSON = '{"hidePanelTitles":false,"useMargins":true}'
            version = 1
            timeRestore = $false
            kibanaSavedObjectMeta = @{
                searchSourceJSON = '{"query":{"language":"kuery","query":""},"filter":[]}'
            }
        }
        type = 'dashboard'
        references = $references
        migrationVersion = @{
            dashboard = '7.9.3'
        }
        updated_at = (Get-Date).ToUniversalTime().ToString('o')
    } | ConvertTo-Json -Compress -Depth 12
}

$dashboardSpecs = @(
    @{
        DashboardId = 'dashboard:ids-home'
        Title = 'IDS Operations Home'
        Description = 'Operational landing page for IDS telemetry with high-level counters, charts, and recent activity.'
        Visualizations = @(
            @{ Id = 'visualization:ids-home-total-events'; ShortId = 'ids-home-total-events'; Kind = 'metric'; Title = 'Total Events'; Description = 'All IDS events in the current time range.'; Query = 'source_type:*'; Subtitle = 'All sources' },
            @{ Id = 'visualization:ids-home-suricata-count'; ShortId = 'ids-home-suricata-count'; Kind = 'metric'; Title = 'Suricata Events'; Description = 'Suricata-backed events.'; Query = '_index:"logs-*-suricata-*"'; Subtitle = 'Suricata' },
            @{ Id = 'visualization:ids-home-zeek-count'; ShortId = 'ids-home-zeek-count'; Kind = 'metric'; Title = 'Zeek Events'; Description = 'Zeek-backed events.'; Query = '_index:"logs-*-zeek-*"'; Subtitle = 'Zeek' },
            @{ Id = 'visualization:ids-home-events-line'; ShortId = 'ids-home-events-line'; Kind = 'line'; Title = 'Event Volume Over Time'; Description = 'Time-series trend for incoming IDS events.'; Query = 'source_type:*'; Field = 'timestamp' },
            @{ Id = 'visualization:ids-home-ingestion-progress'; ShortId = 'ids-home-ingestion-progress'; Kind = 'gauge'; Title = 'Telemetry Progress'; Description = 'Gauge view of current telemetry volume.'; Query = 'source_type:*'; Subtitle = 'Toward target range' },
            @{ Id = 'visualization:ids-home-tenant-chart'; ShortId = 'ids-home-tenant-chart'; Kind = 'pie'; Title = 'Events By Tenant'; Description = 'Tenant distribution for current traffic.'; Query = 'tenant_id:*'; Field = 'tenant_id.keyword'; Size = 8 },
            @{ Id = 'visualization:ids-home-source-chart'; ShortId = 'ids-home-source-chart'; Kind = 'pie'; Title = 'Events By Source'; Description = 'Source distribution for current traffic.'; Query = 'source_type:*'; Field = 'source_type.keyword'; Size = 6 }
        )
        Searches = @(
            @{ Id = 'search:ids-home-activity'; ShortId = 'ids-home-activity'; Title = 'Recent IDS Activity'; Description = 'Latest multi-tenant IDS events.'; Query = 'source_type:*'; Columns = @('timestamp', 'tenant_id', 'source_type', 'event_type', 'proto', 'src_ip', 'dest_ip', '_index') },
            @{ Id = 'search:ids-home-files'; ShortId = 'ids-home-files'; Title = 'File Extraction Watch'; Description = 'Recent file-related IDS telemetry.'; Query = '_index:"logs-*-suricata-fileinfo"'; Columns = @('timestamp', 'tenant_id', 'fileinfo.filename', 'fileinfo.magic', 'fileinfo.size', 'http.hostname', '_index') }
        )
        Panels = @(
            @{ Type = 'visualization'; SavedObjectShortId = 'ids-home-total-events'; x = 0; y = 0; w = 16; h = 8 },
            @{ Type = 'visualization'; SavedObjectShortId = 'ids-home-suricata-count'; x = 16; y = 0; w = 16; h = 8 },
            @{ Type = 'visualization'; SavedObjectShortId = 'ids-home-zeek-count'; x = 32; y = 0; w = 16; h = 8 },
            @{ Type = 'visualization'; SavedObjectShortId = 'ids-home-events-line'; x = 0; y = 8; w = 32; h = 14 },
            @{ Type = 'visualization'; SavedObjectShortId = 'ids-home-ingestion-progress'; x = 32; y = 8; w = 16; h = 14 },
            @{ Type = 'visualization'; SavedObjectShortId = 'ids-home-tenant-chart'; x = 0; y = 22; w = 24; h = 14 },
            @{ Type = 'visualization'; SavedObjectShortId = 'ids-home-source-chart'; x = 24; y = 22; w = 24; h = 14 },
            @{ Type = 'search'; SavedObjectShortId = 'ids-home-activity'; x = 0; y = 36; w = 32; h = 14 },
            @{ Type = 'search'; SavedObjectShortId = 'ids-home-files'; x = 32; y = 36; w = 16; h = 14 }
        )
    },
    @{
        DashboardId = 'dashboard:ids-traffic-overview'
        Title = 'IDS Traffic Overview'
        Description = 'Traffic-focused dashboard with flow counters, protocol charts, and packet streams.'
        Visualizations = @(
            @{ Id = 'visualization:ids-traffic-total'; ShortId = 'ids-traffic-total'; Kind = 'metric'; Title = 'Traffic Records'; Description = 'All traffic records.'; Query = 'source_type:* and (event_type:* or source:*)'; Subtitle = 'Unified traffic' },
            @{ Id = 'visualization:ids-traffic-suricata'; ShortId = 'ids-traffic-suricata'; Kind = 'metric'; Title = 'Suricata Flows'; Description = 'Suricata flow records.'; Query = '_index:"logs-*-suricata-flow"'; Subtitle = 'Suricata flow' },
            @{ Id = 'visualization:ids-traffic-zeek'; ShortId = 'ids-traffic-zeek'; Kind = 'metric'; Title = 'Zeek Connections'; Description = 'Zeek connection records.'; Query = '_index:"logs-*-zeek-conn"'; Subtitle = 'Zeek conn' },
            @{ Id = 'visualization:ids-traffic-proto-chart'; ShortId = 'ids-traffic-proto-chart'; Kind = 'pie'; Title = 'Traffic By Protocol'; Description = 'Protocol distribution.'; Query = 'source_type:*'; Field = 'proto.keyword'; Size = 8 },
            @{ Id = 'visualization:ids-traffic-tenant-chart'; ShortId = 'ids-traffic-tenant-chart'; Kind = 'pie'; Title = 'Traffic By Tenant'; Description = 'Tenant traffic distribution.'; Query = 'tenant_id:*'; Field = 'tenant_id.keyword'; Size = 8 }
        )
        Searches = @(
            @{ Id = 'search:ids-traffic-overview'; ShortId = 'ids-traffic-overview'; Title = 'Traffic Overview Stream'; Description = 'Unified traffic stream across current IDS logs.'; Query = 'source_type:* and (event_type:* or source:*)'; Columns = @('timestamp', 'tenant_id', 'source_type', 'event_type', 'app_proto', 'proto', 'src_ip', 'src_port', 'dest_ip', 'dest_port', '_index') },
            @{ Id = 'search:ids-traffic-nf-feature'; ShortId = 'ids-traffic-nf-feature'; Title = 'Flow Feature Telemetry'; Description = 'Flow feature records from Zeek NF feature logs.'; Query = '_index:"logs-*-zeek-nf-feature"'; Columns = @('timestamp', 'tenant_id', 'IPV4_SRC_ADDR', 'L4_SRC_PORT', 'IPV4_DST_ADDR', 'L4_DST_PORT', 'L7_PROTO', 'IN_BYTES', 'OUT_BYTES', '_index') }
        )
        Panels = @(
            @{ Type = 'visualization'; SavedObjectShortId = 'ids-traffic-total'; x = 0; y = 0; w = 16; h = 8 },
            @{ Type = 'visualization'; SavedObjectShortId = 'ids-traffic-suricata'; x = 16; y = 0; w = 16; h = 8 },
            @{ Type = 'visualization'; SavedObjectShortId = 'ids-traffic-zeek'; x = 32; y = 0; w = 16; h = 8 },
            @{ Type = 'visualization'; SavedObjectShortId = 'ids-traffic-proto-chart'; x = 0; y = 8; w = 18; h = 14 },
            @{ Type = 'visualization'; SavedObjectShortId = 'ids-traffic-tenant-chart'; x = 18; y = 8; w = 18; h = 14 },
            @{ Type = 'search'; SavedObjectShortId = 'ids-traffic-overview'; x = 36; y = 8; w = 12; h = 14 },
            @{ Type = 'search'; SavedObjectShortId = 'ids-traffic-nf-feature'; x = 0; y = 22; w = 48; h = 14 }
        )
    },
    @{
        DashboardId = 'dashboard:ids-blocked-threats'
        Title = 'IDS Blocked Threats'
        Description = 'Threat-response dashboard with blocked-flow counts, threat charts, and pivot context.'
        Visualizations = @(
            @{ Id = 'visualization:ids-blocked-total'; ShortId = 'ids-blocked-total'; Kind = 'metric'; Title = 'Alert Hits'; Description = 'Records matching alert or flagged-flow logic.'; Query = 'event_type:"alert" or flow.alerted:true or alert.signature:*'; Subtitle = 'Alert-like events' },
            @{ Id = 'visualization:ids-blocked-suricata'; ShortId = 'ids-blocked-suricata'; Kind = 'metric'; Title = 'Suricata Hits'; Description = 'Suricata alert-like records.'; Query = '(_index:"logs-*-suricata-*") and (event_type:"alert" or flow.alerted:true or alert.signature:*)'; Subtitle = 'Suricata only' },
            @{ Id = 'visualization:ids-blocked-flows'; ShortId = 'ids-blocked-flows'; Kind = 'metric'; Title = 'Flagged Flows'; Description = 'Flagged flow records.'; Query = '_index:"logs-*-suricata-flow" and flow.alerted:true'; Subtitle = 'flow.alerted' },
            @{ Id = 'visualization:ids-blocked-proto-chart'; ShortId = 'ids-blocked-proto-chart'; Kind = 'pie'; Title = 'Threats By Protocol'; Description = 'Protocol split for blocked-threat logic.'; Query = 'event_type:"alert" or flow.alerted:true or alert.signature:*'; Field = 'proto.keyword'; Size = 8 },
            @{ Id = 'visualization:ids-blocked-tenant-chart'; ShortId = 'ids-blocked-tenant-chart'; Kind = 'pie'; Title = 'Threats By Tenant'; Description = 'Tenant split for blocked-threat logic.'; Query = 'event_type:"alert" or flow.alerted:true or alert.signature:*'; Field = 'tenant_id.keyword'; Size = 8 }
        )
        Searches = @(
            @{ Id = 'search:ids-blocked-http-context'; ShortId = 'ids-blocked-http-context'; Title = 'HTTP Threat Context'; Description = 'HTTP requests around suspicious traffic.'; Query = '_index:"logs-*-suricata-http"'; Columns = @('timestamp', 'tenant_id', 'http.hostname', 'http.http_method', 'http.url', 'src_ip', 'dest_ip', '_index') },
            @{ Id = 'search:ids-blocked-file-context'; ShortId = 'ids-blocked-file-context'; Title = 'File Threat Context'; Description = 'File artifacts around suspicious traffic.'; Query = '_index:"logs-*-suricata-fileinfo"'; Columns = @('timestamp', 'tenant_id', 'fileinfo.filename', 'fileinfo.magic', 'fileinfo.size', 'src_ip', 'dest_ip', '_index') }
        )
        Panels = @(
            @{ Type = 'visualization'; SavedObjectShortId = 'ids-blocked-total'; x = 0; y = 0; w = 16; h = 8 },
            @{ Type = 'visualization'; SavedObjectShortId = 'ids-blocked-suricata'; x = 16; y = 0; w = 16; h = 8 },
            @{ Type = 'visualization'; SavedObjectShortId = 'ids-blocked-flows'; x = 32; y = 0; w = 16; h = 8 },
            @{ Type = 'visualization'; SavedObjectShortId = 'ids-blocked-proto-chart'; x = 0; y = 8; w = 24; h = 14 },
            @{ Type = 'visualization'; SavedObjectShortId = 'ids-blocked-tenant-chart'; x = 24; y = 8; w = 24; h = 14 },
            @{ Type = 'search'; SavedObjectShortId = 'ids-blocked-http-context'; x = 0; y = 22; w = 24; h = 14 },
            @{ Type = 'search'; SavedObjectShortId = 'ids-blocked-file-context'; x = 24; y = 22; w = 24; h = 14 }
        )
    },
    @{
        DashboardId = 'dashboard:ids-intrusion-alerts'
        Title = 'IDS Intrusion Alerts'
        Description = 'Alert-centric dashboard with counts, tenant/event charts, and investigation pivots.'
        Visualizations = @(
            @{ Id = 'visualization:ids-alerts-total'; ShortId = 'ids-alerts-total'; Kind = 'metric'; Title = 'Intrusion Hits'; Description = 'Records matching intrusion-alert logic.'; Query = '(_index:"logs-*-suricata-*") and (event_type:"alert" or flow.alerted:true or alert.signature:*)'; Subtitle = 'Alert logic' },
            @{ Id = 'visualization:ids-alerts-http-count'; ShortId = 'ids-alerts-http-count'; Kind = 'metric'; Title = 'HTTP Context'; Description = 'HTTP records for intrusion context.'; Query = '_index:"logs-*-suricata-http"'; Subtitle = 'HTTP pivots' },
            @{ Id = 'visualization:ids-alerts-dns-count'; ShortId = 'ids-alerts-dns-count'; Kind = 'metric'; Title = 'DNS Context'; Description = 'DNS records for intrusion context.'; Query = '_index:"logs-*-suricata-dns"'; Subtitle = 'DNS pivots' },
            @{ Id = 'visualization:ids-alerts-tenant-chart'; ShortId = 'ids-alerts-tenant-chart'; Kind = 'pie'; Title = 'Alerts By Tenant'; Description = 'Tenant distribution for intrusion alerts.'; Query = '(_index:"logs-*-suricata-*") and (event_type:"alert" or flow.alerted:true or alert.signature:*)'; Field = 'tenant_id.keyword'; Size = 8 },
            @{ Id = 'visualization:ids-alerts-event-chart'; ShortId = 'ids-alerts-event-chart'; Kind = 'pie'; Title = 'Context By Event Type'; Description = 'Context record type split.'; Query = '(_index:"logs-*-suricata-dns" or _index:"logs-*-suricata-http" or _index:"logs-*-suricata-fileinfo")'; Field = 'event_type.keyword'; Size = 8 }
        )
        Searches = @(
            @{ Id = 'search:ids-intrusion-alerts-overview'; ShortId = 'ids-intrusion-alerts-overview'; Title = 'Intrusion Overview'; Description = 'All matching alert-style records.'; Query = '(_index:"logs-*-suricata-*") and (event_type:"alert" or flow.alerted:true or alert.signature:*)'; Columns = @('timestamp', 'tenant_id', 'event_type', 'alert.signature', 'src_ip', 'dest_ip', 'dest_port', 'proto', '_index') },
            @{ Id = 'search:ids-intrusion-alerts-files'; ShortId = 'ids-intrusion-alerts-files'; Title = 'Artifact Correlation'; Description = 'File artifacts helpful during intrusion review.'; Query = '_index:"logs-*-suricata-fileinfo"'; Columns = @('timestamp', 'tenant_id', 'fileinfo.filename', 'fileinfo.magic', 'http.hostname', 'src_ip', 'dest_ip', '_index') }
        )
        Panels = @(
            @{ Type = 'visualization'; SavedObjectShortId = 'ids-alerts-total'; x = 0; y = 0; w = 16; h = 8 },
            @{ Type = 'visualization'; SavedObjectShortId = 'ids-alerts-http-count'; x = 16; y = 0; w = 16; h = 8 },
            @{ Type = 'visualization'; SavedObjectShortId = 'ids-alerts-dns-count'; x = 32; y = 0; w = 16; h = 8 },
            @{ Type = 'visualization'; SavedObjectShortId = 'ids-alerts-tenant-chart'; x = 0; y = 8; w = 18; h = 14 },
            @{ Type = 'visualization'; SavedObjectShortId = 'ids-alerts-event-chart'; x = 18; y = 8; w = 18; h = 14 },
            @{ Type = 'search'; SavedObjectShortId = 'ids-intrusion-alerts-overview'; x = 36; y = 8; w = 12; h = 14 },
            @{ Type = 'search'; SavedObjectShortId = 'ids-intrusion-alerts-files'; x = 0; y = 22; w = 48; h = 14 }
        )
    },
    @{
        DashboardId = 'dashboard:ids-packet-check'
        Title = 'IDS Packet Check'
        Description = 'Packet-inspection dashboard with live counts, distribution charts, and protocol-specific streams.'
        Visualizations = @(
            @{ Id = 'visualization:ids-packet-total'; ShortId = 'ids-packet-total'; Kind = 'metric'; Title = 'Packet Logs'; Description = 'All packet-oriented logs.'; Query = 'source_type:*'; Subtitle = 'All packet logs' },
            @{ Id = 'visualization:ids-packet-suricata'; ShortId = 'ids-packet-suricata'; Kind = 'metric'; Title = 'Suricata Logs'; Description = 'Suricata packet-oriented logs.'; Query = '_index:"logs-*-suricata-*"'; Subtitle = 'Suricata' },
            @{ Id = 'visualization:ids-packet-zeek'; ShortId = 'ids-packet-zeek'; Kind = 'metric'; Title = 'Zeek Logs'; Description = 'Zeek packet-oriented logs.'; Query = '_index:"logs-*-zeek-*"'; Subtitle = 'Zeek' },
            @{ Id = 'visualization:ids-packet-source-chart'; ShortId = 'ids-packet-source-chart'; Kind = 'pie'; Title = 'Packet Logs By Source'; Description = 'Source split for packet logs.'; Query = 'source_type:*'; Field = 'source_type.keyword'; Size = 6 },
            @{ Id = 'visualization:ids-packet-event-chart'; ShortId = 'ids-packet-event-chart'; Kind = 'pie'; Title = 'Packet Logs By Event'; Description = 'Event-type split for packet logs.'; Query = 'event_type:*'; Field = 'event_type.keyword'; Size = 8 }
        )
        Searches = @(
            @{ Id = 'search:ids-packet-check-suricata'; ShortId = 'ids-packet-check-suricata'; Title = 'Suricata Packet Detail'; Description = 'Suricata packet-oriented telemetry.'; Query = '_index:"logs-*-suricata-*"'; Columns = @('timestamp', 'tenant_id', 'event_type', 'app_proto', 'src_ip', 'src_port', 'dest_ip', 'dest_port', '_index') },
            @{ Id = 'search:ids-packet-check-zeek'; ShortId = 'ids-packet-check-zeek'; Title = 'Zeek Packet Detail'; Description = 'Zeek packet-oriented telemetry.'; Query = '_index:"logs-*-zeek-*"'; Columns = @('timestamp', 'tenant_id', 'service', 'proto', 'id.orig_h', 'id.orig_p', 'id.resp_h', 'id.resp_p', 'uid', '_index') }
        )
        Panels = @(
            @{ Type = 'visualization'; SavedObjectShortId = 'ids-packet-total'; x = 0; y = 0; w = 16; h = 8 },
            @{ Type = 'visualization'; SavedObjectShortId = 'ids-packet-suricata'; x = 16; y = 0; w = 16; h = 8 },
            @{ Type = 'visualization'; SavedObjectShortId = 'ids-packet-zeek'; x = 32; y = 0; w = 16; h = 8 },
            @{ Type = 'visualization'; SavedObjectShortId = 'ids-packet-source-chart'; x = 0; y = 8; w = 24; h = 14 },
            @{ Type = 'visualization'; SavedObjectShortId = 'ids-packet-event-chart'; x = 24; y = 8; w = 24; h = 14 },
            @{ Type = 'search'; SavedObjectShortId = 'ids-packet-check-suricata'; x = 0; y = 22; w = 24; h = 14 },
            @{ Type = 'search'; SavedObjectShortId = 'ids-packet-check-zeek'; x = 24; y = 22; w = 24; h = 14 }
        )
    }
)

foreach ($spec in $dashboardSpecs) {
    foreach ($visualization in $spec.Visualizations) {
        if ($visualization.Kind -eq 'metric') {
            Invoke-OpenSearchDocumentUpsert -DocumentId $visualization.Id -JsonBody (New-MetricVisualizationDocument `
                -Title $visualization.Title `
                -Description $visualization.Description `
                -Query $visualization.Query `
                -Subtitle $visualization.Subtitle)
        } elseif ($visualization.Kind -eq 'line') {
            Invoke-OpenSearchDocumentUpsert -DocumentId $visualization.Id -JsonBody (New-LineVisualizationDocument `
                -Title $visualization.Title `
                -Description $visualization.Description `
                -Query $visualization.Query `
                -Field $visualization.Field)
        } elseif ($visualization.Kind -eq 'gauge') {
            Invoke-OpenSearchDocumentUpsert -DocumentId $visualization.Id -JsonBody (New-GaugeVisualizationDocument `
                -Title $visualization.Title `
                -Description $visualization.Description `
                -Query $visualization.Query `
                -Subtitle $visualization.Subtitle)
        } else {
            Invoke-OpenSearchDocumentUpsert -DocumentId $visualization.Id -JsonBody (New-PieVisualizationDocument `
                -Title $visualization.Title `
                -Description $visualization.Description `
                -Query $visualization.Query `
                -Field $visualization.Field `
                -Size $visualization.Size)
        }
    }

    foreach ($search in $spec.Searches) {
        Invoke-OpenSearchDocumentUpsert -DocumentId $search.Id -JsonBody (New-SavedSearchDocument `
            -Title $search.Title `
            -Description $search.Description `
            -Query $search.Query `
            -Columns $search.Columns)
    }

    $dashboardBody = New-DashboardDocument `
        -Title $spec.Title `
        -Description $spec.Description `
        -Panels $spec.Panels

    Invoke-OpenSearchDocumentUpsert -DocumentId $spec.DashboardId -JsonBody $dashboardBody
}

docker exec $kindNode kubectl --kubeconfig=/etc/kubernetes/admin.conf exec -n $opensearchNamespace $opensearchPod -- curl -s "http://localhost:9200/$kibanaIndex/_search?q=type:dashboard%20AND%20dashboard.title:IDS*&size=20"
