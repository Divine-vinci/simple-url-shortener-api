import os from 'node:os'
import path from 'node:path'
import { mkdtemp, rm } from 'node:fs/promises'
import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { createDatabaseClient } from '../../src/db/client.js'
import { ShortUrlRepository } from '../../src/repositories/short-url-repository.js'

describe('ShortUrlRepository', () => {
  let tempDir: string
  let databasePath: string
  let repository: ShortUrlRepository
  let closeDatabase: (() => void) | undefined

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'short-url-repository-'))
    databasePath = path.join(tempDir, 'test.db')

    const client = createDatabaseClient({ databasePath })
    repository = new ShortUrlRepository(client.db)
    closeDatabase = client.close
  })

  afterEach(async () => {
    closeDatabase?.()
    await rm(tempDir, { recursive: true, force: true })
  })

  it('inserts a record and returns a typed ShortUrlRecord with generated fields', () => {
    const record = repository.insert({
      shortCode: 'abc123',
      originalUrl: 'https://example.com/articles/1',
      normalizedUrl: 'https://example.com/articles/1'
    })

    expect(record).toMatchObject({
      id: expect.any(Number),
      shortCode: 'abc123',
      originalUrl: 'https://example.com/articles/1',
      normalizedUrl: 'https://example.com/articles/1',
      createdAt: expect.any(String)
    })
    expect(Number.isInteger(record.id)).toBe(true)
    expect(new Date(record.createdAt).toISOString()).toBe(record.createdAt)
  })

  it('findByShortCode returns an existing typed record', () => {
    const inserted = repository.insert({
      shortCode: 'findme',
      originalUrl: 'https://example.com/find',
      normalizedUrl: 'https://example.com/find'
    })

    const found = repository.findByShortCode('findme')

    expect(found).toEqual(inserted)
  })

  it('findByShortCode returns null for missing codes', () => {
    expect(repository.findByShortCode('missing')).toBeNull()
  })

  it('findByNormalizedUrl returns null for missing URLs', () => {
    expect(repository.findByNormalizedUrl('https://nonexistent.com')).toBeNull()
  })

  it('findByNormalizedUrl returns an existing record', () => {
    const inserted = repository.insert({
      shortCode: 'norm01',
      originalUrl: 'https://example.com/path?a=1',
      normalizedUrl: 'https://example.com/path?a=1'
    })

    const found = repository.findByNormalizedUrl('https://example.com/path?a=1')

    expect(found).toEqual(inserted)
  })

  it('throws a unique constraint violation for duplicate short_code', () => {
    repository.insert({
      shortCode: 'dup001',
      originalUrl: 'https://example.com/one',
      normalizedUrl: 'https://example.com/one'
    })

    expect(() =>
      repository.insert({
        shortCode: 'dup001',
        originalUrl: 'https://example.com/two',
        normalizedUrl: 'https://example.com/two'
      })
    ).toThrow(/unique/i)
  })

  it('throws a unique constraint violation for duplicate normalized_url', () => {
    repository.insert({
      shortCode: 'uniq01',
      originalUrl: 'https://example.com/shared',
      normalizedUrl: 'https://example.com/shared'
    })

    expect(() =>
      repository.insert({
        shortCode: 'uniq02',
        originalUrl: 'https://example.com/shared?utm=1',
        normalizedUrl: 'https://example.com/shared'
      })
    ).toThrow(/unique/i)
  })

  it('generated migrations create the short_urls table with expected indexes and columns', () => {
    closeDatabase?.()
    closeDatabase = undefined

    const client = createDatabaseClient({ databasePath })
    closeDatabase = client.close

    const tableSql = client.sqlite
      .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'short_urls'")
      .get() as { sql: string } | undefined
    const indexes = client.sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'short_urls' ORDER BY name")
      .all() as Array<{ name: string }>

    expect(tableSql?.sql).toContain('`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL')
    expect(tableSql?.sql).toContain('`short_code` text NOT NULL')
    expect(tableSql?.sql).toContain('`original_url` text NOT NULL')
    expect(tableSql?.sql).toContain('`normalized_url` text NOT NULL')
    expect(tableSql?.sql).toContain('`created_at` text NOT NULL')
    expect(indexes.map((index) => index.name)).toEqual([
      'idx_short_urls_short_code',
      'short_urls_normalized_url_unique',
      'short_urls_short_code_unique'
    ])
  })
})
