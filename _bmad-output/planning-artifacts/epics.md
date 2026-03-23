---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - /home/clawd/projects/simple-url-shortener-api/_bmad-output/planning-artifacts/prd.md
  - /home/clawd/projects/simple-url-shortener-api/_bmad-output/planning-artifacts/architecture.md
workflowType: 'create-epics-and-stories'
project_name: 'Simple URL Shortener API'
date: '2026-03-23'
status: 'complete'
completedAt: '2026-03-23'
---

# Simple URL Shortener API - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Simple URL Shortener API, decomposing the requirements from the PRD and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

- FR1: Developers can submit a long URL to create a short URL.
- FR2: The system can validate whether a submitted URL is structurally valid before creating a short URL.
- FR3: The system can generate a unique short code for each accepted URL.
- FR4: The system can return the generated short code and full short URL in the creation response.
- FR5: Developers can receive a clear error response when URL creation input is invalid.
- FR6: The system can handle duplicate destination URLs according to a defined product rule.
- FR7: End users can request a short URL and be redirected to the original destination.
- FR8: The system can return an error response when a short code does not exist.
- FR9: The system can preserve redirect correctness independent of client or browser type.
- FR10: The system can persist each short-code-to-URL mapping.
- FR11: The system can store the creation timestamp for each short URL.
- FR12: The system can guarantee uniqueness of stored short codes.
- FR13: The system can retrieve stored mappings fast enough to support low-latency redirects.
- FR14: Developers can interact with the service through a documented REST API.
- FR15: The system can accept JSON requests for non-redirect operations.
- FR16: The system can return JSON responses for creation, validation, and health operations.
- FR17: Developers can receive structured machine-readable errors for failed API requests.
- FR18: The system can maintain a stable API contract for MVP endpoints.
- FR19: Operators can configure the service through environment variables.
- FR20: Operators can set the public base URL used to construct returned short URLs.
- FR21: Operators can configure the listening port.
- FR22: Operators can configure the storage location or database connection.
- FR23: Operators can check service health through a dedicated endpoint.
- FR24: The health endpoint can indicate whether the service and storage layer are operational.
- FR25: Developers can run the service locally with minimal setup.
- FR26: Operators can deploy the service as a container.
- FR27: Developers can use a one-command local setup path for evaluation.
- FR28: Developers can distinguish between validation errors, missing resources, and server failures.
- FR29: The system can fail predictably when storage is unavailable.
- FR30: The system can log operationally relevant events needed for debugging and monitoring.
- FR31: The product can be extended later to support custom short codes without redefining the core API purpose.
- FR32: The product can be extended later to support expiration policies.
- FR33: The product can be extended later to support authentication and rate limiting.

### NonFunctional Requirements

- NFR1: Create-short-url requests must complete within 100ms p95 under normal expected load.
- NFR2: Redirect requests must complete within 50ms p95 under normal expected load.
- NFR3: The service must not introduce perceptible latency to the end-user click experience.
- NFR4: The service must achieve 99.9% uptime in standard production deployment.
- NFR5: The service must continue stable operation for 72+ hours under light production load without crashes or memory leaks.
- NFR6: Redirect behavior must remain correct across restart cycles and normal deployment events.
- NFR7: The system must validate all incoming URLs before persistence.
- NFR8: The system must avoid exposing sensitive configuration values in logs or API responses.
- NFR9: The system must support deployment behind trusted network controls or external gateways.
- NFR10: The system must support meaningful early-stage production traffic for small teams without architectural change.
- NFR11: The storage and service design must preserve a clear migration path from SQLite-class simplicity to PostgreSQL-class scale.
- NFR12: The service must be configurable entirely through environment variables for standard deployment environments.
- NFR13: The health endpoint must be suitable for use by load balancers, orchestrators, and uptime monitors.
- NFR14: Docker packaging must be sufficient for local evaluation and basic production deployment.
- NFR15: Idle memory usage should remain below 128MB in standard deployment.
- NFR16: Docker image size should stay below 100MB where practical.

### Additional Requirements

**From Architecture — Starter Template:**
- Project must be initialized using Fastify starter: `npm create fastify@latest simple-url-shortener-api -- --lang=ts` (Epic 1, Story 1)
- Runtime: Fastify 5.8.2 on Node 24 LTS
- TypeScript-first project setup

**From Architecture — Persistence:**
- SQLite for MVP with Drizzle ORM 0.45.1 and Drizzle Kit 0.31.10
- Primary table: `short_urls` with columns: id, short_code (unique, indexed), original_url, normalized_url (unique), created_at
- Duplicate destination URLs return the existing active short code in MVP

**From Architecture — Short Code Generation:**
- 7-character base62 codes with database-backed uniqueness enforcement and retry-on-collision

