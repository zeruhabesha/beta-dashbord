#!/bin/sh
# Generate a JSON file with environment variables at runtime
# This file is loaded by the browser and sets window._env_

cat <<EOF > /usr/share/nginx/html/env-config.js
window._env_ = {
  "KAFKA_UI_URL": "${VITE_KAFKA_UI_URL:-http://localhost:9090}",
  "KEYCLOAK_URL": "${VITE_KEYCLOAK_URL-${KEYCLOAK_URL-}}",
  "KEYCLOAK_REALM": "${VITE_KEYCLOAK_REALM-${KEYCLOAK_REALM-master}}",
  "KEYCLOAK_CLIENT_ID": "${VITE_KEYCLOAK_CLIENT_ID-${KEYCLOAK_CLIENT_ID-security-admin-console}}",
  "KEYCLOAK_REDIRECT_URI": "${VITE_KEYCLOAK_REDIRECT_URI-${KEYCLOAK_REDIRECT_URI-}}",
  "KEYCLOAK_LOGOUT_REDIRECT_URI": "${VITE_KEYCLOAK_LOGOUT_REDIRECT_URI-${KEYCLOAK_LOGOUT_REDIRECT_URI-}}",
  "PLAYBOOK_SERVICE_API": "${VITE_PLAYBOOK_SERVICE_API-/api/playbooks}",
  "APPROVAL_SERVICE_API": "${VITE_APPROVAL_SERVICE_API-/api/approvals}",
  "RESPONSE_SERVICE_API": "${VITE_RESPONSE_SERVICE_API-/api/response}",
  "AUDIT_SERVICE_API": "${VITE_AUDIT_SERVICE_API-/api/audit-service}",
  "THREAT_HUNTING_SERVICE_API": "${VITE_THREAT_HUNTING_SERVICE_API-/api/threat-hunting}",
  "SECURITY_SERVICES_ENABLED": "${VITE_SECURITY_SERVICES_ENABLED-${SECURITY_SERVICES_ENABLED-false}}",
  "SIEM_ALERTS_ENABLED": "${VITE_SIEM_ALERTS_ENABLED-${SIEM_ALERTS_ENABLED-false}}",
  "CMT_API_BASE": "${VITE_CMT_API_BASE-/api/cmt}",
  "CMT_AUTO_CONNECT": "${VITE_CMT_AUTO_CONNECT-false}",
  "CMT_REQUEST_TIMEOUT_MS": "${VITE_CMT_REQUEST_TIMEOUT_MS-4500}",
  "CMT_ENABLE_SSE": "${VITE_CMT_ENABLE_SSE-false}"
};
EOF

OPENSEARCH_PROXY_TARGET="${OPENSEARCH_PROXY_TARGET:-http://196.188.249.46:9200}"
SIEM_ALERTS_PROXY_TARGET="${SIEM_ALERTS_PROXY_TARGET:-http://192.168.1.28:8080}"
CMT_PROXY_TARGET="${CMT_PROXY_TARGET:-http://192.168.1.28:8081}"
PLAYBOOK_SERVICE_PROXY_TARGET="${PLAYBOOK_SERVICE_PROXY_TARGET:-http://192.168.1.28:9092}"
RESPONSE_SERVICE_PROXY_TARGET="${RESPONSE_SERVICE_PROXY_TARGET:-http://192.168.1.28:9093}"
APPROVAL_SERVICE_PROXY_TARGET="${APPROVAL_SERVICE_PROXY_TARGET:-http://192.168.1.28:9094}"
THREAT_HUNTING_SERVICE_PROXY_TARGET="${THREAT_HUNTING_SERVICE_PROXY_TARGET:-http://192.168.1.28:9095}"
AUDIT_SERVICE_PROXY_TARGET="${AUDIT_SERVICE_PROXY_TARGET:-http://192.168.1.28:9096}"
KUBERNETES_PROXY_TARGET="${KUBERNETES_PROXY_TARGET:-http://host.docker.internal:8001}"
DASHBOARDS_PROXY_TARGET="${DASHBOARDS_PROXY_TARGET:-http://196.188.249.46:5601}"
DASHBOARDS_PROXY_PATH="${DASHBOARDS_PROXY_PATH-}"
KUBERNETES_AUTH_DIRECTIVE=""
SIEM_ALERTS_AUTH_DIRECTIVE=""
PLAYBOOK_SERVICE_AUTH_DIRECTIVE=""
RESPONSE_SERVICE_AUTH_DIRECTIVE=""
APPROVAL_SERVICE_AUTH_DIRECTIVE=""
THREAT_HUNTING_SERVICE_AUTH_DIRECTIVE=""
AUDIT_SERVICE_AUTH_DIRECTIVE=""
KUBERNETES_SSL_DIRECTIVES="proxy_ssl_verify off;"
DASHBOARDS_REWRITE_DIRECTIVE=""

