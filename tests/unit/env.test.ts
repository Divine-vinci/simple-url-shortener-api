import { describe, expect, it } from 'vitest'
import { loadEnv } from '../../src/config/env.js'

describe('loadEnv', () => {
  it('returns defaults when no env vars are set', () => {
    const env = loadEnv({})
    expect(env.PORT).toBe(3000)
    expect(env.BASE_URL).toBe('http://localhost:3000')
    expect(env.DATABASE_PATH).toBe('./data/urls.db')
    expect(env.LOG_LEVEL).toBe('info')
  })

  it('parses valid env vars', () => {
    const env = loadEnv({
      PORT: '8080',
      BASE_URL: 'https://sho.rt',
      DATABASE_PATH: '/tmp/test.db',
      LOG_LEVEL: 'debug'
    })
    expect(env.PORT).toBe(8080)
    expect(env.BASE_URL).toBe('https://sho.rt')
    expect(env.DATABASE_PATH).toBe('/tmp/test.db')
    expect(env.LOG_LEVEL).toBe('debug')
  })

  it('throws on invalid PORT', () => {
    expect(() => loadEnv({ PORT: 'abc' })).toThrow('Invalid environment configuration')
  })

  it('throws on PORT out of range', () => {
    expect(() => loadEnv({ PORT: '0' })).toThrow('Invalid environment configuration')
    expect(() => loadEnv({ PORT: '99999' })).toThrow('Invalid environment configuration')
  })

  it('throws on invalid BASE_URL', () => {
    expect(() => loadEnv({ BASE_URL: 'not-a-url' })).toThrow('Invalid environment configuration')
  })

  it('throws on invalid LOG_LEVEL', () => {
    expect(() => loadEnv({ LOG_LEVEL: 'verbose' })).toThrow('Invalid environment configuration')
  })

  it('throws on empty DATABASE_PATH', () => {
    expect(() => loadEnv({ DATABASE_PATH: '   ' })).toThrow('Invalid environment configuration')
  })

  it('includes field path in error message', () => {
    try {
      loadEnv({ PORT: 'abc' })
      expect.fail('should have thrown')
    } catch (error) {
      expect((error as Error).message).toContain('PORT')
    }
  })
})
