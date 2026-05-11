import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request


DASHBOARDS_URL = os.getenv("OPENSEARCH_DASHBOARDS_URL", "http://196.188.249.46:5601").rstrip("/")
OPENSEARCH_URL = os.getenv("OPENSEARCH_URL", "http://196.188.249.46:9200").rstrip("/")
SAVED_OBJECTS_INDEX = os.getenv("OPENSEARCH_DASHBOARDS_INDEX", ".kibana")
AUTH_HEADER = os.getenv("OPENSEARCH_DASHBOARDS_AUTH", "").strip()
OPENSEARCH_AUTH_HEADER = os.getenv("OPENSEARCH_AUTH", "").strip()

HEADERS = {
    "Content-Type": "application/json",
    "osd-xsrf": "true",
}
OPENSEARCH_HEADERS = {"Content-Type": "application/json"}

SAVED_OBJECTS_INDEX_MAPPING = {
    "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 0,
    },
    "mappings": {
        "dynamic_templates": [
            {
                "strings": {
                    "match_mapping_type": "string",
                    "mapping": {
                        "type": "text",
                        "fields": {
                            "keyword": {
                                "type": "keyword",
                                "ignore_above": 256,
                            }
                        },
                    },
                }
            }
        ],
        "properties": {
            "type": {"type": "keyword"},
            "namespace": {"type": "keyword"},
            "namespaces": {"type": "keyword"},
            "updated_at": {"type": "date"},
            "references": {
                "properties": {
                    "id": {"type": "keyword"},
                    "name": {"type": "keyword"},
                    "type": {"type": "keyword"},
                }
            },
        },
    },
}

if AUTH_HEADER:
    HEADERS["Authorization"] = AUTH_HEADER

if OPENSEARCH_AUTH_HEADER:
    OPENSEARCH_HEADERS["Authorization"] = OPENSEARCH_AUTH_HEADER

WAZUH_INDEX_PATTERN = "wazuh-alerts-4.x-*"
DEFAULT_DATA_VIEW_ID = "unified-index-pattern"
WAZUH_BASE_QUERY = "rule.level:* or rule.id:* or rule.description:*"
WAZUH_FIELD_NAMES = [
    "@timestamp",
    "timestamp",
    "id",
    "title",
    "type",
    "agent.name",
    "agent.id",
    "agent.ip",
    "agent.labels.tenant_id",
    "manager.name",
    "rule.level",
    "rule.description",
    "rule.groups",
    "rule.id",
    "rule.firedtimes",
    "rule.frequency",
    "rule.pci_dss",
    "rule.gdpr",
    "rule.hipaa",
    "rule.nist_800_53",
    "rule.nist_800-53",
    "rule.nist_sp_800-53",
    "rule.cis",
    "rule.cve",
    "rule.mitre.id",
    "rule.mitre.tactic",
    "rule.mitre.technique",
    "decoder.name",
    "decoder.parent",
    "location",
    "full_log",
    "message",
    "data.srcip",
    "data.dstip",
    "data.aws.source",
    "data.aws.region",
    "data.YARA.rule_name",
    "data.YARA.scanned_file",
    "syscheck.event",
    "syscheck.path",
    "syscheck.sha256_after",
    "syscheck.audit.user.name",
]

WAZUH_BOOTSTRAP_INDEX = "wazuh-alerts-4.x-bootstrap"
DATE_FIELDS = {"@timestamp", "timestamp"}
NUMBER_FIELDS = {"rule.level", "rule.firedtimes", "rule.frequency"}
TEXT_FIELDS = {"full_log", "message", "type"}

def request_json(method, path, payload=None):
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        f"{DASHBOARDS_URL}{path}",
        data=data,
        method=method,
        headers=HEADERS,
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read().decode("utf-8")
            return response.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {path} failed: {error.code} {body}") from error


def request_opensearch_json(method, path, payload=None):
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        f"{OPENSEARCH_URL}{path}",
        data=data,
        method=method,
        headers=OPENSEARCH_HEADERS,
    )

    with urllib.request.urlopen(request, timeout=30) as response:
        body = response.read().decode("utf-8")
        return response.status, json.loads(body) if body else {}


def request_opensearch_json_optional(method, path, payload=None):
    try:
        return request_opensearch_json(method, path, payload)
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        return error.code, json.loads(body) if body else {}


def quote_index(index_name):
    return urllib.parse.quote(index_name, safe="")


def opensearch_index_exists(index_name):
    status, _ = request_opensearch_json_optional("HEAD", f"/{quote_index(index_name)}")
    return status == 200


def opensearch_index_count(index_name):
    status, body = request_opensearch_json_optional("GET", f"/{quote_index(index_name)}/_count")
    if status == 404:
        return 0
    if status != 200:
        raise RuntimeError(f"Could not count {index_name}: {status} {body}")
    return int(body.get("count", 0))


def saved_objects_type_mapping(index_name):
    status, body = request_opensearch_json_optional(
        "GET",
        f"/{quote_index(index_name)}/_mapping/field/type",
    )
    if status == 404:
        return None
    if status != 200:
        raise RuntimeError(f"Could not read {index_name} type mapping: {status} {body}")
    return (
        body.get(index_name, {})
        .get("mappings", {})
        .get("type", {})
        .get("mapping", {})
        .get("type", {})
    )


def create_saved_objects_index(index_name):
    status, body = request_opensearch_json_optional(
        "PUT",
        f"/{quote_index(index_name)}",
        SAVED_OBJECTS_INDEX_MAPPING,
    )
    if status not in (200, 201):
        raise RuntimeError(f"Could not create {index_name}: {status} {body}")


def reindex_documents(source_index, destination_index):
    payload = {
        "source": {"index": source_index},
        "dest": {"index": destination_index},
    }
    status, body = request_opensearch_json_optional(
        "POST",
        "/_reindex?wait_for_completion=true&refresh=true",
        payload,
    )
    if status not in (200, 201):
        raise RuntimeError(f"Could not reindex {source_index} to {destination_index}: {status} {body}")
    if body.get("failures"):
        raise RuntimeError(f"Reindex {source_index} to {destination_index} had failures: {body['failures']}")


def set_index_replicas(index_name, replicas):
    status, body = request_opensearch_json_optional(
        "PUT",
        f"/{quote_index(index_name)}/_settings",
        {"index": {"number_of_replicas": replicas}},
    )
    if status not in (200, 201):
        raise RuntimeError(f"Could not set replicas for {index_name}: {status} {body}")


def ensure_saved_objects_index_mapping():
    if not opensearch_index_exists(SAVED_OBJECTS_INDEX):
        create_saved_objects_index(SAVED_OBJECTS_INDEX)
        print(f"created saved objects index: {SAVED_OBJECTS_INDEX}")
        return

    type_mapping = saved_objects_type_mapping(SAVED_OBJECTS_INDEX)
    if type_mapping and type_mapping.get("type") == "keyword":
        print(f"saved objects index mapping is healthy: {SAVED_OBJECTS_INDEX}")
        return

    source_count = opensearch_index_count(SAVED_OBJECTS_INDEX)
    backup_index = f"{SAVED_OBJECTS_INDEX}-backup-{int(time.time())}"
    while opensearch_index_exists(backup_index):
        backup_index = f"{SAVED_OBJECTS_INDEX}-backup-{int(time.time()) + 1}"

    print(
        f"repairing {SAVED_OBJECTS_INDEX}: current type mapping is "
        f"{type_mapping or 'missing'}, backing up {source_count} documents to {backup_index}"
    )
    reindex_documents(SAVED_OBJECTS_INDEX, backup_index)
    set_index_replicas(backup_index, 0)
    backup_count = opensearch_index_count(backup_index)
    if backup_count != source_count:
        raise RuntimeError(
            f"Backup count mismatch for {backup_index}: expected {source_count}, got {backup_count}"
        )

    status, body = request_opensearch_json_optional("DELETE", f"/{quote_index(SAVED_OBJECTS_INDEX)}")
    if status not in (200, 202):
        raise RuntimeError(f"Could not delete old {SAVED_OBJECTS_INDEX}: {status} {body}")

    create_saved_objects_index(SAVED_OBJECTS_INDEX)
    reindex_documents(backup_index, SAVED_OBJECTS_INDEX)
    repaired_count = opensearch_index_count(SAVED_OBJECTS_INDEX)
    if repaired_count != backup_count:
        raise RuntimeError(
            f"Repaired count mismatch for {SAVED_OBJECTS_INDEX}: expected {backup_count}, got {repaired_count}"
        )

    print(
        f"repaired {SAVED_OBJECTS_INDEX} mapping; backup retained at {backup_index} "
        f"with {backup_count} documents"
    )


