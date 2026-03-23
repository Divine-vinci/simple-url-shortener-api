import type { FastifyPluginAsync } from 'fastify'
import { ShortUrlRepository } from '../repositories/short-url-repository.js'
import {
  errorResponseJsonSchema,
  shortenRequestJsonSchema,
  shortenResponseJsonSchema,
  type ShortenRequest,
  type ShortenResponse
} from '../schemas/short-url-schemas.js'
import { shortenUrl } from '../services/shorten-url-service.js'

export const shortenRoutes: FastifyPluginAsync = async (app) => {
  const repository = new ShortUrlRepository(app.db)

  app.post<{ Body: ShortenRequest; Reply: ShortenResponse }>(
    '/shorten',
    {
      bodyLimit: 1_048_576,
      schema: {
        tags: ['URL Shortening'],
        summary: 'Create a short URL',
        description: 'Submit a long URL to receive a shortened URL with a unique short code',
        body: shortenRequestJsonSchema,
        response: {
          200: shortenResponseJsonSchema,
          201: shortenResponseJsonSchema,
          400: errorResponseJsonSchema,
          500: errorResponseJsonSchema
        }
      }
    },
    async (request, reply) => {
      const result = shortenUrl(request.body.url, request.server.config, repository)
      const responseBody: ShortenResponse = {
        shortCode: result.shortCode,
        shortUrl: result.shortUrl,
        originalUrl: result.originalUrl,
        createdAt: result.createdAt
      }

      return reply.status(result.isNew ? 201 : 200).send(responseBody)
    }
  )
}
