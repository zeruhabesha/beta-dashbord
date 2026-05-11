const KEYCLOAK_SESSION_STORAGE_KEY = 'security-dashboard-keycloak-session';
const KEYCLOAK_PKCE_STORAGE_KEY = 'security-dashboard-keycloak-pkce';
const TOKEN_REFRESH_SKEW_MS = 60 * 1000;
let pendingInitialization = null;
let pendingInitializationKey = '';

function getRuntimeEnv() {
    if (typeof window === 'undefined') {
        return {};
    }

    return window._env_ || {};
}

function getDefaultRedirectUri() {
    if (typeof window === 'undefined') {
        return '';
    }

    const redirectUrl = new URL(window.location.origin);
    redirectUrl.pathname = '/select';
    return redirectUrl.toString();
}

function normalizeRedirectUri(value, fallbackPath = '/select') {
    if (typeof window === 'undefined') {
        return value || '';
    }

    const redirectUrl = new URL(value || getDefaultRedirectUri(), window.location.origin);
    redirectUrl.search = '';
    redirectUrl.hash = '';

    if (!redirectUrl.pathname || redirectUrl.pathname === '/') {
        redirectUrl.pathname = fallbackPath;
    }

    return redirectUrl.toString();
}

export function getKeycloakConfig() {
    const runtimeEnv = getRuntimeEnv();
    const configuredClientId =
        runtimeEnv.KEYCLOAK_CLIENT_ID ||
        import.meta.env.VITE_KEYCLOAK_CLIENT_ID ||
        'vite-app';
    const normalizedClientId =
        configuredClientId === 'security-admin-console' ? 'vite-app' : configuredClientId;

    return {
        url: String(runtimeEnv.KEYCLOAK_URL || import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080').replace(/\/$/, ''),
        realm: runtimeEnv.KEYCLOAK_REALM || import.meta.env.VITE_KEYCLOAK_REALM || 'master',
        clientId: normalizedClientId,
        redirectUri: normalizeRedirectUri(runtimeEnv.KEYCLOAK_REDIRECT_URI || import.meta.env.VITE_KEYCLOAK_REDIRECT_URI || getDefaultRedirectUri()),
        postLogoutRedirectUri: normalizeRedirectUri(runtimeEnv.KEYCLOAK_LOGOUT_REDIRECT_URI || import.meta.env.VITE_KEYCLOAK_LOGOUT_REDIRECT_URI || getDefaultRedirectUri()),
        scope: 'openid profile email'
    };
}

function base64UrlEncode(bytes) {
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function generateRandomString(length = 96) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const randomBytes = new Uint8Array(length);
    crypto.getRandomValues(randomBytes);

    return Array.from(randomBytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

async function createCodeChallenge(codeVerifier) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
    return base64UrlEncode(new Uint8Array(digest));
}

function decodeJwt(token) {
    if (!token) {
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

function readStorage(key) {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const raw = window.sessionStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch (_error) {
        return null;
    }
}

function writeStorage(key, value) {
    if (typeof window === 'undefined') {
        return;
    }

    window.sessionStorage.setItem(key, JSON.stringify(value));
}

function clearStorage(key) {
    if (typeof window === 'undefined') {
        return;
    }

    window.sessionStorage.removeItem(key);
}

function buildUserProfile(tokenPayload = {}) {
    const claims = decodeJwt(tokenPayload.id_token || tokenPayload.access_token);
    const displayName = claims.preferred_username || claims.name || claims.email || 'admin';

    return {
        username: claims.preferred_username || displayName,
        displayName,
        email: claims.email || '',
        name: claims.name || displayName
    };
}

function persistSession(tokenPayload = {}) {
    const now = Date.now();
    const session = {
        accessToken: tokenPayload.access_token || '',
        refreshToken: tokenPayload.refresh_token || '',
        idToken: tokenPayload.id_token || '',
        tokenType: tokenPayload.token_type || 'Bearer',
        expiresAt: now + Math.max((tokenPayload.expires_in || 60) * 1000 - TOKEN_REFRESH_SKEW_MS, 30 * 1000),
        refreshExpiresAt: now + Math.max((tokenPayload.refresh_expires_in || 1800) * 1000, 60 * 1000),
        user: buildUserProfile(tokenPayload)
    };

    writeStorage(KEYCLOAK_SESSION_STORAGE_KEY, session);
    return session;
}

function readSession() {
    return readStorage(KEYCLOAK_SESSION_STORAGE_KEY);
}

function readPkceState() {
    return readStorage(KEYCLOAK_PKCE_STORAGE_KEY);
}

function clearPkceState() {
    clearStorage(KEYCLOAK_PKCE_STORAGE_KEY);
}

function cleanupAuthParams() {
    if (typeof window === 'undefined') {
        return;
    }

    const url = new URL(window.location.href);
    ['code', 'state', 'session_state', 'iss', 'error', 'error_description'].forEach((name) => {
        url.searchParams.delete(name);
    });

    window.history.replaceState({}, document.title, url.toString());
}

async function requestTokens(formData, config) {
    const response = await fetch(`${config.url}/realms/${config.realm}/protocol/openid-connect/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(payload?.error_description || payload?.error || `Keycloak token request failed with ${response.status}`);
    }

    return payload;
}

async function refreshSession(session, config) {
    if (!session?.refreshToken || session.refreshExpiresAt <= Date.now()) {
        clearKeycloakSession();
        return null;
    }

    try {
        const payload = await requestTokens(new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: config.clientId,
            refresh_token: session.refreshToken
        }), config);

        return persistSession({
            ...payload,
            refresh_token: payload.refresh_token || session.refreshToken
        });
    } catch (_error) {
        clearKeycloakSession();
        return null;
    }
}

export async function startKeycloakLogin() {
    const config = getKeycloakConfig();
    const codeVerifier = generateRandomString(96);
    const codeChallenge = await createCodeChallenge(codeVerifier);
    const state = generateRandomString(48);
    const nonce = generateRandomString(48);

    writeStorage(KEYCLOAK_PKCE_STORAGE_KEY, {
        codeVerifier,
        state,
        nonce,
        createdAt: new Date().toISOString()
    });

    const url = new URL(`${config.url}/realms/${config.realm}/protocol/openid-connect/auth`);
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('redirect_uri', config.redirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set('response_mode', 'query');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', config.scope);
    url.searchParams.set('nonce', nonce);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');

    window.location.assign(url.toString());
}

export async function initializeKeycloakSession() {
    if (pendingInitialization) {
        return pendingInitialization;
    }

    const config = getKeycloakConfig();
    const url = typeof window !== 'undefined' ? new URL(window.location.href) : null;
    const authError = url?.searchParams.get('error');

    if (authError) {
        const description = url.searchParams.get('error_description') || authError;
        cleanupAuthParams();
        throw new Error(description);
    }

    const code = url?.searchParams.get('code');
    const state = url?.searchParams.get('state');

    if (code) {
        const initializationKey = `${code}:${state || ''}`;

        if (pendingInitialization && pendingInitializationKey === initializationKey) {
            return pendingInitialization;
        }

        pendingInitializationKey = initializationKey;
        pendingInitialization = (async () => {
            const pkceState = readPkceState();

            if (!pkceState || !state || pkceState.state !== state) {
                clearPkceState();
                cleanupAuthParams();
                throw new Error('Invalid Keycloak login state. Start sign-in again.');
            }

            try {
                const payload = await requestTokens(new URLSearchParams({
                    grant_type: 'authorization_code',
                    client_id: config.clientId,
                    code,
                    redirect_uri: config.redirectUri,
                    code_verifier: pkceState.codeVerifier
                }), config);

                return persistSession(payload);
            } finally {
                clearPkceState();
                cleanupAuthParams();
                pendingInitialization = null;
                pendingInitializationKey = '';
            }
        })();

        return pendingInitialization;
    }

    const storedSession = readSession();

    if (!storedSession) {
        return null;
    }

    if (storedSession.expiresAt <= Date.now() + TOKEN_REFRESH_SKEW_MS) {
        return refreshSession(storedSession, config);
    }

    return storedSession;
}

export async function getKeycloakAccessToken() {
    const session = await initializeKeycloakSession();
    return session?.accessToken || '';
}

export function clearKeycloakSession() {
    clearStorage(KEYCLOAK_SESSION_STORAGE_KEY);
    clearPkceState();
}

export function logoutFromKeycloak() {
    const config = getKeycloakConfig();
    const session = readSession();
    clearKeycloakSession();

    const logoutUrl = new URL(`${config.url}/realms/${config.realm}/protocol/openid-connect/logout`);
    logoutUrl.searchParams.set('post_logout_redirect_uri', config.postLogoutRedirectUri);
    logoutUrl.searchParams.set('client_id', config.clientId);

    if (session?.idToken) {
        logoutUrl.searchParams.set('id_token_hint', session.idToken);
    }

    window.location.assign(logoutUrl.toString());
}