def saved_object_path(object_type, object_id):
    return f"/api/saved_objects/{object_type}/{urllib.parse.quote(object_id, safe='')}?overwrite=true"


def find_saved_objects(object_type):
    status, payload = request_json(
        "GET",
        f"/api/saved_objects/_find?type={urllib.parse.quote(object_type)}&per_page=10000",
    )
    if status != 200:
        raise RuntimeError(f"Unexpected _find status: {status}")
    return payload.get("saved_objects", [])


def create_saved_object(object_type, object_id, attributes, references=None):
    payload = {"attributes": attributes}
    if references is not None:
        payload["references"] = references

    status, body = request_json("POST", saved_object_path(object_type, object_id), payload)
    if status not in (200, 201):
        raise RuntimeError(f"Unexpected {object_type}/{object_id} status: {status} {body}")
    return body


def get_saved_object(object_type, object_id):
    try:
        status, body = request_json("GET", f"/api/saved_objects/{object_type}/{urllib.parse.quote(object_id, safe='')}")
        if status == 200:
            return body
    except RuntimeError:
        return None
    return None


def opensearch_field_type(field_name):
    if field_name in DATE_FIELDS:
        return "date"
    if field_name in NUMBER_FIELDS:
        return "long"
    if field_name in TEXT_FIELDS:
        return "text"
    return "keyword"


def add_mapping_property(properties, field_name):
    parts = field_name.split(".")
    current = properties

    for part in parts[:-1]:
        current = current.setdefault(part, {"properties": {}})["properties"]

    current[parts[-1]] = {"type": opensearch_field_type(field_name)}


def wazuh_mapping_properties():
    properties = {}

    for field_name in WAZUH_FIELD_NAMES:
        add_mapping_property(properties, field_name)

    return properties


def ensure_wazuh_index_template():
    payload = {
        "index_patterns": [WAZUH_INDEX_PATTERN],
        "template": {
            "settings": {
                "number_of_shards": 1,
                "number_of_replicas": 0,
            },
            "mappings": {
                "properties": wazuh_mapping_properties(),
            },
        },
    }
    status, body = request_opensearch_json_optional(
        "PUT",
        "/_index_template/beta-wazuh-alerts-template",
        payload,
    )
    if status not in (200, 201):
        print(f"warning: could not create Wazuh index template: {status} {body}")
    else:
        print("upserted Wazuh index template")


def matching_indices(pattern):
    status, body = request_opensearch_json_optional(
        "GET",
        f"/_cat/indices/{urllib.parse.quote(pattern, safe='*')}?format=json&h=index",
    )
    if status != 200 or not isinstance(body, list):
        return []
    return [item.get("index") for item in body if item.get("index")]


def ensure_wazuh_bootstrap_index():
    ensure_wazuh_index_template()

    if matching_indices(WAZUH_INDEX_PATTERN):
        return

    payload = {
        "settings": {
            "number_of_shards": 1,
            "number_of_replicas": 0,
        },
        "mappings": {
            "properties": wazuh_mapping_properties(),
        },
    }
    status, body = request_opensearch_json_optional(
        "PUT",
        f"/{urllib.parse.quote(WAZUH_BOOTSTRAP_INDEX, safe='')}",
        payload,
    )
    if status in (200, 201):
        print(f"created Wazuh bootstrap index: {WAZUH_BOOTSTRAP_INDEX}")
    elif status == 400 and body.get("error", {}).get("type") == "resource_already_exists_exception":
        print(f"Wazuh bootstrap index already exists: {WAZUH_BOOTSTRAP_INDEX}")
    else:
        print(f"warning: could not create Wazuh bootstrap index: {status} {body}")


def field_type_for_dashboards(es_type):
    if es_type in ("date", "date_nanos"):
        return "date"
    if es_type in ("long", "integer", "short", "byte", "double", "float", "half_float", "scaled_float"):
        return "number"
    if es_type == "boolean":
        return "boolean"
    if es_type == "geo_point":
        return "geo_point"
    if es_type == "_source":
        return "_source"
    return "string"


def make_data_view_field(name, es_type, searchable=True, aggregatable=True):
    dashboards_type = field_type_for_dashboards(es_type)
    return {
        "count": 0,
        "name": name,
        "type": dashboards_type,
        "esTypes": [name] if name in ("_id", "_index", "_source") else [es_type],
        "scripted": False,
        "searchable": searchable,
        "aggregatable": aggregatable,
        "readFromDocValues": aggregatable and es_type not in ("text", "_source"),
    }


def fallback_wazuh_fields():
    fields = [
        make_data_view_field("_id", "_id", searchable=True, aggregatable=True),
        make_data_view_field("_index", "_index", searchable=True, aggregatable=True),
        make_data_view_field("_score", "float", searchable=False, aggregatable=False),
        make_data_view_field("_source", "_source", searchable=False, aggregatable=False),
    ]
    fields.extend(make_data_view_field(name, "keyword") for name in WAZUH_FIELD_NAMES)
    for item in fields:
        if item["name"] in ("@timestamp", "timestamp"):
            item["type"] = "date"
            item["esTypes"] = ["date"]
        if item["name"] == "rule.level":
            item["type"] = "number"
            item["esTypes"] = ["long"]
        if item["name"] in ("full_log", "message"):
            item["esTypes"] = ["text"]
            item["aggregatable"] = False
            item["readFromDocValues"] = False
    return fields


def wazuh_fields_from_field_caps():
    try:
        fields_param = urllib.parse.quote(",".join(WAZUH_FIELD_NAMES), safe=",@.*-_")
        status, payload = request_opensearch_json(
            "GET",
            f"/{urllib.parse.quote(WAZUH_INDEX_PATTERN, safe='*')}/_field_caps?fields={fields_param}",
        )
        if status != 200:
            return fallback_wazuh_fields()

        fields = [
            make_data_view_field("_id", "_id", searchable=True, aggregatable=True),
            make_data_view_field("_index", "_index", searchable=True, aggregatable=True),
            make_data_view_field("_score", "float", searchable=False, aggregatable=False),
            make_data_view_field("_source", "_source", searchable=False, aggregatable=False),
        ]
        for name in WAZUH_FIELD_NAMES:
            caps = payload.get("fields", {}).get(name, {})
            if not caps:
                continue
            es_type, details = next(iter(caps.items()))
            if es_type == "object":
                continue
            fields.append(
                make_data_view_field(
                    name,
                    es_type,
                    searchable=details.get("searchable", True),
                    aggregatable=details.get("aggregatable", False),
                )
            )
        if len(fields) <= 4:
            return fallback_wazuh_fields()
        return fields
    except Exception as exc:
        print(f"warning: could not refresh Wazuh data-view fields from OpenSearch: {exc}")
        return fallback_wazuh_fields()


def ensure_data_view(existing_by_title, object_id, title, time_field=None, fields=None):
    existing = existing_by_title.get(title)
    attributes = {"title": title}
    if time_field:
        attributes["timeFieldName"] = time_field
    if fields is not None:
        attributes["fields"] = json.dumps(fields)

    if existing:
        create_saved_object("index-pattern", existing["id"], attributes, references=existing.get("references", []))
        print(f"updated data view: {title} ({existing['id']})")
        return existing["id"]

    create_saved_object("index-pattern", object_id, attributes, references=[])
    print(f"created data view: {title} ({object_id})")
    return object_id


def upsert_data_view_id(object_id, title, time_field=None, fields=None):
    attributes = {"title": title}
    if time_field:
        attributes["timeFieldName"] = time_field
    if fields is not None:
        attributes["fields"] = json.dumps(fields)

    create_saved_object("index-pattern", object_id, attributes, references=[])
    print(f"upserted data view: {title} ({object_id})")
    return object_id


def ensure_default_index(data_view_id):
    status, payload = request_json("GET", "/api/status")
    version = str(payload.get("version", {}).get("number") or "3.6.0")
    build_number = payload.get("version", {}).get("build_number")
    existing = get_saved_object("config", version)
    attributes = dict(existing.get("attributes", {}) if existing else {})

    if build_number is not None:
        attributes.setdefault("buildNum", build_number)

    attributes["defaultIndex"] = data_view_id
    attributes["dateFormat:tz"] = "UTC"
    create_saved_object("config", version, attributes, references=existing.get("references", []) if existing else [])
    print(f"set OpenSearch Dashboards defaultIndex: {data_view_id}")
    print("forced OpenSearch Dashboards timezone: UTC")


