const OS_API = '/api/opensearch';
const SAVED_OBJECTS_API = '/api/saved_objects';
const DASHBOARDS_API = '/api';
const GLOBAL_TENANT_HEADERS = {
    'Content-Type': 'application/json',
    'osd-xsrf': 'true',
    securitytenant: 'global'
};

const dataViewIdCache = new Map();
let dataViewListPromise = null;

const META_FIELDS = [
    { name: '_id', esType: '_id', searchable: true, aggregatable: true },
    { name: '_index', esType: '_index', searchable: true, aggregatable: true },
    { name: '_score', esType: 'float', searchable: false, aggregatable: false },
    { name: '_source', esType: '_source', searchable: false, aggregatable: false }
];
const DATE_FIELD_NAMES = new Set(['@timestamp', 'timestamp', 'indexed_at', 'created_at', 'updated_at', 'detected_at', 'finished_at', 'retention_until', 'expiration_time', 'requested_at']);
const TEXT_FIELD_NAMES = new Set(['message', 'full_log', 'command_line', 'reason', 'description', 'rule.description']);

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesPattern(title, pattern) {
    if (title === pattern) {
        return true;
    }

    if (!pattern.includes('*')) {
        return false;
    }

    const regex = new RegExp(`^${escapeRegex(pattern).replace(/\\\*/g, '.*')}$`);
    return regex.test(title);
}

function splitIndexExpression(value) {
    return String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function matchesIndexExpression(title, requestedPattern) {
    const titleParts = splitIndexExpression(title);
    const requestedParts = splitIndexExpression(requestedPattern);

    if (!titleParts.length || !requestedParts.length) {
        return false;
    }

    return requestedParts.some((requestedPart) => (
        matchesPattern(title, requestedPart)
        || titleParts.some((titlePart) => titlePart === requestedPart || matchesPattern(titlePart, requestedPart))
    ));
}

function parseDataViewFields(item) {
    const fields = item.attributes?.fields || item._source?.['index-pattern']?.fields;

    if (!fields) {
        return [];
    }

    try {
        return JSON.parse(fields);
    } catch (_error) {
        return [];
    }
}

function getDataViewTitle(item) {
    return item.attributes?.title || item._source?.['index-pattern']?.title || '';
}

function getDataViewId(item) {
    return item.id || item._id?.split(':').slice(1).join(':') || '';
}

function isUsableDataView(item) {
    return parseDataViewFields(item).length > 0;
}

function dashboardFieldType(esType) {
    if (esType === 'date' || esType === 'date_nanos') {
        return 'date';
    }

    if (['long', 'integer', 'short', 'byte', 'double', 'float', 'half_float', 'scaled_float'].includes(esType)) {
        return 'number';
    }

    if (esType === 'boolean') {
        return 'boolean';
    }

    if (esType === 'geo_point') {
        return 'geo_point';
    }

    if (esType === '_source') {
        return '_source';
    }

    return 'string';
}

function inferFieldType(name, timeFieldName) {
    if (name === timeFieldName || DATE_FIELD_NAMES.has(name)) {
        return 'date';
    }

    if (/(_count|count|_ms|duration|size|bytes|score|level|severity|risk|rate|retry_count|matched_endpoints)$/i.test(name)) {
        return 'long';
    }

    if (/^(dry_run|process_killed|quarantined|elevated_privilege)$/i.test(name)) {
        return 'boolean';
    }

    if (TEXT_FIELD_NAMES.has(name)) {
        return 'text';
    }

    return 'keyword';
}

function makeDataViewField(name, esType, searchable = true, aggregatable = true) {
    return {
        count: 0,
        name,
        type: dashboardFieldType(esType),
        esTypes: ['_id', '_index', '_source'].includes(name) ? [name] : [esType],
        scripted: false,
        searchable,
        aggregatable,
        readFromDocValues: aggregatable && !['text', '_source'].includes(esType)
    };
}

function buildDataViewFields(fieldNames = [], timeFieldName) {
    const fields = META_FIELDS.map((field) => makeDataViewField(field.name, field.esType, field.searchable, field.aggregatable));
    const seen = new Set(fields.map((field) => field.name));

    for (const fieldName of [timeFieldName, ...fieldNames].filter(Boolean)) {
        if (seen.has(fieldName)) {
            continue;
        }

        seen.add(fieldName);
        const esType = inferFieldType(fieldName, timeFieldName);
        fields.push(makeDataViewField(fieldName, esType, true, esType !== 'text'));
    }

    return fields;
}

async function requestJson(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...GLOBAL_TENANT_HEADERS,
            ...(options.headers || {})
        }
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`${options.method || 'GET'} ${url} failed: ${response.status}${detail ? ` ${detail}` : ''}`);
    }

    if (response.status === 204) {
        return {};
    }

    return response.json();
}

async function loadSavedObjectDataViews() {
    const payload = await requestJson(`${SAVED_OBJECTS_API}/_find?type=index-pattern&per_page=1000`);
    return payload.saved_objects || [];
}

