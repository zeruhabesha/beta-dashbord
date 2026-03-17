import requests
import json
import base64

BASE_URL = "http://localhost:5601/api/saved_objects"
AUTH = base64.b64encode(b"admin:admin").decode('utf-8')
HEADERS = {
    "Authorization": f"Basic {AUTH}",
    "osd-xsrf": "true",
    "Content-Type": "application/json"
}

def upsert(obj_type, obj_id, attributes, references=[]):
    url = f"{BASE_URL}/{obj_type}/{obj_id}?overwrite=true"
    body = {"attributes": attributes, "references": references}
    res = requests.post(url, headers=HEADERS, json=body)
    res.raise_for_status()
    print(f"  ✓ Updated {obj_type}: {obj_id}")

def main():
    # Visualizations
    upsert("visualization", "siem-nav-vis", {
        "title": "SIEM Navigation",
        "description": "SIEM team navigation",
        "visState": json.dumps({
            "title": "SIEM Navigation",
            "type": "markdown",
            "params": {
                "fontSize": 14,
                "markdown": "# SIEM Operations\n\n## Quick Access\n- [Overview](http://localhost:5601/app/dashboards#/view/siem-overview)\n- [Malware Detection](http://localhost:5601/app/dashboards#/view/siem-malware)\n- [File Integrity](http://localhost:5601/app/dashboards#/view/siem-fim)\n\n## Threat Intelligence\n- [Threat Hunting](http://localhost:5601/app/dashboards#/view/siem-hunting)\n- [Vulnerability Detection](http://localhost:5601/app/dashboards#/view/siem-vuln-detect)\n- [MITRE ATT&CK](http://localhost:5601/app/dashboards#/view/siem-mitre)\n\n## Compliance\n- [PCI DSS](http://localhost:5601/app/dashboards#/view/siem-pci)\n- [GDPR](http://localhost:5601/app/dashboards#/view/siem-gdpr)\n- [HIPAA](http://localhost:5601/app/dashboards#/view/siem-hipaa)\n- [NIST 800-53](http://localhost:5601/app/dashboards#/view/siem-nist)\n\n## Cloud Security\n- [Docker](http://localhost:5601/app/dashboards#/view/siem-docker)\n- [AWS](http://localhost:5601/app/dashboards#/view/siem-aws)\n- [GCP](http://localhost:5601/app/dashboards#/view/siem-gcp)\n- [Azure](http://localhost:5601/app/dashboards#/view/siem-azure)"
            }
        })
    })

    upsert("visualization", "ids-nav-vis", {
        "title": "IDS Navigation",
        "visState": json.dumps({
            "title": "IDS Navigation",
            "type": "markdown",
            "params": {
                "fontSize": 14,
                "markdown": "# IDS / IPS Analysis\n\n## Quick Access\n- [Traffic Overview](http://localhost:5601/app/dashboards#/view/ids-traffic)\n- [Blocked Threats](http://localhost:5601/app/dashboards#/view/ids-blocked)\n- [Intrusion Alerts](http://localhost:5601/app/dashboards#/view/ids-ids-alerts)\n\n## Analysis\n- [Signatures](http://localhost:5601/app/dashboards#/view/ids-signatures)\n- [Network Flows](http://localhost:5601/app/dashboards#/view/ids-flows)\n\n## Tools\n- [Discover](http://localhost:5601/app/discover)\n- [Maps](http://localhost:5601/app/maps-dashboards)"
            }
        })
    })

    upsert("visualization", "edr-nav-vis", {
        "title": "EDR Navigation",
        "visState": json.dumps({
            "title": "EDR Navigation",
            "type": "markdown",
            "params": {
                "fontSize": 14,
                "markdown": "# EDR Analysis\n\n## Quick Access\n- [Endpoint Status](http://localhost:5601/app/dashboards#/view/edr-endpoints)\n- [Active Threats](http://localhost:5601/app/dashboards#/view/edr-active-threats)\n- [Malware Analysis](http://localhost:5601/app/dashboards#/view/edr-malware)\n\n## Response\n- [Host Isolation](http://localhost:5601/app/dashboards#/view/edr-isolation)\n\n## Forensics\n- [Process Tree](http://localhost:5601/app/dashboards#/view/edr-process-tree)\n- [File Integrity](http://localhost:5601/app/dashboards#/view/edr-file-integrity)\n- [Threat Hunting](http://localhost:5601/app/dashboards#/view/edr-hunting)"
            }
        })
    })

    # Dashboards
    upsert("dashboard", "siem-home", {
        "title": "SIEM - Home",
        "panelsJSON": json.dumps([{"gridData":{"x":0,"y":0,"w":48,"h":30,"i":"1"},"panelIndex":"1","panelRefName":"panel_1"}])
    }, [{"name": "panel_1", "type": "visualization", "id": "siem-nav-vis"}])

    upsert("dashboard", "ids-home", {
        "title": "IDS - Home",
        "panelsJSON": json.dumps([{"gridData":{"x":0,"y":0,"w":48,"h":20,"i":"1"},"panelIndex":"1","panelRefName":"panel_1"}])
    }, [{"name": "panel_1", "type": "visualization", "id": "ids-nav-vis"}])

    upsert("dashboard", "edr-home", {
        "title": "EDR - Home",
        "panelsJSON": json.dumps([{"gridData":{"x":0,"y":0,"w":48,"h":20,"i":"1"},"panelIndex":"1","panelRefName":"panel_1"}])
    }, [{"name": "panel_1", "type": "visualization", "id": "edr-nav-vis"}])

if __name__ == "__main__":
    main()
