const API_TOKEN_STORAGE_KEY = 'security-dashboard-api-token-v1';
const API_SCOPES_STORAGE_KEY = 'security-dashboard-api-scopes-v1';

function canUseStorage() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function decodeJwtPayload(token) {
    if (!token || !token.includes('.')) {
        return {};
    }

    try {
        const [, payload] = token.split('.');
        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
        return JSON.parse(atob(normalized));
    } catch (_error) {
        return {};
    }
}

function normalizeScopes(value) {
    if (Array.isArray(value)) {
        return value.flatMap(normalizeScopes);
    }

    if (!value) {
        return [];
    }

    return String(value)
        .split(/[\s,]+/)
        .map((scope) => scope.trim())
        .filter(Boolean);
}

export function getConfiguredApiToken() {
    if (!canUseStorage()) {
        return '';
    }

    return window.localStorage.getItem(API_TOKEN_STORAGE_KEY) || '';
}

export function setConfiguredApiToken(token) {
    if (!canUseStorage()) {
        return;
    }

    if (!token) {
        window.localStorage.removeItem(API_TOKEN_STORAGE_KEY);
        return;
    }

    window.localStorage.setItem(API_TOKEN_STORAGE_KEY, token.trim());
}

export function getConfiguredScopes() {
    if (!canUseStorage()) {
        return [];
    }

    const storedScopes = normalizeScopes(window.localStorage.getItem(API_SCOPES_STORAGE_KEY));
    const tokenPayload = decodeJwtPayload(getConfiguredApiToken());
    const tokenScopes = normalizeScopes([
        tokenPayload.scope,
        tokenPayload.scp,
        tokenPayload.permissions,
        tokenPayload.realm_access?.roles,
        tokenPayload.resource_access?.['beta-dashboard']?.roles
    ]);

    return [...new Set([...storedScopes, ...tokenScopes])];
}

export function setConfiguredScopes(scopes) {
    if (!canUseStorage()) {
        return;
    }

    window.localStorage.setItem(API_SCOPES_STORAGE_KEY, normalizeScopes(scopes).join(' '));
}

export function clearConfiguredAccess() {
    if (!canUseStorage()) {
        return;
    }

    window.localStorage.removeItem(API_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(API_SCOPES_STORAGE_KEY);
}

export function scopeMatches(requiredScope, availableScope) {
    if (!requiredScope || availableScope === '*') {
        return true;
    }

    if (availableScope === requiredScope) {
        return true;
    }

    if (availableScope.endsWith(':*')) {
        const prefix = availableScope.slice(0, -1);
        return requiredScope.startsWith(prefix);
    }

    return false;
}

export function hasRequiredScopes(requiredScopes = [], availableScopes = getConfiguredScopes()) {
    const required = normalizeScopes(requiredScopes);
    const available = normalizeScopes(availableScopes);

    if (!required.length) {
        return true;
    }

    if (!available.length) {
        return null;
    }

    return required.every((requiredScope) => available.some((availableScope) => scopeMatches(requiredScope, availableScope)));
}

export function missingRequiredScopes(requiredScopes = [], availableScopes = getConfiguredScopes()) {
    const required = normalizeScopes(requiredScopes);
    const available = normalizeScopes(availableScopes);

    return required.filter((requiredScope) => !available.some((availableScope) => scopeMatches(requiredScope, availableScope)));
}
