import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'

interface PackageJson {
  version: string
}

const packageJson = JSON.parse(
  readFileSync(resolve(__dirname, '../../package.json'), 'utf8')
) as PackageJson

export const swaggerPlugin: FastifyPluginAsync = async (app) => {
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Simple URL Shortener API',
        description: 'A lightweight, self-hosted URL shortening API',
        version: packageJson.version,
        contact: {
          name: 'API Support'
        }
      },
      tags: [
        {
          name: 'URL Shortening',
          description: 'Create and manage short URLs'
        },
        {
          name: 'Redirect',
          description: 'Short URL redirect resolution'
        },
        {
          name: 'Operations',
          description: 'Health checks and operational endpoints'
        }
      ]
    }
  })

  await app.register(swaggerUi, {
    routePrefix: '/docs'
  })
}

export default fp(swaggerPlugin, { name: 'swagger' })
