# Story 2.1: GET /:shortCode Redirect Endpoint

Status: review

## Story

As an end user,
I want to click a short URL and be redirected to the original destination,
So that short links work transparently and take me where I expect to go.

## Acceptance Criteria

1. **Given** a valid short code exists in the database **When** a GET request is made to `/:shortCode` **Then** the server responds with HTTP 302 and a `Location` header pointing to the original URL **And** no JSON body is returned for successful redirects **And** the redirect works correctly regardless of client or browser type
2. **Given** a short code that does not exist in the database **When** a GET request is made to `/:shortCode` **Then** the server responds with HTTP 404 and body `{ "error": { "code": "NOT_FOUND", "message": "Short URL not found" } }`
3. **Given** the database is unavailable or returns an unexpected error **When** a GET request is made to `/:shortCode` **Then** the server responds with HTTP 500 and body `{ "error": { "code": "INTERNAL_ERROR", "message": string } }` **And** the error is logged with sufficient detail for debugging but without exposing sensitive internals
4. **And** integration tests verify successful redirect, 404 for missing code, and error handling

## Tasks / Subtasks

- [x] Task 1: Create resolve-short-url service (AC: #1, #2)
  - [x] Create `src/services/resolve-short-url-service.ts`
  - [x] Implement `resolveShortCode(shortCode: string, repository: ShortUrlRepository): string | null` that looks up the short code and returns the `originalUrl` or `null`
- [x] Task 2: Create GET /:shortCode redirect route (AC: #1, #2, #3)
  - [x] Create `src/routes/redirect-routes.ts`
  - [x] Register as a Fastify plugin with `GET /:shortCode` route
  - [x] On found: respond with `reply.redirect(302, originalUrl)` — no JSON body
  - [x] On not found: respond with 404 JSON error using the standard error format
  - [x] Unexpected errors bubble to the centralized error handler (do NOT catch them locally)
- [x] Task 3: Add NOT_FOUND error handling to error handler (AC: #2)
  - [x] Check if the existing error handler in `src/plugins/error-handler.ts` needs a `NotFoundError` class, OR handle 404 directly in the route handler (recommended — 404 is a route-level response, not a domain exception)
  - [x] Decision: Return 404 directly from the route handler since "not found" is a normal control flow outcome, not an exception. The centralized error handler already covers unexpected 500 errors.
- [x] Task 4: Register redirect routes in app.ts (AC: #1)
  - [x] Modify `src/app.ts` to import and register `redirectRoutes`
  - [x] Registration order: database plugin → error handler → shorten routes → redirect routes
- [x] Task 5: Write integration tests (AC: #4)
  - [x] Create `tests/integration/redirect-route.test.ts`
  - [x] Test: existing short code → 302 with correct `Location` header, no JSON body
  - [x] Test: non-existent short code → 404 with `NOT_FOUND` error response
  - [x] Test: verify `Location` header contains the `originalUrl` (not the normalized URL)
  - [x] Test: verify redirect response has no body / empty body
  - [x] Setup: use `POST /shorten` to create a short URL, then `GET /:shortCode` to test redirect
- [x] Task 6: Verify build and all tests pass
  - [x] Run `npm run typecheck`, `npm run build`, `npm test`, `npm run lint`

## Dev Notes

### Architecture Compliance

- **File locations** — per architecture project structure:
  - `src/services/resolve-short-url-service.ts` — redirect resolution service
  - `src/routes/redirect-routes.ts` — redirect route handler plugin
  - `tests/integration/redirect-route.test.ts` — integration tests
- **Layer separation**: Route → Service → Repository. The route handler calls the service; the service calls the repository.
- **Error flow**: The route handles 404 directly (normal control flow). Unexpected errors (DB failures) bubble to the centralized error handler in `src/plugins/error-handler.ts` which maps them to 500 `INTERNAL_ERROR`.
- **Redirect behavior**: HTTP 302 (temporary redirect) per architecture decision. Use `reply.redirect(302, originalUrl)` — Fastify sets the `Location` header automatically.
- **No JSON body on redirect**: Successful redirects return only the 302 status + Location header. Only error responses (404, 500) return JSON.

### Technical Requirements

- **HTTP 302 redirect**: Architecture specifies 302 (not 301) for MVP safety — allows future change to permanent redirects without cached-redirect issues.
- **Route parameter**: `/:shortCode` — Fastify uses `request.params.shortCode` to extract the path parameter.
- **`originalUrl` for redirect**: Redirect to `originalUrl` (the user-submitted URL), NOT `normalizedUrl`. Architecture says: "redirect using the original submitted destination to avoid silent mutation of user intent."
- **404 response format**:
  ```json
  {
    "error": {
      "code": "NOT_FOUND",
      "message": "Short URL not found"
    }
  }
  ```
- **500 response format** (handled by centralized error handler):
  ```json
  {
    "error": {
      "code": "INTERNAL_ERROR",
      "message": "An unexpected error occurred"
    }
  }
  ```
- **Module system**: ESM — use `import` statements, `.js` extensions in local imports.
- **Naming conventions**: kebab-case files, camelCase functions, PascalCase types.

### Existing Code to Reuse (DO NOT RECREATE)

These modules already exist and are tested. Import and use them directly:

- **`src/repositories/short-url-repository.ts`** — `ShortUrlRepository` class:
  - `findByShortCode(shortCode: string): ShortUrlRecord | null` — returns the full record or null. All methods are **synchronous** (better-sqlite3 is sync).
- **`src/plugins/error-handler.ts`** — centralized error handler already maps unknown errors to 500 `INTERNAL_ERROR`. It also handles `UrlValidationError` and `ShortCodeCollisionError`. No changes needed for this story unless adding a specific `NotFoundError` class (not recommended — handle 404 in the route).
- **`src/types/short-url.ts`** — `ShortUrlRecord` interface: `{ id, shortCode, originalUrl, normalizedUrl, createdAt }`.
- **`src/plugins/database.ts`** — registers `db` decorator on Fastify instance (type: `AppDatabase`).
- **`tests/fixtures/test-app.ts`** — `buildTestApp()` creates a Fastify instance with in-memory SQLite, silent logging, and full plugin registration. Use for integration tests.
- **`src/routes/shorten-routes.ts`** — existing `POST /shorten` route. Use in integration tests to create URLs before testing redirect.

### Resolve Service (`resolve-short-url-service.ts`) Logic

```
resolveShortCode(shortCode, repository):
  1. record = repository.findByShortCode(shortCode)
  2. if record → return record.originalUrl
  3. if null → return null
```

This is intentionally simple. The service exists for architectural consistency (route → service → repository pattern) and future extensibility (click counting, expiration checks, etc.).

### Redirect Route (`redirect-routes.ts`) Logic

```
GET /:shortCode handler:
  1. repository = new ShortUrlRepository(app.db)
  2. originalUrl = resolveShortCode(request.params.shortCode, repository)
  3. if originalUrl → reply.redirect(302, originalUrl)
  4. if null → reply.status(404).send({ error: { code: "NOT_FOUND", message: "Short URL not found" } })
```

**Route registration consideration**: This route uses a wildcard-like parameter `/:shortCode`. Register it AFTER more specific routes (`/shorten`, `/health`) to avoid the catch-all parameter matching those paths. Fastify handles this correctly with its radix-tree router, but registration order matters for clarity.

### Anti-Pattern Prevention

- **Do NOT** return JSON body on successful redirect — only set 302 + Location header
- **Do NOT** redirect to `normalizedUrl` — always redirect to `originalUrl` to preserve user intent
- **Do NOT** use 301 (permanent redirect) — architecture specifies 302 for MVP
- **Do NOT** create a `NotFoundError` class — 404 is normal control flow, not an exception. Return 404 directly from the route handler.
- **Do NOT** catch errors in the route handler for DB failures — let them bubble to the centralized error handler
- **Do NOT** modify the error handler plugin for this story — it already handles unexpected errors correctly
- **Do NOT** create `src/plugins/request-logging.ts` — that's Story 2.2
- **Do NOT** add click counting, analytics, or timestamps to the redirect — those are post-MVP
- **Do NOT** instantiate the repository at the module level — create it inside the plugin function using `app.db`

### Previous Story Intelligence

**Story 1.5 (done):**
- Established the route → service → repository pattern. Follow the same structure.
- `shortenRoutes` is registered as a `FastifyPluginAsync` — use the same pattern for `redirectRoutes`.
- The repository is instantiated inside the plugin function: `const repository = new ShortUrlRepository(app.db)` — follow this pattern.
- `tests/fixtures/test-app.ts` exists and provides `buildTestApp()` — reuse it directly.
- Integration tests use `app.inject()` for HTTP testing — follow the same pattern.
- `app.ts` registers plugins in order: database → error handler → shorten routes. Add redirect routes after shorten routes.
- Code review found: `logLevel: 'silent' as never` cast in test fixture — this is intentional for test output suppression.

**Story 1.2 (done):**
- `ShortUrlRepository.findByShortCode()` is synchronous (better-sqlite3). The resolve service can be synchronous too.
- Repository returns `ShortUrlRecord | null` — use this directly.

### Git Intelligence

Recent commits show Stories 1.1–1.5 are implemented and code-reviewed. The codebase follows a consistent pattern:
- Fastify plugins for routes and cross-cutting concerns
- Synchronous repository operations (better-sqlite3)
- ESM with `.js` extensions in imports
- Integration tests using `app.inject()` with `buildTestApp()` fixture

### File Structure (files to create/modify)

```
simple-url-shortener-api/
├── src/
│   ├── app.ts                                  (modify — register redirect routes)
│   ├── services/
│   │   └── resolve-short-url-service.ts       (create)
│   └── routes/
│       └── redirect-routes.ts                 (create)
└── tests/
    └── integration/
        └── redirect-route.test.ts             (create)
```

### Testing Standards

- **Framework**: Vitest `4.1.0`
- **Integration tests**: Use `app.inject()` for HTTP testing — no actual network requests needed
- **Test setup**: Use `buildTestApp()` from `tests/fixtures/test-app.ts`
  - Each test should get a fresh app instance (`beforeEach` / `afterEach` with `app.close()`)
- **Test structure**: `describe('GET /:shortCode', () => { ... })` with separate `it` blocks per scenario
- **Creating test data**: Use `app.inject({ method: 'POST', url: '/shorten', ... })` to create a short URL, then extract the `shortCode` from the response to test the redirect
- **Redirect assertions**:
  - Check `response.statusCode === 302`
  - Check `response.headers.location` equals the original URL
  - Check response body is empty or minimal (no JSON)
- **404 assertions**:
  - Check `response.statusCode === 404`
  - Check `response.headers['content-type']` includes `application/json`
  - Parse body and assert `error.code === 'NOT_FOUND'`
- **Existing tests** (all passing) must continue passing

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions] — HTTP 302 for MVP, Fastify 5.8.2, single structured error format
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns] — GET /:shortCode endpoint, redirect returns bare HTTP redirect or 404 JSON
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules] — error handling patterns, route/service/repository separation
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture] — "redirect using the original submitted destination to avoid silent mutation of user intent"
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries] — redirect-routes.ts, resolve-short-url-service.ts file locations
- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1] — acceptance criteria, FR references
- [Source: _bmad-output/implementation-artifacts/1-5-*.md] — route plugin pattern, repository instantiation, test fixture usage, app.ts registration order
- FR7 (redirect to destination), FR8 (error when short code not found), FR9 (redirect correctness across clients), FR13 (fast retrieval for low-latency redirects), FR28 (distinguish error types), FR29 (predictable failure when storage unavailable)

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Debug Log References

### Completion Notes List

- Added a synchronous resolve service that returns stored original destinations from existing short codes.
- Added a dedicated redirect route that returns 302 on success, explicit 404 `NOT_FOUND` JSON for misses, and lets unexpected failures reach the centralized 500 handler.
- Registered redirect routes after `/shorten` so the parameterized route stays behind more specific endpoints.
- Added integration coverage for redirect success, empty-body behavior, missing codes, stored-original-vs-normalized behavior, and unexpected repository failures.
- Verification passed on 2026-03-23: `npm run typecheck`, `npm run build`, `npm test`, `npm run lint`.

### File List

- src/app.ts
- src/routes/redirect-routes.ts
- src/services/resolve-short-url-service.ts
- tests/integration/redirect-route.test.ts