**From Architecture — Redirect Behavior:**
- Default to HTTP 302 for MVP

**From Architecture — Validation:**
- Zod 4.3.6 for input/config validation
- Single structured error format: `{ "error": { "code": string, "message": string, "details"?: object } }`

**From Architecture — Observability:**
- Logging via Pino 10.3.1 and Fastify request logging
- OpenAPI docs using @fastify/swagger 9.7.0 and @fastify/swagger-ui 5.2.5

**From Architecture — Testing:**
- Vitest 4.1.0 for unit and integration tests
- tsx 4.21.0 for local TS execution

**From Architecture — Deployment:**
- Single Docker container, stateless app process except attached SQLite volume
- Config contract: PORT, BASE_URL, DATABASE_URL (or DATABASE_PATH), LOG_LEVEL
- CI quality gate: typecheck + lint + unit/integration tests on pull requests

**From Architecture — Project Structure:**
- Group code by architectural role: routes/, services/, repositories/, schemas/, plugins/, config/, db/, lib/, types/
- Tests under tests/unit/ and tests/integration/
- kebab-case file names, PascalCase types, camelCase functions/variables

**From Architecture — Security:**
- Enforce request body size limits and standard security headers
- Validate URL syntax, require http or https schemes
- No built-in auth for MVP

### FR Coverage Map

- FR1: Epic 1 — Submit long URL to create short URL
- FR2: Epic 1 — Validate URL structure
- FR3: Epic 1 — Generate unique short code
- FR4: Epic 1 — Return short code and full short URL
- FR5: Epic 1 — Clear error for invalid input
- FR6: Epic 1 — Handle duplicate destination URLs
- FR7: Epic 2 — Redirect short URL to destination
- FR8: Epic 2 — Error when short code not found
- FR9: Epic 2 — Redirect correctness across clients
- FR10: Epic 1 — Persist short-code-to-URL mapping
- FR11: Epic 1 — Store creation timestamp
- FR12: Epic 1 — Guarantee short code uniqueness
- FR13: Epic 2 — Fast retrieval for low-latency redirects
- FR14: Epic 3 — Documented REST API
- FR15: Epic 1 — Accept JSON requests
- FR16: Epic 1 — Return JSON responses
- FR17: Epic 1 — Structured machine-readable errors
- FR18: Epic 3 — Stable API contract
- FR19: Epic 1 — Configure via environment variables
- FR20: Epic 1 — Set public base URL
- FR21: Epic 1 — Configure listening port
- FR22: Epic 1 — Configure storage location
- FR23: Epic 3 — Health check endpoint
- FR24: Epic 3 — Health indicates service and storage status
- FR25: Epic 1 — Run locally with minimal setup
- FR26: Epic 3 — Deploy as container
- FR27: Epic 1 — One-command local setup
- FR28: Epic 2 — Distinguish error types
- FR29: Epic 2 — Predictable failure when storage unavailable
- FR30: Epic 2 — Log operationally relevant events
- FR31: Epic 3 — Extensible for custom short codes
- FR32: Epic 3 — Extensible for expiration policies
- FR33: Epic 3 — Extensible for auth and rate limiting

## Epic List

### Epic 1: Project Foundation & Core URL Shortening
Developers can deploy the service locally and create their first short URL — validating the core value proposition end-to-end with a working POST /shorten endpoint, persistence, configuration, and structured error handling.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR10, FR11, FR12, FR15, FR16, FR17, FR19, FR20, FR21, FR22, FR25, FR27

### Epic 2: Redirect Resolution & End-User Experience
End users clicking short URLs are reliably redirected to their destinations, completing the core product loop with low-latency lookups, proper HTTP redirect semantics, error differentiation, and operational logging.
**FRs covered:** FR7, FR8, FR9, FR13, FR28, FR29, FR30

### Epic 3: API Documentation, Health Monitoring & Production Readiness
Operators can monitor service health, developers can discover the API contract through generated docs, and the service is packaged for production deployment with Docker, CI, and clean extensibility boundaries.
**FRs covered:** FR14, FR18, FR23, FR24, FR26, FR31, FR32, FR33

## Epic 1: Project Foundation & Core URL Shortening

Developers can deploy the service locally and create their first short URL — validating the core value proposition end-to-end with a working POST /shorten endpoint, persistence, configuration, and structured error handling.

### Story 1.1: Initialize Fastify TypeScript Project with Environment Configuration

As a developer,
I want to initialize the project with Fastify and TypeScript and load configuration from environment variables,
So that I have a running local server with validated config as the foundation for all subsequent features.

**Acceptance Criteria:**

