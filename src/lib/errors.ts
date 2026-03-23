export class ShortCodeCollisionError extends Error {
  readonly name = 'ShortCodeCollisionError'

  constructor(message = 'Failed to generate unique short code after 4 attempts') {
    super(message)
  }
}

export class UrlValidationError extends Error {
  readonly name = 'UrlValidationError'

  constructor(
    message = 'Submitted URL failed validation',
    readonly details?: Record<string, unknown>
  ) {
    super(message)
  }
}