async function loadRawDataViewsFallback() {
    const response = await fetch(`${OS_API}/.kibana/_search?q=type:index-pattern&size=100`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to load OpenSearch data views: ${response.status}`);
    }

    const payload = await response.json();
    return payload.hits?.hits || [];
}

async function loadDataViews({ force = false } = {}) {
    if (force) {
        dataViewListPromise = null;
    }

    if (!dataViewListPromise) {
        dataViewListPromise = loadSavedObjectDataViews().then(async (savedObjects) => {
            if (savedObjects.length) {
                return savedObjects;
            }

            try {
                return await loadRawDataViewsFallback();
            } catch (_rawError) {
                return savedObjects;
            }
        }).catch(async (savedObjectsError) => {
            try {
                return await loadRawDataViewsFallback();
            } catch (_rawError) {
                throw savedObjectsError;
            }
        });
    }

    return dataViewListPromise;
}

function findMatchingDataView(hits, requestedTitles) {
    return requestedTitles
        .map((pattern) => hits.find((item) => isUsableDataView(item) && matchesIndexExpression(getDataViewTitle(item), pattern)))
        .find(Boolean) || requestedTitles
        .map((pattern) => hits.find((item) => matchesIndexExpression(getDataViewTitle(item), pattern)))
        .find(Boolean);
}

function stableDataViewId(title) {
    const normalized = String(title || 'logs-*')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);

    if (title === 'wazuh-alerts-4.x-*') {
        return 'unified-index-pattern';
    }

    if (title.includes('edr')) {
        return 'beta-edr-events';
    }

    return `beta-${normalized || 'data-view'}`;
}

async function createDataView(title, timeFieldName, fields = [], objectIdOverride = '') {
    const objectId = objectIdOverride || stableDataViewId(title);
    const attributes = { title };
    const dataViewFields = buildDataViewFields(fields, timeFieldName);

    if (timeFieldName) {
        attributes.timeFieldName = timeFieldName;
    }

    if (dataViewFields.length) {
        attributes.fields = JSON.stringify(dataViewFields);
    }

    const payload = await requestJson(`${SAVED_OBJECTS_API}/index-pattern/${encodeURIComponent(objectId)}?overwrite=true`, {
        method: 'POST',
        body: JSON.stringify({
            attributes,
            references: []
        })
    });

    dataViewListPromise = null;
    dataViewIdCache.clear();

    return {
        id: payload.id || objectId,
        title
    };
}

async function getDashboardsVersion() {
    const payload = await requestJson(`${DASHBOARDS_API}/status`, {
        headers: {
            'Content-Type': 'application/json'
        }
    });

    return {
        number: String(payload.version?.number || '3.6.0'),
        buildNumber: payload.version?.build_number
    };
}

async function getSavedObject(type, id) {
    try {
        return await requestJson(`${SAVED_OBJECTS_API}/${type}/${encodeURIComponent(id)}`);
    } catch (_error) {
        return null;
    }
}

async function ensureDefaultDataView(dataViewId, knownDataViewIds) {
    try {
        const version = await getDashboardsVersion();
        const existingConfig = await getSavedObject('config', version.number);
        const attributes = { ...(existingConfig?.attributes || {}) };
        const defaultIndex = attributes.defaultIndex;

        if (defaultIndex && knownDataViewIds.has(defaultIndex)) {
            return;
        }

        if (version.buildNumber !== undefined) {
            attributes.buildNum = attributes.buildNum || version.buildNumber;
        }

        attributes.defaultIndex = dataViewId;
        attributes['dateFormat:tz'] = 'UTC';

        await requestJson(`${SAVED_OBJECTS_API}/config/${encodeURIComponent(version.number)}?overwrite=true`, {
            method: 'POST',
            body: JSON.stringify({
                attributes,
                references: existingConfig?.references || []
            })
        });
    } catch (error) {
        console.warn('Unable to update OpenSearch Dashboards default data view:', error);
    }
}

export async function findDataViewId(titles = ['logs-*']) {
    const result = await ensureDataViewId(titles, { createIfMissing: false });
    return result.id;
}

export async function ensureDataViewId(titles = ['logs-*'], options = {}) {
    const requestedTitles = Array.isArray(titles) ? titles : [titles];
    const cacheKey = requestedTitles.join('|');

    if (dataViewIdCache.has(cacheKey)) {
        return dataViewIdCache.get(cacheKey);
    }

    const hits = await loadDataViews({ force: options.force });
    const hit = findMatchingDataView(hits, requestedTitles);

    if (hit) {
        const dataView = {
            id: getDataViewId(hit),
            title: getDataViewTitle(hit),
            created: false
        };
        const knownDataViewIds = new Set(hits.map(getDataViewId).filter(Boolean));

        if (dataView.id) {
            const result = !isUsableDataView(hit) && options.fields?.length
                ? {
                    ...(await createDataView(dataView.title, options.timeFieldName, options.fields, dataView.id)),
                    created: false,
                    repaired: true
                }
                : dataView;

            dataViewIdCache.set(cacheKey, result);
            await ensureDefaultDataView(dataView.id, knownDataViewIds);
            return result;
        }
    }

    if (options.createIfMissing === false) {
        throw new Error(`OpenSearch data view "${requestedTitles.join(', ')}" was not found.`);
    }

    const createdDataView = await createDataView(requestedTitles[0] || 'logs-*', options.timeFieldName, options.fields || []);
    const refreshedHits = await loadDataViews({ force: true });
    const knownDataViewIds = new Set(refreshedHits.map(getDataViewId).filter(Boolean));
    const result = {
        ...createdDataView,
        created: true
    };

    dataViewIdCache.set(cacheKey, result);
    await ensureDefaultDataView(result.id, knownDataViewIds);
    return result;
}
