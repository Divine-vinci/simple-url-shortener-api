import type { FastifyError, FastifyPluginAsync, FastifyReply } from 'fastify'
import { ShortCodeCollisionError, UrlValidationError } from '../lib/errors.js'

interface ErrorResponseBody {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

function sendError(reply: FastifyReply, statusCode: number, body: ErrorResponseBody): void {
  void reply.status(statusCode).send(body)
}

function isFastifyValidationError(error: FastifyError): boolean {
  return (
    error.validation !== undefined ||
    error.code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE' ||
    error.code === 'FST_ERR_CTP_EMPTY_JSON_BODY' ||
    error.code === 'FST_ERR_CTP_INVALID_JSON_BODY' ||
    error.code === 'FST_ERR_VALIDATION'
  )
}

export const errorHandlerPlugin: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((error: FastifyError, _request, reply) => {
    if (error instanceof UrlValidationError) {
      const validationErrorBody: ErrorResponseBody = {
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message
        }
      }

      if (error.details !== undefined) {
        validationErrorBody.error.details = error.details
      }

      sendError(reply, 400, validationErrorBody)
      return
    }

    if (error instanceof ShortCodeCollisionError) {
      app.log.error(error)
      sendError(reply, 500, {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create short URL'
        }
      })
      return
    }

    if (isFastifyValidationError(error)) {
      sendError(reply, 400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message
        }
      })
      return
    }

    app.log.error(error)
    sendError(reply, 500, {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    })
  })
}


;(errorHandlerPlugin as unknown as Record<PropertyKey, unknown>)[Symbol.for('skip-override')] = true