def search_source(index_ref_name, query=""):
    return json.dumps(
        {
            "indexRefName": index_ref_name,
            "query": {"query": query, "language": "kuery"},
            "filter": [],
        }
    )


def visualization_attributes(title, vis_state, index_id, query=""):
    index_ref_name = "kibanaSavedObjectMeta.searchSourceJSON.index"
    return (
        {
            "title": title,
            "visState": json.dumps(vis_state),
            "uiStateJSON": "{}",
            "description": "Generated for BETA unified security dashboard iframes.",
            "version": 1,
            "kibanaSavedObjectMeta": {
                "searchSourceJSON": search_source(index_ref_name, query)
            },
        },
        [{"name": index_ref_name, "type": "index-pattern", "id": index_id}],
    )


def metric_vis(title):
    return {
        "title": title,
        "type": "metric",
        "params": {
            "type": "metric",
            "addTooltip": True,
            "addLegend": False,
            "metric": {
                "percentageMode": False,
                "useRanges": False,
                "colorSchema": "Green to Red",
                "metricColorMode": "None",
                "labels": {"show": True},
                "style": {"bgFill": False, "bgColor": False, "labelColor": False, "fontSize": 52},
            },
        },
        "aggs": [{"id": "1", "enabled": True, "type": "count", "schema": "metric", "params": {}}],
    }


def avg_metric_vis(title, field):
    return {
        "title": title,
        "type": "metric",
        "params": {
            "type": "metric",
            "addTooltip": True,
            "addLegend": False,
            "metric": {
                "percentageMode": False,
                "useRanges": False,
                "colorSchema": "Green to Red",
                "metricColorMode": "None",
                "labels": {"show": True},
                "style": {"bgFill": False, "bgColor": False, "labelColor": False, "fontSize": 42},
            },
        },
        "aggs": [
            {
                "id": "1",
                "enabled": True,
                "type": "avg",
                "schema": "metric",
                "params": {"field": field},
            }
        ],
    }


def date_histogram_vis(title, time_field):
    return {
        "title": title,
        "type": "histogram",
        "params": {
            "type": "histogram",
            "grid": {"categoryLines": False, "style": {"color": "#eee"}},
            "categoryAxes": [
                {
                    "id": "CategoryAxis-1",
                    "type": "category",
                    "position": "bottom",
                    "show": True,
                    "scale": {"type": "linear"},
                    "labels": {"show": True, "truncate": 100},
                }
            ],
            "valueAxes": [
                {
                    "id": "ValueAxis-1",
                    "name": "LeftAxis-1",
                    "type": "value",
                    "position": "left",
                    "show": True,
                    "scale": {"type": "linear", "mode": "normal"},
                    "labels": {"show": True, "rotate": 0, "filter": False, "truncate": 100},
                }
            ],
            "seriesParams": [
                {
                    "show": True,
                    "type": "histogram",
                    "mode": "normal",
                    "data": {"label": "Events", "id": "1"},
                    "valueAxis": "ValueAxis-1",
                    "drawLinesBetweenPoints": True,
                    "showCircles": True,
                }
            ],
            "addTooltip": True,
            "addLegend": False,
            "times": [],
            "addTimeMarker": False,
        },
        "aggs": [
            {"id": "1", "enabled": True, "type": "count", "schema": "metric", "params": {}},
            {
                "id": "2",
                "enabled": True,
                "type": "date_histogram",
                "schema": "segment",
                "params": {"field": time_field, "interval": "auto", "customInterval": "2h", "min_doc_count": 1},
            },
        ],
    }


def terms_bar_vis(title, field, size=10):
    return {
        "title": title,
        "type": "horizontal_bar",
        "params": {
            "type": "histogram",
            "grid": {"categoryLines": False},
            "categoryAxes": [
                {
                    "id": "CategoryAxis-1",
                    "type": "category",
                    "position": "left",
                    "show": True,
                    "scale": {"type": "linear"},
                    "labels": {"show": True, "truncate": 100},
                }
            ],
            "valueAxes": [
                {
                    "id": "ValueAxis-1",
                    "name": "LeftAxis-1",
                    "type": "value",
                    "position": "bottom",
                    "show": True,
                    "scale": {"type": "linear", "mode": "normal"},
                    "labels": {"show": True, "rotate": 0, "filter": False, "truncate": 100},
                }
            ],
            "seriesParams": [
                {
                    "show": True,
                    "type": "histogram",
                    "mode": "normal",
                    "data": {"label": "Count", "id": "1"},
                    "valueAxis": "ValueAxis-1",
                    "drawLinesBetweenPoints": True,
                    "showCircles": True,
                }
            ],
            "addTooltip": True,
            "addLegend": False,
            "legendPosition": "right",
            "times": [],
            "addTimeMarker": False,
        },
        "aggs": [
            {"id": "1", "enabled": True, "type": "count", "schema": "metric", "params": {}},
            {
                "id": "2",
                "enabled": True,
                "type": "terms",
                "schema": "segment",
                "params": {"field": field, "size": size, "order": "desc", "orderBy": "1"},
            },
        ],
    }


def terms_pie_vis(title, field, size=8):
    return {
        "title": title,
        "type": "pie",
        "params": {
            "type": "pie",
            "addTooltip": True,
            "addLegend": True,
            "legendPosition": "right",
            "isDonut": True,
            "labels": {"show": False, "values": True, "last_level": True, "truncate": 100},
        },
        "aggs": [
            {"id": "1", "enabled": True, "type": "count", "schema": "metric", "params": {}},
            {
                "id": "2",
                "enabled": True,
                "type": "terms",
                "schema": "segment",
                "params": {"field": field, "size": size, "order": "desc", "orderBy": "1"},
            },
        ],
    }


def table_vis(title, field, size=20):
    return {
        "title": title,
        "type": "table",
        "params": {
            "perPage": 10,
            "showPartialRows": False,
            "showMetricsAtAllLevels": False,
            "sort": {"columnIndex": None, "direction": None},
            "showTotal": False,
            "totalFunc": "sum",
        },
        "aggs": [
            {"id": "1", "enabled": True, "type": "count", "schema": "metric", "params": {}},
            {
                "id": "2",
                "enabled": True,
                "type": "terms",
                "schema": "bucket",
                "params": {"field": field, "size": size, "order": "desc", "orderBy": "1"},
            },
        ],
    }


def dashboard_attributes(title, description, query, panels):
    panels_json = []
    references = []

    for index, panel in enumerate(panels):
        panel_id = panel["id"]
        ref_name = f"panel_{index}"
        panels_json.append(
            {
                "version": "7.10.2",
                "type": "visualization",
                "panelIndex": str(index + 1),
                "panelRefName": ref_name,
                "embeddableConfig": {},
                "gridData": {
                    "x": panel["x"],
                    "y": panel["y"],
                    "w": panel["w"],
                    "h": panel["h"],
                    "i": str(index + 1),
                },
            }
        )
        references.append({"name": ref_name, "type": "visualization", "id": panel_id})

    attributes = {
        "title": title,
        "description": description,
        "hits": 0,
        "panelsJSON": json.dumps(panels_json),
        "optionsJSON": json.dumps({"useMargins": True, "hidePanelTitles": False}),
        "timeRestore": False,
        "kibanaSavedObjectMeta": {
            "searchSourceJSON": json.dumps(
                {
                    "query": {"query": query, "language": "kuery"},
                    "filter": [],
                }
            )
        },
    }
    return attributes, references


