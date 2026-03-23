import { Writable } from 'node:stream'
import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app.js'

interface CapturedLogEntry {
  level: number
  msg: string
  method: string
  url: string
  statusCode: number
  responseTime: number
  errorCode?: string
}

function parseCapturedLogs(lines: string[]): CapturedLogEntry[] {
  return lines
    .flatMap((line) => line.trim().split('\n'))
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as CapturedLogEntry)
    .filter((entry) => entry.msg === 'request completed')
}

describe('Request logging', () => {
  let app: FastifyInstance
  let logLines: string[]

  beforeEach(async () => {
    logLines = []

    const stream = new Writable({
      write(chunk, _encoding, callback) {
        logLines.push(chunk.toString())
        callback()
      }
    })

    app = await buildApp({
      config: {
        port: 3000,
        baseUrl: 'http://localhost:3000/',
        databasePath: ':memory:',
        logLevel: 'info' as never
      },
      loggerOptions: {
        stream
      }
    })

    await app.ready()
  })

  afterEach(async () => {
    await app.close()
  })

  it('emits a structured JSON log entry for successful requests', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/shorten',
      headers: {
        'content-type': 'application/json'
      },
      payload: {
        url: 'https://example.com/logged-success'
      }
    })

    expect(response.statusCode).toBe(201)

    const entries = parseCapturedLogs(logLines)
    const entry = entries.at(-1)

    expect(entry).toMatchObject({
      level: 30,
      msg: 'request completed',
      method: 'POST',
      url: '/shorten',
      statusCode: 201
    })
    expect(entry?.responseTime).toEqual(expect.any(Number))
    expect(entry?.responseTime).toBeGreaterThanOrEqual(0)
  })

  it('includes NOT_FOUND error codes for 404 responses', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/missing1'
    })

    expect(response.statusCode).toBe(404)

    const entries = parseCapturedLogs(logLines)
    const entry = entries.at(-1)

    expect(entry).toMatchObject({
      level: 40,
      msg: 'request completed',
      method: 'GET',
      url: '/missing1',
      statusCode: 404,
      errorCode: 'NOT_FOUND'
    })
  })

  it('includes VALIDATION_ERROR for validation failures', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/shorten',
      headers: {
        'content-type': 'application/json'
      },
      payload: {
        url: 'ftp://example.com/invalid'
      }
    })

    expect(response.statusCode).toBe(400)

    const entries = parseCapturedLogs(logLines)
    const entry = entries.at(-1)

    expect(entry).toMatchObject({
      level: 40,
      msg: 'request completed',
      method: 'POST',
      url: '/shorten',
      statusCode: 400,
      errorCode: 'VALIDATION_ERROR'
    })
  })

  it('does not leak sensitive configuration values into logs', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/shorten',
      headers: {
        'content-type': 'application/json'
      },
      payload: {
        url: 'https://example.com/sensitive-check'
      }
    })

    expect(response.statusCode).toBe(201)

    const output = logLines.join('\n')

    expect(output).not.toContain('DATABASE_PATH')
    expect(output).not.toContain('databasePath')
    expect(output).not.toContain(':memory:')
  })
})
