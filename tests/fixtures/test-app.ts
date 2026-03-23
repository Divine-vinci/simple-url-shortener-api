import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../src/app.js'

export async function buildTestApp(): Promise<FastifyInstance> {
  const app = await buildApp({
    config: {
      port: 3000,
      baseUrl: 'http://localhost:3000/',
      databasePath: ':memory:',
      logLevel: 'silent' as never
    }
  })

  await app.ready()

  return app
}