PANELS = {
    "overview": [
        {"id": "beta-security-total-events", "x": 0, "y": 0, "w": 12, "h": 8},
        {"id": "beta-security-severity", "x": 12, "y": 0, "w": 12, "h": 8},
        {"id": "beta-security-status", "x": 24, "y": 0, "w": 12, "h": 8},
        {"id": "beta-security-threat-types", "x": 36, "y": 0, "w": 12, "h": 8},
        {"id": "beta-security-timeline", "x": 0, "y": 8, "w": 48, "h": 14},
        {"id": "beta-security-recent-threats", "x": 0, "y": 22, "w": 24, "h": 13},
        {"id": "beta-security-top-clients", "x": 24, "y": 22, "w": 24, "h": 13},
    ],
    "response": [
        {"id": "beta-security-total-events", "x": 0, "y": 0, "w": 12, "h": 8},
        {"id": "beta-security-actions", "x": 12, "y": 0, "w": 18, "h": 8},
        {"id": "beta-security-status", "x": 30, "y": 0, "w": 18, "h": 8},
        {"id": "beta-security-policies", "x": 0, "y": 8, "w": 24, "h": 14},
        {"id": "beta-security-top-clients", "x": 24, "y": 8, "w": 24, "h": 14},
        {"id": "beta-security-recent-threats", "x": 0, "y": 22, "w": 48, "h": 13},
    ],
    "forensics": [
        {"id": "beta-security-total-events", "x": 0, "y": 0, "w": 12, "h": 8},
        {"id": "beta-security-files", "x": 12, "y": 0, "w": 18, "h": 8},
        {"id": "beta-security-processes", "x": 30, "y": 0, "w": 18, "h": 8},
        {"id": "beta-security-mitre", "x": 0, "y": 8, "w": 24, "h": 14},
        {"id": "beta-security-threat-types", "x": 24, "y": 8, "w": 24, "h": 14},
        {"id": "beta-security-recent-threats", "x": 0, "y": 22, "w": 48, "h": 13},
    ],
    "operations": [
        {"id": "beta-security-total-events", "x": 0, "y": 0, "w": 12, "h": 8},
        {"id": "beta-security-stages", "x": 12, "y": 0, "w": 18, "h": 8},
        {"id": "beta-security-risk", "x": 30, "y": 0, "w": 18, "h": 8},
        {"id": "beta-security-timeline", "x": 0, "y": 8, "w": 48, "h": 14},
        {"id": "beta-security-recent-threats", "x": 0, "y": 22, "w": 48, "h": 13},
    ],
    "playbook_control": [
        {"id": "beta-security-total-events", "x": 0, "y": 0, "w": 10, "h": 8},
        {"id": "beta-security-execution-modes", "x": 10, "y": 0, "w": 12, "h": 8},
        {"id": "beta-security-risk", "x": 22, "y": 0, "w": 12, "h": 8},
        {"id": "beta-security-actions", "x": 34, "y": 0, "w": 14, "h": 8},
        {"id": "beta-security-policies", "x": 0, "y": 8, "w": 24, "h": 14},
        {"id": "beta-security-stages", "x": 24, "y": 8, "w": 24, "h": 14},
        {"id": "beta-security-timeline", "x": 0, "y": 22, "w": 32, "h": 13},
        {"id": "beta-security-decisions", "x": 32, "y": 22, "w": 16, "h": 13},
    ],
    "approval_governance": [
        {"id": "beta-security-total-events", "x": 0, "y": 0, "w": 10, "h": 8},
        {"id": "beta-security-execution-modes", "x": 10, "y": 0, "w": 12, "h": 8},
        {"id": "beta-security-risk", "x": 22, "y": 0, "w": 12, "h": 8},
        {"id": "beta-security-status", "x": 34, "y": 0, "w": 14, "h": 8},
        {"id": "beta-security-policies", "x": 0, "y": 8, "w": 24, "h": 14},
        {"id": "beta-security-actions", "x": 24, "y": 8, "w": 24, "h": 14},
        {"id": "beta-security-timeline", "x": 0, "y": 22, "w": 32, "h": 13},
        {"id": "beta-security-recent-threats", "x": 32, "y": 22, "w": 16, "h": 13},
    ],
    "forensic_storage": [
        {"id": "beta-security-total-events", "x": 0, "y": 0, "w": 10, "h": 8},
        {"id": "beta-security-artifacts", "x": 10, "y": 0, "w": 14, "h": 8},
        {"id": "beta-security-actions", "x": 24, "y": 0, "w": 12, "h": 8},
        {"id": "beta-security-status", "x": 36, "y": 0, "w": 12, "h": 8},
        {"id": "beta-security-top-clients", "x": 0, "y": 8, "w": 24, "h": 14},
        {"id": "beta-security-policies", "x": 24, "y": 8, "w": 24, "h": 14},
        {"id": "beta-security-timeline", "x": 0, "y": 22, "w": 48, "h": 13},
    ],
    "audit_trail": [
        {"id": "beta-security-total-events", "x": 0, "y": 0, "w": 10, "h": 8},
        {"id": "beta-security-stages", "x": 10, "y": 0, "w": 12, "h": 8},
        {"id": "beta-security-audit-entities", "x": 22, "y": 0, "w": 12, "h": 8},
        {"id": "beta-security-status", "x": 34, "y": 0, "w": 14, "h": 8},
        {"id": "beta-security-policies", "x": 0, "y": 8, "w": 24, "h": 14},
        {"id": "beta-security-actions", "x": 24, "y": 8, "w": 24, "h": 14},
        {"id": "beta-security-timeline", "x": 0, "y": 22, "w": 32, "h": 13},
        {"id": "beta-security-decisions", "x": 32, "y": 22, "w": 16, "h": 13},
    ],
    "response_control": [
        {"id": "beta-security-total-events", "x": 0, "y": 0, "w": 8, "h": 8},
        {"id": "beta-security-playbook-status", "x": 8, "y": 0, "w": 10, "h": 8},
        {"id": "beta-security-control-actions", "x": 18, "y": 0, "w": 10, "h": 8},
        {"id": "beta-security-manual-actions", "x": 28, "y": 0, "w": 10, "h": 8},
        {"id": "beta-security-operators", "x": 38, "y": 0, "w": 10, "h": 8},
        {"id": "beta-security-timeline", "x": 0, "y": 8, "w": 48, "h": 14},
        {"id": "beta-security-playbook-executions", "x": 0, "y": 22, "w": 24, "h": 13},
        {"id": "beta-security-actions", "x": 24, "y": 22, "w": 24, "h": 13},
    ],
    "response_metrics": [
        {"id": "beta-security-total-events", "x": 0, "y": 0, "w": 8, "h": 8},
        {"id": "beta-security-mttr", "x": 8, "y": 0, "w": 10, "h": 8},
        {"id": "beta-security-response-duration", "x": 18, "y": 0, "w": 10, "h": 8},
        {"id": "beta-security-status", "x": 28, "y": 0, "w": 10, "h": 8},
        {"id": "beta-security-actions", "x": 38, "y": 0, "w": 10, "h": 8},
        {"id": "beta-security-timeline", "x": 0, "y": 8, "w": 48, "h": 14},
        {"id": "beta-security-policies", "x": 0, "y": 22, "w": 24, "h": 13},
        {"id": "beta-security-top-clients", "x": 24, "y": 22, "w": 24, "h": 13},
    ],
    "forensic_deep": [
        {"id": "beta-security-total-events", "x": 0, "y": 0, "w": 8, "h": 8},
        {"id": "beta-security-artifacts", "x": 8, "y": 0, "w": 10, "h": 8},
        {"id": "beta-security-forensic-buckets", "x": 18, "y": 0, "w": 10, "h": 8},
        {"id": "beta-security-retention-until", "x": 28, "y": 0, "w": 10, "h": 8},
        {"id": "beta-security-status", "x": 38, "y": 0, "w": 10, "h": 8},
        {"id": "beta-security-timeline", "x": 0, "y": 8, "w": 48, "h": 14},
        {"id": "beta-security-forensic-paths", "x": 0, "y": 22, "w": 24, "h": 13},
        {"id": "beta-security-actions", "x": 24, "y": 22, "w": 24, "h": 13},
    ],
    "threat_hunting": [
        {"id": "beta-security-total-events", "x": 0, "y": 0, "w": 8, "h": 8},
        {"id": "beta-security-hunts", "x": 8, "y": 0, "w": 10, "h": 8},
        {"id": "beta-security-ioc-types", "x": 18, "y": 0, "w": 10, "h": 8},
        {"id": "beta-security-cti-feeds", "x": 28, "y": 0, "w": 10, "h": 8},
        {"id": "beta-security-status", "x": 38, "y": 0, "w": 10, "h": 8},
        {"id": "beta-security-timeline", "x": 0, "y": 8, "w": 48, "h": 14},
        {"id": "beta-security-ioc-values", "x": 0, "y": 22, "w": 24, "h": 13},
        {"id": "beta-security-top-clients", "x": 24, "y": 22, "w": 24, "h": 13},
    ],
    "enterprise_integrations": [
        {"id": "beta-security-total-events", "x": 0, "y": 0, "w": 8, "h": 8},
        {"id": "beta-security-integrations", "x": 8, "y": 0, "w": 10, "h": 8},
        {"id": "beta-security-status", "x": 18, "y": 0, "w": 10, "h": 8},
        {"id": "beta-security-forwarding-destinations", "x": 28, "y": 0, "w": 10, "h": 8},
        {"id": "beta-security-policies", "x": 38, "y": 0, "w": 10, "h": 8},
        {"id": "beta-security-timeline", "x": 0, "y": 8, "w": 48, "h": 14},
        {"id": "beta-security-jira-tickets", "x": 0, "y": 22, "w": 24, "h": 13},
        {"id": "beta-security-pagerduty-incidents", "x": 24, "y": 22, "w": 24, "h": 13},
    ],
    "platform_health": [
        {"id": "beta-security-total-events", "x": 0, "y": 0, "w": 8, "h": 8},
        {"id": "beta-security-services", "x": 8, "y": 0, "w": 10, "h": 8},
        {"id": "beta-security-health-status", "x": 18, "y": 0, "w": 10, "h": 8},
        {"id": "beta-security-errors", "x": 28, "y": 0, "w": 10, "h": 8},
        {"id": "beta-security-circuit-breakers", "x": 38, "y": 0, "w": 10, "h": 8},
        {"id": "beta-security-timeline", "x": 0, "y": 8, "w": 48, "h": 14},
        {"id": "beta-security-consumer-groups", "x": 0, "y": 22, "w": 24, "h": 13},
        {"id": "beta-security-retry-counts", "x": 24, "y": 22, "w": 24, "h": 13},
    ],
    "config_testing": [
        {"id": "beta-security-total-events", "x": 0, "y": 0, "w": 8, "h": 8},
        {"id": "beta-security-config-versions", "x": 8, "y": 0, "w": 10, "h": 8},
        {"id": "beta-security-validation-status", "x": 18, "y": 0, "w": 10, "h": 8},
        {"id": "beta-security-dry-run", "x": 28, "y": 0, "w": 10, "h": 8},
        {"id": "beta-security-operators", "x": 38, "y": 0, "w": 10, "h": 8},
        {"id": "beta-security-timeline", "x": 0, "y": 8, "w": 48, "h": 14},
        {"id": "beta-security-simulations", "x": 0, "y": 22, "w": 24, "h": 13},
        {"id": "beta-security-environments", "x": 24, "y": 22, "w": 24, "h": 13},
    ],
    "wazuh_overview": [
        {"id": "beta-wazuh-total-alerts", "x": 0, "y": 0, "w": 10, "h": 8},
        {"id": "beta-wazuh-rule-levels", "x": 10, "y": 0, "w": 14, "h": 8},
        {"id": "beta-wazuh-top-agents", "x": 24, "y": 0, "w": 12, "h": 8},
        {"id": "beta-wazuh-decoders", "x": 36, "y": 0, "w": 12, "h": 8},
        {"id": "beta-wazuh-timeline", "x": 0, "y": 8, "w": 48, "h": 14},
        {"id": "beta-wazuh-top-rules", "x": 0, "y": 22, "w": 24, "h": 13},
        {"id": "beta-wazuh-groups", "x": 24, "y": 22, "w": 24, "h": 13},
    ],
    "wazuh_threat": [
        {"id": "beta-wazuh-total-alerts", "x": 0, "y": 0, "w": 10, "h": 8},
        {"id": "beta-wazuh-mitre", "x": 10, "y": 0, "w": 14, "h": 8},
        {"id": "beta-wazuh-rule-levels", "x": 24, "y": 0, "w": 12, "h": 8},
        {"id": "beta-wazuh-locations", "x": 36, "y": 0, "w": 12, "h": 8},
        {"id": "beta-wazuh-timeline", "x": 0, "y": 8, "w": 48, "h": 14},
        {"id": "beta-wazuh-top-rules", "x": 0, "y": 22, "w": 24, "h": 13},
        {"id": "beta-wazuh-recent-alerts", "x": 24, "y": 22, "w": 24, "h": 13},
    ],
    "wazuh_compliance": [
        {"id": "beta-wazuh-total-alerts", "x": 0, "y": 0, "w": 8, "h": 8},
        {"id": "beta-wazuh-pci", "x": 8, "y": 0, "w": 10, "h": 8},
        {"id": "beta-wazuh-gdpr", "x": 18, "y": 0, "w": 10, "h": 8},
        {"id": "beta-wazuh-hipaa", "x": 28, "y": 0, "w": 10, "h": 8},
        {"id": "beta-wazuh-nist", "x": 38, "y": 0, "w": 10, "h": 8},
        {"id": "beta-wazuh-timeline", "x": 0, "y": 8, "w": 48, "h": 14},
        {"id": "beta-wazuh-top-rules", "x": 0, "y": 22, "w": 24, "h": 13},
        {"id": "beta-wazuh-top-agents", "x": 24, "y": 22, "w": 24, "h": 13},
    ],
    "wazuh_sources": [
        {"id": "beta-wazuh-total-alerts", "x": 0, "y": 0, "w": 10, "h": 8},
        {"id": "beta-wazuh-decoders", "x": 10, "y": 0, "w": 14, "h": 8},
        {"id": "beta-wazuh-locations", "x": 24, "y": 0, "w": 12, "h": 8},
        {"id": "beta-wazuh-top-agents", "x": 36, "y": 0, "w": 12, "h": 8},
        {"id": "beta-wazuh-timeline", "x": 0, "y": 8, "w": 48, "h": 14},
        {"id": "beta-wazuh-top-rules", "x": 0, "y": 22, "w": 24, "h": 13},
        {"id": "beta-wazuh-groups", "x": 24, "y": 22, "w": 24, "h": 13},
    ],
}


