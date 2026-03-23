import { sql } from 'drizzle-orm'
import type { AppDatabase } from '../db/client.js'

export interface HealthCheckResult {
  status: 'ok' | 'error'
  database: 'ok' | 'error'
}

export function checkHealth(db: AppDatabase): HealthCheckResult {
  try {
    db.get(sql`SELECT 1 as value`)

    return {
      status: 'ok',
      database: 'ok'
    }
  } catch {
    return {
      status: 'error',
      database: 'error'
    }
  }
}
