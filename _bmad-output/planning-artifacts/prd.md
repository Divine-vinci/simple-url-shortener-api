---
workflow: create-prd
project: Simple URL Shortener API
date: 2026-03-23
author: John (PM)
source_artifact: product-brief.md
status: complete
classification:
  projectType: api_backend
  domain: developer-tools
  complexity: low-medium
  projectContext: greenfield
---

# Product Requirements Document: Simple URL Shortener API

## Executive Summary

Simple URL Shortener API is a greenfield, API-first infrastructure product for developers who need dependable URL shortening without adopting a bloated SaaS platform or maintaining a fragile one-off implementation. It solves a narrow but recurring problem: teams need short, shareable links inside their own products, but existing options force an undesirable tradeoff between third-party dependency, overbuilt self-hosted platforms, and low-quality DIY hacks.

The product is intentionally small. Its value comes from radical scope discipline: create short URLs, resolve them reliably, and stay operationally invisible. The primary user is a developer or small engineering team that wants to deploy the service quickly, integrate it in minutes, and trust it to work without ongoing attention.

### What Makes This Special

The differentiator is not novelty for its own sake. The differentiator is disciplined subtraction:
- API-only surface area
- self-hosted privacy and control
- lightweight deployment and resource usage
- fast path from setup to first successful short URL

The core insight is that many teams do not want a link-management platform. They want URL shortening as invisible infrastructure. This product is designed around that insight.

## Project Classification

- **Project Type:** API product / backend developer service
- **Domain:** Developer tools / infrastructure utility
- **Complexity:** Low to medium
- **Project Context:** Greenfield

## Success Criteria

### User Success

Users succeed when they can deploy the service, create a short URL, and integrate it into their application without reading extensive documentation or making architecture decisions of their own.

Primary user success criteria:
- A developer can run the service locally and create the first short URL in under 5 minutes.
- A developer can integrate URL creation into an application using fewer than 10 lines of client code.
- An end user clicking a short link reaches the destination with no perceptible delay.
- Operators can confirm service health quickly and diagnose the most common failures without entering the application codebase.

### Business Success

This is an open-source infrastructure utility, so business success is adoption and trust, not subscription revenue.

Business success criteria:
- The project gains clear developer adoption signals through GitHub stars, forks, and repeat usage.
- The Docker image or package sees consistent pulls/downloads from external users.
- External developers can adopt the service without filing support issues for core setup and use.
- The product becomes a credible recommendation for "self-hosted URL shortener API" use cases.

### Technical Success

Technical success is defined by reliability, low operational overhead, and simplicity.

Technical success criteria:
- Short-code creation responds within 100ms p95 under normal load.
- Redirect resolution responds within 50ms p95 under normal load.
- The service maintains 99.9% uptime in standard production deployment.
- Collision rate is effectively zero in normal operation.
- The idle service footprint stays below 128MB.
- The system can run stably for 72+ hours under light production load with no crashes or memory leaks.

### Measurable Outcomes

- Time to first short URL: **< 5 minutes**
- Integration effort: **< 10 lines of code**
- Create endpoint latency: **< 100ms p95**
- Redirect latency: **< 50ms p95**
- Uptime: **99.9%**
- Idle memory usage: **< 128MB**
- Core application code size target: **< 1000 LOC**

## Product Scope

### MVP - Minimum Viable Product

The MVP is a problem-solving MVP. It proves that teams want a lightweight, self-hosted, API-only shortener that is easier to adopt than full-featured alternatives and safer than DIY glue code.

MVP capabilities:
- create a short URL from a valid long URL
- redirect short URLs to original destinations
- persist mappings reliably
- expose a health check for operators
- support environment-based configuration
- package the service for one-command deployment via Docker

### Growth Features (Post-MVP)

