import { loadEnv } from './env.js'

export interface AppConfig {
  port: number
  baseUrl: string
  databasePath: string
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace'
}

export function loadConfig(): AppConfig {
  const env = loadEnv()

  return {
    port: env.PORT,
    baseUrl: env.BASE_URL,
    databasePath: env.DATABASE_PATH,
    logLevel: env.LOG_LEVEL
  }
}
