import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildTestApp } from '../fixtures/test-app.js'

interface OpenApiOperation {
  get?: unknown
  post?: unknown
}

interface OpenApiSpec {
  openapi: string
  info: {
    title: string
    version: string
  }
  paths: Record<string, OpenApiOperation>
}

describe('OpenAPI Documentation', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  afterEach(async () => {
    await app.close()
  })

  it('GET /docs returns Swagger UI HTML', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/docs'
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('text/html')
    expect(response.body).toContain('Swagger UI')
  })

  it('GET /docs/json returns valid OpenAPI spec', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/docs/json'
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('application/json')

    const spec = response.json() as OpenApiSpec

    expect(spec.openapi).toMatch(/^3\./)
  })

  it('OpenAPI spec includes POST /shorten', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/docs/json'
    })

    const spec = response.json() as OpenApiSpec

    expect(spec.paths['/shorten']).toBeDefined()
    expect(spec.paths['/shorten']?.post).toBeDefined()
  })

  it('OpenAPI spec includes GET /{shortCode}', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/docs/json'
    })

    const spec = response.json() as OpenApiSpec

    expect(spec.paths['/{shortCode}']).toBeDefined()
    expect(spec.paths['/{shortCode}']?.get).toBeDefined()
  })

  it('OpenAPI spec includes GET /health', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/docs/json'
    })

    const spec = response.json() as OpenApiSpec

    expect(spec.paths['/health']).toBeDefined()
    expect(spec.paths['/health']?.get).toBeDefined()
  })

  it('OpenAPI spec has correct title and version', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/docs/json'
    })

    const spec = response.json() as OpenApiSpec

    expect(spec.info.title).toBe('Simple URL Shortener API')
    expect(spec.info.version).toBe('0.1.0')
  })
})
