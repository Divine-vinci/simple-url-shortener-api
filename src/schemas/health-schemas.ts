import { z } from 'zod'

export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'error']),
  database: z.enum(['ok', 'error'])
})

export type HealthResponse = z.infer<typeof healthResponseSchema>

export const healthResponseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'database'],
  properties: {
    status: {
      type: 'string',
      enum: ['ok', 'error']
    },
    database: {
      type: 'string',
      enum: ['ok', 'error']
    }
  }
} as const
