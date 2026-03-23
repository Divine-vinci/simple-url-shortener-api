import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildTestApp } from '../fixtures/test-app.js'

describe('POST /shorten', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  afterEach(async () => {
    await app.close()
  })

  it('returns 201 with structured JSON for a new valid URL', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/shorten',
      headers: {
        'content-type': 'application/json'
      },
      payload: {
        url: 'https://example.com/long-path'
      }
    })

    expect(response.statusCode).toBe(201)
    expect(response.headers['content-type']).toContain('application/json')

    const body = response.json()

    expect(body).toMatchObject({
      shortCode: expect.stringMatching(/^[A-Za-z0-9]{7}$/),
      shortUrl: expect.stringMatching(/^http:\/\/localhost:3000\/[A-Za-z0-9]{7}$/),
      originalUrl: 'https://example.com/long-path',
      createdAt: expect.any(String)
    })
    expect(new Date(body.createdAt).toISOString()).toBe(body.createdAt)
  })

  it('returns 200 with the existing short URL for duplicate normalized URLs', async () => {
    const firstResponse = await app.inject({
      method: 'POST',
      url: '/shorten',
      headers: {
        'content-type': 'application/json'
      },
      payload: {
        url: 'https://example.com/path/?b=2&a=1#section'
      }
    })

    const secondResponse = await app.inject({
      method: 'POST',
      url: '/shorten',
      headers: {
        'content-type': 'application/json'
      },
      payload: {
        url: 'https://EXAMPLE.com:443/path?a=1&b=2'
      }
    })

    expect(firstResponse.statusCode).toBe(201)
    expect(secondResponse.statusCode).toBe(200)

    const firstBody = firstResponse.json()
    const secondBody = secondResponse.json()

    expect(secondBody).toEqual(firstBody)
  })

  it('returns 400 VALIDATION_ERROR for invalid URLs', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/shorten',
      headers: {
        'content-type': 'application/json'
      },
      payload: {
        url: 'ftp://example.com/resource'
      }
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'URL protocol must be http or https; received ftp:'
      }
    })
  })

  it('returns 400 VALIDATION_ERROR when the url field is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/shorten',
      headers: {
        'content-type': 'application/json'
      },
      payload: {}
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.any(String)
      }
    })
  })

  it('returns 400 VALIDATION_ERROR for an empty JSON body', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/shorten',
      headers: {
        'content-type': 'application/json'
      },
      payload: ''
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.any(String)
      }
    })
  })

  it('returns 400 VALIDATION_ERROR for unsupported content types', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/shorten',
      headers: {
        'content-type': 'text/plain'
      },
      payload: 'https://example.com'
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.any(String)
      }
    })
  })
})
