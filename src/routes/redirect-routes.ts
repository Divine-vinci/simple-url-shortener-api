import type { FastifyPluginAsync } from 'fastify'
import { ShortUrlRepository } from '../repositories/short-url-repository.js'
import { errorResponseJsonSchema } from '../schemas/short-url-schemas.js'
import { resolveShortCode } from '../services/resolve-short-url-service.js'

interface RedirectParams {
  shortCode: string
}

export const redirectRoutes: FastifyPluginAsync = async (app) => {
  const repository = new ShortUrlRepository(app.db)

  app.get<{ Params: RedirectParams }>(
    '/:shortCode',
    {
      schema: {
        response: {
          404: errorResponseJsonSchema,
          500: errorResponseJsonSchema
        }
      }
    },
    async (request, reply) => {
      const originalUrl = resolveShortCode(request.params.shortCode, repository)

      if (originalUrl === null) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Short URL not found'
          }
        })
      }

      return reply.code(302).redirect(originalUrl)
    }
  )
}
