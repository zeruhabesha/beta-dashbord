/**
 * provision-siem-pattern.mjs
 *
 * One-off script to ensure the wazuh-alerts-4.x-* pattern exists in the Global tenant.
 */

const DASHBOARDS_URL = 'http://196.188.249.46:5601';

const OSD_HEADERS = {
    'Content-Type':     'application/json',
    'osd-xsrf':         'true',
    'securitytenant':   'global',
};

async function createPattern() {
    console.log(`Creating wazuh-alerts-4.x-* pattern in Global tenant...`);
    const res = await fetch(`${DASHBOARDS_URL}/api/saved_objects/index-pattern/unified-index-pattern?overwrite=true`, {
        method: 'POST',
        headers: OSD_HEADERS,
        body: JSON.stringify({
            attributes: {
                title: 'wazuh-alerts-4.x-*',
                timeFieldName: '@timestamp'
            }
        })
    });
    const text = await res.text();
    console.log(`Response: ${res.status} ${text}`);
}

createPattern();
