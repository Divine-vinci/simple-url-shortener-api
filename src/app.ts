import Fastify, { type FastifyInstance } from 'fastify'
import type { AppConfig } from './config/app-config.js'
import { loadConfig } from './config/app-config.js'
import { databasePlugin } from './plugins/database.js'
import { errorHandlerPlugin } from './plugins/error-handler.js'
import { shortenRoutes } from './routes/shorten-routes.js'
import { redirectRoutes } from './routes/redirect-routes.js'

export interface BuildAppOptions {
  config?: AppConfig
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadConfig()

  const app = Fastify({
    logger: {
      level: config.logLevel
    }
  })

  app.decorate('config', config)
  await app.register(databasePlugin)
  await app.register(errorHandlerPlugin)
  await app.register(shortenRoutes)
  await app.register(redirectRoutes)

  return app
}
