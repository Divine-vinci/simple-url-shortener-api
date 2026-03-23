import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShortUrlRepository } from '../../src/repositories/short-url-repository.js'
import { buildTestApp } from '../fixtures/test-app.js'

describe('GET /:shortCode', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await app.close()
  })

  it('returns 302 with a Location header for an existing short code and no response body', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/shorten',
      headers: {
        'content-type': 'application/json'
      },
      payload: {
        url: 'https://example.com/original-destination?ref=redirect'
      }
    })

    const { shortCode } = createResponse.json()

    const response = await app.inject({
      method: 'GET',
      url: `/${shortCode}`
    })

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe('https://example.com/original-destination?ref=redirect')
    expect(response.body).toBe('')
  })

  it('returns 404 NOT_FOUND for an unknown short code', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/missing1'
    })

    expect(response.statusCode).toBe(404)
    expect(response.headers['content-type']).toContain('application/json')
    expect(response.json()).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Short URL not found'
      }
    })
  })

  it('redirects to the stored original URL rather than the normalized URL variant', async () => {
    const submittedUrl = 'https://Example.com:443/path/?b=2&a=1#frag'
    const createResponse = await app.inject({
      method: 'POST',
      url: '/shorten',
      headers: {
        'content-type': 'application/json'
      },
      payload: {
        url: submittedUrl
      }
    })

    const createdBody = createResponse.json()
    const { shortCode } = createdBody

    const response = await app.inject({
      method: 'GET',
      url: `/${shortCode}`
    })

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(createdBody.originalUrl)
    expect(response.headers.location).not.toBe('https://example.com/path/?a=1&b=2')
  })

  it('returns 500 INTERNAL_ERROR when repository lookup throws unexpectedly', async () => {
    vi.spyOn(ShortUrlRepository.prototype, 'findByShortCode').mockImplementation(() => {
      throw new Error('database unavailable')
    })

    const response = await app.inject({
      method: 'GET',
      url: '/boom123'
    })

    expect(response.statusCode).toBe(500)
    expect(response.headers['content-type']).toContain('application/json')
    expect(response.json()).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    })
  })
})
