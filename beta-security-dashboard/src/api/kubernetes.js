const KUBERNETES_API = '/api/kubernetes';
const TENANT_GROUP = 'ids.betatech.com';
const TENANT_VERSION = 'v1alpha1';
const TENANT_KIND = 'TenantIDS';
const TENANT_RESOURCE_FALLBACK = 'tenantidses';
const NAD_GROUP = 'k8s.cni.cncf.io';
const NAD_VERSION = 'v1';
const NAD_RESOURCE = 'network-attachment-definitions';

let tenantResourcePromise = null;

async function request(path, options = {}) {
    const response = await fetch(`${KUBERNETES_API}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        ...options
    });

    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
        ? await response.json()
        : await response.text();

    if (!response.ok) {
        const message = typeof payload === 'string'
            ? payload
            : payload?.message || payload?.error || payload?.details?.causes?.[0]?.message || `${response.status} ${response.statusText}`;
        throw new Error(message);
    }

    return payload;
}

async function discoverTenantResource() {
    if (!tenantResourcePromise) {
        tenantResourcePromise = request(`/apis/${TENANT_GROUP}/${TENANT_VERSION}`)
            .then((payload) => {
                const discovered = payload?.resources?.find((resource) =>
                    resource.kind === TENANT_KIND && !resource.name.includes('/')
                );
                return discovered?.name || TENANT_RESOURCE_FALLBACK;
            })
            .catch(() => TENANT_RESOURCE_FALLBACK);
    }

    return tenantResourcePromise;
}

async function getTenantResourcePath(name = '') {
    const resourceName = await discoverTenantResource();
    return `/apis/${TENANT_GROUP}/${TENANT_VERSION}/${resourceName}${name ? `/${encodeURIComponent(name)}` : ''}`;
}

export async function getKubernetesVersion() {
    return request('/version');
}

export async function listTenantResources() {
    const path = await getTenantResourcePath();
    return request(path);
}

export async function createTenantResource(manifest) {
    const path = await getTenantResourcePath();
    return request(path, {
        method: 'POST',
        body: JSON.stringify(manifest)
    });
}

export async function replaceTenantResource(name, manifest) {
    const path = await getTenantResourcePath(name);
    return request(path, {
        method: 'PUT',
        body: JSON.stringify(manifest)
    });
}

export async function deleteTenantResource(name) {
    const path = await getTenantResourcePath(name);
    return request(path, {
        method: 'DELETE'
    });
}

export async function listNamespaces() {
    return request('/api/v1/namespaces');
}

export async function getNamespace(name) {
    return request(`/api/v1/namespaces/${encodeURIComponent(name)}`);
}

export async function createNamespace(manifest) {
    return request('/api/v1/namespaces', {
        method: 'POST',
        body: JSON.stringify(manifest)
    });
}

export async function listNetworkAttachmentDefinitions(namespace = '') {
    const namespaceSegment = namespace
        ? `/namespaces/${encodeURIComponent(namespace)}`
        : '';
    return request(`/apis/${NAD_GROUP}/${NAD_VERSION}${namespaceSegment}/${NAD_RESOURCE}`);
}

export async function getNetworkAttachmentDefinition(namespace, name) {
    return request(`/apis/${NAD_GROUP}/${NAD_VERSION}/namespaces/${encodeURIComponent(namespace)}/${NAD_RESOURCE}/${encodeURIComponent(name)}`);
}

export async function createNetworkAttachmentDefinition(namespace, manifest) {
    return request(`/apis/${NAD_GROUP}/${NAD_VERSION}/namespaces/${encodeURIComponent(namespace)}/${NAD_RESOURCE}`, {
        method: 'POST',
        body: JSON.stringify(manifest)
    });
}

export async function replaceNetworkAttachmentDefinition(namespace, name, manifest) {
    return request(`/apis/${NAD_GROUP}/${NAD_VERSION}/namespaces/${encodeURIComponent(namespace)}/${NAD_RESOURCE}/${encodeURIComponent(name)}`, {
        method: 'PUT',
        body: JSON.stringify(manifest)
    });
}

export async function listStorageClasses() {
    return request('/apis/storage.k8s.io/v1/storageclasses');
}
