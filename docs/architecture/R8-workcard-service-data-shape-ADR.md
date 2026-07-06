# ADR: R8 workCardService data shape and read contract

Status: Proposed for R8 implementation
Date: 2026-07-03
Owner: Atlas, Tier-3 Architecture Specialist
Work card: R8-WORKCARD-FEED

## Decision

Stronghold will add a read-only `workCardService` that treats Chris-authored markdown work cards in `%LOCALAPPDATA%/hermes/agent-army/work-cards/*.md` as the source of truth for the R8 Work Card Feed.

The service must parse YAML frontmatter, map work-card lifecycle values into the existing Stronghold Mission status vocabulary, and expose the result through `GET /api/workcards` as `WorkCard[]`.

No write-back, status mutation, card creation, or syncing into mission JSON storage is included in R8.

## Existing files verified

- Existing client Mission type: `src/types.ts`, lines 50-58.
  - `Mission.status` is currently `'planned' | 'active' | 'blocked' | 'review' | 'complete'`.
- Existing shared/server Mission type: `shared/types.ts`, lines 1 and 10-22.
  - `MissionStatus` includes an extra `'cancelled'` value.
- Existing mission JSON service: `server/services/missionService.ts`.
  - It imports `Mission` from `../../shared/types` and reads/writes JSON through `readJsonArray` and `atomicWriteJson`.
- Dependency check:
  - `package.json` does not list `js-yaml` or `yaml` in `dependencies` or `devDependencies`.
  - `npm ls js-yaml --depth=5` returned empty.
  - `npm ls yaml --depth=5` returned empty.
  - `package-lock.json` references `yaml` only as an optional peer under Vite metadata, not as an installed project dependency.

## Data shape

R8's parsed `WorkCard` shape is independent from `Mission`, but its `status` field must use the same status vocabulary as the current client `Mission.status` in `src/types.ts`.

Exact TypeScript contract for implementers:

```ts
import type { Mission } from '../../src/types';

export type WorkCardRisk = 'GREEN' | 'YELLOW' | 'RED';

export type WorkCardStatus = Mission['status'];

export type WorkCard = {
  workCardId: string;
  project: string;
  risk: WorkCardRisk;
  owner: string;
  qc: string;
  created: string;
  status: WorkCardStatus;
  schedule?: string;
  mode?: string;
  title: string;
  filePath: string;
  lastUpdated: string;
};
```

Field meanings:

- `workCardId`: required. Source frontmatter key: `work_card_id`. Example: `R8-WORKCARD-FEED`.
- `project`: required. Source frontmatter key: `project`. Example: `stronghold`.
- `risk`: required. Source frontmatter key: `risk`. Accepted values: `GREEN`, `YELLOW`, `RED`.
- `owner`: required. Source frontmatter key: `owner`. Preserve the authored string; do not split by agent names in R8.
- `qc`: required. Source frontmatter key: `qc`. Preserve the authored string.
- `created`: required. Source frontmatter key: `created`. Return a string, normalized to ISO date format when the parsed value is a date-like YAML value.
- `status`: required. Derived by mapping source work-card `status` into the current client Mission status vocabulary.
- `schedule`: optional. Source frontmatter key: `schedule`. Preserve as string if present.
- `mode`: optional. Source frontmatter key: `mode`. Preserve as string if present. R8 should not over-constrain this because R7 scheduler semantics are not final.
- `title`: required. Source frontmatter key: `title`. If missing, parser should reject/filter the file rather than infer a title from markdown body in R8.
- `filePath`: required. Absolute path to the markdown file used to build the card. This supports debugging and test assertions; do not expose write controls from it.
- `lastUpdated`: required. ISO timestamp from the source file's filesystem `mtime`.

Strict TypeScript requirements:

- No `any`.
- Treat YAML parse output as `unknown`, then narrow through explicit runtime validation.
- Do not silently coerce missing required fields into empty strings.
- Invalid files are filtered out with a logged warning or structured diagnostic path, not included as partial cards.

