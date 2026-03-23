import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { loadConfig } from '../../src/config/app-config.js'

describe('loadConfig', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    // Clear any env vars that would interfere with defaults
    delete process.env.PORT
    delete process.env.BASE_URL
    delete process.env.DATABASE_PATH
    delete process.env.LOG_LEVEL
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns a typed AppConfig object with defaults', () => {
    const config = loadConfig()
    expect(config).toEqual({
      port: 3000,
      baseUrl: 'http://localhost:3000',
      databasePath: './data/urls.db',
      logLevel: 'info'
    })
  })

  it('maps env var names to camelCase config keys', () => {
    const config = loadConfig()
    expect(config).toHaveProperty('port')
    expect(config).toHaveProperty('baseUrl')
    expect(config).toHaveProperty('databasePath')
    expect(config).toHaveProperty('logLevel')
  })
})
