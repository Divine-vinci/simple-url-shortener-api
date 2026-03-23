# Story 3.3: Docker Packaging and CI Pipeline

Status: review

## Story

As an operator,
I want a Dockerfile and docker-compose.yml for one-command deployment, and a CI pipeline for quality gates,
So that I can deploy the service to production with confidence and catch regressions before merge.

## Acceptance Criteria

1. **Given** the repository contains a Dockerfile **When** `docker build .` is run **Then** a container image is produced under 100MB containing the compiled application and production dependencies only
2. **And** the container runs the service on the configured PORT with environment variable support for PORT, BASE_URL, DATABASE_PATH, and LOG_LEVEL
3. **Given** a `docker-compose.yml` exists **When** `docker compose up` is run **Then** the service starts with a persistent volume for the SQLite database file
4. **And** the docker-compose.yml references `.env.example` variables as documentation
5. **Given** the repository contains `.github/workflows/ci.yml` **When** a pull request is opened **Then** the pipeline runs TypeScript type checking, linting, and all unit/integration tests
6. **And** the pipeline fails if any check does not pass
7. **And** the Dockerfile uses a multi-stage build for minimal image size
8. **And** the Docker image uses Node 24 LTS as the base runtime

## Tasks / Subtasks

- [x] Task 1: Create Dockerfile with multi-stage build (AC: #1, #2, #7, #8)
  - [x] Stage 1 (`builder`): Use `node:24-alpine` base, copy `package.json` + `package-lock.json`, run `npm ci`, copy source, run `npm run build`
  - [x] Stage 2 (`production`): Use `node:24-alpine` base, copy only `dist/`, `node_modules/` (production), `package.json`, `drizzle/` from builder
  - [x] Set `NODE_ENV=production`, expose PORT via `ENV` and `EXPOSE`
  - [x] Set entrypoint to `node dist/server.js`
  - [x] Create `data/` directory in the image for SQLite mount point
  - [x] Add `.dockerignore` to exclude `node_modules`, `dist`, `.git`, `tests`, `data`, `_bmad*`
- [x] Task 2: Create docker-compose.yml (AC: #3, #4)
  - [x] Define `api` service using local build context
  - [x] Map port `${PORT:-3000}:${PORT:-3000}`
  - [x] Mount named volume `url-data` to `/app/data` for SQLite persistence
  - [x] Set environment variables from `.env` with documented defaults
  - [x] Add comments referencing `.env.example` for configuration documentation
- [x] Task 3: Create CI pipeline `.github/workflows/ci.yml` (AC: #5, #6)
  - [x] Trigger on `pull_request` to `main` and `push` to `main`
  - [x] Use `node:24` or `actions/setup-node@v4` with Node 24
  - [x] Steps: checkout → setup node → `npm ci` → `npm run typecheck` → `npm run lint` → `npm test`
  - [x] Fail the workflow if any step fails (default behavior)
- [x] Task 4: Verify Docker build locally
  - [x] Run `docker build -t url-shortener .` and verify image size < 100MB
  - [x] Run container with test environment variables and verify health check responds
- [x] Task 5: Verify all existing tests still pass
  - [x] Run `npm run typecheck`, `npm run lint`, `npm test`

## Dev Notes

### Architecture Compliance

- **File locations** — per architecture project structure:
  - `Dockerfile` — repo root (explicitly listed in architecture)
  - `docker-compose.yml` — repo root (explicitly listed in architecture)
  - `.github/workflows/ci.yml` — GitHub Actions workflow (explicitly listed in architecture)
  - `.dockerignore` — repo root (standard Docker convention)
- **No source code changes**: This story creates only deployment and CI infrastructure files. No modifications to `src/` or `tests/`.
- **Config contract**: Architecture specifies `PORT`, `BASE_URL`, `DATABASE_URL` (or `DATABASE_PATH`), `LOG_LEVEL` as the config contract. The project uses `DATABASE_PATH` (see `src/config/env.ts` and `.env.example`).

### Technical Requirements

- **Node runtime**: Node 24 LTS (`node:24-alpine` for Docker)
- **Build output**: TypeScript compiles to `dist/` via `tsc -p tsconfig.build.json`
- **Entry point**: `node dist/server.js` (see `package.json` `main` field and `start` script)
- **Production dependencies** (from `package.json`):
  - `better-sqlite3` — native addon, needs to be built during `npm ci` in the builder stage on Alpine (requires `python3`, `make`, `g++` build tools)
  - `drizzle-orm`, `fastify`, `zod` — pure JS
- **SQLite persistence**: The database file lives at the path specified by `DATABASE_PATH` env var (default `./data/urls.db`). Must be on a persistent volume in Docker.
- **Image size target**: Under 100MB (NFR16). Alpine base + production-only deps + compiled JS should achieve this. `better-sqlite3` native addon adds ~5MB.

### Dockerfile Implementation

```dockerfile
# Stage 1: Build
FROM node:24-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json drizzle.config.ts ./
COPY src/ src/
COPY drizzle/ drizzle/
RUN npm run build

# Stage 2: Production
FROM node:24-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && apk del python3 make g++
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
RUN mkdir -p data
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

**Critical notes on `better-sqlite3`:**
- `better-sqlite3` is a native Node addon that requires compilation. Alpine needs `python3 make g++` to build it during `npm ci`.
- The production stage must ALSO compile `better-sqlite3` from source (cannot copy `node_modules` from builder if architectures differ or to avoid copying devDependencies).
- After `npm ci --omit=dev`, remove build tools to keep the image small.
- Alternative: use `npm ci` in builder, then `npm ci --omit=dev` in production stage separately. Do NOT copy `node_modules` from builder (it includes devDependencies).

### docker-compose.yml Implementation

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "${PORT:-3000}:${PORT:-3000}"
    environment:
      - PORT=${PORT:-3000}
      - BASE_URL=${BASE_URL:-http://localhost:3000}
      - DATABASE_PATH=/app/data/urls.db
      - LOG_LEVEL=${LOG_LEVEL:-info}
    volumes:
      - url-data:/app/data
    restart: unless-stopped

volumes:
  url-data:
```

**Notes:**
- `DATABASE_PATH` is hardcoded to `/app/data/urls.db` inside the container since the volume is mounted there.
- Other variables use defaults matching `.env.example`.

### CI Pipeline Implementation

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test
```

**Notes:**
- Single job with sequential steps — any failure stops the pipeline.
- `actions/setup-node@v4` with `cache: 'npm'` for faster installs.
- `better-sqlite3` compiles on Ubuntu without extra packages (build-essential is pre-installed on `ubuntu-latest`).

### .dockerignore Implementation

```
node_modules
dist
.git
.gitignore
tests
data
_bmad*
_bmad-output
*.md
!README.md
.env
.env.*
!.env.example
```

### Existing Code to Reuse (DO NOT RECREATE)

- **`.env.example`** — already exists at repo root with PORT, BASE_URL, DATABASE_PATH, LOG_LEVEL
- **`package.json`** — already has `build`, `start`, `typecheck`, `lint`, `test` scripts
- **`tsconfig.build.json`** — already configured to compile `src/` to `dist/`
- **`drizzle/`** — migrations directory, must be included in Docker image for database setup
- **`drizzle.config.ts`** — needed during build for migration references

### Anti-Pattern Prevention

- **Do NOT** use `npm install` in Docker — use `npm ci` for reproducible builds from lockfile
- **Do NOT** copy `node_modules` from builder to production stage — production stage runs its own `npm ci --omit=dev` to exclude devDependencies
- **Do NOT** use `node:24` (Debian) for production image — use `node:24-alpine` for smaller image size
- **Do NOT** run the container as root — consider adding a non-root user (Alpine convention: `node` user already exists in node images)
- **Do NOT** include test files, `.git`, or `_bmad*` in the Docker image — use `.dockerignore`
- **Do NOT** hardcode environment variables in the Dockerfile — use `ENV` defaults only for NODE_ENV and EXPOSE
- **Do NOT** add Docker build/run steps to CI pipeline — the CI pipeline only runs type checking, linting, and tests per architecture spec
- **Do NOT** modify any source files in `src/` or `tests/` — this story is purely infrastructure
- **Do NOT** use `ENTRYPOINT` with shell form — use exec form `["node", "dist/server.js"]` via `CMD`
- **Do NOT** forget `drizzle/` directory in Docker image — it contains migration files needed at runtime

### Previous Story Intelligence

**Story 3.1 (review):**
- Created `src/routes/health-routes.ts`, `src/services/health-check-service.ts`, `src/schemas/health-schemas.ts`
- Health check endpoint at `GET /health` — useful for Docker health check and verifying container startup
- No changes to build/deployment infrastructure

**Story 3.2 (ready-for-dev):**
- Will add `@fastify/swagger` and `@fastify/swagger-ui` as dependencies
- These are pure JS packages — no impact on Docker native compilation
- Adds `/docs` endpoint — will be available in containerized deployment too

**Story 2.2 (done):**
- Request logging via Pino — LOG_LEVEL env var controls log verbosity
- Structured JSON logs in production — ideal for container log aggregation

### Git Intelligence

Recent commits show:
- Project builds successfully with `tsc -p tsconfig.build.json`
- All tests pass with `vitest run`
- ESM module system with `.js` extensions in imports
- `better-sqlite3` is the only native addon
- `drizzle/` directory exists with migrations

### File Structure (files to create)

```
simple-url-shortener-api/
├── .dockerignore                    (create)
├── Dockerfile                       (create)
├── docker-compose.yml               (create)
└── .github/
    └── workflows/
        └── ci.yml                   (create)
```

No files modified — purely additive.

### Testing Standards

- No new tests for this story — Dockerfile and CI are verified by building/running
- All existing tests must continue passing after this story (no source changes)
- CI pipeline itself validates: `npm run typecheck` → `npm run lint` → `npm test`

### Project Structure Notes

- All file paths align with the architecture's project structure definition
- `Dockerfile`, `docker-compose.yml` are explicitly listed in the architecture project structure at repo root
- `.github/workflows/ci.yml` is explicitly listed in the architecture project structure
- No conflicts or variances with the unified project structure

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Infrastructure & Deployment] — single Docker container, stateless app, config contract (PORT, BASE_URL, DATABASE_PATH, LOG_LEVEL), Vitest for tests
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries] — `Dockerfile`, `docker-compose.yml`, `.github/workflows/ci.yml` file locations, `data/` for SQLite persistence
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions] — CI quality gate: typecheck + lint + tests on PRs, Node 24 LTS runtime
- [Source: _bmad-output/planning-artifacts/architecture.md#Development Workflow Integration] — TypeScript builds to `dist/`, Docker bundles compiled app, CI validates before merge
- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.3] — acceptance criteria, FR26 (deploy as container), NFR14 (Docker packaging), NFR15 (idle memory < 128MB), NFR16 (image < 100MB)
- FR26 (deploy as container), NFR14 (Docker sufficient for local eval and basic production), NFR15 (idle memory < 128MB), NFR16 (Docker image < 100MB)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
