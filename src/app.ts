import Fastify, { type FastifyInstance } from 'fastify'
import type { AppConfig } from './config/app-config.js'
import { loadConfig } from './config/app-config.js'

export interface BuildAppOptions {
  config?: AppConfig
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const config = options.config ?? loadConfig()

  const app = Fastify({
    logger: {
      level: config.logLevel
    }
  })

  app.decorate('config', config)

  return app
}