**Given** a fresh checkout of the repository
**When** the developer runs `npm install` and starts the dev server
**Then** the Fastify server starts and listens on the configured PORT (default 3000)
**And** BASE_URL, PORT, DATABASE_PATH, and LOG_LEVEL are read from environment variables with sensible defaults
**And** invalid or missing required config values cause a clear startup error via Zod validation
**And** an `.env.example` file documents all available environment variables
**And** the project uses the directory structure defined in Architecture (src/config/, src/plugins/, src/routes/, src/services/, src/repositories/, src/schemas/, src/db/, src/lib/, src/types/)
**And** TypeScript compilation succeeds with no errors
**And** Vitest is configured and a placeholder test passes

**References:** FR19, FR20, FR21, FR22, FR25, FR27, NFR12

### Story 1.2: Database Schema and Persistence Layer

As a developer,
I want the short_urls table created and a repository layer for CRUD operations,
So that short URL mappings can be reliably stored and retrieved.

**Acceptance Criteria:**

**Given** the Fastify server starts with a valid DATABASE_PATH
**When** the application initializes
**Then** the SQLite database and short_urls table are created via Drizzle ORM migration
**And** the table has columns: id (integer primary key), short_code (text, unique, indexed), original_url (text, not null), normalized_url (text, not null, unique), created_at (timestamp, not null)
**And** the repository exposes methods to insert a new short URL record and find by short_code and find by normalized_url
**And** the repository returns typed domain records, not raw SQL driver objects
**And** a unit test verifies repository insert and lookup operations against an in-memory or temp SQLite database

**References:** FR10, FR11, FR12, NFR11

### Story 1.3: Short Code Generation Service

As a developer,
I want a service that generates unique 7-character base62 short codes,
So that each shortened URL gets a collision-resistant, URL-safe identifier.

**Acceptance Criteria:**

**Given** the short code generation service is called
**When** a new short code is requested
**Then** a 7-character string using characters [a-zA-Z0-9] is returned
**And** the generated code is cryptographically random (using Node crypto)
**And** if a generated code collides with an existing database entry, the service retries up to 3 times before throwing an error
**And** unit tests verify code length, character set, and retry-on-collision behavior

**References:** FR3, FR12

### Story 1.4: URL Validation and Normalization Service

As a developer,
I want submitted URLs validated for structure and normalized for duplicate detection,
So that only valid URLs are persisted and duplicate destinations return existing short codes.

**Acceptance Criteria:**

**Given** a URL is submitted to the validation service
**When** the URL has a valid http or https scheme and valid structure
**Then** validation passes and the URL proceeds to normalization
**And** normalization canonicalizes the URL (lowercasing scheme and host, removing default ports, sorting query params, removing trailing slashes) for consistent duplicate detection

**Given** a URL is submitted with an invalid scheme (ftp, javascript, etc.) or malformed structure
**When** validation runs
**Then** a structured validation error is returned with code "VALIDATION_ERROR"
**And** the error follows the format: `{ "error": { "code": "VALIDATION_ERROR", "message": string, "details": object } }`

**Given** a URL is submitted that normalizes to match an existing stored normalized_url
**When** the shorten service processes the request
**Then** the existing short code is returned instead of creating a new one

**And** unit tests cover valid URLs, invalid schemes, malformed URLs, and normalization edge cases

**References:** FR2, FR5, FR6, NFR7

### Story 1.5: POST /shorten Endpoint with Structured JSON Responses

As a developer,
I want a POST /shorten endpoint that accepts a JSON body with a URL and returns the generated short URL,
So that I can programmatically create short URLs and integrate them into my application.

**Acceptance Criteria:**

**Given** a valid JSON request body `{ "url": "https://example.com/long-path" }` is POSTed to /shorten
**When** the URL passes validation
**Then** the response has status 201 and body `{ "shortCode": "abc1234", "shortUrl": "https://base.url/abc1234", "originalUrl": "https://example.com/long-path", "createdAt": "ISO8601 timestamp" }`
**And** the shortUrl is constructed using the configured BASE_URL

**Given** a request body with an invalid or missing URL
**When** POSTed to /shorten
**Then** the response has status 400 and body `{ "error": { "code": "VALIDATION_ERROR", "message": string } }`

**Given** a request body with a URL that matches an already-shortened destination (after normalization)
**When** POSTed to /shorten
**Then** the existing short code and short URL are returned with status 200

**Given** a request with wrong content type or empty body
**When** POSTed to /shorten
**Then** a 400 error with structured error response is returned

**And** the centralized error handler plugin maps all domain errors to the standard error format
**And** request body size is limited to prevent abuse
**And** integration tests verify success, validation error, duplicate, and malformed request scenarios

**References:** FR1, FR4, FR5, FR15, FR16, FR17

---

## Epic 2: Redirect Resolution & End-User Experience

