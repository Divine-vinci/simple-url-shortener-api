import type { ShortUrlRepository } from '../repositories/short-url-repository.js'

export function resolveShortCode(shortCode: string, repository: ShortUrlRepository): string | null {
  const record = repository.findByShortCode(shortCode)

  return record?.originalUrl ?? null
}
