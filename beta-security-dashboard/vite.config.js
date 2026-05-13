import https from 'node:https'
import { execFileSync } from 'node:child_process'
import { createReadStream, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BETA_OPENSEARCH_LOGO_PATHS = new Set([
    '/ui/logos/opensearch_spinner_on_dark.svg',
    '/ui/logos/opensearch_spinner_on_light.svg',
    '/ui/logos/opensearch_mark_on_dark.svg',
    '/ui/logos/opensearch_mark_on_light.svg'
])

function betaOpenSearchBrandingPlugin() {
    return {
        name: 'beta-opensearch-branding',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const requestPath = req.url?.split('?')[0]

                if (!BETA_OPENSEARCH_LOGO_PATHS.has(requestPath)) {
                    next()
                    return
                }

                const filePath = resolve(__dirname, 'public', requestPath.slice(1))

                if (!existsSync(filePath)) {
                    next()
                    return
                }

                res.statusCode = 200
                res.setHeader('Content-Type', 'image/svg+xml')
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
                createReadStream(filePath).pipe(res)
            })
        }
    }
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseKubeConfigBlock(kubeconfig) {
    return {
        target: kubeconfig.match(/server:\s*(.+)/)?.[1]?.trim(),
        caData: kubeconfig.match(/certificate-authority-data:\s*(.+)/)?.[1]?.trim(),
        certData: kubeconfig.match(/client-certificate-data:\s*(.+)/)?.[1]?.trim(),
        keyData: kubeconfig.match(/client-key-data:\s*(.+)/)?.[1]?.trim()
    }
}

function decodeBase64(value) {
    return value ? Buffer.from(value, 'base64').toString('utf8') : undefined
}

function loadKindDockerConfig() {
    const clusterNames = ['beta-idps-test-control-plane', 'tenant-ids-dev-control-plane', 'kind-control-plane']

    for (const name of clusterNames) {
        try {
            const publishedPort = execFileSync('docker', ['port', name, '6443/tcp'], {
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'ignore'],
                timeout: 1000
            }).trim()
            const kubeconfig = execFileSync('docker', ['exec', name, 'cat', '/etc/kubernetes/admin.conf'], {
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'ignore'],
                timeout: 1000
            })
            const parsed = parseKubeConfigBlock(kubeconfig)
            const hostTarget = publishedPort ? `https://${publishedPort.replace('0.0.0.0', '127.0.0.1')}` : parsed.target

            return {
                ...parsed,
                target: hostTarget
            }
        } catch (_error) {
            continue
        }
    }

    return {}
}

function loadWslKindConfig() {
    try {
        const kubeconfig = execFileSync('wsl', ['-d', 'Ubuntu', 'sh', '-lc', 'cat ~/.kube/config'], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
            timeout: 1500
        })
        const currentContext = kubeconfig.match(/^current-context:\s*(.+)$/m)?.[1]?.trim()
        const kindContext = currentContext?.startsWith('kind-')
            ? currentContext
            : kubeconfig.match(/^  name:\s*(kind-[^\s]+)$/m)?.[1]

        if (!kindContext) {
            return {}
        }

        const clustersSection = kubeconfig.split(/\ncontexts:\n/)[0]
        const usersSection = kubeconfig.split(/\nusers:\n/)[1] || ''
        const clusterMatch = clustersSection.match(new RegExp(`- cluster:\\n([\\s\\S]*?)\\n  name: ${escapeRegex(kindContext)}`))
        const userMatch = usersSection.match(new RegExp(`- name: ${escapeRegex(kindContext)}\\n  user:\\n([\\s\\S]*?)(?=\\n- name: |$)`))

        return parseKubeConfigBlock(`${clusterMatch?.[1] || ''}\n${userMatch?.[1] || ''}`)
    } catch (_error) {
        return {}
    }
}

function createKubernetesAgent(config) {
    const ca = decodeBase64(config.caData)
    const cert = decodeBase64(config.certData)
    const key = decodeBase64(config.keyData)

    if (!ca && !cert && !key) {
        return undefined
    }

    return new https.Agent({
        ca,
        cert,
        key,
        rejectUnauthorized: false
    })
}

