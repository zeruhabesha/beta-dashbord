import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        host: true,
        proxy: {
            '/api/opensearch': {
                target: 'https://192.168.1.11:9200',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/api\/opensearch/, ''),
                headers: {
                    'Authorization': 'Basic ' + Buffer.from('admin:SecretPassword').toString('base64')
                },
                configure: (proxy, _options) => {
                    proxy.on('proxyRes', (proxyRes, _req, _res) => {
                        // Remove CSP headers that cause inline script issues
                        delete proxyRes.headers['content-security-policy'];
                        delete proxyRes.headers['content-security-policy-report-only'];
                        delete proxyRes.headers['x-content-security-policy'];
                    });
                }
            }
        }
    }
})