if [ -n "${DASHBOARDS_PROXY_PATH}" ]; then
  DASHBOARDS_REWRITE_DIRECTIVE="rewrite ^(.*)$ ${DASHBOARDS_PROXY_PATH}\$1 break;"
fi

if [ -n "${KUBERNETES_PROXY_TOKEN:-}" ]; then
  KUBERNETES_AUTH_DIRECTIVE="proxy_set_header Authorization \"Bearer ${KUBERNETES_PROXY_TOKEN}\";"
fi

if [ -n "${SIEM_ALERTS_PROXY_AUTHORIZATION:-}" ]; then
  SIEM_ALERTS_AUTH_DIRECTIVE="proxy_set_header Authorization \"${SIEM_ALERTS_PROXY_AUTHORIZATION}\";"
fi

if [ -n "${PLAYBOOK_SERVICE_PROXY_AUTHORIZATION:-}" ]; then
  PLAYBOOK_SERVICE_AUTH_DIRECTIVE="proxy_set_header Authorization \"${PLAYBOOK_SERVICE_PROXY_AUTHORIZATION}\";"
fi

if [ -n "${RESPONSE_SERVICE_PROXY_AUTHORIZATION:-}" ]; then
  RESPONSE_SERVICE_AUTH_DIRECTIVE="proxy_set_header Authorization \"${RESPONSE_SERVICE_PROXY_AUTHORIZATION}\";"
fi

if [ -n "${APPROVAL_SERVICE_PROXY_AUTHORIZATION:-}" ]; then
  APPROVAL_SERVICE_AUTH_DIRECTIVE="proxy_set_header Authorization \"${APPROVAL_SERVICE_PROXY_AUTHORIZATION}\";"
fi

if [ -n "${THREAT_HUNTING_SERVICE_PROXY_AUTHORIZATION:-}" ]; then
  THREAT_HUNTING_SERVICE_AUTH_DIRECTIVE="proxy_set_header Authorization \"${THREAT_HUNTING_SERVICE_PROXY_AUTHORIZATION}\";"
fi

if [ -n "${AUDIT_SERVICE_PROXY_AUTHORIZATION:-}" ]; then
  AUDIT_SERVICE_AUTH_DIRECTIVE="proxy_set_header Authorization \"${AUDIT_SERVICE_PROXY_AUTHORIZATION}\";"
fi

if [ -n "${KUBERNETES_PROXY_CLIENT_CERT_DATA:-}" ] && [ -n "${KUBERNETES_PROXY_CLIENT_KEY_DATA:-}" ]; then
  K8S_CERT_FILE="$(mktemp -p /tmp k8s-client-cert.XXXXXX)"
  K8S_KEY_FILE="$(mktemp -p /tmp k8s-client-key.XXXXXX)"
  printf '%s' "${KUBERNETES_PROXY_CLIENT_CERT_DATA}" | base64 -d > "${K8S_CERT_FILE}"
  printf '%s' "${KUBERNETES_PROXY_CLIENT_KEY_DATA}" | base64 -d > "${K8S_KEY_FILE}"
  KUBERNETES_SSL_DIRECTIVES="proxy_ssl_certificate ${K8S_CERT_FILE};
        proxy_ssl_certificate_key ${K8S_KEY_FILE};
        proxy_ssl_verify off;"
