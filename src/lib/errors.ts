export class ShortCodeCollisionError extends Error {
  readonly name = 'ShortCodeCollisionError'

  constructor(message = 'Failed to generate unique short code after 4 attempts') {
    super(message)
  }
}