## Status mapping

The work-card source status is not the API status. The API status is mapped to existing `Mission.status` values.

| Work-card frontmatter status | API `WorkCard.status` / Mission status | Notes |
| --- | --- | --- |
| `ready` | `planned` | Ready to start but not actively in progress. |
| `in_progress` | `active` | Work is currently underway. |
| `blocked` | `blocked` | Waiting on a blocker or decision. |
| `review` | `review` | Ready for QC/review. |
| `complete` | `complete` | Finished. |

Unknown source status values must cause that file to be filtered out with diagnostics. Do not default unknown values to `planned`; that would hide authoring mistakes.

## Parser contract

Input:

- Default directory: `%LOCALAPPDATA%/hermes/agent-army/work-cards/` (Windows primary).
- File glob: `*.md` only.
- Files are the markdown work-card files Chris writes.

Output:

- `WorkCard[]`.
- Sorted deterministically for stable UI and tests. Recommended order: newest `lastUpdated` first, then `workCardId` ascending as a tie-breaker.

Frontmatter extraction:

- Only parse files beginning with YAML frontmatter bounded by `---` on its own line.
- Recommended extraction regex shape: match a leading frontmatter block only, not arbitrary `---` later in the document.
- Files without frontmatter are filtered out and must not crash the service.
- Files with malformed YAML are filtered out and must not crash the service.
- YAML comments must be allowed.

YAML parsing approach:

- Preferred parser: `js-yaml`, because YAML frontmatter should be parsed by a real YAML parser rather than regex field extraction.
- Current blocker: `js-yaml` is not available in project npm dependencies. Forge/Igris need either:
  - approval to add `js-yaml` plus its types if needed, or
  - approval to use another already-approved YAML parser after dependency review.
- Do not implement regex-only key/value parsing as the R8 parser; it is too brittle for comments, quoted strings, dates, colons, and multiline values.

Validation and narrowing:

- Parse YAML into `unknown`.
- Narrow to a record-like structure without `any`, e.g. by checking object-ness and using `Record<string, unknown>`.
- Validate every required field explicitly.
- Normalize YAML date values to strings for `created`.
- Normalize `lastUpdated` from `fs.stat().mtime` to ISO string.
- Preserve authored text for `owner`, `qc`, `schedule`, and `mode` after trimming leading/trailing whitespace.

Cache invalidation:

- Cache parsed output for 30 seconds.
- Cache key must include the resolved work-card directory.
- Cache must be invalidated early when the file set or file mtimes change.
- Recommended cache fingerprint: sorted list of `filename:absolute-or-resolved-path:mtimeMs:size` for all `*.md` files in the selected directory.
- If fingerprint changes, re-parse immediately even if TTL has not expired.
- If fingerprint is unchanged and cache age is under 30 seconds, return cached `WorkCard[]`.

Error behavior:

- Directory missing: return `[]`, do not crash.
- Empty directory: return `[]`.
- Individual bad file: filter that file and continue.
- Filesystem-level read errors: skip unreadable file and continue unless the whole directory cannot be read, in which case return `[]` with a diagnostic.

## API contract

Endpoint:

```http
GET /api/workcards
```

Response:

```ts
WorkCard[]
```

Behavior:

- Returns the parsed cards from the active work-card directory.
- Uses the same 30 second service cache described above.
- No request body.
- Read-only.
- No mutation side effects.

Testing override header:

- Header name: `X-Work-Card-Dir`.
- Honored only when the server is not running in production.
- In production, the header must be ignored and the default work-card directory must be used.
- The header value must resolve to a filesystem directory path. Do not accept URL-like values.
- The resolved directory must be used only for reading `*.md` files; no write behavior exists in R8.

CORS implications:

