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
        tags: ['Redirect'],
        summary: 'Redirect to original URL',
        description: 'Look up a short code and redirect (302) to the original destination URL',
        params: {
          type: 'object',
          additionalProperties: false,
          required: ['shortCode'],
          properties: {
            shortCode: {
              type: 'string',
              description: '7-character short code'
            }
          }
        },
        response: {
          302: {
            type: 'null',
            description: 'Redirect to original URL via Location header'
          },
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
