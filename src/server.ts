import { buildApp } from './app.js'
import { loadConfig } from './config/app-config.js'

async function startServer(): Promise<void> {
  const config = loadConfig()
  const app = buildApp({ config })

  try {
    await app.listen({
      port: config.port,
      host: '0.0.0.0'
    })
  } catch (error) {
    app.log.error(error)
    process.exitCode = 1
    throw error
  }
}

void startServer()
