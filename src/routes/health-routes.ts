import type { FastifyPluginAsync } from 'fastify'
import { healthResponseJsonSchema, type HealthResponse } from '../schemas/health-schemas.js'
import { checkHealth } from '../services/health-check-service.js'

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Reply: HealthResponse }>(
    '/health',
    {
      schema: {
        tags: ['Operations'],
        summary: 'Health check',
        description: 'Check service and database health status',
        response: {
          200: healthResponseJsonSchema,
          503: healthResponseJsonSchema
        }
      }
    },
    async (_request, reply) => {
      const result = checkHealth(app.db)
      const statusCode = result.status === 'ok' ? 200 : 503

      return reply.status(statusCode).send(result)
    }
  )
}
