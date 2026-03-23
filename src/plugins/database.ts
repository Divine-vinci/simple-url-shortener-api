import type { FastifyPluginAsync } from 'fastify'
import { createDatabaseClient, ensureDatabaseDirectory } from '../db/client.js'

export const databasePlugin: FastifyPluginAsync = async (app) => {
  await ensureDatabaseDirectory(app.config.databasePath)

  const client = createDatabaseClient({ databasePath: app.config.databasePath })

  app.decorate('db', client.db)

  app.addHook('onClose', async () => {
    client.close()
  })
}


;(databasePlugin as unknown as Record<PropertyKey, unknown>)[Symbol.for('skip-override')] = true
