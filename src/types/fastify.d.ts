import 'fastify'
import type { AppConfig } from '../config/app-config.js'
import type { AppDatabase } from '../db/client.js'

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig
    db: AppDatabase
  }

  interface FastifyRequest {
    errorCode?: string
  }
}
