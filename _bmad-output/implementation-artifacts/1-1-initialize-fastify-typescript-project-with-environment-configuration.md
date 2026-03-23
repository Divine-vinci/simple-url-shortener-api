# Story 1.1: Initialize Fastify TypeScript Project with Environment Configuration

Status: ready-for-dev

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

- [ ] Task 1: Initialize Fastify project using starter template (AC: #1)
  - [ ] Run `npm create fastify@latest -- --lang=ts` in a temporary location, then merge generated files into the repo root (the repo already exists with _bmad files)
  - [ ] Verify Fastify 5.x is installed and server boots
- [ ] Task 2: Install and configure additional dependencies (AC: #1, #2, #3, #6)
  - [ ] Install production deps: `zod@^4.3.6`, `@fastify/env` (or use custom Zod-based config), `better-sqlite3`, `drizzle-orm@^0.45.1`, `pino@^10.3.1`
  - [ ] Install dev deps: `vitest@^4.1.0`, `tsx@^4.21.0`, `drizzle-kit@^0.31.10`, `typescript`, `@types/better-sqlite3`, `eslint`
  - [ ] Configure `tsconfig.json` and `tsconfig.build.json` for strict TypeScript
- [ ] Task 3: Create directory structure (AC: #5)
  - [ ] Create all `src/` subdirectories: config, plugins, routes, services, repositories, schemas, db, lib, types
  - [ ] Create `tests/unit/`, `tests/integration/`, `tests/fixtures/`
  - [ ] Create `data/.gitkeep` for local SQLite storage
  - [ ] Create `drizzle/` directory for future migrations
- [ ] Task 4: Implement environment configuration with Zod validation (AC: #2, #3)
  - [ ] Create `src/config/env.ts` — Zod schema parsing PORT, BASE_URL, DATABASE_PATH, LOG_LEVEL from `process.env` with defaults
  - [ ] Create `src/config/app-config.ts` — export typed config object from parsed env
  - [ ] Ensure startup fails fast with clear error message on invalid config
- [ ] Task 5: Create app bootstrap and server entry point (AC: #1)
  - [ ] Create `src/app.ts` — Fastify instance factory, registers plugins
  - [ ] Create `src/server.ts` — process entry point, calls app.listen on configured PORT
  - [ ] Verify dev server starts with `npm run dev` (tsx watch mode)
- [ ] Task 6: Create `.env.example` (AC: #4)
  - [ ] Document PORT, BASE_URL, DATABASE_PATH, LOG_LEVEL with example values and comments
- [ ] Task 7: Configure Vitest and write placeholder test (AC: #7)
  - [ ] Create `vitest.config.ts` at repo root
  - [ ] Create placeholder test in `tests/unit/` that asserts true
  - [ ] Verify `npm test` passes
- [ ] Task 8: Add npm scripts to package.json (AC: #1, #6, #7)
  - [ ] `dev`: run with tsx in watch mode
  - [ ] `build`: TypeScript compilation
  - [ ] `start`: run compiled output
  - [ ] `test`: vitest run
  - [ ] `test:watch`: vitest watch mode
  - [ ] `lint`: eslint
  - [ ] `typecheck`: tsc --noEmit

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

### Debug Log References

### Completion Notes List

### File List
