import { eq } from 'drizzle-orm'
import type { AppDatabase } from '../db/client.js'
import { shortUrls } from '../db/schema.js'
import type { ShortUrlInsert, ShortUrlRecord } from '../types/short-url.js'

function mapShortUrlRecord(row: typeof shortUrls.$inferSelect): ShortUrlRecord {
  return {
    id: row.id,
    shortCode: row.shortCode,
    originalUrl: row.originalUrl,
    normalizedUrl: row.normalizedUrl,
    createdAt: row.createdAt
  }
}

export class ShortUrlRepository {
  constructor(private readonly db: AppDatabase) {}

  insert(record: ShortUrlInsert): ShortUrlRecord {
    const createdAt = new Date().toISOString()
    const inserted = this.db
      .insert(shortUrls)
      .values({
        shortCode: record.shortCode,
        originalUrl: record.originalUrl,
        normalizedUrl: record.normalizedUrl,
        createdAt
      })
      .returning()
      .get()

    return mapShortUrlRecord(inserted)
  }

  findByShortCode(shortCode: string): ShortUrlRecord | null {
    const row = this.db.select().from(shortUrls).where(eq(shortUrls.shortCode, shortCode)).get()

    return row ? mapShortUrlRecord(row) : null
  }

  findByNormalizedUrl(normalizedUrl: string): ShortUrlRecord | null {
    const row = this.db.select().from(shortUrls).where(eq(shortUrls.normalizedUrl, normalizedUrl)).get()

    return row ? mapShortUrlRecord(row) : null
  }
}
