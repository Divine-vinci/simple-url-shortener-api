import { z } from 'zod'

const logLevelSchema = z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])

const portSchema = z.coerce.number().int().min(1).max(65535)

export const envSchema = z.object({
  PORT: portSchema.default(3000),
  BASE_URL: z.url().default('http://localhost:3000'),
  DATABASE_PATH: z.string().trim().min(1).default('./data/urls.db'),
  LOG_LEVEL: logLevelSchema.default('info')
})

export type EnvSchema = z.infer<typeof envSchema>

export function loadEnv(rawEnv: NodeJS.ProcessEnv = process.env): EnvSchema {
  const parsed = envSchema.safeParse(rawEnv)

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => {
        const path = issue.path.join('.') || 'environment'
        return `${path}: ${issue.message}`
      })
      .join('; ')

    throw new Error(`Invalid environment configuration: ${message}`)
  }

  return parsed.data
}