VISUALIZATIONS = {
    "beta-security-total-events": ("Total Events", metric_vis("Total Events")),
    "beta-security-timeline": ("Events Over Time", date_histogram_vis("Events Over Time", "indexed_at")),
    "beta-security-threat-types": ("Threat Types", terms_bar_vis("Threat Types", "threat_type")),
    "beta-security-severity": ("Severity Distribution", terms_bar_vis("Severity Distribution", "severity")),
    "beta-security-status": ("Status Distribution", terms_pie_vis("Status Distribution", "status.keyword")),
    "beta-security-top-clients": ("Top Clients", terms_bar_vis("Top Clients", "client_id.keyword")),
    "beta-security-actions": ("Response Actions", terms_bar_vis("Response Actions", "action_name.keyword")),
    "beta-security-policies": ("Policies and Rules", terms_bar_vis("Policies and Rules", "policy_name.keyword")),
    "beta-security-files": ("Impacted Files", terms_bar_vis("Impacted Files", "file_path")),
    "beta-security-processes": ("Processes", terms_bar_vis("Processes", "process_name")),
    "beta-security-mitre": ("MITRE Techniques", terms_bar_vis("MITRE Techniques", "mitre_techniques")),
    "beta-security-stages": ("Pipeline Stages", terms_bar_vis("Pipeline Stages", "stage.keyword")),
    "beta-security-risk": ("Risk Tiers", terms_bar_vis("Risk Tiers", "risk_tier.keyword")),
    "beta-security-recent-threats": ("Recent Threats", table_vis("Recent Threats", "id.keyword")),
    "beta-security-execution-modes": ("Execution Modes", terms_bar_vis("Execution Modes", "execution_mode.keyword")),
    "beta-security-artifacts": ("Artifacts", terms_bar_vis("Artifacts", "artifact_name")),
    "beta-security-audit-entities": ("Audit Entities", terms_bar_vis("Audit Entities", "entity_type.keyword")),
    "beta-security-decisions": ("Decision IDs", table_vis("Decision IDs", "decision_id.keyword")),
    "beta-security-playbook-status": ("Playbook Status", terms_pie_vis("Playbook Status", "status.keyword")),
    "beta-security-control-actions": ("Control Actions", terms_bar_vis("Control Actions", "control_action.keyword")),
    "beta-security-manual-actions": ("Manual Actions", terms_bar_vis("Manual Actions", "manual_action.keyword")),
    "beta-security-operators": ("Operators", terms_bar_vis("Operators", "operator_id.keyword")),
    "beta-security-playbook-executions": ("Playbook Executions", table_vis("Playbook Executions", "playbook_execution_id.keyword")),
    "beta-security-mttr": ("Average MTTR (ms)", avg_metric_vis("Average MTTR (ms)", "mttr_ms")),
    "beta-security-response-duration": ("Average Response Duration (ms)", avg_metric_vis("Average Response Duration (ms)", "response_duration_ms")),
    "beta-security-forensic-buckets": ("Forensic Buckets", terms_bar_vis("Forensic Buckets", "storage_bucket.keyword")),
    "beta-security-retention-until": ("Retention Deadlines", table_vis("Retention Deadlines", "retention_until")),
    "beta-security-forensic-paths": ("Evidence Paths", table_vis("Evidence Paths", "forensic_path.keyword")),
    "beta-security-hunts": ("Hunt Campaigns", terms_bar_vis("Hunt Campaigns", "hunt_id.keyword")),
    "beta-security-ioc-types": ("IOC Types", terms_bar_vis("IOC Types", "ioc_type.keyword")),
    "beta-security-cti-feeds": ("CTI Feeds", terms_bar_vis("CTI Feeds", "cti_feed.keyword")),
    "beta-security-ioc-values": ("IOC Values", table_vis("IOC Values", "ioc_value.keyword")),
    "beta-security-integrations": ("Integration Types", terms_bar_vis("Integration Types", "integration_type.keyword")),
    "beta-security-forwarding-destinations": ("Forwarding Destinations", terms_bar_vis("Forwarding Destinations", "forwarding_destination.keyword")),
    "beta-security-jira-tickets": ("JIRA Tickets", table_vis("JIRA Tickets", "jira_ticket.keyword")),
    "beta-security-pagerduty-incidents": ("PagerDuty Incidents", table_vis("PagerDuty Incidents", "pagerduty_incident.keyword")),
    "beta-security-services": ("Services", terms_bar_vis("Services", "service_name.keyword")),
    "beta-security-health-status": ("Health Status", terms_pie_vis("Health Status", "health_status.keyword")),
    "beta-security-errors": ("Errors", terms_bar_vis("Errors", "error_type.keyword")),
    "beta-security-circuit-breakers": ("Circuit Breakers", terms_bar_vis("Circuit Breakers", "circuit_breaker_state.keyword")),
    "beta-security-consumer-groups": ("Consumer Groups", terms_bar_vis("Consumer Groups", "consumer_group.keyword")),
    "beta-security-retry-counts": ("Retry Counts", terms_bar_vis("Retry Counts", "retry_count")),
    "beta-security-config-versions": ("Config Versions", terms_bar_vis("Config Versions", "config_version.keyword")),
    "beta-security-validation-status": ("Validation Status", terms_pie_vis("Validation Status", "validation_status.keyword")),
    "beta-security-dry-run": ("Dry Run", terms_pie_vis("Dry Run", "dry_run")),
    "beta-security-simulations": ("Simulations", table_vis("Simulations", "simulation_id.keyword")),
    "beta-security-environments": ("Environments", terms_bar_vis("Environments", "environment.keyword")),
}