function createProxyOptions({ target, headers, agent, rewrite }) {
    const isHttps = typeof target === 'string' && target.startsWith('https:')
    return {
        target,
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: "",
        timeout: 10000,
        proxyTimeout: 10000,
        rewrite,
        headers,
        agent: isHttps ? agent : undefined
    }
}

function parseBoolean(value, fallback = false) {
    if (value === undefined || value === null || value === '') {
        return fallback
    }

    return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase())
}

function betaUnavailableBackendsPlugin(disabledRoutes = []) {
    return {
        name: 'beta-unavailable-backends',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const requestPath = req.url?.split('?')[0] || ''
                const match = disabledRoutes.find(({ prefix }) => requestPath === prefix || requestPath.startsWith(`${prefix}/`))

                if (!match) {
                    next()
                    return
                }

                res.statusCode = 503
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({
                    error: `${match.serviceName} proxy is not configured`,
                    code: 'SERVICE_PROXY_NOT_CONFIGURED',
                    hint: match.hint
                }))
            })
        }
    }
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')
    const discoveredKindConfig = loadKindDockerConfig()
    const discoveredWslKindConfig = Object.keys(discoveredKindConfig).length === 0 ? loadWslKindConfig() : {}
    const devServerHost = env.VITE_DEV_SERVER_HOST || env.DEV_SERVER_HOST || 'localhost'
    const devServerPort = Number(env.VITE_DEV_SERVER_PORT || env.DEV_SERVER_PORT || 5173)

    const openSearchTarget = env.VITE_OPENSEARCH_PROXY_TARGET || env.OPENSEARCH_PROXY_TARGET || 'http://196.188.249.46:9200'
    const siemAlertsTargetEnv = env.VITE_SIEM_ALERTS_PROXY_TARGET || env.SIEM_ALERTS_PROXY_TARGET || ''
    const cmtTargetEnv = env.VITE_CMT_PROXY_TARGET || env.CMT_PROXY_TARGET || 'http://192.168.1.28:8081'
    const playbookServiceTargetEnv = env.VITE_PLAYBOOK_SERVICE_PROXY_TARGET || env.PLAYBOOK_SERVICE_PROXY_TARGET || ''
    const responseServiceTargetEnv = env.VITE_RESPONSE_SERVICE_PROXY_TARGET || env.RESPONSE_SERVICE_PROXY_TARGET || ''
    const approvalServiceTargetEnv = env.VITE_APPROVAL_SERVICE_PROXY_TARGET || env.APPROVAL_SERVICE_PROXY_TARGET || ''
    const threatHuntingServiceTargetEnv = env.VITE_THREAT_HUNTING_SERVICE_PROXY_TARGET || env.THREAT_HUNTING_SERVICE_PROXY_TARGET || ''
    const auditServiceTargetEnv = env.VITE_AUDIT_SERVICE_PROXY_TARGET || env.AUDIT_SERVICE_PROXY_TARGET || ''
    const siemAlertsEnabled = parseBoolean(env.VITE_SIEM_ALERTS_ENABLED || env.SIEM_ALERTS_ENABLED, Boolean(siemAlertsTargetEnv))
    const securityServicesEnabled = parseBoolean(
        env.VITE_SECURITY_SERVICES_ENABLED || env.SECURITY_SERVICES_ENABLED,
        Boolean(playbookServiceTargetEnv || responseServiceTargetEnv || approvalServiceTargetEnv || threatHuntingServiceTargetEnv || auditServiceTargetEnv)
    )
    const cmtEnabled = parseBoolean(env.VITE_CMT_ENABLED || env.CMT_ENABLED, true)
    const siemAlertsTarget = siemAlertsEnabled ? siemAlertsTargetEnv : ''
    const cmtTarget = cmtEnabled ? cmtTargetEnv : ''
    const playbookServiceTarget = securityServicesEnabled ? playbookServiceTargetEnv : ''
    const responseServiceTarget = securityServicesEnabled ? responseServiceTargetEnv : ''
    const approvalServiceTarget = securityServicesEnabled ? approvalServiceTargetEnv : ''
    const threatHuntingServiceTarget = securityServicesEnabled ? threatHuntingServiceTargetEnv : ''
    const auditServiceTarget = securityServicesEnabled ? auditServiceTargetEnv : ''
    const openSearchUsername = env.VITE_OPENSEARCH_PROXY_USERNAME || env.OPENSEARCH_PROXY_USERNAME
    const openSearchPassword = env.VITE_OPENSEARCH_PROXY_PASSWORD || env.OPENSEARCH_PROXY_PASSWORD
    const siemAlertsAuthorization = env.SIEM_ALERTS_PROXY_AUTHORIZATION
    const playbookServiceAuthorization = env.PLAYBOOK_SERVICE_PROXY_AUTHORIZATION
    const responseServiceAuthorization = env.RESPONSE_SERVICE_PROXY_AUTHORIZATION
    const approvalServiceAuthorization = env.APPROVAL_SERVICE_PROXY_AUTHORIZATION
    const threatHuntingServiceAuthorization = env.THREAT_HUNTING_SERVICE_PROXY_AUTHORIZATION
    const auditServiceAuthorization = env.AUDIT_SERVICE_PROXY_AUTHORIZATION
    const kubernetesTarget =
        env.VITE_KUBERNETES_PROXY_TARGET ||
        env.KUBERNETES_PROXY_TARGET ||
        discoveredKindConfig.target ||
        discoveredWslKindConfig.target ||
        'http://127.0.0.1:8001'
    const dashboardsTarget =
        env.VITE_DASHBOARDS_PROXY_TARGET ||
        env.DASHBOARDS_PROXY_TARGET ||
        'http://196.188.249.46:5601'
    const dashboardsProxyPath =
        env.VITE_DASHBOARDS_PROXY_PATH !== undefined
            ? env.VITE_DASHBOARDS_PROXY_PATH
            : env.DASHBOARDS_PROXY_PATH !== undefined
                ? env.DASHBOARDS_PROXY_PATH
                : ''
    const kubernetesToken = env.VITE_KUBERNETES_PROXY_TOKEN || env.KUBERNETES_PROXY_TOKEN
    const openSearchHeaders = {}
    const siemAlertsHeaders = {}
    const playbookServiceHeaders = {}
    const responseServiceHeaders = {}
    const approvalServiceHeaders = {}
    const threatHuntingServiceHeaders = {}
    const auditServiceHeaders = {}
    const kubernetesHeaders = {}
    const kubernetesAgent = createKubernetesAgent({
        caData: env.KUBERNETES_PROXY_CA_DATA || env.VITE_KUBERNETES_PROXY_CA_DATA || discoveredKindConfig.caData || discoveredWslKindConfig.caData,
        certData: env.KUBERNETES_PROXY_CLIENT_CERT_DATA || env.VITE_KUBERNETES_PROXY_CLIENT_CERT_DATA || discoveredKindConfig.certData || discoveredWslKindConfig.certData,
        keyData: env.KUBERNETES_PROXY_CLIENT_KEY_DATA || env.VITE_KUBERNETES_PROXY_CLIENT_KEY_DATA || discoveredKindConfig.keyData || discoveredWslKindConfig.keyData
    })

    if (openSearchUsername && openSearchPassword) {
        openSearchHeaders.Authorization = 'Basic ' + Buffer.from(`${openSearchUsername}:${openSearchPassword}`).toString('base64')
    }

    if (siemAlertsAuthorization) {
        siemAlertsHeaders.Authorization = siemAlertsAuthorization
    }

    if (playbookServiceAuthorization) {
        playbookServiceHeaders.Authorization = playbookServiceAuthorization
    }

    if (responseServiceAuthorization) {
        responseServiceHeaders.Authorization = responseServiceAuthorization
    }

    if (approvalServiceAuthorization) {
        approvalServiceHeaders.Authorization = approvalServiceAuthorization
    }

    if (threatHuntingServiceAuthorization) {
        threatHuntingServiceHeaders.Authorization = threatHuntingServiceAuthorization
    }

    if (auditServiceAuthorization) {
        auditServiceHeaders.Authorization = auditServiceAuthorization
    }

    if (kubernetesToken) {
        kubernetesHeaders.Authorization = `Bearer ${kubernetesToken}`
    }

    const dashboardsHeaders = dashboardsProxyPath ? kubernetesHeaders : {}
    const dashboardsAgent = dashboardsProxyPath ? kubernetesAgent : undefined
    const rewriteToDashboards = (path) => (dashboardsProxyPath ? `${dashboardsProxyPath}${path}` : path)

    const disabledProxyRoutes = []
    const registerProxy = (proxyMap, route, serviceName, options, proxyOverrides = {}) => {
        if (!options.target) {
            disabledProxyRoutes.push({
                prefix: route,
                serviceName,
                hint: `Set VITE_${serviceName.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_PROXY_TARGET and enable the related VITE_*_ENABLED flag when the backend is running.`
            })
            return
        }

        proxyMap[route] = {
            ...createProxyOptions(options),
            ...proxyOverrides
        }
    }

    const proxy = {
        '/api/opensearch': {
            ...createProxyOptions({
                target: openSearchTarget,
                headers: openSearchHeaders,
                rewrite: (path) => path.replace(/^\/api\/opensearch/, '')
            }),
            configure: (proxyServer) => {
                proxyServer.on('proxyRes', (proxyRes) => {
                    delete proxyRes.headers['content-security-policy']
                    delete proxyRes.headers['content-security-policy-report-only']
                    delete proxyRes.headers['x-content-security-policy']
                })
            }
        },
        '/api/kubernetes': createProxyOptions({
            target: kubernetesTarget,
            headers: kubernetesHeaders,
            agent: kubernetesAgent,
            rewrite: (path) => path.replace(/^\/api\/kubernetes/, '')
        }),
        '/api/v1': createProxyOptions({
            target: kubernetesTarget,
            headers: kubernetesHeaders,
            agent: kubernetesAgent
        })
    }

    registerProxy(proxy, '/api/siem-alerts', 'siem-alerts', {
        target: siemAlertsTarget,
        headers: siemAlertsHeaders,
        rewrite: (path) => path.replace(/^\/api\/siem-alerts/, '')
    }, { timeout: 0, proxyTimeout: 0 })
    
    registerProxy(proxy, '/api/cmt', 'cmt', {
        target: cmtTarget,
        rewrite: (path) => path.replace(/^\/api\/cmt/, '')
    }, { 
        timeout: 60000, 
        proxyTimeout: 60000,
        xfwd: true
    })

    registerProxy(proxy, '/api/playbooks', 'playbook-service', {
        target: playbookServiceTarget,
        headers: playbookServiceHeaders,
        rewrite: (path) => path.replace(/^\/api\/playbooks/, '')
    }, { timeout: 0, proxyTimeout: 0 })

    registerProxy(proxy, '/api/response', 'response-service', {
        target: responseServiceTarget,
        headers: responseServiceHeaders,
        rewrite: (path) => path.replace(/^\/api\/response/, '')
    }, { timeout: 0, proxyTimeout: 0 })

    registerProxy(proxy, '/api/approvals', 'approval-service', {
        target: approvalServiceTarget,
        headers: approvalServiceHeaders,
        rewrite: (path) => path.replace(/^\/api\/approvals/, '')
    }, { timeout: 0, proxyTimeout: 0 })

    registerProxy(proxy, '/api/audit-service', 'audit-service', {
        target: auditServiceTarget,
        headers: auditServiceHeaders,
        rewrite: (path) => path.replace(/^\/api\/audit-service/, '')
    }, { timeout: 0, proxyTimeout: 0 })

    registerProxy(proxy, '/api/threat-hunting', 'threat-hunting-service', {
        target: threatHuntingServiceTarget,
        headers: threatHuntingServiceHeaders,
        rewrite: (path) => path.replace(/^\/api\/threat-hunting/, '')
    }, { timeout: 0, proxyTimeout: 0 })

    for (const route of ['/app', '/bootstrap.js', '/startup.js', '/ui', '/translations', '/node_modules/@osd', '/internal', '/goto', '^/\\d+/', '/api']) {
        proxy[route] = createProxyOptions({
            target: dashboardsTarget,
            headers: dashboardsHeaders,
            agent: dashboardsAgent,
            rewrite: rewriteToDashboards
        })
    }

    return {
        plugins: [betaUnavailableBackendsPlugin(disabledProxyRoutes), betaOpenSearchBrandingPlugin(), react()],
        resolve: {
            alias: {
                '@': resolve(__dirname, 'src')
            }
        },
        server: {
            host: devServerHost,
            port: devServerPort,
            strictPort: true,
            proxy
        }
    }
})
