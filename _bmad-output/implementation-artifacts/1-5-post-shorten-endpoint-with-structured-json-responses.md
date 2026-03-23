# Story 1.5: POST /shorten Endpoint with Structured JSON Responses

Status: ready-for-dev

## Story

As a developer,
I want a POST /shorten endpoint that accepts a JSON body with a URL and returns the generated short URL,
So that I can programmatically create short URLs and integrate them into my application.

## Acceptance Criteria

1. **Given** a valid JSON request body `{ "url": "https://example.com/long-path" }` is POSTed to /shorten **When** the URL passes validation **Then** the response has status 201 and body `{ "shortCode": "abc1234", "shortUrl": "https://base.url/abc1234", "originalUrl": "https://example.com/long-path", "createdAt": "ISO8601 timestamp" }` **And** the `shortUrl` is constructed using the configured `BASE_URL`
2. **Given** a request body with an invalid or missing URL **When** POSTed to /shorten **Then** the response has status 400 and body `{ "error": { "code": "VALIDATION_ERROR", "message": string } }`
3. **Given** a request body with a URL that matches an already-shortened destination (after normalization) **When** POSTed to /shorten **Then** the existing short code and short URL are returned with status 200
4. **Given** a request with wrong content type or empty body **When** POSTed to /shorten **Then** a 400 error with structured error response is returned
5. **And** the centralized error handler plugin maps all domain errors to the standard error format
6. **And** request body size is limited to prevent abuse
7. **And** integration tests verify success, validation error, duplicate, and malformed request scenarios

## Tasks / Subtasks

