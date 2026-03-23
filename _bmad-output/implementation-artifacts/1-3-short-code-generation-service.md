# Story 1.3: Short Code Generation Service

Status: ready-for-dev

## Story

As a developer,
I want a service that generates unique 7-character base62 short codes,
So that each shortened URL gets a collision-resistant, URL-safe identifier.

## Acceptance Criteria

1. **Given** the short code generation service is called **When** a new short code is requested **Then** a 7-character string using characters `[a-zA-Z0-9]` is returned
2. **Given** the generation mechanism **Then** codes are produced using Node.js `crypto.randomBytes` for cryptographic randomness
3. **Given** a generated code collides with an existing database entry **When** the service retries **Then** it retries up to 3 times before throwing a descriptive error
4. **Given** the service **When** unit tests are run **Then** tests verify code length, character set, uniqueness across multiple generations, and retry-on-collision behavior

## Tasks / Subtasks

- [ ] Task 1: Create short code generation service (AC: #1, #2)
  - [ ] Create `src/services/generate-short-code-service.ts`
  - [ ] Implement `generateShortCode()` that produces a 7-character base62 string using `crypto.randomBytes`
  - [ ] Use base62 alphabet: `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789`
  - [ ] Convert random bytes to base62 characters using modulo mapping
- [ ] Task 2: Implement collision-aware generation (AC: #3)
  - [ ] Create `generateUniqueShortCode(existsFn: (code: string) => boolean): string` that wraps generation with collision checking
  - [ ] Accept a callback/function that checks if a code already exists in the database (dependency injection for testability)
  - [ ] Retry up to 3 times on collision (total 4 attempts including initial)
  - [ ] Throw a typed error (`ShortCodeCollisionError` or use existing error pattern from `src/lib/errors.ts`) after max retries exhausted
- [ ] Task 3: Write unit tests (AC: #4)
  - [ ] Create `tests/unit/generate-short-code-service.test.ts`
  - [ ] Test: generated code is exactly 7 characters long
  - [ ] Test: generated code contains only `[a-zA-Z0-9]` characters
  - [ ] Test: multiple calls produce different codes (statistical uniqueness)
  - [ ] Test: `generateUniqueShortCode` succeeds on first try when no collision
  - [ ] Test: `generateUniqueShortCode` retries and succeeds when collision occurs on first attempt(s)
  - [ ] Test: `generateUniqueShortCode` throws error after 3 consecutive collisions (4 total attempts)
- [ ] Task 4: Verify build and existing tests still pass
  - [ ] Run `npm run typecheck`, `npm run build`, `npm test`, `npm run lint`

## Dev Notes

### Architecture Compliance

- **File location**: `src/services/generate-short-code-service.ts` — per architecture project structure
- **Service boundary**: This is pure generation logic. It does NOT import HTTP/Fastify, route modules, or the database client directly
- **Collision checking**: The service receives an `existsFn` callback for collision detection — this keeps the service decoupled from the repository layer (which may not exist yet if Story 1.2 hasn't been implemented). Story 1.5 wires it to the repository.
- **Error handling**: Collision exhaustion errors should use a domain error class. Check if `src/lib/errors.ts` exists; if so, add a `ShortCodeCollisionError` there. If not, create the file with this error class. The central error handler (Story 1.5) will map it to HTTP 500.
- **Data flow**: This service sits in the `Route → Service → Repository` chain. It is called by `shorten-url-service.ts` (Story 1.5), not by routes directly.

### Technical Requirements

- **Code length**: Exactly 7 characters
- **Character set**: base62 — `[A-Za-z0-9]` (62 characters)
- **Randomness source**: `crypto.randomBytes` from Node.js built-in `node:crypto` module — do NOT use `Math.random()`
- **Base62 encoding approach**: Generate enough random bytes (at least 7), then map each byte to the base62 alphabet using `byte % 62`. This introduces slight bias but is acceptable for this use case. Alternative: generate more bytes and use rejection sampling for uniform distribution — either approach is acceptable.
- **Retry strategy**: Maximum 3 retries (4 total attempts). On each collision, generate a completely new code (do not mutate the previous one).
- **Error on exhaustion**: Throw with a clear message like `"Failed to generate unique short code after 4 attempts"`
- **Naming conventions**:
  - File: `generate-short-code-service.ts` (kebab-case)
  - Functions: `generateShortCode`, `generateUniqueShortCode` (camelCase)
  - Constants: `SHORT_CODE_LENGTH = 7`, `BASE62_ALPHABET`, `MAX_RETRIES = 3` (UPPER_SNAKE_CASE)
- **Module system**: ESM — use `import` statements, `.js` extensions in local imports

### Anti-Pattern Prevention

- **Do NOT** use `Math.random()` — it is not cryptographically secure and the architecture explicitly requires crypto-random codes
- **Do NOT** use external libraries (e.g., nanoid, shortid, uuid) — the architecture specifies base62 with crypto.randomBytes
- **Do NOT** import the repository or database client directly — use dependency injection (callback parameter) for the collision check
- **Do NOT** make this an async function unless necessary — `crypto.randomBytes` has a synchronous variant (`crypto.randomBytesSync` or the sync overload) that is fine for 7 bytes. If using synchronous crypto, the function can be synchronous.
- **Do NOT** create a Fastify plugin for this service — it is a pure function, not a plugin. It will be called by the shorten-url-service.

### Previous Story Intelligence

**Story 1.1 (done):**
- Module system: ESM with `.js` extensions in imports (NodeNext module resolution)
- Config: `loadConfig()` returns typed `AppConfig` — not relevant to this story but shows the pattern
- Test pattern: Vitest in `tests/unit/`, standard `describe/it/expect`
- Build verification: `npm run typecheck`, `npm run build`, `npm test`, `npm run lint`
- Code review issues found: redundant deps, missing tests, inconsistent type refs — ensure thorough test coverage

**Story 1.2 (ready-for-dev, not yet implemented):**
- Will create the repository with `findByShortCode(shortCode: string): ShortUrlRecord | null`
- The `existsFn` callback for collision checking will eventually call `repository.findByShortCode(code) !== null`
- This story is designed to be implementable independently of 1.2 — the callback pattern avoids the direct dependency

### Git Intelligence

- Recent commits show BMAD workflow progression. Story 1.1 was implemented by GPT-5.4 and code-reviewed by Claude Opus 4.6.
- Current source files: `src/app.ts`, `src/server.ts`, `src/config/env.ts`, `src/config/app-config.ts`, `src/types/fastify.d.ts`
- No existing files in `src/services/` or `src/lib/` — these directories contain only `.gitkeep` files

### File Structure (files to create/modify)

```
simple-url-shortener-api/
├── src/
│   ├── services/
│   │   └── generate-short-code-service.ts  (create)
│   └── lib/
│       └── errors.ts                       (create — if not exists)
├── tests/
│   └── unit/
│       └── generate-short-code-service.test.ts  (create)
```

### Testing Standards

- **Framework**: Vitest `4.1.0`
- **Location**: `tests/unit/generate-short-code-service.test.ts`
- **Pattern**: `describe('generateShortCode', () => { ... })` and `describe('generateUniqueShortCode', () => { ... })`
- **Collision testing**: Mock the `existsFn` callback to simulate collisions — e.g., return `true` for first N calls, then `false`
- **Randomness testing**: Generate multiple codes and verify they differ (at least 100 samples for statistical confidence)
- **Character set**: Use regex `/^[A-Za-z0-9]{7}$/` to validate format
- **No database needed**: Tests use mock callbacks, no SQLite or temp DB required

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions] — 7-character base62 codes with database-backed uniqueness enforcement and retry-on-collision
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries] — `src/services/generate-short-code-service.ts`
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules] — naming conventions, service boundaries
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3] — acceptance criteria and FR references
- [Source: _bmad-output/implementation-artifacts/1-1-*.md] — previous story patterns, ESM module system, test approach
- FR3 (generate unique short code), FR12 (guarantee short code uniqueness)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
