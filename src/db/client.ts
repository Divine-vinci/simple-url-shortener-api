import path from 'node:path'
import { mkdir } from 'node:fs/promises'
import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema.js'

export type AppDatabase = BetterSQLite3Database<typeof schema>

export interface DatabaseClient {
  db: AppDatabase
  sqlite: Database.Database
  close: () => void
}

export interface CreateDatabaseClientOptions {
  databasePath: string
}

export async function ensureDatabaseDirectory(databasePath: string): Promise<void> {
  if (databasePath === ':memory:') {
    return
  }

  const directory = path.dirname(databasePath)
  await mkdir(directory, { recursive: true })
}

export function createDatabaseClient(options: CreateDatabaseClientOptions): DatabaseClient {
  const sqlite = new Database(options.databasePath)
  const db = drizzle(sqlite, { schema })

  migrate(db, { migrationsFolder: path.resolve(process.cwd(), 'drizzle/migrations') })

  return {
    db,
    sqlite,
    close: () => sqlite.close()
  }
}
