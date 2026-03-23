import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildTestApp } from '../fixtures/test-app.js'

describe('GET /health', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await app.close()
  })

  it('returns 200 with ok service and database status when the database probe succeeds', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health'
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('application/json')
    expect(response.json()).toEqual({
      status: 'ok',
      database: 'ok'
    })
  })

  it('returns 503 with error service and database status when the database probe fails', async () => {
    vi.spyOn(app.db, 'get').mockImplementation(() => {
      throw new Error('database unavailable')
    })

    const response = await app.inject({
      method: 'GET',
      url: '/health'
    })

    expect(response.statusCode).toBe(503)
    expect(response.headers['content-type']).toContain('application/json')
    expect(response.json()).toEqual({
      status: 'error',
      database: 'error'
    })
  })
})
