# Story 1.4: URL Validation and Normalization Service

Status: ready-for-dev

## Story

As a developer,
I want submitted URLs validated for structure and normalized for duplicate detection,
So that only valid URLs are persisted and duplicate destinations return existing short codes.

## Acceptance Criteria

1. **Given** a URL is submitted to the validation service **When** the URL has a valid `http` or `https` scheme and valid structure **Then** validation passes and the URL proceeds to normalization
2. **Given** a URL is submitted with an invalid scheme (`ftp`, `javascript`, data URIs, etc.) or malformed structure **When** validation runs **Then** a structured validation error is returned with code `"VALIDATION_ERROR"` following the format: `{ "error": { "code": "VALIDATION_ERROR", "message": string, "details": object } }`
3. **Given** a valid URL is submitted **When** normalization runs **Then** the URL is canonicalized: lowercasing scheme and host, removing default ports (80 for http, 443 for https), sorting query parameters alphabetically, removing trailing slashes from the path, and removing fragment identifiers
4. **Given** a URL is submitted that normalizes to match an existing stored `normalized_url` **When** the shorten service processes the request **Then** the existing short code is returned instead of creating a new one (this is verified in Story 1.5 integration, but normalization logic must support it)
5. **Given** the services **When** unit tests are run **Then** tests cover valid URLs, invalid schemes, malformed URLs, empty/missing input, and normalization edge cases (default ports, trailing slashes, query sorting, mixed-case hosts, fragment removal)

## Tasks / Subtasks

