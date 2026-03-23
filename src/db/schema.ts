import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const shortUrls = sqliteTable(
  'short_urls',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    shortCode: text('short_code').notNull().unique(),
    originalUrl: text('original_url').notNull(),
    normalizedUrl: text('normalized_url').notNull().unique(),
    createdAt: text('created_at').notNull()
  },
  (table) => [index('idx_short_urls_short_code').on(table.shortCode)]
)
