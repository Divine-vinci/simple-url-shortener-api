import { z } from 'zod'

export const shortenRequestSchema = z.object({
  url: z.string()
})

export const shortenResponseSchema = z.object({
  shortCode: z.string(),
  shortUrl: z.string(),
  originalUrl: z.string(),
  createdAt: z.string()
})

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional()
  })
})

export type ShortenRequest = z.infer<typeof shortenRequestSchema>
export type ShortenResponse = z.infer<typeof shortenResponseSchema>
export type ErrorResponse = z.infer<typeof errorResponseSchema>

export const shortenRequestJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['url'],
  properties: {
    url: { type: 'string' }
  }
} as const

export const shortenResponseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['shortCode', 'shortUrl', 'originalUrl', 'createdAt'],
  properties: {
    shortCode: { type: 'string' },
    shortUrl: { type: 'string' },
    originalUrl: { type: 'string' },
    createdAt: { type: 'string' }
  }
} as const

export const errorResponseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['error'],
  properties: {
    error: {
      type: 'object',
      additionalProperties: false,
      required: ['code', 'message'],
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        details: { type: 'object', additionalProperties: true }
      }
    }
  }
} as const
