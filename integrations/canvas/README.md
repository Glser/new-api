# Canvas Seedance task plugin

Uploaded plugin for the Canvas OpenAPI 1.0.0 specification supplied on
2026-10-26. Supports public `seedance-2.5` mapped to upstream `sd2.5-qd`
through a type-61 Task Plugin channel bound to
`canvas`, with Base URL `https://canvas.yydsapi.uno/api/v1/prot`.

The channel was initially installed disabled and unpriced, then configured
with fixed per-output-second prices. The latest readback shows the user has
enabled channel 79 and set group `Seedance-QT` to multiplier **0.7**. Plugin
1.0.1 has been reactivated to restore 480p, preserving that channel state and
group multiplier.
No upstream model-list, quote, generation, query, download, or
connectivity requests were made during these configuration operations. The supplied Canvas key
is stored in the channel, not in this directory.

## Workflow

1. The submit hook requests `/quotes`. After it succeeds, New API persists a
   local workflow with the exact input, quote ID, and a stable request ID.
2. The first background poll sends `/generate`. Every replay uses those same
   values, including when the previous submission result is uncertain. The
   plugin never automatically gets a new quote for an uncertain generation.
3. The returned generation ID is saved in private plugin state. Subsequent
   polls request `/query/{id}`.
4. A task completes only when generation succeeded, billing was captured and
   at least one video asset is ready. Downloads use the authenticated
   `/assets/{assetId}/content` endpoint on the configured channel host.

Provider IDs stay in private state. Clients use the stable New API task ID.
New API pins the channel key for subsequent polling and artifact downloads.

The existing host polling failure limit and task timeout still apply. An
unresolved provider charge or failed asset ingestion needs operator attention
before that timeout; the plugin does not invoke `/reconcile` or start a new
generation automatically.

## Client requests

Standard video protocol:

```http
POST /v1/videos
Authorization: Bearer <New API relay key for Seedance-QT>
Content-Type: application/json

{
  "model": "seedance-2.5",
  "prompt": "清晨森林中，阳光穿过树叶，镜头缓缓前行",
  "seconds": 4,
  "metadata": {
    "params": {"aspectRatio": "16:9", "resolution": "720p"},
    "references": {}
  }
}
```

Retrieve through `GET /v1/videos/{id}` and download through
`GET /v1/videos/{id}/content`, using the same New API relay key.

The native plugin route accepts the original generation input without a
client-supplied quote or request ID; the plugin handles those internally:

```http
POST /canvas/api/v1/prot/generate
Authorization: Bearer <New API relay key for the video group>
Content-Type: application/json

{
  "modelId": "seedance-2.5",
  "prompt": "清晨森林中，阳光穿过树叶，镜头缓缓前行",
  "params": {"aspectRatio": "16:9", "duration": 4, "resolution": "720p"},
  "references": {}
}
```

Query it through `GET /canvas/api/v1/prot/query/{id}`. Generic task and
artifact management is also available at `/v1/tasks/{id}` and
`/v1/tasks/{id}/artifacts`.

Reference inputs must be **already uploaded Canvas asset IDs**, supplied in
`references.image`, `.video`, `.audio` or named `referenceFields` arrays.
Automatic local-file/URL uploads and `/v1/responses` are not implemented.
OpenAI file attachments and URL reference fields are rejected explicitly.

Defaults are 4 seconds, 720p and 16:9, following the user's supplied example.
Actual model availability, supported parameter combinations, prices and key
permissions have not been checked against the upstream service.

## Pricing

Both `seedance-2.5` and the retained `sd2.5-qd` name use the same task usage
expression, based on `seconds` and `resolution`:

| Resolution | CNY per output second |
| --- | ---: |
| 480p | 0.67 |
| 720p | 1.51 |
| 1080p | 3.74 |

These are rounded fixed rates converted from the official 16:9, no-input-video
examples discussed with the user. They are **not exact official token billing**.
References do not add an input-duration charge or change this output-second
tariff. Canvas upstream charges remain independent. Unpriced resolutions such
as `4k` are rejected before quoting. The usage schema and public price expression
contain 480p, 720p and 1080p; an omitted resolution defaults to 720p.

The site currently displays CNY with `USDExchangeRate=1` and
`QuotaPerUnit=500000`, so one CNY maps to 500000 quota. Task expressions return
the host's internal currency amount; coefficients must be converted if the
site's exchange setting changes. Group `Seedance-QT` currently has multiplier
0.7, giving effective prices of CNY 0.469/second for 480p, 1.057/second for 720p
and 2.618/second for 1080p before any user-specific group override.
Canvas decimal currency amounts are not treated as USD or Ark tokens.

The original `apply_pricing.py` created a protected backup, registered plugin 1.0.1, validated
and saves both model prices through the management API, merges the new group
into existing options, updates channel 79, and verifies the disabled abilities,
credentials, zero new tasks, runtime health and unchanged container start time.
It refuses pre-existing prices/groups rather than overwriting later changes.
`remove_480p.py` registers plugin 1.0.2 with the narrowed resolution schema,
validates and saves both model expressions with version conflict checks, and
verifies that channel configuration and group settings are preserved. It takes
a protected snapshot before updating and does not invoke upstream endpoints.
`inspect_pricing.py` reads back configuration without contacting Canvas.
`add_480p_pricing.py` restored the 480p price branch for both model names.
`restore_plugin.py` then reactivated the installed plugin 1.0.1 after offline
validation, preserving pricing, channel settings and group multipliers.
The server receipt is `/opt/new-api/integrations/canvas/pricing-config.json`.
The current plugin restoration receipt is
`/opt/new-api/integrations/canvas/plugin-restore.json`.

## Offline verification and deployment

These commands compile and replay descriptors without executing HTTP:

```sh
new-api plugin lint plugin.js
new-api plugin test plugin.js --fixture fixtures.json
```

The 47 offline fixtures cover quote expiration, exact submission replay, task state
transitions, uncertain billing, uploaded reference IDs, authenticated downloads
and public response rendering, the `seedance-2.5` mapping, fractional seconds,
480p quote construction, billing facts, native/OpenAI video decoding, and
rejection of unpriced 4K. They use dummy credentials only.

`deploy.py` is tailored to the existing Australian Docker deployment. It
reads the Canvas key from stdin, authenticates to the local management API
using the existing root management token, snapshots configuration before
changes, uploads the plugin, creates a disabled channel with auto-ban/testing
and model update checks disabled, and verifies saved configuration. This original
installer never calls the upstream API or changes prices. A second install stops when an
existing Canvas channel is found instead of creating duplicates.
