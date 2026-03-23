# Story 2.2: Request Logging and Operational Observability

Status: ready-for-dev

## Story

As an operator,
I want structured request logs for all API operations,
So that I can debug issues, monitor traffic patterns, and trace failures without entering the application codebase.

## Acceptance Criteria

1. **Given** any HTTP request is made to the service **When** the request completes (success or failure) **Then** a structured JSON log entry is emitted via Pino including method, path, status code, and response time **And** error responses include error codes in the log entry for quick filtering **And** sensitive configuration values (DATABASE_PATH contents, internal paths) are not logged **And** log level is configurable via the LOG_LEVEL environment variable **And** the request logging plugin is registered as a Fastify plugin
2. **And** integration tests verify that log output is produced for requests and that error scenarios produce appropriate log entries

## Tasks / Subtasks

- [ ] Task 1: Create request logging plugin (AC: #1)
  - [ ] Create `src/plugins/request-logging.ts`
  - [ ] Register as a `FastifyPluginAsync` using Fastify's lifecycle hooks
  - [ ] Use `onResponse` hook to log: method, url, statusCode, responseTime
  - [ ] For error responses (4xx/5xx), include `errorCode` in the log entry when available
  - [ ] Add custom serializers to redact sensitive fields (DATABASE_PATH, databasePath, internal file paths)
  - [ ] Mark plugin with `skip-override` symbol so it applies application-wide
- [ ] Task 2: Configure Pino serializers for sensitive data redaction (AC: #1)
  - [ ] Add `redact` configuration to the Pino logger options in `src/app.ts`
  - [ ] Redact paths: `['req.headers.authorization', 'req.headers.cookie']` (future-proofing)
  - [ ] Ensure DATABASE_PATH and databasePath never appear in log output by not logging config objects directly
- [ ] Task 3: Register request logging plugin in app.ts (AC: #1)
  - [ ] Import and register `requestLoggingPlugin` in `src/app.ts`
  - [ ] Registration order: database → error handler → request logging → shorten routes → redirect routes
- [ ] Task 4: Write integration tests (AC: #2)
  - [ ] Create `tests/integration/request-logging.test.ts`
  - [ ] Capture Pino log output by using a custom destination stream in test setup
  - [ ] Test: successful request produces log entry with method, url/path, statusCode (2xx), responseTime
  - [ ] Test: 404 request produces log entry with statusCode 404
  - [ ] Test: 400 validation error produces log entry with statusCode 400
  - [ ] Test: log entries are valid JSON (structured logging verification)
  - [ ] Test: log entries do NOT contain DATABASE_PATH or databasePath values
- [ ] Task 5: Verify build and all tests pass
  - [ ] Run `npm run typecheck`, `npm run build`, `npm test`, `npm run lint`

## Dev Notes

### Architecture Compliance

- **File locations** — per architecture project structure:
  - `src/plugins/request-logging.ts` — request logging Fastify plugin
  - `tests/integration/request-logging.test.ts` — integration tests
- **Layer separation**: This is a cross-cutting plugin registered at the app level. It uses Fastify lifecycle hooks, NOT route-level middleware.
- **Observability stack**: Pino is Fastify's built-in logger (no extra dependency needed). Fastify 5.x uses Pino under the hood — `app.log` is a Pino logger instance.
- **LOG_LEVEL**: Already configurable via `src/config/app-config.ts` → `config.logLevel` → passed to `Fastify({ logger: { level: config.logLevel } })` in `src/app.ts`. No config changes needed.

### Technical Requirements

- **Pino**: Built into Fastify — do NOT install pino separately. `app.log` IS the Pino logger.
- **Fastify's default request logging**: Fastify already logs `request incoming` and `request completed` at `info` level when `logger` is enabled. However, the default format lacks error codes and may need customization.
- **Approach**: Use Fastify's `onResponse` hook in a plugin to emit a single, enriched log entry per request that includes all required fields. Optionally disable Fastify's built-in per-request logging (`disableRequestLogging: true` in Fastify options) to avoid duplicate log lines, then emit your own consolidated entry.
- **Log entry shape** (minimum required fields):
  ```json
  {
    "level": 30,
    "time": 1711152000000,
    "msg": "request completed",
    "reqId": "req-1",
    "method": "GET",
    "url": "/abc1234",
    "statusCode": 302,
    "responseTime": 1.23
  }
  ```
- **Error-enhanced log entry** (for 4xx/5xx responses):
  ```json
  {
    "level": 40,
    "msg": "request completed",
    "method": "POST",
    "url": "/shorten",
    "statusCode": 400,
    "responseTime": 2.15,
    "errorCode": "VALIDATION_ERROR"
  }
  ```
- **Sensitive data**: NEVER log `config.databasePath`, `DATABASE_PATH`, or full config objects. Only log operational fields (method, url, status, timing).
- **Log levels for responses**:
  - 2xx/3xx → `info` level
  - 4xx → `warn` level
  - 5xx → `error` level
- **Module system**: ESM — use `import` statements, `.js` extensions in local imports.
- **Naming**: kebab-case files, camelCase functions, PascalCase types.

### Existing Code to Reuse (DO NOT RECREATE)

- **`src/app.ts`** — Fastify app builder. Currently configures `logger: { level: config.logLevel }`. Registers database → error handler → shorten routes. You'll add request-logging plugin registration here.
- **`src/plugins/error-handler.ts`** — Centralized error handler. Maps domain errors to structured `{ error: { code, message } }` responses. The request-logging plugin can extract `errorCode` from the response body for 4xx/5xx responses.
- **`src/config/app-config.ts`** — `AppConfig` with `logLevel` field. Already loaded and applied. No changes needed.
- **`tests/fixtures/test-app.ts`** — `buildTestApp()` creates Fastify with `logLevel: 'silent' as never`. For logging tests, you'll need a variant that captures log output instead of silencing it.
- **`src/routes/shorten-routes.ts`** — Existing POST /shorten route. Use in integration tests to generate requests that produce log output.

### Request Logging Plugin Design

```typescript
// src/plugins/request-logging.ts
import type { FastifyPluginAsync } from 'fastify'

export const requestLoggingPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('onResponse', (request, reply, done) => {
    const logData: Record<string, unknown> = {
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime
    }

    // Extract errorCode from response body for error responses
    // Note: Fastify stores the serialized payload — you may need to
    // access it via reply.payload or track it from the error handler

    const statusCode = reply.statusCode
    if (statusCode >= 500) {
      request.log.error(logData, 'request completed')
    } else if (statusCode >= 400) {
      request.log.warn(logData, 'request completed')
    } else {
      request.log.info(logData, 'request completed')
    }

    done()
  })
}
```

**Error code extraction strategy**: The simplest reliable approach is to use the `onSend` hook (fires before response is sent, gives access to payload) to stash the error code on the request object, then read it in `onResponse`. Alternatively, use `onError` hook to capture error codes before they're serialized.

Recommended approach using `onSend`:
```
onSend hook:
  1. If statusCode >= 400 and payload is JSON
  2. Parse payload, extract error.code
  3. Store on request: request.errorCode = parsed.error.code

onResponse hook:
  1. Build log entry with method, url, statusCode, responseTime
  2. If request.errorCode exists, add errorCode to log entry
  3. Log at appropriate level based on statusCode
```

### Disabling Default Fastify Request Logging

To avoid duplicate log entries, set `disableRequestLogging: true` in Fastify options in `src/app.ts`:
```typescript
const app = Fastify({
  logger: { level: config.logLevel },
  disableRequestLogging: true
})
```
This disables Fastify's built-in "incoming request" and "request completed" log lines, letting your plugin be the single source of request logs.

### Testing Strategy for Log Output

Capturing Pino log output in tests requires a custom approach since `buildTestApp()` uses `logLevel: 'silent'`. Options:

**Recommended: Create a test helper that captures logs via a writable stream:**
```typescript
import { Writable } from 'node:stream'

interface LogCapture {
  app: FastifyInstance
  logs: string[]
}

export async function buildTestAppWithLogs(): Promise<LogCapture> {
  const logs: string[] = []
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      logs.push(chunk.toString())
      callback()
    }
  })

  // Build app with logger writing to capture stream
  const config = { port: 3000, baseUrl: 'http://localhost:3000/', databasePath: ':memory:', logLevel: 'info' }
  const app = Fastify({
    logger: { level: 'info', stream },
    disableRequestLogging: true
  })
  app.decorate('config', config)
  // ... register plugins same as buildApp
  await app.ready()
  return { app, logs }
}
```

**Important**: You may need to build the test app manually (not via `buildApp()`) to inject the custom logger stream, OR modify `buildApp()` to accept a `loggerOptions` override. Prefer the manual build in tests to avoid modifying the production `buildApp` signature.

### Anti-Pattern Prevention

- **Do NOT** install `pino` as a separate dependency — Fastify bundles it. `app.log` IS Pino.
- **Do NOT** use `console.log` or any non-Pino logging — all logging goes through `app.log` / `request.log`.
- **Do NOT** log full config objects — they contain `databasePath` which is sensitive.
- **Do NOT** log request/response bodies — only log operational metadata (method, url, status, timing).
- **Do NOT** create custom log formatting — Pino's default JSON output is the correct structured format.
- **Do NOT** add request ID generation — Fastify auto-generates `reqId` on each request and Pino includes it.
- **Do NOT** modify the error handler plugin to add logging — keep concerns separated. The error handler maps errors to responses; the logging plugin logs requests.
- **Do NOT** use Express-style middleware (`app.use()`) — use Fastify hooks (`addHook`).
- **Do NOT** create `src/plugins/swagger.ts` — that's Story 3.2.
- **Do NOT** add health check logging customization — that's Story 3.1.

### Previous Story Intelligence

**Story 2.1 (ready-for-dev):**
- Added `redirect-routes.ts` with GET /:shortCode → 302 redirect or 404 JSON error
- Route handles 404 directly (not via error handler) — the logging plugin must still capture 404s from both the error handler path and direct route responses
- `resolve-short-url-service.ts` is a thin service layer
- Registration order in app.ts will be: database → error handler → request logging → shorten routes → redirect routes

**Story 1.5 (done):**
- `shorten-routes.ts` uses `FastifyPluginAsync` pattern — follow the same for request-logging plugin
- Error handler uses `setErrorHandler` with `skip-override` symbol — the logging plugin should also use `skip-override` to apply app-wide
- `buildTestApp()` returns `app.ready()` — maintain this pattern
- Integration tests use `app.inject()` — same for logging tests

**Story 1.1 (done):**
- `app.ts` passes `logger: { level: config.logLevel }` to Fastify constructor
- Config loaded via `loadConfig()` which reads `LOG_LEVEL` env var with default `'info'`

### Git Intelligence

The codebase follows ESM with `.js` extensions, `FastifyPluginAsync` for plugins, `skip-override` symbol for app-wide plugins, and `app.inject()` for testing. All existing tests pass. Story 2.1 story file exists but code is not yet implemented — the redirect route does not exist in `src/routes/` yet. This story can be implemented independently.

### File Structure (files to create/modify)

```
simple-url-shortener-api/
├── src/
│   ├── app.ts                                  (modify — add disableRequestLogging, register logging plugin)
│   └── plugins/
│       └── request-logging.ts                 (create)
└── tests/
    └── integration/
        └── request-logging.test.ts            (create)
```

### Testing Standards

- **Framework**: Vitest 4.1.0
- **Integration tests**: Use `app.inject()` — no actual network requests
- **Log capture**: Build test app with a writable stream to capture Pino JSON output
- **Test structure**: `describe('Request Logging', () => { ... })` with separate `it` blocks per scenario
- **Assertions**:
  - Parse each captured log line as JSON
  - Assert presence of `method`, `url`, `statusCode`, `responseTime` fields
  - For error responses, assert `errorCode` field is present
  - Assert no log entry contains `databasePath` or DATABASE_PATH values
  - Assert log level is appropriate: info for success, warn for 4xx, error for 5xx
- **Existing tests** must continue passing — the `buildTestApp()` fixture uses `logLevel: 'silent'` so logging changes won't affect existing test output

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions] — Logging via Pino and Fastify request logging
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules] — Error handling patterns, logging shape, no secrets in logs
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries] — request-logging.ts in src/plugins/
- [Source: _bmad-output/planning-artifacts/architecture.md#Infrastructure & Deployment] — LOG_LEVEL config, structured logs for operational traceability
- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.2] — Acceptance criteria, FR references
- [Source: _bmad-output/implementation-artifacts/1-5-*.md] — Plugin registration pattern, error handler design, test fixture pattern
- [Source: _bmad-output/implementation-artifacts/2-1-*.md] — Redirect route pattern, 404 handling approach
- FR30 (log operationally relevant events), NFR8 (no sensitive config in logs)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