These features improve competitiveness but are not required to validate the core value proposition:
- custom short codes
- URL expiration / TTL
- basic click counting
- API key authentication
- rate limiting
- admin endpoints for listing and deleting links
- PostgreSQL-first deployment optimization
- Prometheus metrics endpoint

### Vision (Future)

Longer-term expansion can include:
- official client SDKs
- Helm chart / Kubernetes deployment support
- pluggable short-code generation strategies
- privacy-respecting analytics
- multi-tenant deployment patterns for teams and platforms

## User Journeys

### Journey 1: Backend Developer - Core Success Path

Alex is a backend developer shipping a notification feature. They need shorter links for SMS and email. Existing SaaS APIs feel brittle and expensive, while self-hosted products look like whole applications they do not want to own.

Alex finds the project, runs the container locally, sets a base URL and database path, then sends a POST request with a long destination URL. The service returns a short code immediately. Alex adds one HTTP request in their application and starts using the service in production notifications.

**Climax:** the first real notification ships with a short link and resolves correctly when clicked.

**Resolution:** URL shortening becomes invisible infrastructure inside Alex's stack.

### Journey 2: Solo Developer - Resource-Constrained Adoption

Sam runs side projects on a small VPS and wants URL shortening without paying recurring SaaS fees or burning time on plumbing. Sam chooses the project because it is small, API-only, and easy to host.

Sam deploys with Docker Compose, confirms `/health` is working, and wires the shortener into a weekend project. Sam values that there is no dashboard, no account system, and no large operational footprint.

**Climax:** the shortener runs alongside the app without becoming another product to maintain.

**Resolution:** Sam gets reliable short-link capability at low cost and low cognitive load.

### Journey 3: Operator / Platform Engineer - Reliability Path

A platform engineer did not choose the shortener, but now owns keeping it alive. They need a service that behaves predictably, exposes health status, and fails in understandable ways.

They deploy the service with environment variables, attach health probes, and monitor logs. When an issue occurs, the failure is traceable to a small number of causes: bad config, database unavailability, invalid requests, or missing short codes.

**Climax:** the operator can diagnose service health quickly without learning a complex product.

**Resolution:** the service is acceptable to run in shared infrastructure because it is operationally boring.

### Journey 4: API Consumer - Error Recovery Path

A developer integrates the API but accidentally submits malformed URLs or requests non-existent short codes. They need predictable, machine-readable failure behavior.

The service returns clear validation errors for invalid input and 404 responses for missing short codes. The developer handles these outcomes cleanly in their own application.

**Climax:** integration does not break under common mistakes because error conditions are explicit.

**Resolution:** the product feels dependable even when usage is imperfect.

### Journey Requirements Summary

These journeys reveal the need for:
- fast setup and first success
- predictable API contracts and error behavior
- reliable redirect behavior
- low operational complexity
- health visibility for operators
- packaging and configuration suitable for self-hosting

## Domain-Specific Requirements

This is a low-to-medium complexity developer-tools domain, so no heavyweight regulatory section is required. The domain-specific needs are practical rather than compliance-driven.

### Technical Constraints

- Redirect behavior must use standard HTTP semantics so integrators do not need custom client logic.
- Stored URLs must be validated to reduce broken redirects and misuse.
- Short-code generation must avoid collisions without introducing unnecessary operational complexity.
- Configuration must work cleanly in local, containerized, and small production deployments.

### Risk Mitigations

- Prevent collisions with uniqueness checks and retry logic.
- Prevent malformed links through strict URL validation.
- Reduce deployment risk through environment-driven config and health checks.
- Keep operational blast radius small by minimizing dependencies.

## Innovation & Novel Patterns

No breakthrough innovation section is required. This product is not betting on a novel market thesis; it is betting on superior execution of a narrow, under-served use case. That is acceptable and strategically sound.

## API / Backend Specific Requirements

### Project-Type Overview

Because this is an API/backend product, the PRD must be explicit about externally exposed capabilities, service behavior, configuration, and operational expectations. It does not need UI requirements.

