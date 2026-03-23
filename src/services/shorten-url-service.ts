import type { AppConfig } from '../config/app-config.js'
import { UrlValidationError } from '../lib/errors.js'
import type { ShortUrlRepository } from '../repositories/short-url-repository.js'
import { generateUniqueShortCode } from './generate-short-code-service.js'
import { normalizeUrl } from './normalize-url-service.js'
import { validateUrl } from './url-validation-service.js'

export interface ShortenResult {
  id: number
  shortCode: string
  shortUrl: string
  originalUrl: string
  createdAt: string
  isNew: boolean
}

function buildShortUrl(baseUrl: string, shortCode: string): string {
  return `${baseUrl.replace(/\/+$/u, '')}/${shortCode}`
}

export function shortenUrl(url: string, config: AppConfig, repository: ShortUrlRepository): ShortenResult {
  const validationResult = validateUrl(url)

  if (!validationResult.valid) {
    throw new UrlValidationError(validationResult.error)
  }

  const originalUrl = validationResult.url.toString()
  const normalizedUrl = normalizeUrl(validationResult.url)
  const existingRecord = repository.findByNormalizedUrl(normalizedUrl)

  if (existingRecord) {
    return {
      id: existingRecord.id,
      shortCode: existingRecord.shortCode,
      shortUrl: buildShortUrl(config.baseUrl, existingRecord.shortCode),
      originalUrl: existingRecord.originalUrl,
      createdAt: existingRecord.createdAt,
      isNew: false
    }
  }

  const shortCode = generateUniqueShortCode((code) => repository.findByShortCode(code) !== null)
  const record = repository.insert({
    shortCode,
    originalUrl,
    normalizedUrl
  })

  return {
    id: record.id,
    shortCode: record.shortCode,
    shortUrl: buildShortUrl(config.baseUrl, record.shortCode),
    originalUrl: record.originalUrl,
    createdAt: record.createdAt,
    isNew: true
  }
}