End users clicking short URLs are reliably redirected to their destinations, completing the core product loop with low-latency lookups, proper HTTP redirect semantics, error differentiation, and operational logging.

### Story 2.1: GET /:shortCode Redirect Endpoint

As an end user,
I want to click a short URL and be redirected to the original destination,
So that short links work transparently and take me where I expect to go.

**Acceptance Criteria:**

**Given** a valid short code exists in the database
**When** a GET request is made to /:shortCode
**Then** the server responds with HTTP 302 and a Location header pointing to the original URL
**And** no JSON body is returned for successful redirects
**And** the redirect works correctly regardless of client or browser type

**Given** a short code that does not exist in the database
**When** a GET request is made to /:shortCode
**Then** the server responds with HTTP 404 and body `{ "error": { "code": "NOT_FOUND", "message": "Short URL not found" } }`

**Given** the database is unavailable or returns an unexpected error
**When** a GET request is made to /:shortCode
**Then** the server responds with HTTP 500 and body `{ "error": { "code": "INTERNAL_ERROR", "message": string } }`
**And** the error is logged with sufficient detail for debugging but without exposing sensitive internals

**And** integration tests verify successful redirect, 404 for missing code, and error handling

**References:** FR7, FR8, FR9, FR13, FR28, FR29

### Story 2.2: Request Logging and Operational Observability

As an operator,
I want structured request logs for all API operations,
So that I can debug issues, monitor traffic patterns, and trace failures without entering the application codebase.

**Acceptance Criteria:**

**Given** any HTTP request is made to the service
**When** the request completes (success or failure)
**Then** a structured JSON log entry is emitted via Pino including method, path, status code, and response time
**And** error responses include error codes in the log entry for quick filtering
**And** sensitive configuration values (DATABASE_PATH contents, internal paths) are not logged
**And** log level is configurable via the LOG_LEVEL environment variable
**And** the request logging plugin is registered as a Fastify plugin

**And** integration tests verify that log output is produced for requests and that error scenarios produce appropriate log entries

**References:** FR30, NFR8

---

## Epic 3: API Documentation, Health Monitoring & Production Readiness

Operators can monitor service health, developers can discover the API contract through generated docs, and the service is packaged for production deployment with Docker, CI, and clean extensibility boundaries.

### Story 3.1: Health Check Endpoint

As an operator,
I want a GET /health endpoint that reports service and database status,
So that I can attach health probes from load balancers, orchestrators, and uptime monitors.

**Acceptance Criteria:**

**Given** the service is running and the database is accessible
**When** a GET request is made to /health
**Then** the response has status 200 and body `{ "status": "ok", "database": "ok" }`

**Given** the service is running but the database is inaccessible
**When** a GET request is made to /health
**Then** the response has status 503 and body `{ "status": "error", "database": "error" }`

**And** the health check performs a lightweight database probe (e.g., SELECT 1) to verify connectivity
**And** integration tests verify both healthy and degraded states

**References:** FR23, FR24, NFR13

### Story 3.2: OpenAPI Documentation

As a developer,
I want auto-generated OpenAPI documentation served at /docs,
So that I can discover and understand the API contract without reading source code.

**Acceptance Criteria:**

**Given** the Fastify server is running
**When** a GET request is made to /docs
**Then** a Swagger UI page is served showing all API endpoints with their request/response schemas
**And** the OpenAPI spec includes POST /shorten, GET /:shortCode, and GET /health
**And** request and response schemas match the implemented Zod validation schemas
**And** the API title and version are set from project metadata
**And** @fastify/swagger and @fastify/swagger-ui plugins are registered

**And** the API contract is stable and versioned (FR18)
**And** the route and schema structure supports future addition of custom short codes (FR31), expiration (FR32), and auth (FR33) without breaking existing endpoints

**References:** FR14, FR18, FR31, FR32, FR33

### Story 3.3: Docker Packaging and CI Pipeline

As an operator,
I want a Dockerfile and docker-compose.yml for one-command deployment, and a CI pipeline for quality gates,
So that I can deploy the service to production with confidence and catch regressions before merge.

**Acceptance Criteria:**

**Given** the repository contains a Dockerfile
**When** `docker build` is run
**Then** a container image is produced under 100MB containing the compiled application and production dependencies
**And** the container runs the service on the configured PORT with environment variable support
**And** a docker-compose.yml is provided that mounts a persistent volume for the SQLite database file

**Given** the repository contains a CI workflow (.github/workflows/ci.yml)
**When** a pull request is opened
**Then** the pipeline runs TypeScript type checking, linting, and all unit/integration tests
**And** the pipeline fails if any check does not pass

**And** the Dockerfile uses a multi-stage build for minimal image size
**And** the docker-compose.yml includes the .env.example variables as documentation

**References:** FR26, NFR14, NFR15, NFR16