### Technical Architecture Considerations

- The product must expose a small REST API surface optimized for programmatic use.
- The API contract must be stable, explicit, and versionable.
- The storage model must support fast reads for redirect resolution and durable writes for short-link creation.
- The service should start with SQLite-compatible simplicity while leaving a clean upgrade path to PostgreSQL.

### Endpoint Requirements

Required MVP endpoints:
- `POST /shorten`
- `GET /:shortCode`
- `GET /health`

### Authentication Model

MVP requires no built-in authentication. The initial product assumes trusted network placement or external gateway protection. Authentication can be added later if usage patterns justify it.

### Data Contract Requirements

- Requests and non-redirect responses use JSON.
- Validation failures return structured error responses.
- Redirect endpoint returns standard HTTP redirect responses, not JSON wrappers.

### Implementation Considerations

- The product should support local development with minimal config.
- Deployment should be container-friendly.
- Failure modes should be explicit and debuggable.
- The API surface should remain small enough to document fully in a concise README.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Prove the core utility with the smallest production-worthy API.

**Resource Requirements:** One engineer can build and operate the MVP. No design team or frontend effort is required.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- developer creates short URL
- end user follows short URL to destination
- operator checks service health
- integrator handles common API errors

**Must-Have Capabilities:**
- create short links
- resolve short links
- persist mappings
- validate URLs
- expose health status
- configure base URL, port, and storage via environment variables
- containerized deployment

### Post-MVP Features

**Phase 2 (Growth):** custom codes, expiration, basic analytics, auth, rate limiting, admin operations.

**Phase 3 (Expansion):** SDKs, Kubernetes packaging, plugin architecture, advanced metrics, multi-tenant patterns.

### Risk Mitigation Strategy

**Technical Risks:** collision handling, redirect correctness, storage durability. Mitigation: simple schema, unique indexes, explicit tests around code generation and redirects.

**Market Risks:** developers may prefer existing SaaS or fully featured self-hosted options. Mitigation: position sharply around simplicity, privacy, and time-to-value.

**Resource Risks:** feature creep can destroy the product's advantage. Mitigation: preserve strict MVP boundaries and defer non-essential capabilities.

## Functional Requirements

### URL Creation

- **FR1:** Developers can submit a long URL to create a short URL.
- **FR2:** The system can validate whether a submitted URL is structurally valid before creating a short URL.
- **FR3:** The system can generate a unique short code for each accepted URL.
- **FR4:** The system can return the generated short code and full short URL in the creation response.
- **FR5:** Developers can receive a clear error response when URL creation input is invalid.
- **FR6:** The system can handle duplicate destination URLs according to a defined product rule.

### Redirect Resolution

- **FR7:** End users can request a short URL and be redirected to the original destination.
- **FR8:** The system can return an error response when a short code does not exist.
- **FR9:** The system can preserve redirect correctness independent of client or browser type.

### Link Persistence & Data Management

- **FR10:** The system can persist each short-code-to-URL mapping.
- **FR11:** The system can store the creation timestamp for each short URL.
- **FR12:** The system can guarantee uniqueness of stored short codes.
- **FR13:** The system can retrieve stored mappings fast enough to support low-latency redirects.

### API Contract & Integration

- **FR14:** Developers can interact with the service through a documented REST API.
- **FR15:** The system can accept JSON requests for non-redirect operations.
- **FR16:** The system can return JSON responses for creation, validation, and health operations.
- **FR17:** Developers can receive structured machine-readable errors for failed API requests.
- **FR18:** The system can maintain a stable API contract for MVP endpoints.

### Operations & Configuration

- **FR19:** Operators can configure the service through environment variables.
- **FR20:** Operators can set the public base URL used to construct returned short URLs.
- **FR21:** Operators can configure the listening port.
- **FR22:** Operators can configure the storage location or database connection.
- **FR23:** Operators can check service health through a dedicated endpoint.
- **FR24:** The health endpoint can indicate whether the service and storage layer are operational.