- [ ] Task 1: Create URL validation service (AC: #1, #2)
  - [ ] Create `src/services/url-validation-service.ts`
  - [ ] Implement `validateUrl(url: string): { valid: true, url: URL } | { valid: false, error: string }` using Node.js built-in `URL` constructor for parsing
  - [ ] Accept only `http:` and `https:` schemes
  - [ ] Reject empty strings, non-string input, and unparseable URLs
  - [ ] Return descriptive error messages for each failure mode
- [ ] Task 2: Create URL normalization service (AC: #3)
  - [ ] Create `src/services/normalize-url-service.ts`
  - [ ] Implement `normalizeUrl(url: URL): string` that takes a parsed URL object and returns the canonical string
  - [ ] Lowercase scheme and host
  - [ ] Remove default ports (80 for http, 443 for https)
  - [ ] Sort query parameters alphabetically by key
  - [ ] Remove trailing slashes from path (except root `/`)
  - [ ] Remove fragment/hash identifiers
  - [ ] Decode and re-encode path for consistent percent-encoding
- [ ] Task 3: Add validation error class (AC: #2)
  - [ ] Add `UrlValidationError` to `src/lib/errors.ts`
  - [ ] Follow the existing `ShortCodeCollisionError` pattern (extend `Error`, set `readonly name`)
  - [ ] Include an optional `details` field for structured error information
- [ ] Task 4: Write unit tests for validation (AC: #5)
  - [ ] Create `tests/unit/url-validation-service.test.ts`
  - [ ] Test: valid `http://` and `https://` URLs pass validation
  - [ ] Test: URLs with paths, query params, and fragments pass validation
  - [ ] Test: `ftp://`, `javascript:`, `data:`, `file://`, and other non-http schemes are rejected
  - [ ] Test: empty string, whitespace-only, and non-URL strings are rejected
  - [ ] Test: malformed URLs (missing host, double slashes, etc.) are rejected
  - [ ] Test: returned error messages are descriptive
- [ ] Task 5: Write unit tests for normalization (AC: #5)
  - [ ] Create `tests/unit/normalize-url-service.test.ts`
  - [ ] Test: scheme is lowercased (`HTTP://` -> `http://`)
  - [ ] Test: host is lowercased (`Example.COM` -> `example.com`)
  - [ ] Test: default port 80 removed for http, port 443 removed for https
  - [ ] Test: non-default ports are preserved
  - [ ] Test: query parameters sorted alphabetically (`?z=1&a=2` -> `?a=2&z=1`)
  - [ ] Test: trailing slashes removed from paths (`/path/` -> `/path`)
  - [ ] Test: root path `/` preserved (does not become empty)
  - [ ] Test: fragment/hash identifiers removed
  - [ ] Test: equivalent URLs produce identical normalized output
  - [ ] Test: URLs with no query params or path work correctly
- [ ] Task 6: Verify build and existing tests still pass
  - [ ] Run `npm run typecheck`, `npm run build`, `npm test`, `npm run lint`

## Dev Notes

### Architecture Compliance

- **File locations**: `src/services/url-validation-service.ts` and `src/services/normalize-url-service.ts` — per architecture project structure
- **Service boundary**: These are pure functions. They do NOT import HTTP/Fastify, route modules, or the database client. They receive input and return results.
- **Data flow**: `Route → shorten-url-service → [validate → normalize → repository.findByNormalizedUrl → generate → repository.insert] → Response`. This story implements the validate and normalize steps. Story 1.5 wires them into the orchestration service.
- **Error handling**: `UrlValidationError` goes in `src/lib/errors.ts` alongside the existing `ShortCodeCollisionError`. The central error handler (Story 1.5) will map it to HTTP 400 with `"VALIDATION_ERROR"` code.
- **Separation of concerns**: Validation and normalization are separate functions in separate files per the architecture (`url-validation-service.ts` for validation, `normalize-url-service.ts` for normalization). Do NOT combine them into one file.

### Technical Requirements

- **URL parsing**: Use Node.js built-in `URL` constructor (`new URL(input)`) — do NOT use external URL parsing libraries
- **Allowed schemes**: Only `http:` and `https:` — reject all others including `ftp:`, `javascript:`, `data:`, `file:`, `mailto:`
- **Normalization rules** (canonicalize for consistent duplicate detection):
  1. Lowercase the scheme: `HTTP://` -> `http://`
  2. Lowercase the hostname: `Example.COM` -> `example.com`
  3. Remove default ports: `:80` for http, `:443` for https — leave non-default ports intact
  4. Sort query parameters alphabetically by key name
  5. Remove trailing slashes from the path (except when path is just `/`)
  6. Remove fragment/hash (`#section`) — fragments are client-side only
  7. Re-construct URL string from normalized parts
- **Return types**:
  - `validateUrl` returns a discriminated union: `{ valid: true, url: URL }` on success, `{ valid: false, error: string }` on failure
  - `normalizeUrl` returns a `string` (the normalized URL)
- **Module system**: ESM — use `import` statements, `.js` extensions in local imports
- **Naming conventions**:
  - Files: kebab-case (`url-validation-service.ts`, `normalize-url-service.ts`)
  - Functions: camelCase (`validateUrl`, `normalizeUrl`)
  - Types: PascalCase (`UrlValidationResult`, `UrlValidationError`)
  - Error class: `UrlValidationError` in `src/lib/errors.ts`

### Anti-Pattern Prevention

- **Do NOT** use external URL parsing/validation libraries (e.g., `valid-url`, `normalize-url` npm package, `is-url`). Use the built-in `URL` constructor which is standard and sufficient.
- **Do NOT** import the repository or database client — this service is pure. Duplicate detection (using `repository.findByNormalizedUrl`) is wired in `shorten-url-service.ts` (Story 1.5), not here.
- **Do NOT** create Fastify plugins for these services — they are pure functions called by the orchestration service.
- **Do NOT** create Zod schemas for URL validation in this story — Zod request body schemas are part of Story 1.5 (POST /shorten endpoint). This story validates the URL string itself using the URL API.
- **Do NOT** combine validation and normalization into a single function — keep them separate per architecture. Validation checks if the URL is valid; normalization canonicalizes a valid URL.
- **Do NOT** modify the `original_url` during normalization — the original submitted URL is preserved as-is. Only the `normalized_url` field uses the canonicalized version for duplicate detection.
- **Do NOT** throw exceptions from `validateUrl` — return the discriminated union. The calling service (Story 1.5) decides whether to throw a `UrlValidationError` based on the result.

### Previous Story Intelligence

**Story 1.1 (done):**
- Module system: ESM with `.js` extensions in imports (NodeNext module resolution)
- Config: `loadConfig()` returns typed `AppConfig` — not directly relevant but shows the pattern
- Test pattern: Vitest in `tests/unit/`, standard `describe/it/expect`
- Build verification: `npm run typecheck`, `npm run build`, `npm test`, `npm run lint`
- Code review feedback: redundant deps, missing tests, inconsistent type refs — ensure thorough test coverage

**Story 1.2 (done):**
- Repository exposes `findByNormalizedUrl(normalizedUrl: string): ShortUrlRecord | null` — this is the method that consumes the output of `normalizeUrl`
- `ShortUrlRecord` has `normalizedUrl` field (camelCase) mapping to `normalized_url` column (snake_case)
- `ShortUrlInsert` requires `{ shortCode, originalUrl, normalizedUrl }` — both original and normalized URLs are stored
- Code review noted: `mapShortUrlRecord` is identity mapping since Drizzle returns camelCase already, and there's a redundant index on `short_code`
- All repository tests use temp SQLite databases for isolation

**Story 1.3 (ready-for-dev):**
- `src/services/generate-short-code-service.ts` exists — uses dependency injection pattern (`existsFn` callback) for testability. Follow this same pattern of pure functions with injected dependencies.
- `src/lib/errors.ts` exists with `ShortCodeCollisionError` — add `UrlValidationError` here following the same class pattern
- Error pattern: `extends Error`, `readonly name = 'ClassName'`, default error message in constructor

### Git Intelligence

Recent commits:
- `9e6bc6a` [BMAD] code-review complete
- `6a59d04` [BMAD] Code review fixes for Story 1.2
- `545de47` [BMAD Phase 4] Story 1.2 complete
- `0078f67` [BMAD Phase 4] Story 1.1: Initialize Fastify TypeScript Project

Current source files in `src/services/`:
- `generate-short-code-service.ts` (from Story 1.3, status: ready-for-dev — may or may not be committed yet)

Current source files in `src/lib/`:
- `errors.ts` (contains `ShortCodeCollisionError`)

Empty directories (`.gitkeep` only):
- `src/routes/`
- `src/schemas/`

### File Structure (files to create/modify)

```
simple-url-shortener-api/
├── src/
│   ├── services/
│   │   ├── url-validation-service.ts      (create)
│   │   └── normalize-url-service.ts       (create)
│   └── lib/
│       └── errors.ts                      (modify — add UrlValidationError)
├── tests/
│   └── unit/
│       ├── url-validation-service.test.ts (create)
│       └── normalize-url-service.test.ts  (create)
```

### Testing Standards

- **Framework**: Vitest `4.1.0`
- **Location**: `tests/unit/url-validation-service.test.ts` and `tests/unit/normalize-url-service.test.ts`
- **Pattern**: `describe('validateUrl', () => { ... })` and `describe('normalizeUrl', () => { ... })`
- **No database needed**: These are pure functions — no SQLite, no mocks of DB
- **No HTTP needed**: No Fastify test app — these test pure function input/output
- **Edge case coverage is critical**: URL parsing has many edge cases. Test thoroughly:
  - Valid: `http://example.com`, `https://example.com/path?q=1`, `http://localhost:8080`
  - Invalid: `ftp://files.example.com`, `javascript:alert(1)`, `data:text/html,<h1>hi</h1>`, `not-a-url`, `://missing-scheme`, empty string
  - Normalization: `HTTP://EXAMPLE.COM:80/Path/?z=1&a=2#frag` -> `http://example.com/Path?a=2&z=1`
  - Note: path casing is NOT normalized (paths are case-sensitive per RFC 3986)

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions] — Zod 4.3.6 for validation, single structured error format
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture] — canonicalize URLs before persistence, redirect using original URL
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules] — error handling patterns, service boundaries
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries] — `src/services/normalize-url-service.ts` location
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4] — acceptance criteria, FR references
- [Source: _bmad-output/implementation-artifacts/1-2-*.md] — repository `findByNormalizedUrl` method, `ShortUrlInsert` type
- [Source: _bmad-output/implementation-artifacts/1-3-*.md] — service pattern, error class pattern in `src/lib/errors.ts`
- FR2 (validate URL structure), FR5 (clear error for invalid input), FR6 (handle duplicate URLs), NFR7 (validate all incoming URLs before persistence)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List



## Dev Agent Record

### Agent Model Used
openai/gpt-5.4

### Completion Notes List
- AC1-AC2: Added `validateUrl(input)` in `src/services/url-validation-service.ts` with http/https-only validation, trimmed empty-input rejection, malformed URL rejection, and descriptive discriminated-union failures.
- AC3: Added `normalizeUrl(url)` in `src/services/normalize-url-service.ts` with scheme/host canonicalization, default-port stripping, sorted query params, trailing-slash removal for non-root paths, fragment removal, and canonical pathname encoding.
- AC2: Added `UrlValidationError` with optional structured `details` in `src/lib/errors.ts`.
- AC5: Added unit coverage for valid URLs, invalid schemes, malformed/empty/non-string input, query sorting, default-port removal, trailing-slash normalization, fragment removal, equivalent URL normalization, and root-path preservation.
- Verification: `npm run typecheck`, `npm test`, `npm run build`, `npm run lint` all pass.

### File List
- src/services/url-validation-service.ts
- src/services/normalize-url-service.ts
- src/lib/errors.ts
- tests/unit/url-validation-service.test.ts
- tests/unit/normalize-url-service.test.ts
