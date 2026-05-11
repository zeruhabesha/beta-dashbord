param(
    [string]$KindControlPlane = "tenant-ids-dev-control-plane"
)

$ErrorActionPreference = "Stop"

function Get-KindAdminConfig {
    param([string]$ContainerName)

    $publishedPort = docker port $ContainerName 6443/tcp
    if (-not $publishedPort) {
        throw "Unable to discover published API port for '$ContainerName'."
    }

    $publishedPort = $publishedPort.Trim()
    if ($publishedPort -match ":(\d+)$") {
        $port = $Matches[1]
    } else {
        throw "Unexpected docker port output: $publishedPort"
    }

    $kubeConfig = docker exec $ContainerName cat /etc/kubernetes/admin.conf
    if (-not $kubeConfig) {
        throw "Unable to read /etc/kubernetes/admin.conf from '$ContainerName'."
    }

    $caData = [regex]::Match($kubeConfig, "certificate-authority-data:\s*(.+)").Groups[1].Value.Trim()
    $certData = [regex]::Match($kubeConfig, "client-certificate-data:\s*(.+)").Groups[1].Value.Trim()
    $keyData = [regex]::Match($kubeConfig, "client-key-data:\s*(.+)").Groups[1].Value.Trim()

    if (-not $caData -or -not $certData -or -not $keyData) {
        throw "Kind admin kubeconfig is missing client certificate data."
    }

    return @{
        Target = "https://host.docker.internal:$port"
        CaData = $caData
        CertData = $certData
        KeyData = $keyData
    }
}

function Remove-LegacyUiContainer {
    $legacyContainer = docker ps -a --filter "name=^beta-ui$" --format "{{.Names}}"
    if ($legacyContainer) {
        Write-Host "Removing legacy beta-ui container so port 8080 can be reused..."
        docker rm -f beta-ui | Out-Null
    }
}

$kindConfig = Get-KindAdminConfig -ContainerName $KindControlPlane

$env:KUBERNETES_PROXY_TARGET = $kindConfig.Target
$env:KUBERNETES_PROXY_CA_DATA = $kindConfig.CaData
$env:KUBERNETES_PROXY_CLIENT_CERT_DATA = $kindConfig.CertData
$env:KUBERNETES_PROXY_CLIENT_KEY_DATA = $kindConfig.KeyData

Remove-LegacyUiContainer

Write-Host "Starting security-dashboard against $($env:KUBERNETES_PROXY_TARGET)..."
docker compose up -d --build security-dashboard