WAZUH_VISUALIZATIONS = {
    "beta-wazuh-total-alerts": ("Wazuh Alerts", metric_vis("Wazuh Alerts")),
    "beta-wazuh-timeline": ("Wazuh Alerts Over Time", date_histogram_vis("Wazuh Alerts Over Time", "@timestamp")),
    "beta-wazuh-rule-levels": ("Rule Levels", terms_bar_vis("Rule Levels", "rule.level")),
    "beta-wazuh-top-rules": ("Top Wazuh Rules", terms_bar_vis("Top Wazuh Rules", "rule.description", 12)),
    "beta-wazuh-top-agents": ("Top Agents", terms_bar_vis("Top Agents", "agent.name", 12)),
    "beta-wazuh-decoders": ("Decoders", terms_pie_vis("Decoders", "decoder.name", 10)),
    "beta-wazuh-groups": ("Rule Groups", terms_bar_vis("Rule Groups", "rule.groups", 14)),
    "beta-wazuh-mitre": ("MITRE Techniques", terms_bar_vis("MITRE Techniques", "rule.mitre.id", 12)),
    "beta-wazuh-pci": ("PCI DSS Controls", terms_bar_vis("PCI DSS Controls", "rule.pci_dss", 12)),
    "beta-wazuh-gdpr": ("GDPR Articles", terms_bar_vis("GDPR Articles", "rule.gdpr", 12)),
    "beta-wazuh-hipaa": ("HIPAA Controls", terms_bar_vis("HIPAA Controls", "rule.hipaa", 12)),
    "beta-wazuh-nist": ("NIST 800-53 Controls", terms_bar_vis("NIST 800-53 Controls", "rule.nist_800_53", 12)),
    "beta-wazuh-locations": ("Alert Locations", terms_bar_vis("Alert Locations", "location", 12)),
    "beta-wazuh-recent-alerts": ("Recent Wazuh Alerts", table_vis("Recent Wazuh Alerts", "rule.id", 20)),
}