- [ ] Task 1: Create Zod request/response schemas (AC: #1, #2)
  - [ ] Create `src/schemas/short-url-schemas.ts`
  - [ ] Define `shortenRequestSchema` with Zod: `{ url: z.string() }` — minimal, validation logic is in `url-validation-service.ts`
  - [ ] Define `shortenResponseSchema` for the success response shape (used for OpenAPI docs in Story 3.2)
  - [ ] Define `errorResponseSchema` for the standard error format
- [ ] Task 2: Create shorten URL orchestration service (AC: #1, #3)
  - [ ] Create `src/services/shorten-url-service.ts`
  - [ ] Implement `shortenUrl(url: string, config: AppConfig, repository: ShortUrlRepository): Promise<ShortenResult>` that orchestrates: validate → normalize → check duplicate → generate code → persist → return result
  - [ ] On duplicate (normalized URL match): return existing record with `isNew: false`
  - [ ] On new URL: generate unique short code, insert, return new record with `isNew: true`
  - [ ] Throw `UrlValidationError` when validation fails
- [ ] Task 3: Create centralized error handler plugin (AC: #2, #4, #5)
  - [ ] Create `src/plugins/error-handler.ts`
  - [ ] Register as a Fastify plugin using `setErrorHandler`
  - [ ] Map `UrlValidationError` → 400 with `"VALIDATION_ERROR"` code
  - [ ] Map `ShortCodeCollisionError` → 500 with `"INTERNAL_ERROR"` code
  - [ ] Map Fastify validation errors (JSON parse, content-type) → 400 with `"VALIDATION_ERROR"` code
  - [ ] Map unknown errors → 500 with `"INTERNAL_ERROR"` code and sanitized message
  - [ ] Always use format: `{ "error": { "code": string, "message": string, "details"?: object } }`
- [ ] Task 4: Create POST /shorten route (AC: #1, #2, #3, #4, #6)
  - [ ] Create `src/routes/shorten-routes.ts`
  - [ ] Register as a Fastify plugin with `POST /shorten` route
  - [ ] Attach Zod-derived JSON schema for request body validation
  - [ ] Set request body size limit (e.g., `bodyLimit: 1_048_576` — 1MB)
  - [ ] Call `shortenUrl` service, then return 201 (new) or 200 (duplicate) with the response body
  - [ ] Construct `shortUrl` using `request.server.config.baseUrl + '/' + shortCode`
- [ ] Task 5: Register routes and plugins in app.ts (AC: #1, #5, #6)
  - [ ] Modify `src/app.ts` to register `errorHandlerPlugin` and `shortenRoutes`
  - [ ] Registration order: database plugin → error handler → routes
- [ ] Task 6: Create test fixture for integration tests (AC: #7)
  - [ ] Create `tests/fixtures/test-app.ts`
  - [ ] Export a `buildTestApp()` helper that creates a Fastify instance with in-memory SQLite (`:memory:`) and test config
  - [ ] Ensure proper cleanup (app.close()) support
- [ ] Task 7: Write integration tests (AC: #7)
  - [ ] Create `tests/integration/shorten-route.test.ts`
  - [ ] Test: valid URL → 201 with correct response body shape and `shortUrl` construction
  - [ ] Test: same URL submitted twice → first returns 201, second returns 200 with same shortCode
  - [ ] Test: invalid URL → 400 with `VALIDATION_ERROR` error response
  - [ ] Test: missing URL field → 400
  - [ ] Test: empty body → 400
  - [ ] Test: wrong content-type → 400
  - [ ] Test: response `createdAt` is valid ISO 8601
- [ ] Task 8: Verify build and all tests pass
  - [ ] Run `npm run typecheck`, `npm run build`, `npm test`, `npm run lint`

## Dev Notes

### Architecture Compliance

- **File locations** — per architecture project structure:
  - `src/schemas/short-url-schemas.ts` — Zod request/response schemas
  - `src/services/shorten-url-service.ts` — orchestration service
  - `src/routes/shorten-routes.ts` — route handler plugin
  - `src/plugins/error-handler.ts` — centralized error handler plugin
  - `tests/fixtures/test-app.ts` — shared test app builder
  - `tests/integration/shorten-route.test.ts` — integration tests
- **Layer separation**: Route → Service → Repository. The route handler calls the service; the service calls the repository. The route NEVER directly imports the repository or database client.
- **Error flow**: Domain errors (`UrlValidationError`, `ShortCodeCollisionError`) bubble up from services. The centralized error handler in `src/plugins/error-handler.ts` catches them and maps to HTTP responses. Routes do NOT catch errors themselves.
- **Data contract**: API responses use `camelCase` JSON fields. Database uses `snake_case`. The repository already handles this mapping.

### Technical Requirements

- **Zod version**: `4.3.6` (already in `package.json` dependencies)
- **Request schema**: `{ url: z.string() }` — Zod validates structure only; URL content validation happens in `url-validation-service.ts`
- **Response format for success (201/200)**:
  ```json
  {
    "shortCode": "abc1234",
    "shortUrl": "https://base.url/abc1234",
    "originalUrl": "https://example.com/long-path",
    "createdAt": "2026-03-23T00:00:00.000Z"
  }
  ```
- **Response format for errors (400/500)**:
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Invalid URL: scheme must be http or https",
      "details": {}
    }
  }
  ```
- **Status codes**: 201 for new short URL, 200 for duplicate (existing normalized URL match), 400 for validation errors, 500 for internal errors
- **Body size limit**: Set `bodyLimit` on the route to prevent abuse (1MB is sufficient)
- **Content-Type enforcement**: Fastify handles JSON parsing automatically; non-JSON content-type will trigger a parse error
- **`shortUrl` construction**: `config.baseUrl + '/' + shortCode` — use the `BASE_URL` from config, remove any trailing slash from baseUrl before concatenating
- **Module system**: ESM — use `import` statements, `.js` extensions in local imports
- **Naming conventions**:
  - Files: kebab-case
  - Functions: camelCase (`shortenUrl`, `buildTestApp`)
  - Types: PascalCase (`ShortenResult`, `ShortenRequest`)
  - Constants: UPPER_SNAKE_CASE where appropriate

### Existing Code to Reuse (DO NOT RECREATE)

These modules already exist and are tested. Import and use them directly:

- **`src/services/url-validation-service.ts`** — `validateUrl(url: string)` returns `{ valid: true, url: URL } | { valid: false, error: string }`
- **`src/services/normalize-url-service.ts`** — `normalizeUrl(url: URL)` returns normalized URL string
- **`src/services/generate-short-code-service.ts`** — `generateUniqueShortCode(existsFn)` returns 7-char base62 code. The `existsFn` should be `(code) => repository.findByShortCode(code) !== null`
- **`src/repositories/short-url-repository.ts`** — `ShortUrlRepository` class with methods: `insert(data: ShortUrlInsert)`, `findByShortCode(code)`, `findByNormalizedUrl(normalizedUrl)`
- **`src/lib/errors.ts`** — `UrlValidationError` and `ShortCodeCollisionError` error classes
- **`src/types/short-url.ts`** — `ShortUrlRecord` and `ShortUrlInsert` types
- **`src/config/app-config.ts`** — `AppConfig` interface with `baseUrl`, `port`, `databasePath`, `logLevel`
- **`src/plugins/database.ts`** — registers `db` decorator on Fastify instance (type: `AppDatabase`)
- **`src/db/client.ts`** — `createDatabaseClient(databasePath)` — use with `:memory:` for test fixtures

### Orchestration Service (`shorten-url-service.ts`) Logic Flow

```
shortenUrl(url, config, repository):
  1. result = validateUrl(url)
  2. if !result.valid → throw new UrlValidationError(result.error)
  3. normalizedUrl = normalizeUrl(result.url)
  4. existing = repository.findByNormalizedUrl(normalizedUrl)
  5. if existing → return { ...existing, isNew: false }
  6. shortCode = generateUniqueShortCode((code) => repository.findByShortCode(code) !== null)
  7. record = repository.insert({ shortCode, originalUrl: url, normalizedUrl })
  8. return { ...record, isNew: true }
```

Note: `generateUniqueShortCode` is synchronous (uses `crypto.randomBytesSync`), but repository operations may be synchronous too since better-sqlite3 is synchronous. The service function itself should match the sync/async nature of the repository. Check current `ShortUrlRepository` — if methods are sync, the service can be sync too.

### Centralized Error Handler Requirements

The error handler plugin must handle these specific error types:

| Error Type | HTTP Status | Error Code | Source |
|---|---|---|---|
| `UrlValidationError` | 400 | `VALIDATION_ERROR` | Service layer |
| `ShortCodeCollisionError` | 500 | `INTERNAL_ERROR` | Service layer |
| Fastify content-type/parse error | 400 | `VALIDATION_ERROR` | Fastify framework |
| Fastify validation error (schema) | 400 | `VALIDATION_ERROR` | Fastify framework |
| Unknown/unexpected error | 500 | `INTERNAL_ERROR` | Any |

Fastify sets `error.statusCode` for framework-generated errors (e.g., FST_ERR_CTP_INVALID_MEDIA_TYPE, JSON parse errors). Use `error.statusCode` when available for Fastify errors; for domain errors use the mappings above.

**Security**: Never expose stack traces or internal error details in 500 responses. Log the full error server-side; return a sanitized message to the client.

### Anti-Pattern Prevention

- **Do NOT** create a new repository class or modify the existing one — `ShortUrlRepository` already has all needed methods
- **Do NOT** put URL validation logic in the Zod schema — Zod validates the request body structure (`{ url: string }`), while `url-validation-service.ts` validates the URL content (scheme, structure)
- **Do NOT** put business logic in the route handler — the route calls `shortenUrl()` from the service and maps the result to an HTTP response. Keep the handler thin.
- **Do NOT** catch errors in the route handler — let them bubble to the centralized error handler
- **Do NOT** use `fastify.inject()` responses as plain objects — use `.json()` to parse response bodies in tests
- **Do NOT** create separate error handler functions per route — one centralized `setErrorHandler` in the plugin handles all routes
- **Do NOT** import `better-sqlite3` or `drizzle-orm` directly in routes or services — use the repository abstraction
- **Do NOT** add logging to the error handler beyond what Fastify provides — Story 2.2 covers request logging
- **Do NOT** register the swagger plugin — that's Story 3.2
- **Do NOT** create `src/services/resolve-short-url-service.ts` — that's Story 2.1 (redirect endpoint)

### Previous Story Intelligence

**Story 1.1 (done):**
- `src/app.ts` currently registers only the `databasePlugin`. Add error handler and routes here.
- `buildApp()` accepts `BuildAppOptions` with optional `AppConfig` override — use this pattern for test fixtures
- ESM module system with `.js` extensions in local imports
- Code review found: redundant deps, missing tests, inconsistent type refs

**Story 1.2 (done):**
- `ShortUrlRepository` class — constructor takes `db: AppDatabase`
- `insert()` auto-generates `createdAt` via `new Date().toISOString()`
- `findByNormalizedUrl(normalizedUrl)` returns `ShortUrlRecord | null`
- `findByShortCode(shortCode)` returns `ShortUrlRecord | null`
- Code review noted: `mapShortUrlRecord` is identity mapping (Drizzle returns camelCase). All methods are synchronous.

**Story 1.3 (done):**
- `generateUniqueShortCode(existsFn, randomFn?)` — existsFn is `(code: string) => boolean`
- Synchronous function (uses `crypto.randomBytes` sync)
- Throws `ShortCodeCollisionError` after 4 total attempts

**Story 1.4 (ready-for-dev, files exist but may not be committed):**
- `validateUrl(url)` returns discriminated union
- `normalizeUrl(url: URL)` returns string
- `UrlValidationError` added to `src/lib/errors.ts` with optional `details` field
- Files exist in working tree: `src/services/url-validation-service.ts`, `src/services/normalize-url-service.ts`

### Git Intelligence

Recent commits show the BMAD pipeline pattern. Stories 1.1-1.3 are done and committed. Story 1.4 files appear in the working tree (new files for validation/normalization services).

Current `src/app.ts` structure:
```typescript
import Fastify from 'fastify'
import { loadConfig, type AppConfig } from './config/app-config.js'
import { databasePlugin } from './plugins/database.js'

interface BuildAppOptions { config?: AppConfig }

export async function buildApp(options: BuildAppOptions = {}) {
  const config = options.config ?? loadConfig()
  const app = Fastify({ logger: { level: config.logLevel } })
  app.decorate('config', config)
  await app.register(databasePlugin)
  return app
}
```

### File Structure (files to create/modify)

```
simple-url-shortener-api/
├── src/
│   ├── app.ts                                  (modify — register error handler + routes)
│   ├── schemas/
│   │   └── short-url-schemas.ts               (create)
│   ├── services/
│   │   └── shorten-url-service.ts             (create)
│   ├── routes/
│   │   └── shorten-routes.ts                  (create)
│   └── plugins/
│       └── error-handler.ts                   (create)
├── tests/
│   ├── fixtures/
│   │   └── test-app.ts                        (create)
│   └── integration/
│       └── shorten-route.test.ts              (create)
```

### Testing Standards

- **Framework**: Vitest `4.1.0`
- **Integration tests**: Use `fastify.inject()` for HTTP testing — no actual network requests needed
- **Test app setup**: Create `tests/fixtures/test-app.ts` with a `buildTestApp()` helper:
  - Uses `buildApp()` with overridden config: `databasePath: ':memory:'`, `baseUrl: 'http://localhost:3000'`
  - Returns the Fastify instance ready for `app.inject()`
  - Each test should get a fresh app instance (call `buildTestApp()` in `beforeEach`)
  - Clean up with `app.close()` in `afterEach`
- **Test structure**: `describe('POST /shorten', () => { ... })` with separate `it` blocks per scenario
- **Response assertions**: Check status code, content-type header (`application/json`), and parsed response body
- **Duplicate test**: Submit same URL twice — first should be 201, second should be 200 with identical `shortCode`
- **Existing unit tests** (26 tests across 5 files) must continue passing

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions] — Zod 4.3.6, structured error format, HTTP endpoints
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns] — REST endpoints, error contract, response shapes
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules] — error handling patterns, service boundaries, naming conventions
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries] — file locations, architectural boundaries, data flow
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.5] — acceptance criteria, FR references
- [Source: _bmad-output/implementation-artifacts/1-2-*.md] — ShortUrlRepository API, ShortUrlRecord/ShortUrlInsert types
- [Source: _bmad-output/implementation-artifacts/1-3-*.md] — generateUniqueShortCode API, ShortCodeCollisionError
- [Source: _bmad-output/implementation-artifacts/1-4-*.md] — validateUrl and normalizeUrl APIs, UrlValidationError
- FR1 (submit URL to create short URL), FR4 (return short code and full short URL), FR5 (clear error for invalid input), FR15 (accept JSON requests), FR16 (return JSON responses), FR17 (structured machine-readable errors)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
