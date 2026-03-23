# Story 1.1: Initialize Fastify TypeScript Project with Environment Configuration

Status: review

## Story

As a developer,
I want to initialize the project with Fastify and TypeScript and load configuration from environment variables,
So that I have a running local server with validated config as the foundation for all subsequent features.

## Acceptance Criteria

1. **Given** a fresh checkout of the repository **When** the developer runs `npm install` and starts the dev server **Then** the Fastify server starts and listens on the configured PORT (default 3000)
2. **Given** the environment variables BASE_URL, PORT, DATABASE_PATH, and LOG_LEVEL are set **When** the server starts **Then** each is read and used; sensible defaults apply when unset (PORT=3000, BASE_URL=http://localhost:3000, DATABASE_PATH=./data/urls.db, LOG_LEVEL=info)
3. **Given** an invalid or missing required config value **When** the server attempts to start **Then** a clear startup error is thrown via Zod validation explaining what is wrong
4. **Given** the project is initialized **Then** an `.env.example` file documents all available environment variables with example values
5. **Given** the project structure **Then** it uses the directory layout defined in Architecture: `src/config/`, `src/plugins/`, `src/routes/`, `src/services/`, `src/repositories/`, `src/schemas/`, `src/db/`, `src/lib/`, `src/types/`
6. **Given** the TypeScript project **When** `npm run build` is executed **Then** compilation succeeds with zero errors
7. **Given** the test setup **When** `npm test` is executed **Then** Vitest runs and a placeholder test passes

## Tasks / Subtasks

- [x] Task 1: Initialize Fastify project using starter template (AC: #1)
  - [x] Run `npm create fastify@latest -- --lang=ts` in a temporary location, then merge generated files into the repo root (the repo already exists with _bmad files)
  - [x] Verify Fastify 5.x is installed and server boots
- [x] Task 2: Install and configure additional dependencies (AC: #1, #2, #3, #6)
  - [x] Install production deps: `zod@^4.3.6`, `@fastify/env` (or use custom Zod-based config), `better-sqlite3`, `drizzle-orm@^0.45.1`, `pino@^10.3.1`
  - [x] Install dev deps: `vitest@^4.1.0`, `tsx@^4.21.0`, `drizzle-kit@^0.31.10`, `typescript`, `@types/better-sqlite3`, `eslint`
  - [x] Configure `tsconfig.json` and `tsconfig.build.json` for strict TypeScript
- [x] Task 3: Create directory structure (AC: #5)
  - [x] Create all `src/` subdirectories: config, plugins, routes, services, repositories, schemas, db, lib, types
  - [x] Create `tests/unit/`, `tests/integration/`, `tests/fixtures/`
  - [x] Create `data/.gitkeep` for local SQLite storage
  - [x] Create `drizzle/` directory for future migrations
- [x] Task 4: Implement environment configuration with Zod validation (AC: #2, #3)
  - [x] Create `src/config/env.ts` — Zod schema parsing PORT, BASE_URL, DATABASE_PATH, LOG_LEVEL from `process.env` with defaults
  - [x] Create `src/config/app-config.ts` — export typed config object from parsed env
  - [x] Ensure startup fails fast with clear error message on invalid config
- [x] Task 5: Create app bootstrap and server entry point (AC: #1)
  - [x] Create `src/app.ts` — Fastify instance factory, registers plugins
  - [x] Create `src/server.ts` — process entry point, calls app.listen on configured PORT
  - [x] Verify dev server starts with `npm run dev` (tsx watch mode)
- [x] Task 6: Create `.env.example` (AC: #4)
  - [x] Document PORT, BASE_URL, DATABASE_PATH, LOG_LEVEL with example values and comments
- [x] Task 7: Configure Vitest and write placeholder test (AC: #7)
  - [x] Create `vitest.config.ts` at repo root
  - [x] Create placeholder test in `tests/unit/` that asserts true
  - [x] Verify `npm test` passes
- [x] Task 8: Add npm scripts to package.json (AC: #1, #6, #7)
  - [x] `dev`: run with tsx in watch mode
  - [x] `build`: TypeScript compilation
  - [x] `start`: run compiled output
  - [x] `test`: vitest run
  - [x] `test:watch`: vitest watch mode
  - [x] `lint`: eslint
  - [x] `typecheck`: tsc --noEmit

## Dev Notes

### Architecture Compliance

- **Starter command**: `npm create fastify@latest simple-url-shortener-api -- --lang=ts` — since the repo already exists with _bmad planning artifacts, scaffold into a temp directory and merge generated files (package.json, tsconfig, src/app.ts, src/server.ts, etc.) into the project root. Do NOT delete existing `_bmad/` or `_bmad-output/` directories.
- **Runtime**: Fastify `5.8.2` on Node `24 LTS`
- **Config validation**: Use Zod `4.3.6` directly (not @fastify/env). Parse `process.env` through a Zod schema at startup. This is the same validation approach used for request schemas later.
- **Logging**: Fastify uses Pino `10.3.1` natively. Pass `logger: true` (or `logger: { level: config.logLevel }`) to Fastify constructor.
- **No database setup in this story** — only create the directory structure placeholders for `src/db/` and `drizzle/`. Database schema and Drizzle setup are Story 1.2.
- **No routes in this story** — only ensure the server boots and responds (Fastify's default 404 is fine). Routes come in Stories 1.5 and 2.1.

### Technical Requirements

- **TypeScript strict mode** enabled in tsconfig.json
- **File naming**: kebab-case for all source files (e.g., `app-config.ts`, `env.ts`)
- **Type naming**: PascalCase (e.g., `AppConfig`, `EnvSchema`)
- **Function naming**: camelCase (e.g., `loadConfig`, `buildApp`)
- **Constants**: UPPER_SNAKE_CASE only for env/config constant names
- **Config contract** (env vars with defaults):
  - `PORT` — number, default `3000`
  - `BASE_URL` — string URL, default `http://localhost:3000`
  - `DATABASE_PATH` — string file path, default `./data/urls.db`
  - `LOG_LEVEL` — enum `fatal|error|warn|info|debug|trace`, default `info`

### File Structure (files to create/modify in this story)

```
simple-url-shortener-api/
├── package.json          (modify — add deps and scripts)
├── tsconfig.json         (create or modify from starter)
├── tsconfig.build.json   (create)
├── vitest.config.ts      (create)
├── eslint.config.js      (create)
├── .env.example          (create)
├── .gitignore            (modify — add data/, dist/, node_modules/, *.db)
├── src/
│   ├── app.ts            (create — Fastify instance factory)
│   ├── server.ts         (create — process entry point)
│   ├── config/
│   │   ├── env.ts        (create — Zod env parsing)
│   │   └── app-config.ts (create — typed config export)
│   ├── plugins/          (create dir, empty for now)
│   ├── routes/           (create dir, empty for now)
│   ├── services/         (create dir, empty for now)
│   ├── repositories/     (create dir, empty for now)
│   ├── schemas/          (create dir, empty for now)
│   ├── db/               (create dir, empty for now)
│   ├── lib/              (create dir, empty for now)
│   └── types/            (create dir, empty for now)
├── tests/
│   ├── unit/
│   │   └── placeholder.test.ts (create)
│   ├── integration/      (create dir, empty for now)
│   └── fixtures/         (create dir, empty for now)
├── drizzle/              (create dir, empty for now)
└── data/
    └── .gitkeep          (create)
```

### Testing Standards

- **Framework**: Vitest `4.1.0`
- **Placeholder test**: simple assertion in `tests/unit/placeholder.test.ts` to verify the test pipeline works
- **Test organization**: `tests/unit/` for pure logic, `tests/integration/` for HTTP+persistence, `tests/fixtures/` for shared test helpers

### Project Structure Notes

- The repo already contains `_bmad/` and `_bmad-output/` directories — these must NOT be modified or deleted
- `.gitignore` must include `node_modules/`, `dist/`, `data/*.db`, `.env` (but NOT `.env.example`)
- The `data/` directory is for local SQLite storage; include `.gitkeep` to preserve it in git

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Starter Template Evaluation] — initialization command and rationale
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions] — runtime versions, config contract
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries] — complete directory structure
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules] — naming conventions, file patterns
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1] — acceptance criteria and FR references
- FR19 (env config), FR20 (BASE_URL), FR21 (PORT), FR22 (DATABASE_PATH), FR25 (local setup), FR27 (one-command setup), NFR12 (env-driven config)

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Debug Log References

- `npm install`
- `npm run typecheck`
- `npm run build`
- `npm test`
- `npm run lint`
- `node dist/server.js` (default port 3000 was unavailable in host env; verified startup on 3001)
- `PORT=abc node dist/server.js` (verified fail-fast config validation)

### Completion Notes List

- Bootstrapped the repo from the Fastify TypeScript starter shape without touching existing `_bmad` directories.
- Implemented Zod-backed environment parsing with defaults and clear startup validation errors.
- Added strict TypeScript, Vitest placeholder coverage, ESLint config, and required project directory structure.
- Verified build, typecheck, lint, and tests all pass.
- Verified server startup on an alternate port because host port 3000 was already occupied outside the project.

### File List

- package.json
- package-lock.json
- tsconfig.json
- tsconfig.build.json
- vitest.config.ts
- eslint.config.js
- .env.example
- .gitignore
- src/app.ts
- src/server.ts
- src/config/env.ts
- src/config/app-config.ts
- src/types/fastify.d.ts
- tests/unit/placeholder.test.ts
- data/.gitkeep

