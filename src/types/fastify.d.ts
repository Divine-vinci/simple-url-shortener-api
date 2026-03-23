import 'fastify'
import type { AppConfig } from '../config/app-config.js'

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig
  }
}