fi

if [ -n "${KUBERNETES_PROXY_CA_DATA:-}" ]; then
  K8S_CA_FILE="$(mktemp -p /tmp k8s-ca.XXXXXX)"
  printf '%s' "${KUBERNETES_PROXY_CA_DATA}" | base64 -d > "${K8S_CA_FILE}"
  KUBERNETES_SSL_DIRECTIVES="proxy_ssl_trusted_certificate ${K8S_CA_FILE};
        ${KUBERNETES_SSL_DIRECTIVES}"
fi

cat <<EOF > /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost;

    resolver 127.0.0.11 valid=30s;

    location = /index.html {
        root /usr/share/nginx/html;
        add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0" always;
        expires -1;
    }

    location = /env-config.js {
        root /usr/share/nginx/html;
        add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0" always;
        expires -1;
    }

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0" always;
        expires -1;
        try_files \$uri \$uri/ /index.html;
    }

    location /api/opensearch/ {
        set \$backend "${OPENSEARCH_PROXY_TARGET}";
        rewrite ^/api/opensearch/?(.*)$ /\$1 break;
        proxy_pass \$backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_ssl_verify off;
    }

    location /alerts/ {
        set \$backend "${SIEM_ALERTS_PROXY_TARGET}";
        rewrite ^/alerts/?(.*)$ /\$1 break;
        proxy_pass \$backend;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        ${SIEM_ALERTS_AUTH_DIRECTIVE}
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_ssl_verify off;
    }

    location /api/cmt/ {
        set \$backend "${CMT_PROXY_TARGET}";
        rewrite ^/api/cmt/?(.*)$ /\$1 break;
        proxy_pass \$backend;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_ssl_verify off;
    }

    location /api/playbooks/ {
        set \$backend "${PLAYBOOK_SERVICE_PROXY_TARGET}";
        rewrite ^/api/playbooks/?(.*)$ /\$1 break;
        proxy_pass \$backend;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        ${PLAYBOOK_SERVICE_AUTH_DIRECTIVE}
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_ssl_verify off;
    }

    location /api/response/ {
        set \$backend "${RESPONSE_SERVICE_PROXY_TARGET}";
        rewrite ^/api/response/?(.*)$ /\$1 break;
        proxy_pass \$backend;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        ${RESPONSE_SERVICE_AUTH_DIRECTIVE}
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_ssl_verify off;
    }

    location /api/approvals/ {
        set \$backend "${APPROVAL_SERVICE_PROXY_TARGET}";
        rewrite ^/api/approvals/?(.*)$ /\$1 break;
        proxy_pass \$backend;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        ${APPROVAL_SERVICE_AUTH_DIRECTIVE}
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_ssl_verify off;
    }

    location /api/audit-service/ {
        set \$backend "${AUDIT_SERVICE_PROXY_TARGET}";
        rewrite ^/api/audit-service/?(.*)$ /\$1 break;
        proxy_pass \$backend;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        ${AUDIT_SERVICE_AUTH_DIRECTIVE}
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_ssl_verify off;
    }

    location /api/threat-hunting/ {
        set \$backend "${THREAT_HUNTING_SERVICE_PROXY_TARGET}";
        rewrite ^/api/threat-hunting/?(.*)$ /\$1 break;
        proxy_pass \$backend;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        ${THREAT_HUNTING_SERVICE_AUTH_DIRECTIVE}
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_ssl_verify off;
    }

    location /api/kubernetes/ {
        set \$backend "${KUBERNETES_PROXY_TARGET}";
        rewrite ^/api/kubernetes/?(.*)$ /\$1 break;
        proxy_pass \$backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        ${KUBERNETES_AUTH_DIRECTIVE}
        ${KUBERNETES_SSL_DIRECTIVES}
    }

    location /api/v1/ {
        set \$backend "${KUBERNETES_PROXY_TARGET}";
        proxy_pass \$backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        ${KUBERNETES_AUTH_DIRECTIVE}
        ${KUBERNETES_SSL_DIRECTIVES}
    }

    location /app/ {
        set \$backend "${DASHBOARDS_PROXY_TARGET}";
        ${DASHBOARDS_REWRITE_DIRECTIVE}
        proxy_pass \$backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        ${KUBERNETES_AUTH_DIRECTIVE}
        ${KUBERNETES_SSL_DIRECTIVES}
    }

    location = /bootstrap.js {
        set \$backend "${DASHBOARDS_PROXY_TARGET}";
        ${DASHBOARDS_REWRITE_DIRECTIVE}
        proxy_pass \$backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        ${KUBERNETES_AUTH_DIRECTIVE}
        ${KUBERNETES_SSL_DIRECTIVES}
    }

    location = /startup.js {
        set \$backend "${DASHBOARDS_PROXY_TARGET}";
        ${DASHBOARDS_REWRITE_DIRECTIVE}
        proxy_pass \$backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        ${KUBERNETES_AUTH_DIRECTIVE}
        ${KUBERNETES_SSL_DIRECTIVES}
    }

    location ~ ^/ui/logos/opensearch_(spinner|mark)_on_(dark|light)\.svg$ {
        root /usr/share/nginx/html;
        add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0" always;
        expires -1;
        try_files \$uri =404;
    }

    location /ui/ {
        set \$backend "${DASHBOARDS_PROXY_TARGET}";
        ${DASHBOARDS_REWRITE_DIRECTIVE}
        proxy_pass \$backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        ${KUBERNETES_AUTH_DIRECTIVE}
        ${KUBERNETES_SSL_DIRECTIVES}
    }

    location /translations/ {
        set \$backend "${DASHBOARDS_PROXY_TARGET}";
        ${DASHBOARDS_REWRITE_DIRECTIVE}
        proxy_pass \$backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        ${KUBERNETES_AUTH_DIRECTIVE}
        ${KUBERNETES_SSL_DIRECTIVES}
    }

    location /node_modules/@osd/ {
        set \$backend "${DASHBOARDS_PROXY_TARGET}";
        ${DASHBOARDS_REWRITE_DIRECTIVE}
        proxy_pass \$backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        ${KUBERNETES_AUTH_DIRECTIVE}
        ${KUBERNETES_SSL_DIRECTIVES}
    }

    location /internal/ {
        set \$backend "${DASHBOARDS_PROXY_TARGET}";
        ${DASHBOARDS_REWRITE_DIRECTIVE}
        proxy_pass \$backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        ${KUBERNETES_AUTH_DIRECTIVE}
        ${KUBERNETES_SSL_DIRECTIVES}
    }

    location /goto/ {
        set \$backend "${DASHBOARDS_PROXY_TARGET}";
        ${DASHBOARDS_REWRITE_DIRECTIVE}
        proxy_pass \$backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        ${KUBERNETES_AUTH_DIRECTIVE}
        ${KUBERNETES_SSL_DIRECTIVES}
    }

    location /api/ {
        set \$backend "${DASHBOARDS_PROXY_TARGET}";
        ${DASHBOARDS_REWRITE_DIRECTIVE}
        proxy_pass \$backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        ${KUBERNETES_AUTH_DIRECTIVE}
        ${KUBERNETES_SSL_DIRECTIVES}
    }

    location ~ ^/[0-9]+/ {
        set \$backend "${DASHBOARDS_PROXY_TARGET}";
        ${DASHBOARDS_REWRITE_DIRECTIVE}
        proxy_pass \$backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        ${KUBERNETES_AUTH_DIRECTIVE}
        ${KUBERNETES_SSL_DIRECTIVES}
    }

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
EOF

# Now start Nginx
exec "$@"