### Deployment & Packaging

- **FR25:** Developers can run the service locally with minimal setup.
- **FR26:** Operators can deploy the service as a container.
- **FR27:** Developers can use a one-command local setup path for evaluation.

### Error Handling & Reliability

- **FR28:** Developers can distinguish between validation errors, missing resources, and server failures.
- **FR29:** The system can fail predictably when storage is unavailable.
- **FR30:** The system can log operationally relevant events needed for debugging and monitoring.

### Extensibility Boundaries

- **FR31:** The product can be extended later to support custom short codes without redefining the core API purpose.
- **FR32:** The product can be extended later to support expiration policies.
- **FR33:** The product can be extended later to support authentication and rate limiting.

## Non-Functional Requirements

### Performance

- Create-short-url requests must complete within **100ms p95** under normal expected load.
- Redirect requests must complete within **50ms p95** under normal expected load.
- The service must not introduce perceptible latency to the end-user click experience.

### Reliability

- The service must achieve **99.9% uptime** in standard production deployment.
- The service must continue stable operation for **72+ hours** under light production load without crashes or memory leaks.
- Redirect behavior must remain correct across restart cycles and normal deployment events.

### Security

- The system must validate all incoming URLs before persistence.
- The system must avoid exposing sensitive configuration values in logs or API responses.
- The system must support deployment behind trusted network controls or external gateways.

### Scalability

- The system must support meaningful early-stage production traffic for small teams without architectural change.
- The storage and service design must preserve a clear migration path from SQLite-class simplicity to PostgreSQL-class scale.

### Operability & Integration

- The service must be configurable entirely through environment variables for standard deployment environments.
- The health endpoint must be suitable for use by load balancers, orchestrators, and uptime monitors.
- Docker packaging must be sufficient for local evaluation and basic production deployment.

### Resource Efficiency

- Idle memory usage should remain below **128MB** in standard deployment.
- Docker image size should stay below **100MB** where practical.

## Assumptions

- MVP deployment occurs in trusted environments where external auth and rate limiting can be delegated to infrastructure.
- Initial users value speed, privacy, and simplicity more than built-in analytics or administration features.
- SQLite is sufficient for MVP validation and small-scale production use.

## Out of Scope

The following are intentionally excluded from MVP:
- user accounts and identity management
- API keys and tenant management
- analytics dashboards and click tracking
- custom short codes
- URL expiration policies
- bulk shortening
- frontend or admin UI
- QR code generation
- webhook integrations
- built-in rate limiting

## Open Questions for Architecture

These are not blockers for the PRD, but architecture should answer them explicitly:
- Should duplicate long URLs return the same existing short code or create a new one every time?
- Should redirects default to 301 or 302 in MVP, and under what rule?
- What short-code length and alphabet best balance readability and collision resistance?
- What logging shape best supports minimal but useful operations visibility?

## Document Readiness Summary

This PRD is ready to drive architecture, epic definition, and implementation planning. It defines:
- the product vision and differentiator
- measurable success criteria
- the primary user and operator journeys
- scope boundaries for MVP and later phases
- the capability contract through functional requirements
- quality expectations through non-functional requirements

The central product bet remains simple: if a developer can self-host this service, integrate it in minutes, and forget it exists because it works, the product is doing its job.


## Workflow Completion

PRD completed and polished. Final artifact written to `_bmad-output/planning-artifacts/prd.md`.

Key sections included:
- Executive Summary
- Project Classification
- Success Criteria
- Product Scope
- User Journeys
- Domain-Specific Requirements
- Innovation Assessment
- API / Backend Specific Requirements
- Project Scoping & Phased Development
- Functional Requirements
- Non-Functional Requirements
- Assumptions, Out of Scope, and Open Questions

Recommended next workflow: `create-architecture`.
