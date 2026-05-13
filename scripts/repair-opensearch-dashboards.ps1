param(
    [string]$OpenSearchUrl = $(if ($env:OPENSEARCH_URL) { $env:OPENSEARCH_URL } else { "http://196.188.249.46:9200" }),
    [string]$DashboardsUrl = $(if ($env:OPENSEARCH_DASHBOARDS_URL) { $env:OPENSEARCH_DASHBOARDS_URL } else { "http://196.188.249.46:5601" }),
    [string]$Username = $(if ($env:OPENSEARCH_USERNAME) { $env:OPENSEARCH_USERNAME } else { "admin" }),
    [string]$Password = $(if ($env:OPENSEARCH_PASSWORD) { $env:OPENSEARCH_PASSWORD } else { "admin" }),
    [string]$Python = $(if ($env:PYTHON) { $env:PYTHON } else { "python" }),
    [switch]$DataViewsOnly
)

$ErrorActionPreference = "Stop"

$repairScriptName = if ($DataViewsOnly) { "repair_data_views.py" } else { "deploy_remote_dashboards.py" }
$repairScript = Resolve-Path (Join-Path $PSScriptRoot "..\opensearch-dashboards-config\$repairScriptName")

function Resolve-PythonRunner {
    param([string]$PreferredPython)

    $candidates = @()

    if ($PreferredPython) {
        $candidates += @{ Command = $PreferredPython; Arguments = @() }
    }

    $candidates += @{ Command = "python"; Arguments = @() }
    $candidates += @{ Command = "py"; Arguments = @("-3") }

    foreach ($candidate in $candidates) {
        try {
            $output = & $candidate.Command @($candidate.Arguments + @("--version")) 2>&1
            if ($LASTEXITCODE -eq 0 -and $output -match "Python") {
                return $candidate
            }
        } catch {
            continue
        }
    }

    throw "Python was not found. Install Python 3 or set the PYTHON environment variable to a Python executable."
}

$env:OPENSEARCH_URL = $OpenSearchUrl.TrimEnd("/")
$env:OPENSEARCH_DASHBOARDS_URL = $DashboardsUrl.TrimEnd("/")

if ($Username -and $Password) {
    $basicToken = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${Username}:${Password}"))
    $env:OPENSEARCH_AUTH = "Basic $basicToken"
    $env:OPENSEARCH_DASHBOARDS_AUTH = "Basic $basicToken"
}

Write-Host "Repairing OpenSearch Dashboards saved objects at $($env:OPENSEARCH_DASHBOARDS_URL) using $repairScriptName..."
$pythonRunner = Resolve-PythonRunner -PreferredPython $Python
& $pythonRunner.Command @($pythonRunner.Arguments + @($repairScript))

if ($LASTEXITCODE -ne 0) {
    throw "OpenSearch Dashboards repair failed with exit code $LASTEXITCODE."
}