DASHBOARDS = [
    ("siem-home", "SIEM Operations Home", WAZUH_BASE_QUERY, "wazuh_overview"),
    ("siem-overview", "SIEM Overview", WAZUH_BASE_QUERY, "wazuh_overview"),
    ("siem-config-assessment", "Configuration Assessment", "rule.groups:sca or rule.groups:rootcheck or rule.cis:*", "wazuh_compliance"),
    ("siem-malware", "Malware Detection", "rule.groups:malware or rule.groups:virus or data.YARA.rule_name:*", "wazuh_threat"),
    ("siem-fim", "File Integrity Monitoring", "rule.groups:syscheck or syscheck.path:*", "wazuh_threat"),
    ("siem-hunting", "Threat Hunting", "rule.level >= 10 or rule.mitre.id:* or data.srcip:* or data.dstip:*", "wazuh_threat"),
    ("siem-vuln-detect", "Vulnerability Detection", "rule.groups:\"vulnerability-detector\" or rule.cve:*", "wazuh_threat"),
    ("siem-mitre", "MITRE ATT&CK", "rule.mitre.id:* or rule.mitre.tactic:* or rule.mitre.technique:*", "wazuh_threat"),
    ("siem-hygiene", "IT Hygiene", "rule.groups:sca or rule.groups:rootcheck or rule.groups:syscollector", "wazuh_compliance"),
    ("siem-pci", "PCI DSS Compliance", "rule.pci_dss:*", "wazuh_compliance"),
    ("siem-gdpr", "GDPR Compliance", "rule.gdpr:*", "wazuh_compliance"),
    ("siem-hipaa", "HIPAA Compliance", "rule.hipaa:*", "wazuh_compliance"),
    ("siem-nist", "NIST 800-53", "rule.nist_800_53:*", "wazuh_compliance"),
    ("siem-docker", "Docker Security", "decoder.name:docker or rule.groups:docker", "wazuh_sources"),
    ("siem-aws", "AWS Security", "decoder.name:\"aws-cloudtrail\" or rule.groups:aws or data.aws.source:*", "wazuh_sources"),
    ("siem-gcp", "Google Cloud Security", "decoder.name:gcp or rule.groups:gcp", "wazuh_sources"),
    ("siem-azure", "Azure / M365 Security", "decoder.name:azure or rule.groups:azure or rule.groups:office365", "wazuh_sources"),
    ("siem-rules", "Ruleset", "rule.id:*", "wazuh_sources"),
    ("siem-decoders", "Decoders", "decoder.name:*", "wazuh_sources"),
    ("siem-logs", "System Logs", "full_log:* or message:*", "wazuh_overview"),
    ("ids-home", "IDS / IPS Home", "", "overview"),
    ("ids-traffic", "Traffic Overview", "source_ip:* or remote_ip:* or source_port:*", "overview"),
    ("ids-blocked-threats", "Blocked Threats", "status:* or threat_type:* or process_killed:true or quarantined:true", "response"),
    ("ids-intrusion-alerts", "Intrusion Alerts", "threat_type:* or severity:* or detection_method:*", "overview"),
    ("ids-signatures", "Signatures", "rule_id:* or detection_method:* or threat_type:*", "forensics"),
    ("ids-flows", "Network Flows", "flow_id:* or remote_ip:* or source_ip:*", "operations"),
    ("edr-home", "EDR Analysis", "event_kind:* or threat_type:* or action_name:* or policy_name:* or stage:*", "overview"),
    ("edr-endpoints", "Endpoint Status", "client_id:*", "overview"),
    ("edr-active-threats", "Active Threats", "severity >= 70", "overview"),
    ("edr-isolation", "Host Isolation", "stage:\"response\" or action_name:* or status:(started or success)", "response"),
    ("edr-contained-threats", "Contained Threats", "status:\"success\" or (stage:\"response\" and status:*)", "response"),
    ("edr-malware", "Malware Analysis", "file_hash:* or file_path:* or threat_type:process_execution", "forensics"),
    ("edr-hash-intelligence", "Hash Intelligence", "file_hash:*", "forensics"),
    ("edr-process-tree", "Process Tree", "process_name:* or command_line:* or file_path:*", "forensics"),
    ("edr-file-integrity", "File Integrity", "file_path:* or file_hash:*", "forensics"),
    ("edr-hunting", "Threat Hunting", "threat_type:* or process_name:* or command_line:* or remote_ip:* or source_ip:*", "forensics"),
    ("edr-response-center", "Response Center", "action_name:* or status:* or policy_name:* or message:*", "response"),
    ("edr-response-dashboard", "Response Dashboard", "playbook_execution_id:* or action_id:* or approval_id:* or action_name:* or status:* or mttr_ms:* or response_duration_ms:* or containment_duration_ms:*", "response_metrics"),
    ("edr-execution-control", "Execution Control", "playbook_execution_id:* or control_action:* or manual_action:* or cancellation_event:* or pause_requested:* or resume_requested:* or parameter_update:* or status:(running or in_progress or paused or cancelled or stopped)", "response_control"),
    ("edr-manual-operations", "Manual Operations", "manual_action:* or manual_execution:* or dry_run:false or elevated_privilege:* or control_action:(stop_execution or pause_execution or resume_execution or modify_parameters)", "response_control"),
    ("edr-response-metrics", "Response Metrics", "mttr_ms:* or response_duration_ms:* or containment_duration_ms:* or success_rate:* or action_name:* or policy_name:* or threat_type:* or status:*", "response_metrics"),
    ("edr-approval-queue", "Approval Queue", "approval_id:* or approval_request_id:* or approval_status:* or execution_mode:approval or status:(pending or approved or rejected or expired)", "approval_governance"),
    ("edr-graduated-response", "Graduated Response", "execution_mode:* or risk_tier:* or severity:* or policy_name:* or action_name:*", "approval_governance"),
    ("edr-safety-checks", "Safety Checks", "safety_check:* or safety_violation:* or whitelist_match:* or guardrail:* or skipped_reason:* or status:(safety_blocked or skipped)", "approval_governance"),
    ("edr-rate-limits", "Rate Limits", "cooldown:* or cooldown_until:* or rate_limit:* or queued_reason:* or max_executions:* or status:(queued or cooldown or rate_limited)", "approval_governance"),
    ("edr-soc-override", "SOC Override", "override_id:* or override_action:* or soc_override:* or manual_action:* or status:(stopped or modified or approved or rejected)", "audit_trail"),
    ("edr-rollback", "Rollback Actions", "rollback_action:* or rollback_id:* or action_name:(restore_file or unblock_ip or reenable_network) or status:(rollback_started or rollback_success or rollback_failed)", "response"),
    ("edr-playbook-automation", "Playbook Automation", "stage:\"playbook\" or policy_name:* or policy_id:*", "response"),
    ("edr-playbook-orchestration", "Playbook Orchestration", "playbook_id:* or playbook_name:* or playbook_execution_id:* or step_id:* or stage:(playbook or response) or action_name:* or policy_name:*", "playbook_control"),
    ("edr-playbook-templates", "Playbook Templates", "template_id:* or template_name:* or template_version:* or policy_name:* or policy_id:* or action_name:*", "playbook_control"),
    ("edr-detection-pipeline", "Detection Pipeline", "event_kind:* or winning_stage:* or winning_method:* or recommended_action:*", "operations"),
    ("edr-collected-artifacts", "Collected Artifacts", "artifact_name:* or flow_id:* or action_name:collect_forensics", "response"),
    ("edr-forensic-storage", "Forensic Storage", "artifact_name:* or forensic_path:* or evidence_path:* or storage_bucket:* or retention_until:* or action_name:collect_forensics", "forensic_storage"),
    ("edr-forensic-retention", "Forensic Retention", "forensic_path:* or evidence_path:* or storage_bucket:* or retention_until:* or sha256:* or checksum:* or encryption_algorithm:* or access_operation:* or export_target:*", "forensic_deep"),
    ("edr-enhanced-forensics", "Enhanced Forensics", "action_name:(collect_memory_dump or collect_process_tree or collect_network_pcap or collect_system_logs or collect_file_timeline) or collection_scope:* or archive_path:* or archive_sha256:* or size_bytes:* or size_limit_bytes:*", "forensic_deep"),
    ("edr-threat-hunting-campaigns", "Threat Hunting Campaigns", "hunt_id:* or campaign_id:* or ioc_type:* or ioc_value:* or file_hash:* or domain:* or process_name:* or registry_key:* or cti_feed:* or baseline_score:* or matched_endpoints:*", "threat_hunting"),
    ("edr-client-events", "Client Events", "client_id:* and (threat_type:* or event_kind:* or process_name:* or file_path:*)", "overview"),
    ("edr-server-events", "Server Events", "stage:* or status:* or message:* or policy_name:*", "overview"),
    ("edr-audit-trail", "Response Audit Trail", "stage:* or action:* or status:* or policy_name:* or entity_type:* or entity_id:* or decision_id:* or threat_event_id:*", "audit_trail"),
    ("edr-audit-compliance", "Audit Compliance", "audit_event_type:* or event_id:* or operator_id:* or reason:* or export_format:* or forwarding_destination:* or splunk_hec:* or syslog_server:* or retention_days:* or action_name:* or policy_name:*", "audit_trail"),
    ("edr-enterprise-integrations", "Enterprise Integrations", "integration_type:* or jira_ticket:* or servicenow_incident:* or slack_channel:* or email_recipient:* or pagerduty_incident:* or webhook_url:* or splunk_hec:* or syslog_server:* or forwarding_destination:*", "enterprise_integrations"),
    ("edr-platform-performance", "Platform Performance", "service_name:* or instance_id:* or consumer_group:* or events_processed:* or actions_generated:* or policy_evaluation_duration_ms:* or health_status:* or circuit_breaker_state:* or liveness:* or readiness:*", "platform_health"),
    ("edr-reliability", "Reliability and Errors", "error_type:* or retry_count:* or dlq_topic:* or dead_letter:* or timeout_event:* or kafka_status:* or velociraptor_api_status:* or replay_status:* or panic_recovered:* or status:(failed or timeout or retrying or dlq)", "platform_health"),
    ("edr-config-management", "Configuration Management", "config_version:* or config_change_id:* or validation_status:* or git_commit:* or environment:* or operator_id:* or secret_provider:* or hot_reload:* or policy_directory:*", "config_testing"),
    ("edr-testing-validation", "Testing and Validation", "dry_run:* or simulation_id:* or validation_status:* or artifact_validation:* or test_playbook:* or sample_event_id:* or policy_simulation:* or really_do_it:false or parameters.ReallyDoIt:false", "config_testing"),
    ("unified-home", "Unified Security Operations Center", WAZUH_BASE_QUERY, "wazuh_overview"),
    ("unified-overview", "Unified Security Overview", WAZUH_BASE_QUERY, "wazuh_overview"),
    ("unified-siem-events", "Unified Security Events", WAZUH_BASE_QUERY, "wazuh_overview"),
    ("unified-ids-alerts", "Unified Intrusion Alerts", "threat_type:* or severity:*", "overview"),
    ("unified-blocked-threats", "Unified Blocked Threats", "status:* or process_killed:true or quarantined:true", "response"),
    ("unified-containment-response", "Containment & Response", "action_name:* or (stage:\"response\" and status:*) or status:\"success\"", "response"),
    ("unified-response-dashboard", "Unified Response Dashboard", "playbook_execution_id:* or action_id:* or approval_id:* or action_name:* or status:* or mttr_ms:* or response_duration_ms:* or containment_duration_ms:*", "response_metrics"),
    ("unified-execution-control", "Unified Execution Control", "playbook_execution_id:* or control_action:* or manual_action:* or cancellation_event:* or pause_requested:* or resume_requested:* or parameter_update:* or status:(running or in_progress or paused or cancelled or stopped)", "response_control"),
    ("unified-manual-operations", "Unified Manual Operations", "manual_action:* or manual_execution:* or dry_run:false or elevated_privilege:* or control_action:(stop_execution or pause_execution or resume_execution or modify_parameters)", "response_control"),
    ("unified-response-metrics", "Unified Response Metrics", "mttr_ms:* or response_duration_ms:* or containment_duration_ms:* or success_rate:* or action_name:* or policy_name:* or threat_type:* or status:*", "response_metrics"),
    ("unified-response-governance", "Response Governance", "(approval_id:* or approval_request_id:* or approval_status:* or execution_mode:approval or status:(pending or approved or rejected or expired)) or (safety_check:* or safety_violation:* or whitelist_match:* or guardrail:* or skipped_reason:* or status:(safety_blocked or skipped)) or (cooldown:* or cooldown_until:* or rate_limit:* or queued_reason:* or max_executions:* or status:(queued or cooldown or rate_limited)) or (execution_mode:* or risk_tier:* or severity:* or policy_name:* or action_name:*)", "approval_governance"),
    ("unified-approval-queue", "Approval Queue", "approval_id:* or approval_request_id:* or approval_status:* or execution_mode:approval or status:(pending or approved or rejected or expired)", "approval_governance"),
    ("unified-graduated-response", "Graduated Response", "execution_mode:* or risk_tier:* or severity:* or policy_name:* or action_name:*", "approval_governance"),
    ("unified-safety-checks", "Safety Checks", "safety_check:* or safety_violation:* or whitelist_match:* or guardrail:* or skipped_reason:* or status:(safety_blocked or skipped)", "approval_governance"),
    ("unified-rate-limits", "Rate Limits", "cooldown:* or cooldown_until:* or rate_limit:* or queued_reason:* or max_executions:* or status:(queued or cooldown or rate_limited)", "approval_governance"),
    ("unified-soc-override", "SOC Override", "override_id:* or override_action:* or soc_override:* or manual_action:* or status:(stopped or modified or approved or rejected)", "audit_trail"),
    ("unified-rollback", "Rollback Actions", "rollback_action:* or rollback_id:* or action_name:(restore_file or unblock_ip or reenable_network) or status:(rollback_started or rollback_success or rollback_failed)", "response"),
    ("unified-automation-ops", "Automation Ops", "stage:\"playbook\" or policy_name:* or action_name:*", "response"),
    ("unified-playbook-ops", "Playbook Ops", "(playbook_id:* or playbook_name:* or playbook_execution_id:* or step_id:* or stage:(playbook or response) or action_name:* or policy_name:*) or (template_id:* or template_name:* or template_version:* or policy_name:* or policy_id:* or action_name:*)", "playbook_control"),
    ("unified-detection-health", "Detection Health", "event_kind:* or winning_stage:* or winning_method:* or recommended_action:*", "operations"),
    ("unified-collected-artifacts", "Collected Artifacts", "artifact_name:* or flow_id:* or action_name:collect_forensics", "response"),
    ("unified-forensic-storage", "Forensic Storage", "artifact_name:* or forensic_path:* or evidence_path:* or storage_bucket:* or retention_until:* or action_name:collect_forensics", "forensic_storage"),
    ("unified-forensic-retention", "Unified Forensic Retention", "forensic_path:* or evidence_path:* or storage_bucket:* or retention_until:* or sha256:* or checksum:* or encryption_algorithm:* or access_operation:* or export_target:*", "forensic_deep"),
    ("unified-enhanced-forensics", "Unified Enhanced Forensics", "action_name:(collect_memory_dump or collect_process_tree or collect_network_pcap or collect_system_logs or collect_file_timeline) or collection_scope:* or archive_path:* or archive_sha256:* or size_bytes:* or size_limit_bytes:*", "forensic_deep"),
    ("unified-threat-hunting-campaigns", "Unified Threat Hunting Campaigns", "hunt_id:* or campaign_id:* or ioc_type:* or ioc_value:* or file_hash:* or domain:* or process_name:* or registry_key:* or cti_feed:* or baseline_score:* or matched_endpoints:*", "threat_hunting"),
    ("unified-client-events", "Client Events", "client_id:* and (threat_type:* or event_kind:* or process_name:* or file_path:*)", "overview"),
    ("unified-server-events", "Server Events", "stage:* or status:* or message:* or policy_name:*", "overview"),
    ("unified-incident-timeline", "Incident Timeline", "rule.id:* or id:* or rule.description:*", "wazuh_threat"),
    ("unified-mitre", "Unified MITRE ATT&CK", "rule.mitre.id:* or rule.mitre.tactic:* or rule.mitre.technique:*", "wazuh_threat"),
    ("unified-audit-trail", "Response Audit Trail", "stage:* or action:* or status:* or policy_name:* or entity_type:* or entity_id:* or decision_id:* or threat_event_id:*", "audit_trail"),
    ("unified-audit-compliance", "Unified Audit Compliance", "audit_event_type:* or event_id:* or operator_id:* or reason:* or export_format:* or forwarding_destination:* or splunk_hec:* or syslog_server:* or retention_days:* or action_name:* or policy_name:*", "audit_trail"),
    ("unified-enterprise-integrations", "Unified Enterprise Integrations", "integration_type:* or jira_ticket:* or servicenow_incident:* or slack_channel:* or email_recipient:* or pagerduty_incident:* or webhook_url:* or splunk_hec:* or syslog_server:* or forwarding_destination:*", "enterprise_integrations"),
    ("unified-platform-performance", "Unified Platform Performance", "service_name:* or instance_id:* or consumer_group:* or events_processed:* or actions_generated:* or policy_evaluation_duration_ms:* or health_status:* or circuit_breaker_state:* or liveness:* or readiness:*", "platform_health"),
    ("unified-reliability", "Unified Reliability and Errors", "error_type:* or retry_count:* or dlq_topic:* or dead_letter:* or timeout_event:* or kafka_status:* or velociraptor_api_status:* or replay_status:* or panic_recovered:* or status:(failed or timeout or retrying or dlq)", "platform_health"),
    ("unified-config-management", "Unified Configuration Management", "config_version:* or config_change_id:* or validation_status:* or git_commit:* or environment:* or operator_id:* or secret_provider:* or hot_reload:* or policy_directory:*", "config_testing"),
    ("unified-testing-validation", "Unified Testing and Validation", "dry_run:* or simulation_id:* or validation_status:* or artifact_validation:* or test_playbook:* or sample_event_id:* or policy_simulation:* or really_do_it:false or parameters.ReallyDoIt:false", "config_testing"),
    ("unified-pci", "Unified PCI DSS", "rule.pci_dss:*", "wazuh_compliance"),
    ("unified-gdpr", "Unified GDPR", "rule.gdpr:*", "wazuh_compliance"),
]


