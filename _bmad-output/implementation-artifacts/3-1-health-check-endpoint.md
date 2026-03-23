# Story 3.1: Health Check Endpoint

Status: ready-for-dev

## Story

As an operator,
I want a GET /health endpoint that reports service and database status,
So that I can attach health probes from load balancers, orchestrators, and uptime monitors.

## Acceptance Criteria

1. **Given** the service is running and the database is accessible **When** a GET request is made to `/health` **Then** the response has status 200 and body `{ "status": "ok", "database": "ok" }`
2. **Given** the service is running but the database is inaccessible **When** a GET request is made to `/health` **Then** the response has status 503 and body `{ "status": "error", "database": "error" }`
3. **And** the health check performs a lightweight database probe (e.g., `SELECT 1`) to verify connectivity
4. **And** integration tests verify both healthy and degraded states

## Tasks / Subtasks

- [ ] Task 1: Create health check service (AC: #1, #2, #3)
  - [ ] Create `src/services/health-check-service.ts`
  - [ ] Implement `checkHealth(db: AppDatabase): { status: string; database: string }` that runs a lightweight `SELECT 1` probe against the database
  - [ ] On success: return `{ status: 'ok', database: 'ok' }`
  - [ ] On failure (catch): return `{ status: 'error', database: 'error' }`
- [ ] Task 2: Create health response schema (AC: #1, #2)
  - [ ] Create `src/schemas/health-schemas.ts`
  - [ ] Define Zod schemas for the health response (both 200 and 503 share the same shape)
  - [ ] Export JSON schema for Fastify route schema registration
- [ ] Task 3: Create GET /health route (AC: #1, #2)
  - [ ] Create `src/routes/health-routes.ts`
  - [ ] Register as a `FastifyPluginAsync` with `GET /health`
  - [ ] Call the health check service and return the result
  - [ ] Set HTTP 200 when `status === 'ok'`, HTTP 503 when `status === 'error'`
- [ ] Task 4: Register health routes in app.ts (AC: #1)
  - [ ] Modify `src/app.ts` to import and register `healthRoutes`
  - [ ] Registration order: database → error handler → shorten routes → **health routes** → redirect routes (health must be registered BEFORE redirect routes to avoid `/:shortCode` catching `/health`)
- [ ] Task 5: Write integration tests (AC: #4)
  - [ ] Create `tests/integration/health-route.test.ts`
  - [ ] Test: healthy state → 200 with `{ "status": "ok", "database": "ok" }`
  - [ ] Test: degraded state (mock database failure) → 503 with `{ "status": "error", "database": "error" }`
  - [ ] Test: response content type is `application/json`
- [ ] Task 6: Verify build and all tests pass
  - [ ] Run `npm run typecheck`, `npm run build`, `npm test`, `npm run lint`

## Dev Notes

### Architecture Compliance

- **File locations** — per architecture project structure:
  - `src/services/health-check-service.ts` — health check service (database probe logic)
  - `src/routes/health-routes.ts` — health route handler plugin
  - `src/schemas/health-schemas.ts` — health response Zod/JSON schemas
  - `tests/integration/health-route.test.ts` — integration tests
- **Layer separation**: Route → Service → Database. The route handler calls the health check service; the service probes the database directly (no repository needed — this is an infrastructure check, not a domain operation).
- **Error flow**: The health check service catches database errors internally and returns a degraded status. This is NOT an error that should bubble to the centralized error handler — a 503 "degraded" response is a valid, expected health check result.
- **Response format**: Architecture specifies `{ "status": "ok", "database": "ok" }` for healthy and `{ "status": "error", "database": "error" }` for degraded. This is NOT the standard error format (`{ error: { code, message } }`) — health responses have their own shape.

### Technical Requirements

- **HTTP status codes**: 200 for healthy, 503 for degraded. NFR13 says the endpoint must be suitable for load balancers and orchestrators — 503 signals "temporarily unavailable" which is the standard convention for health check failures.
- **Database probe**: Use `SELECT 1` via Drizzle's `sql` template tag. This is the lightest possible query to verify database connectivity without hitting any application tables.
- **Synchronous execution**: better-sqlite3 is synchronous, so the database probe will be synchronous. The health check service function can be synchronous too.
- **No domain logic**: The health check does not go through the repository layer. It probes the database directly since it's checking infrastructure, not performing a domain operation.
- **Response format** (NOT the error format):
  ```json
  { "status": "ok", "database": "ok" }
  ```
  ```json
  { "status": "error", "database": "error" }
  ```
- **Module system**: ESM — use `import` statements, `.js` extensions in local imports.
- **Naming conventions**: kebab-case files, camelCase functions, PascalCase types.

### Existing Code to Reuse (DO NOT RECREATE)

These modules already exist and are tested. Import and use them directly:

- **`src/db/client.ts`** — `AppDatabase` type (`BetterSQLite3Database<typeof schema>`). The health service needs this type for its parameter.
- **`src/plugins/database.ts`** — registers `db` decorator on Fastify instance. Health route accesses `app.db`.
- **`src/plugins/error-handler.ts`** — centralized error handler. No changes needed for this story. Health check handles its own error states internally (returning 503), not via thrown exceptions.
- **`tests/fixtures/test-app.ts`** — `buildTestApp()` creates a Fastify instance with in-memory SQLite, silent logging, and full plugin registration. Use for integration tests. **Will need to be updated** to also register `healthRoutes` once added to `app.ts`.
- **`src/types/fastify.d.ts`** — Fastify type augmentation declaring `app.config` and `app.db`. No changes needed.
- **`drizzle-orm`** — Import `sql` from `drizzle-orm` for the raw `SELECT 1` probe.

### Health Check Service (`health-check-service.ts`) Logic

```
checkHealth(db: AppDatabase):
  1. try { db.run(sql`SELECT 1`) } — or equivalent lightweight Drizzle raw query
  2. if success → return { status: 'ok', database: 'ok' }
  3. if catch → return { status: 'error', database: 'error' }
```

**Important**: The service catches the database error and returns a result object — it does NOT throw. The route handler then sets the HTTP status based on the result.

**Drizzle raw SQL execution**: Use Drizzle's `sql` tagged template for the probe. For better-sqlite3 via Drizzle, you can use:
```typescript
import { sql } from 'drizzle-orm'
db.get<{ value: number }>(sql`SELECT 1 as value`)
```
This runs a synchronous query. If the database is closed or corrupted, it will throw, which the service catches.

### Health Route (`health-routes.ts`) Logic

```
GET /health handler:
  1. result = checkHealth(app.db)
  2. statusCode = result.status === 'ok' ? 200 : 503
  3. reply.status(statusCode).send(result)
```

**Route registration**: `/health` is a specific path. It MUST be registered BEFORE `redirectRoutes` which has the catch-all `/:shortCode` parameter. Fastify's radix-tree router handles this correctly, but register health routes before redirect routes for clarity and safety.

### Anti-Pattern Prevention

- **Do NOT** use the standard error response format (`{ error: { code, message } }`) for health check responses. The health endpoint has its own response shape as defined in the architecture: `{ "status": "ok/error", "database": "ok/error" }`.
- **Do NOT** throw errors from the health check service when the database is down. Catch the error and return a degraded status. The 503 response is a valid, expected outcome — not an application error.
- **Do NOT** use the repository layer for the health probe. The `ShortUrlRepository` is for domain operations. The health check probes raw database connectivity.
- **Do NOT** add authentication, rate limiting, or caching to the health endpoint. Architecture explicitly defers these to post-MVP.
- **Do NOT** add detailed diagnostic information (memory usage, uptime, version) to the health response. Architecture specifies binary app/database health for MVP: "MVP keeps binary app/database health."
- **Do NOT** create `src/plugins/request-logging.ts` — that's Story 2.2 (separate story, may be done in parallel).
- **Do NOT** instantiate a repository at the module level — create any needed instances inside the plugin function using `app.db`.
- **Do NOT** create a health-check-repository — a raw `SELECT 1` probe is infrastructure, not a domain query.

### Previous Story Intelligence

**Story 2.1 (done):**
- Established the pattern of handling specific HTTP responses directly in the route handler (e.g., 404 for not found) rather than throwing exceptions. Health check should follow the same pattern — return 200 or 503 directly from the route.
- Route plugins use `FastifyPluginAsync` pattern with `app.db` access.
- `tests/fixtures/test-app.ts` provides `buildTestApp()` — reuse for integration tests.
- Integration tests use `app.inject()` for HTTP testing.
- Route registration order matters: specific routes before parameterized `/:shortCode`.
- Repository instantiation happens inside plugin functions, not at module level.
- The `logLevel: 'silent' as never` cast in test fixture is intentional.

**Story 1.5 (done):**
- JSON schema registration in route options for Fastify serialization. Consider adding health response schema for consistency.
- Error handler already handles all unexpected errors → no changes needed for health story.

### Git Intelligence

Recent commits show Stories 1.1–1.5 and 2.1 implemented. Consistent patterns:
- `FastifyPluginAsync` for route plugins
- Synchronous repository/service operations (better-sqlite3)
- ESM with `.js` extensions in imports
- Integration tests using `app.inject()` with `buildTestApp()` fixture
- `src/app.ts` registers plugins in order: database → error handler → specific routes → parameterized routes

### Testing Strategy for Degraded State

Testing the database-inaccessible scenario requires mocking/sabotaging the database connection. Approaches:

**Recommended approach**: Use `vi.spyOn()` to mock the database method used by the health check service to throw an error:
```typescript
// In the test for degraded state:
vi.spyOn(app.db, 'get').mockImplementation(() => {
  throw new Error('database is locked')
})
```

This is consistent with how Story 2.1 tested database error scenarios in `redirect-route.test.ts`.

### File Structure (files to create/modify)

```
simple-url-shortener-api/
├── src/
│   ├── app.ts                                  (modify — register health routes)
│   ├── services/
│   │   └── health-check-service.ts            (create)
│   ├── schemas/
│   │   └── health-schemas.ts                  (create)
│   └── routes/
│       └── health-routes.ts                   (create)
└── tests/
    └── integration/
        └── health-route.test.ts               (create)
```

### Testing Standards

- **Framework**: Vitest `4.1.0`
- **Integration tests**: Use `app.inject()` for HTTP testing — no actual network requests needed
- **Test setup**: Use `buildTestApp()` from `tests/fixtures/test-app.ts`
  - Each test should get a fresh app instance (`beforeEach` / `afterEach` with `app.close()`)
- **Test structure**: `describe('GET /health', () => { ... })` with separate `it` blocks per scenario
- **Healthy state test**: Simply call `GET /health` — the in-memory SQLite database is always accessible in tests
- **Degraded state test**: Mock the database `get` method to throw, then call `GET /health` and verify 503 response
- **Response assertions**:
  - Check `response.statusCode === 200` or `response.statusCode === 503`
  - Check `response.headers['content-type']` includes `application/json`
  - Parse body and assert `{ status: 'ok', database: 'ok' }` or `{ status: 'error', database: 'error' }`
- **Mock cleanup**: Use `vi.restoreAllMocks()` in `afterEach`
- **Existing tests** (all passing) must continue passing

### Project Structure Notes

- All file paths align with the architecture's project structure definition
- `src/schemas/health-schemas.ts` is explicitly listed in the architecture project structure
- `src/routes/health-routes.ts` is explicitly listed in the architecture project structure
- `tests/integration/health-route.test.ts` is explicitly listed in the architecture project structure
- No conflicts or variances with the unified project structure

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions] — GET /health endpoint, health response format `{ "status": "ok", "database": "ok" }`
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns] — GET /health listed as one of three endpoints
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules] — health checks must degrade explicitly, MVP keeps binary app/database health
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries] — health-routes.ts, health-schemas.ts file locations, operations/deployment FR mapping
- [Source: _bmad-output/planning-artifacts/architecture.md#Infrastructure & Deployment] — /health returns app and storage status
- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.1] — acceptance criteria, FR references
- [Source: _bmad-output/implementation-artifacts/2-1-get-shortcode-redirect-endpoint.md] — route plugin pattern, testing patterns, registration order guidance, database mocking strategy
- FR23 (health check endpoint), FR24 (service and storage status), NFR13 (suitable for load balancers, orchestrators, and uptime monitors)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
