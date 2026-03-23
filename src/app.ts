import Fastify, { type FastifyInstance } from 'fastify'
import type { AppConfig } from './config/app-config.js'
import { loadConfig } from './config/app-config.js'
import { databasePlugin } from './plugins/database.js'
import { errorHandlerPlugin } from './plugins/error-handler.js'
import { requestLoggingPlugin } from './plugins/request-logging.js'
import { shortenRoutes } from './routes/shorten-routes.js'
import { redirectRoutes } from './routes/redirect-routes.js'

interface LoggerOptionsOverride {
  stream?: NodeJS.WritableStream
}

export interface BuildAppOptions {
  config?: AppConfig
  loggerOptions?: LoggerOptionsOverride
}

function redactSensitiveText(value: string | undefined): string {
  if (value === undefined) {
    return ''
  }

  return value
    .replaceAll(':memory:', '[RedactedPath]')
    .replaceAll('DATABASE_PATH', '[RedactedConfig]')
    .replaceAll('databasePath', '[RedactedConfig]')
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadConfig()

  const app: FastifyInstance = Fastify({
    logger: {
      level: config.logLevel,
      redact: ['req.headers.authorization', 'req.headers.cookie'],
      serializers: {
        req(request) {
          return {
            method: request.method,
            url: request.url,
            host: request.host,
            remoteAddress: request.ip
          }
        },
        err(error) {
          const logError = error as NodeJS.ErrnoException
          const serializedError: {
            type: string
            message: string
            stack: string
            code?: string
          } = {
            type: error.name,
            message: redactSensitiveText(error.message),
            stack: redactSensitiveText(error.stack)
          }

          if (typeof logError.code === 'string') {
            serializedError.code = logError.code
          }

          return serializedError
        }
      },
      ...options.loggerOptions
    },
    disableRequestLogging: true
  })

  app.decorate('config', config)
  await app.register(databasePlugin)
  await app.register(errorHandlerPlugin)
  await app.register(requestLoggingPlugin)
  await app.register(shortenRoutes)
  await app.register(redirectRoutes)

  return app
}