def main():
    print(f"deploying saved objects to {DASHBOARDS_URL}")
    ensure_saved_objects_index_mapping()
    ensure_wazuh_bootstrap_index()

    existing_data_views = {
        item.get("attributes", {}).get("title"): item
        for item in find_saved_objects("index-pattern")
        if item.get("attributes", {}).get("title")
    }

    edr_data_view_id = ensure_data_view(existing_data_views, "beta-edr-events", "edr*", "indexed_at")
    wazuh_fields = wazuh_fields_from_field_caps()
    wazuh_data_view_id = upsert_data_view_id(DEFAULT_DATA_VIEW_ID, WAZUH_INDEX_PATTERN, "@timestamp", wazuh_fields)
    ensure_data_view(existing_data_views, "beta-wazuh-alerts", WAZUH_INDEX_PATTERN, "@timestamp", wazuh_fields)
    ensure_data_view(existing_data_views, "beta-wazuh-events", "wazuh-*", "@timestamp", wazuh_fields)
    ensure_data_view(existing_data_views, "beta-security-logs", "logs-*", "timestamp")
    ensure_data_view(existing_data_views, "beta-tenant-logs", "logs-tenant-*", "timestamp")
    ensure_data_view(existing_data_views, "beta-siem-tenant", "tenant-*-siem*", "indexed_at")
    ensure_data_view(existing_data_views, "beta-edr-detections", "edr-detections-*", "indexed_at")
    ensure_default_index(DEFAULT_DATA_VIEW_ID)

    for vis_id, (title, vis_state) in VISUALIZATIONS.items():
        attributes, references = visualization_attributes(title, vis_state, edr_data_view_id)
        create_saved_object("visualization", vis_id, attributes, references)
        print(f"upserted visualization: {vis_id}")

    for vis_id, (title, vis_state) in WAZUH_VISUALIZATIONS.items():
        attributes, references = visualization_attributes(title, vis_state, wazuh_data_view_id)
        create_saved_object("visualization", vis_id, attributes, references)
        print(f"upserted visualization: {vis_id}")

    for dashboard_id, title, query, panel_group in DASHBOARDS:
        attributes, references = dashboard_attributes(
            title,
            f"BETA security dashboard for {title}.",
            query,
            PANELS[panel_group],
        )
        create_saved_object("dashboard", dashboard_id, attributes, references)
        print(f"upserted dashboard: {dashboard_id}")

    print(f"complete: {len(VISUALIZATIONS) + len(WAZUH_VISUALIZATIONS)} visualizations, {len(DASHBOARDS)} dashboards")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"deployment failed: {exc}", file=sys.stderr)
        sys.exit(1)
