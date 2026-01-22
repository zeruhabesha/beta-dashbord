// import fetch from 'node-fetch'; // REMOVED - Using global fetch
// If node-fetch isn't available, we'll try native fetch or axios if present.
// Since package.json has "type": "module", we can use top-level await and imports if node version supports it.

const OSD_URL = "http://localhost:5601";
const AUTH = "Basic " + Buffer.from("admin:S0c!Dash#2025_OpN").toString('base64');
const SOURCE_DASHBOARD_ID = "dashboard-siem-main";

const VIEW_CONFIG = [
    { id: 'overview', title: 'BETA - Overview', filter: "" },

    // Explore
    { id: 'discover', title: 'BETA - Discover', filter: "*" },
    { id: 'dashboards', title: 'BETA - Dashboards', filter: "" },
    { id: 'visualize', title: 'BETA - Visualize', filter: "" },
    { id: 'reporting', title: 'BETA - Reporting', filter: "type:report" },
    { id: 'alerting', title: 'BETA - Alerting', filter: "rule.level >= 10" },
    { id: 'anomaly', title: 'BETA - Anomaly Detection', filter: "rule.groups:anomaly" },
    { id: 'maps', title: 'BETA - Maps', filter: "geoip.location:*" },

    // Endpoint
    { id: 'config-assessment', title: 'BETA - Config Assessment', filter: "rule.groups:sca" },
    { id: 'malware', title: 'BETA - Malware Detection', filter: "rule.groups:malware OR rule.groups:virus" },
    { id: 'fim', title: 'BETA - File Integrity', filter: "rule.groups:syscheck" },

    // Threat Intel
    { id: 'hunting', title: 'BETA - Threat Hunting', filter: "rule.level >= 12" },
    { id: 'vuln-detect', title: 'BETA - Vuln Detection', filter: "rule.groups:vulnerability-detector" },
    { id: 'mitre', title: 'BETA - MITRE ATT&CK', filter: "rule.mitre.id:*" },

    // Ops
    { id: 'hygiene', title: 'BETA - IT Hygiene', filter: "rule.groups:system_error OR rule.groups:pci_dss" },
    { id: 'pci', title: 'BETA - PCI DSS', filter: "rule.pci_dss:*" },
    { id: 'gdpr', title: 'BETA - GDPR', filter: "rule.gdpr:*" },
    { id: 'hipaa', title: 'BETA - HIPAA', filter: "rule.hipaa:*" },
    { id: 'nist', title: 'BETA - NIST 800-53', filter: "rule.nist_800_53:*" },

    // Cloud
    { id: 'docker', title: 'BETA - Docker Security', filter: "decoder.name:docker" },
    { id: 'aws', title: 'BETA - AWS Security', filter: "decoder.name:aws-cloudtrail" },
    { id: 'gcp', title: 'BETA - GCP Security', filter: "decoder.name:gcp-audit" },
    { id: 'azure', title: 'BETA - Azure Security', filter: "decoder.name:azure-logs" },

    // Server
    { id: 'rules', title: 'BETA - Rules', filter: "rule.id:*" },
    { id: 'decoders', title: 'BETA - Decoders', filter: "decoder.parent:*" },
    { id: 'logs', title: 'BETA - System Logs', filter: "" }
];

async function main() {
    console.log("Fetching Source Dashboard:", SOURCE_DASHBOARD_ID);

    // 1. Get Source Dashboard
    const sourceRes = await fetch(`${OSD_URL}/api/saved_objects/dashboard/${SOURCE_DASHBOARD_ID}`, {
        headers: {
            "Authorization": AUTH,
            "osd-xsrf": "true"
        }
    });

    if (!sourceRes.ok) {
        console.error("Failed to fetch source dashboard", await sourceRes.text());
        return;
    }

    const sourceData = await sourceRes.json();
    const sourceAttributes = sourceData.attributes;

    console.log("Source Dashboard Found. Title:", sourceAttributes.title);

    // 2. Loop and Create/Update
    for (const view of VIEW_CONFIG) {
        const newId = `beta-page-${view.id}`;

        // clone attributes
        const newAttributes = { ...sourceAttributes };
        newAttributes.title = view.title;
        newAttributes.description = `Auto-generated BETA dashboard for ${view.id}`;

        // Inject Filter if present
        if (view.filter) {
            // Need to parse searchSourceJSON, inject filter, and re-stringify
            try {
                const searchSource = JSON.parse(newAttributes.kibanaSavedObjectMeta.searchSourceJSON);

                // Ensure query slot exists
                if (!searchSource.query) {
                    searchSource.query = { query: "", language: "kuery" };
                }

                // Append our filter to the query string (simplest way without complex filter objects)
                const existingQuery = searchSource.query.query;
                const newQuery = existingQuery
                    ? `(${existingQuery}) AND (${view.filter})`
                    : view.filter;

                searchSource.query.query = newQuery;

                newAttributes.kibanaSavedObjectMeta.searchSourceJSON = JSON.stringify(searchSource);
            } catch (e) {
                console.warn(`Failed to inject filter for ${view.id}`, e);
            }
        }

        // Post new object
        console.log(`Creating/Updating: ${view.title} (${newId})`);
        const createRes = await fetch(`${OSD_URL}/api/saved_objects/dashboard/${newId}?overwrite=true`, {
            method: 'POST',
            headers: {
                "Authorization": AUTH,
                "osd-xsrf": "true",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                attributes: newAttributes,
                references: sourceData.references // Keep visualization references!
            })
        });

        if (createRes.ok) {
            console.log(`SUCCESS: ${newId}`);
        } else {
            console.error(`FAILED: ${newId}`, await createRes.text());
        }
    }
}

main().catch(console.error);
