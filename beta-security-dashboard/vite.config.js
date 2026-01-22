import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        host: true, // Listen on all local IPs (0.0.0.0)
        proxy: {
            '/api/opensearch': {
                target: 'http://localhost:9200',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/api\/opensearch/, '')
            }
        }
    }
})
