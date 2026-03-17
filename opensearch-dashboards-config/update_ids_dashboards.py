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

def get_index_pattern_id(pattern):
    url = f"{BASE_URL}/_find?type=index-pattern&search_fields=title&search={pattern}"
    res = requests.get(url, headers=HEADERS)
    res.raise_for_status()
    data = res.json()
    if data['saved_objects']:
        return data['saved_objects'][0]['id']
    return None

def create_index_pattern(pattern):
    url = f"{BASE_URL}/index-pattern"
    body = {
        "attributes": {
            "title": pattern,
            "timeFieldName": "@timestamp"
        }
    }
    res = requests.post(url, headers=HEADERS, json=body)
    res.raise_for_status()
    return res.json()['id']

def upsert_saved_object(type, id, attributes, references=[]):
    url = f"{BASE_URL}/{type}/{id}?overwrite=true"
    body = {
        "attributes": attributes,
        "references": references
    }
    res = requests.post(url, headers=HEADERS, json=body)
    res.raise_for_status()
    print(f"  ✓ Updated {type}: {id}")

def main():
    pattern = "tenant-01-ids-*"
    print(f"Checking index pattern: {pattern}")
    idx_id = get_index_pattern_id(pattern)
    
    if not idx_id:
        print("Creating pattern...")
        idx_id = create_index_pattern(pattern)
    
    print(f"Using Pattern ID: {idx_id}")

    # Visualizations
    v_idx_ref = [{"name": "kibanaSavedObjectMeta.searchSourceJSON.index", "type": "index-pattern", "id": idx_id}]
    
    vizzes = {
        "vis-ids-traffic": {
            "title": "IDS - Traffic Throughput",
            "visState": {"title":"Traffic Throughput","type":"line","params":{"addLegend":True},"aggs":[{"id":"1","type":"sum","schema":"metric","params":{"field":"bytes_in","customLabel":"Bytes In"}},{"id":"2","type":"sum","schema":"metric","params":{"field":"bytes_out","customLabel":"Bytes Out"}},{"id":"3","type":"date_histogram","schema":"segment","params":{"field":"@timestamp","interval":"auto"}}]}
        },
        "vis-ids-ml": {
            "title": "IDS - ML Enforcement",
            "visState": {"title":"ML Enforcement","type":"heatmap","params":{"addLegend":True},"aggs":[{"id":"1","type":"count","schema":"metric"},{"id":"2","type":"terms","schema":"segment","params":{"field":"ml_action.keyword","customLabel":"Action"}},{"id":"3","type":"histogram","schema":"group","params":{"field":"ml_confidence","interval":0.1,"customLabel":"Confidence"}}]}
        },
        "vis-ids-proto": {
            "title": "IDS - Protocol Distribution",
            "visState": {"title":"Protocol Distribution","type":"pie","params":{"addLegend":True,"isDonut":True},"aggs":[{"id":"1","type":"count","schema":"metric"},{"id":"2","type":"terms","schema":"segment","params":{"field":"protocol.keyword"}}]}
        },
        "vis-ids-sigs": {
            "title": "IDS - Top Signatures",
            "visState": {"title":"Top Signatures","type":"table","params":{"perPage":10},"aggs":[{"id":"1","type":"count","schema":"metric"},{"id":"2","type":"terms","schema":"bucket","params":{"field":"signature.keyword","size":10,"order":"desc","orderBy":"1"}}]}
        },
        "vis-ids-mode": {
            "title": "IDS - Mode Status",
            "visState": {"title":"Mode Status","type":"pie","params":{"isDonut":True},"aggs":[{"id":"1","type":"count","schema":"metric"},{"id":"2","type":"terms","schema":"segment","params":{"field":"suricata_mode.keyword"}}]}
        },
        "vis-ids-sev": {
            "title": "IDS - Alert Severity",
            "visState": {"title":"Severity Distribution","type":"pie","params":{"isDonut":True},"aggs":[{"id":"1","type":"count","schema":"metric"},{"id":"2","type":"terms","schema":"segment","params":{"field":"severity.keyword"}}]}
        },
        "vis-ids-src": {
            "title": "IDS - Top Source IPs",
            "visState": {"title":"Top Source IPs","type":"table","params":{"perPage":10},"aggs":[{"id":"1","type":"count","schema":"metric"},{"id":"2","type":"terms","schema":"bucket","params":{"field":"source_ip","size":10}}]}
        },
        "vis-ids-zeek": {
            "title": "IDS - Zeek Analysis",
            "visState": {"title":"Zeek Analysis","type":"pie","params":{"isDonut":True},"aggs":[{"id":"1","type":"count","schema":"metric"},{"id":"2","type":"terms","schema":"segment","params":{"field":"data_source.keyword","size":5}}]}
        },
        "ids-nav-vis": {
            "title": "IDS Navigation",
            "visState": {
                "title":"IDS Navigation","type":"markdown",
                "params":{"fontSize":14,"openLinksInNewTab":False,"markdown":"# IDS / IPS Analysis\n\n## Quick Access\n- [Traffic Overview](http://localhost:5601/app/dashboards#/view/ids-traffic)\n- [Blocked Threats](http://localhost:5601/app/dashboards#/view/ids-blocked)\n- [Intrusion Alerts](http://localhost:5601/app/dashboards#/view/ids-ids-alerts)\n\n## Analysis\n- [Signatures](http://localhost:5601/app/dashboards#/view/ids-signatures)\n- [Network Flows](http://localhost:5601/app/dashboards#/view/ids-flows)\n\n## Tools\n- [Discover](http://localhost:5601/app/discover)\n- [Maps](http://localhost:5601/app/maps-dashboards)"},
                "aggs":[]
            }
        }
    }

    for vid, data in vizzes.items():
        attributes = {
            "title": data["title"],
            "visState": json.dumps(data["visState"]),
            "uiStateJSON": "{}",
            "description": "IDS Visualization",
            "version": 1,
            "kibanaSavedObjectMeta": {
                "searchSourceJSON": json.dumps({
                    "query": {"query": "", "language": "kuery"},
                    "filter": [],
                    "index": idx_id
                })
            }
        }
        references = []
        if vid != "ids-nav-vis":
            references = [{"name": "kibanaSavedObjectMeta.searchSourceJSON.index", "type": "index-pattern", "id": idx_id}]
        
        upsert_saved_object("visualization", vid, attributes, references)

    # Dashboards
    dashboards = {
        "ids-home": {
            "title": "IDS - Home",
            "panelsJSON": json.dumps([{"gridData":{"x":0,"y":0,"w":48,"h":20,"i":"1"},"panelIndex":"1","panelRefName":"p1"}]),
            "optionsJSON": json.dumps({"hidePanelTitles": True, "useMargins": True})
        },
        "ids-traffic": {
            "title": "IDS - Traffic Overview",
            "panelsJSON": json.dumps([
                {"gridData":{"x":0,"y":0,"w":48,"h":15,"i":"1"},"panelIndex":"1","panelRefName":"p1"},
                {"gridData":{"x":0,"y":15,"w":24,"h":15,"i":"2"},"panelIndex":"2","panelRefName":"p2"},
                {"gridData":{"x":24,"y":15,"w":24,"h":15,"i":"3"},"panelIndex":"3","panelRefName":"p3"}
            ]),
            "optionsJSON": json.dumps({"useMargins": True})
        },
        "ids-blocked": {
            "title": "IDS - Blocked Threats",
            "panelsJSON": json.dumps([{"gridData":{"x":0,"y":0,"w":48,"h":20,"i":"1"},"panelIndex":"1","panelRefName":"p1"}]),
            "optionsJSON": json.dumps({"useMargins": True})
        },
        "ids-ids-alerts": {
            "title": "IDS - Intrusion Alerts",
            "panelsJSON": json.dumps([
                {"gridData":{"x":0,"y":0,"w":24,"h":15,"i":"1"},"panelIndex":"1","panelRefName":"p1"},
                {"gridData":{"x":24,"y":0,"w":24,"h":15,"i":"2"},"panelIndex":"2","panelRefName":"p2"}
            ]),
            "optionsJSON": json.dumps({"useMargins": True})
        },
        "ids-signatures": {
            "title": "IDS - Signatures",
            "panelsJSON": json.dumps([{"gridData":{"x":0,"y":0,"w":48,"h":20,"i":"1"},"panelIndex":"1","panelRefName":"p1"}]),
            "optionsJSON": json.dumps({"useMargins": True})
        },
        "ids-flows": {
            "title": "IDS - Network Flows",
            "panelsJSON": json.dumps([
                {"gridData":{"x":0,"y":0,"w":24,"h":20,"i":"1"},"panelIndex":"1","panelRefName":"p1"},
                {"gridData":{"x":24,"y":0,"w":24,"h":20,"i":"2"},"panelIndex":"2","panelRefName":"p2"}
            ]),
            "optionsJSON": json.dumps({"useMargins": True})
        }
    }

    dash_refs = {
        "ids-home": [{"name": "p1", "type": "visualization", "id": "ids-nav-vis"}],
        "ids-traffic": [
            {"name": "p1", "type": "visualization", "id": "vis-ids-traffic"},
            {"name": "p2", "type": "visualization", "id": "vis-ids-proto"},
            {"name": "p3", "type": "visualization", "id": "vis-ids-mode"}
        ],
        "ids-blocked": [{"name": "p1", "type": "visualization", "id": "vis-ids-ml"}],
        "ids-ids-alerts": [
            {"name": "p1", "type": "visualization", "id": "vis-ids-sigs"},
            {"name": "p2", "type": "visualization", "id": "vis-ids-sev"}
        ],
        "ids-signatures": [{"name": "p1", "type": "visualization", "id": "vis-ids-sigs"}],
        "ids-flows": [
            {"name": "p1", "type": "visualization", "id": "vis-ids-src"},
            {"name": "p2", "type": "visualization", "id": "vis-ids-zeek"}
        ]
    }

    for did, attr in dashboards.items():
        upsert_saved_object("dashboard", did, attr, dash_refs[did])

    print("\nSUCCESS: IDS/IPS Dashboards Updated.")

if __name__ == "__main__":
    main()
