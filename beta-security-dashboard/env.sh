#!/bin/sh
# Generate a JSON file with environment variables at runtime
# This file is loaded by the browser and sets window._env_

cat <<EOF > /usr/share/nginx/html/env-config.js
window._env_ = {
  "OPENSEARCH_URL": "${VITE_OPENSEARCH_URL:-${OPENSEARCH_URL:-http://localhost:5601}}",
  "KAFKA_UI_URL": "${VITE_KAFKA_UI_URL:-http://localhost:9090}"
};
EOF

# Now start Nginx
exec "$@"
