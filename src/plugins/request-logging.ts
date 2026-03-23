import type { FastifyPluginAsync } from 'fastify'

interface ErrorResponsePayload {
  error?: {
    code?: unknown
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function extractErrorCode(payload: unknown): string | undefined {
  const parsedPayload = (() => {
    if (typeof payload === 'string') {
      try {
        return JSON.parse(payload) as unknown
      } catch {
        return undefined
      }
    }

    return payload
  })()

  if (!isRecord(parsedPayload)) {
    return undefined
  }

  const error = (parsedPayload as ErrorResponsePayload).error

  if (!isRecord(error) || typeof error.code !== 'string') {
    return undefined
  }

  return error.code
}

export const requestLoggingPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('onSend', async (request, reply, payload) => {
    if (reply.statusCode >= 400) {
      const errorCode = extractErrorCode(payload)

      if (errorCode === undefined) {
        delete request.errorCode
      } else {
        request.errorCode = errorCode
      }
    }

    return payload
  })

  app.addHook('onResponse', (request, reply, done) => {
    const logData: Record<string, unknown> = {
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: Number(reply.elapsedTime.toFixed(3))
    }

    if (request.errorCode !== undefined) {
      logData.errorCode = request.errorCode
    }

    if (reply.statusCode >= 500) {
      request.log.error(logData, 'request completed')
    } else if (reply.statusCode >= 400) {
      request.log.warn(logData, 'request completed')
    } else {
      request.log.info(logData, 'request completed')
    }

    done()
  })
}

;(requestLoggingPlugin as unknown as Record<PropertyKey, unknown>)[Symbol.for('skip-override')] = true
