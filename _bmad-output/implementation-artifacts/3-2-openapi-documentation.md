# Story 3.2: OpenAPI Documentation

Status: ready-for-dev

## Story

As a developer,
I want auto-generated OpenAPI documentation served at /docs,
So that I can discover and understand the API contract without reading source code.

## Acceptance Criteria

1. **Given** the Fastify server is running **When** a GET request is made to `/docs` **Then** a Swagger UI page is served showing all API endpoints with their request/response schemas
2. **Given** the Fastify server is running **When** a GET request is made to `/docs/json` **Then** a valid OpenAPI 3.0 JSON spec is returned containing POST /shorten, GET /:shortCode, and GET /health
3. **And** request and response schemas match the implemented Zod validation schemas
4. **And** the API title is "Simple URL Shortener API" and the version is read from package.json
5. **And** `@fastify/swagger` and `@fastify/swagger-ui` plugins are registered
6. **And** the API contract is stable and supports future addition of custom short codes (FR31), expiration (FR32), and auth (FR33) without breaking existing endpoints
7. **And** the OpenAPI spec groups endpoints logically with tags
8. **And** integration tests verify the `/docs` UI is served and the `/docs/json` spec includes all endpoints

## Tasks / Subtasks

- [ ] Task 1: Install dependencies (AC: #5)
  - [ ] Run `npm install @fastify/swagger@9.7.0 @fastify/swagger-ui@5.2.5`
- [ ] Task 2: Create health response schemas (AC: #2, #3)
  - [ ] Create `src/schemas/health-schemas.ts` if Story 3.1 hasn't created it yet
  - [ ] Define Zod schema for health response `{ status: string, database: string }`
  - [ ] Export JSON schema for Fastify route schema registration
  - [ ] If `health-schemas.ts` already exists (from Story 3.1), skip this task
- [ ] Task 3: Add OpenAPI schema metadata to all route files (AC: #2, #3, #7)
  - [ ] Update `src/routes/shorten-routes.ts` — add `tags: ['URL Shortening']`, `summary`, `description` to route schema options
  - [ ] Update `src/routes/redirect-routes.ts` — add `tags: ['Redirect']`, `summary`, `description`, add 302 response schema (empty body with Location header)
  - [ ] Update `src/routes/health-routes.ts` — add `tags: ['Operations']`, `summary`, `description` to route schema options (if Story 3.1 is complete; otherwise create a note for the dev)
- [ ] Task 4: Create swagger plugin (AC: #1, #4, #5)
  - [ ] Create `src/plugins/swagger.ts`
  - [ ] Register `@fastify/swagger` with OpenAPI 3.0 config: title, description, version (from package.json), contact info
  - [ ] Register `@fastify/swagger-ui` with `routePrefix: '/docs'`
  - [ ] Export as `FastifyPluginAsync`
- [ ] Task 5: Register swagger plugin in app.ts (AC: #1)
  - [ ] Import and register `swaggerPlugin` in `src/app.ts`
  - [ ] Registration order: swagger plugin FIRST (before routes), then database, error handler, request logging, routes
  - [ ] `@fastify/swagger` must be registered before route definitions for schema collection to work
- [ ] Task 6: Write integration tests (AC: #8)
  - [ ] Create `tests/integration/swagger.test.ts`
  - [ ] Test: GET /docs returns 200 with HTML content (Swagger UI)
  - [ ] Test: GET /docs/json returns 200 with valid OpenAPI JSON
  - [ ] Test: OpenAPI spec includes path `/shorten` with POST method
  - [ ] Test: OpenAPI spec includes path `/{shortCode}` with GET method
  - [ ] Test: OpenAPI spec includes path `/health` with GET method
  - [ ] Test: OpenAPI spec has correct title and version
- [ ] Task 7: Verify build and all tests pass
  - [ ] Run `npm run typecheck`, `npm run build`, `npm test`, `npm run lint`
  - [ ] Verify existing tests still pass (no regressions)

## Dev Notes

### Architecture Compliance

- **File locations** — per architecture project structure:
  - `src/plugins/swagger.ts` — swagger/OpenAPI plugin (explicitly listed in architecture)
  - Route files already exist at `src/routes/shorten-routes.ts`, `src/routes/redirect-routes.ts`, `src/routes/health-routes.ts`
  - `tests/integration/swagger.test.ts` — integration tests for docs endpoint
- **Plugin registration**: Architecture specifies `src/plugins/swagger.ts` as the OpenAPI plugin. Register it BEFORE routes in `src/app.ts` — `@fastify/swagger` must see route registrations to collect schemas.
- **Layer separation**: This is a cross-cutting infrastructure plugin, not a domain service. No service or repository layers involved.

### Technical Requirements

- **Library versions** (from architecture):
  - `@fastify/swagger@9.7.0` — OpenAPI spec generation
  - `@fastify/swagger-ui@5.2.5` — Swagger UI serving at `/docs`
- **OpenAPI version**: 3.0 (not 3.1 — `@fastify/swagger@9.7.0` generates OpenAPI 3.0 by default)
- **Spec endpoint**: `/docs/json` serves the raw OpenAPI JSON spec (default behavior of `@fastify/swagger-ui`)
- **UI endpoint**: `/docs` serves the Swagger UI HTML interface
- **Module system**: ESM — use `import` statements, `.js` extensions in local imports
- **Naming conventions**: kebab-case files, camelCase functions, PascalCase types

### Swagger Plugin Implementation (`src/plugins/swagger.ts`)

```typescript
import fp from 'fastify-plugin'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import type { FastifyPluginAsync } from 'fastify'

const swaggerPlugin: FastifyPluginAsync = async (app) => {
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Simple URL Shortener API',
        description: 'A lightweight, self-hosted URL shortening API',
        version: process.env.npm_package_version || '1.0.0',
      },
      tags: [
        { name: 'URL Shortening', description: 'Create and manage short URLs' },
        { name: 'Redirect', description: 'Short URL redirect resolution' },
        { name: 'Operations', description: 'Health checks and operational endpoints' },
      ],
    },
  })

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  })
}

export default fp(swaggerPlugin, { name: 'swagger' })
```

**Critical**: Use `fastify-plugin` (`fp`) wrapper so the plugin is not encapsulated — it must be visible to the entire Fastify instance for schema collection to work across all routes.

### Route Schema Enhancements

Routes already have `schema` objects with request/response JSON schemas. Add OpenAPI metadata:

**POST /shorten** (`src/routes/shorten-routes.ts`):
```typescript
schema: {
  tags: ['URL Shortening'],
  summary: 'Create a short URL',
  description: 'Submit a long URL to receive a shortened URL with a unique short code',
  body: shortenRequestJsonSchema,
  response: {
    201: shortenResponseJsonSchema,
    200: shortenResponseJsonSchema,
    400: errorResponseJsonSchema,
    500: errorResponseJsonSchema,
  },
}
```

**GET /:shortCode** (`src/routes/redirect-routes.ts`):
```typescript
schema: {
  tags: ['Redirect'],
  summary: 'Redirect to original URL',
  description: 'Look up a short code and redirect (302) to the original destination URL',
  params: {
    type: 'object',
    properties: { shortCode: { type: 'string', description: '7-character short code' } },
    required: ['shortCode'],
  },
  response: {
    302: { type: 'null', description: 'Redirect to original URL via Location header' },
    404: errorResponseJsonSchema,
    500: errorResponseJsonSchema,
  },
}
```

**GET /health** (`src/routes/health-routes.ts`):
```typescript
schema: {
  tags: ['Operations'],
  summary: 'Health check',
  description: 'Check service and database health status',
  response: {
    200: healthResponseJsonSchema,
    503: healthResponseJsonSchema,
  },
}
```

### Plugin Registration Order in app.ts

```
1. swaggerPlugin        ← NEW (must be before routes)
2. databasePlugin
3. errorHandlerPlugin
4. requestLoggingPlugin
5. shortenRoutes
6. healthRoutes          ← May be added by Story 3.1
7. redirectRoutes        ← Must be last (catch-all /:shortCode)
```

**Why swagger first**: `@fastify/swagger` hooks into Fastify's `onRoute` event to collect route schemas. It must be registered before any routes are added.

### Existing Code to Reuse (DO NOT RECREATE)

These modules already exist and are tested. Import and use them directly:

- **`src/schemas/short-url-schemas.ts`** — contains `shortenRequestJsonSchema`, `shortenResponseJsonSchema`, `errorResponseJsonSchema`. Already used in route schema options.
- **`src/routes/shorten-routes.ts`** — already has `schema` with `body` and `response` JSON schemas. Only add `tags`, `summary`, `description`.
- **`src/routes/redirect-routes.ts`** — already has `schema` with `response` JSON schemas. Add `tags`, `summary`, `description`, and `params` schema.
- **`src/plugins/error-handler.ts`** — centralized error handler. No changes needed.
- **`src/plugins/request-logging.ts`** — request logging plugin. No changes needed.
- **`tests/fixtures/test-app.ts`** — `buildTestApp()` creates a test Fastify instance. Must be updated to register `swaggerPlugin`.

### Dependency Note: Story 3.1 (Health Check)

Story 3.1 creates `src/routes/health-routes.ts` and `src/schemas/health-schemas.ts`. If Story 3.1 is NOT yet complete when this story begins:
- Create placeholder health schemas in `src/schemas/health-schemas.ts` matching the architecture spec
- The health route may not exist yet — the OpenAPI spec test for `/health` should be conditional or the dev should complete Story 3.1 first
- **Recommended**: Complete Story 3.1 before this story, since the OpenAPI spec should document all endpoints

If Story 3.1 IS complete:
- Import `healthResponseJsonSchema` from `src/schemas/health-schemas.ts`
- The health route schema just needs `tags`, `summary`, `description` metadata added

### Anti-Pattern Prevention

- **Do NOT** use `@fastify/swagger@10.x` — architecture pins `9.7.0`. Version 10.x may have breaking API changes.
- **Do NOT** register swagger plugin AFTER routes — schemas won't be collected. It MUST be registered BEFORE route plugins.
- **Do NOT** create a separate OpenAPI spec file manually — `@fastify/swagger` generates it from route schemas automatically.
- **Do NOT** add authentication schemes to the OpenAPI spec — auth is deferred to post-MVP (FR33).
- **Do NOT** duplicate schema definitions — reuse existing JSON schemas from `src/schemas/`.
- **Do NOT** skip `fastify-plugin` wrapper for the swagger plugin — without it, the plugin gets encapsulated and cannot see routes registered in sibling plugins.
- **Do NOT** add `hide: true` to any existing routes — all three MVP endpoints must appear in the OpenAPI spec.
- **Do NOT** add rate limiting, auth, or other post-MVP features to route schemas even as "optional" — keep the spec clean and honest about MVP capabilities.
- **Do NOT** forget to register swagger in the test app fixture (`tests/fixtures/test-app.ts`) — tests need it too.

### Previous Story Intelligence

**Story 3.1 (ready-for-dev):**
- Creates `src/schemas/health-schemas.ts` with health response JSON schema
- Creates `src/routes/health-routes.ts` with `GET /health` route
- Modifies `src/app.ts` to register health routes BEFORE redirect routes
- Uses `FastifyPluginAsync` pattern consistent with other route plugins

**Story 2.2 (done):**
- Created `src/plugins/request-logging.ts` — established pattern for cross-cutting plugins
- Plugin uses `fastify-plugin` wrapper for non-encapsulated registration
- Registered in `src/app.ts` after error handler, before routes

**Story 1.5 (review):**
- Established JSON schema registration pattern in route `schema` options
- Routes use `shortenRequestJsonSchema`, `shortenResponseJsonSchema`, `errorResponseJsonSchema`
- These schemas are already Fastify-compatible and will be picked up by `@fastify/swagger` automatically

**Story 2.1 (review):**
- `redirect-routes.ts` has `schema.response` with 404 and 500 JSON schemas
- Does NOT currently have `params` schema — needs to be added for proper OpenAPI param documentation

### Git Intelligence

Recent commits show consistent patterns:
- `FastifyPluginAsync` for all plugins and route modules
- `fastify-plugin` (`fp`) wrapper for cross-cutting plugins (database, error-handler, request-logging)
- ESM with `.js` extensions in local imports
- Integration tests use `app.inject()` with `buildTestApp()` fixture
- Plugins registered sequentially in `src/app.ts`

### Extensibility Considerations (FR31, FR32, FR33)

The route and schema structure must support future additions without breaking existing endpoints:
- **FR31 (custom short codes)**: POST /shorten body schema uses `additionalProperties: false` in Zod but the schema can be extended. Future `customCode` field can be added without changing the endpoint path.
- **FR32 (expiration)**: Future `expiresAt` field can be added to request and response schemas. No structural changes needed.
- **FR33 (auth/rate limiting)**: OpenAPI security schemes can be added later to the swagger config. Current spec should NOT include any security definitions.

### Testing Strategy

**Integration tests** (`tests/integration/swagger.test.ts`):
```typescript
describe('OpenAPI Documentation', () => {
  it('GET /docs returns Swagger UI HTML')
  it('GET /docs/json returns valid OpenAPI spec')
  it('OpenAPI spec includes POST /shorten')
  it('OpenAPI spec includes GET /{shortCode}')
  it('OpenAPI spec includes GET /health')
  it('OpenAPI spec has correct title and version')
})
```

Use `app.inject()` — no real HTTP needed. Parse the `/docs/json` response body as JSON and assert on `paths`, `info.title`, and `info.version`.

**Important**: `await app.ready()` must be called before accessing `/docs/json` — swagger generates the spec during the `onReady` hook.

### File Structure (files to create/modify)

```
simple-url-shortener-api/
├── package.json                              (modify — add dependencies)
├── src/
│   ├── app.ts                                (modify — register swagger plugin)
│   ├── plugins/
│   │   └── swagger.ts                        (create)
│   └── routes/
│       ├── shorten-routes.ts                 (modify — add tags/summary/description)
│       ├── redirect-routes.ts                (modify — add tags/summary/description/params)
│       └── health-routes.ts                  (modify — add tags/summary/description, if exists)
├── tests/
│   ├── fixtures/
│   │   └── test-app.ts                       (modify — register swagger plugin)
│   └── integration/
│       └── swagger.test.ts                   (create)
```

### Testing Standards

- **Framework**: Vitest `4.1.0`
- **Integration tests**: Use `app.inject()` for HTTP testing
- **Test setup**: Use `buildTestApp()` from `tests/fixtures/test-app.ts`
- **Each test**: Fresh app instance via `beforeEach`/`afterEach` with `app.close()`
- **Test structure**: `describe('OpenAPI Documentation', () => { ... })` with separate `it` blocks
- **Spec assertions**: Parse `/docs/json` response body and check `paths` object for expected endpoints
- **Existing tests** must continue passing — no regressions

### Project Structure Notes

- All file paths align with the architecture's project structure definition
- `src/plugins/swagger.ts` is explicitly listed in the architecture project structure
- No conflicts or variances with the unified project structure
- `tests/integration/swagger.test.ts` is a new test file not in the original architecture tree but follows the established pattern

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions] — `@fastify/swagger@9.7.0`, `@fastify/swagger-ui@5.2.5`, OpenAPI docs at `/docs`
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns] — generated OpenAPI served from /docs, REST-only API
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries] — `src/plugins/swagger.ts` file location, API boundaries, Swagger/OpenAPI is read-only documentation
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules] — JSON camelCase API responses, anti-patterns list
- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.2] — acceptance criteria, FR14, FR18, FR31, FR32, FR33
- [Source: _bmad-output/planning-artifacts/prd.md#API Contract & Integration] — FR14 (documented REST API), FR18 (stable API contract)
- [Source: _bmad-output/implementation-artifacts/3-1-health-check-endpoint.md] — health schemas, health route pattern, plugin registration order
- FR14 (documented REST API), FR18 (stable API contract), FR31 (custom short codes extensibility), FR32 (expiration extensibility), FR33 (auth extensibility)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