- `X-Work-Card-Dir` is a non-safelisted request header, so browser calls that include it trigger a CORS preflight.
- Production should not expose or rely on this header.
- If existing CORS handling has an allowlist, `X-Work-Card-Dir` should be allowed only in non-production test/dev configuration.
- Do not loosen production CORS to support this endpoint. The endpoint reads local filesystem paths, so origin policy should stay narrow and same-origin-oriented.
- The frontend should not send `X-Work-Card-Dir` in normal runtime. It is for tests and controlled development only.

## Rejected alternatives

1. Write-back in v1

Rejected for R8. Updating frontmatter, creating work cards, or mutating status from Stronghold introduces concurrency, authorization, audit, and source-control questions. R8 is read-only to close dashboard/source-of-truth drift safely.

2. Reading existing `missionService` JSON

Rejected because `server/services/missionService.ts` reads/writes Stronghold mission JSON through `readJsonArray` and `atomicWriteJson`. R8's problem statement says those JSON stores drift from Chris-authored work-card files. Reading them would preserve the drift rather than fixing it.

3. Regex-only frontmatter parsing

Rejected because YAML frontmatter can include comments, quoted scalars, dates, colons in strings, and future multiline values. Regex may be used only to extract the bounded frontmatter block; YAML content must be parsed by a YAML parser.

4. Extending `Mission` directly for R8 API output

Rejected for the API output because `WorkCard` has work-card-specific fields (`workCardId`, `risk`, `qc`, `filePath`, `lastUpdated`) and because `Mission` definitions already differ between `src/types.ts` and `shared/types.ts`. The Work Card Feed should define a focused DTO and map only status vocabulary to Mission status.

## Open questions

1. Dependency call: R8 asks to recommend `js-yaml`, but `js-yaml` is not currently installed. Should Forge add `js-yaml` and, if needed, type declarations, or should Igris approve a different YAML parser dependency?
2. Mission type source of truth: `src/types.ts` defines Mission status as `planned|active|blocked|review|complete`, while `shared/types.ts` adds `cancelled`. Should R8 import from the client type as requested, or should the project consolidate WorkCard/Mission DTOs under `shared/types.ts` first?
3. `mode` enum: R8's scope text says `mode?: 'cloud'|'local'`, but the sample card uses `mode: cloud # dispatch specialist work, not local-draft` and future R7 scheduler semantics are not final. Should `mode` be constrained now or kept as a string in R8?
4. Invalid-card observability: Should filtered files be exposed only in server logs, or should `/api/workcards` eventually include diagnostics for skipped malformed cards? R8's requested response shape is only `WorkCard[]`, so this ADR keeps diagnostics out of the response.
5. File path exposure: `filePath` is required by this dispatch, but it exposes absolute local paths in the API response. Is that acceptable for local-only Stronghold, or should production redact/relativize it in a later security pass?
6. Non-prod definition: Should `X-Work-Card-Dir` be gated by `process.env.NODE_ENV !== 'production'`, a Stronghold-specific env var, or both?

## R8-scope contradictions discovered

- The dispatch asks to recommend `js-yaml` and verify it is available in npm dependencies; verification showed `js-yaml` is not available.
- The R8 work card's constraints mention `yaml`/`js-yaml`, but neither package is installed as a project dependency.
- Existing Mission status differs between client and shared/server types: `src/types.ts` excludes `cancelled`; `shared/types.ts` includes `cancelled`.
- The R8 scope text says `mode?: 'cloud'|'local'`, while the broader scheduler dependency is not final. This ADR keeps `mode?: string` unless Igris chooses to freeze the enum for R8.

## Implementation notes for Forge, Clix, and Pulse

- Forge owns `server/services/workCardService.ts` and endpoint integration after this ADR.
- Clix owns UI rendering against `WorkCard[]` and should not send `X-Work-Card-Dir` in normal browser runtime.
- Pulse should test missing frontmatter, malformed YAML, unknown status, mtime invalidation, empty directory, and non-prod header override.
- Sentinel/Tusk should review path exposure and non-prod header gating before final acceptance.
