export type UrlValidationSuccess = { valid: true; url: URL }
export type UrlValidationFailure = { valid: false; error: string }
export type UrlValidationResult = UrlValidationSuccess | UrlValidationFailure

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

export function validateUrl(input: unknown): UrlValidationResult {
  if (typeof input !== 'string') {
    return { valid: false, error: 'URL must be a string' }
  }

  const value = input.trim()

  if (value.length === 0) {
    return { valid: false, error: 'URL is required' }
  }

  let parsedUrl: URL

  try {
    parsedUrl = new URL(value)
  } catch {
    return { valid: false, error: 'URL must be a valid absolute http or https URL' }
  }

  if (!ALLOWED_PROTOCOLS.has(parsedUrl.protocol)) {
    return { valid: false, error: `URL protocol must be http or https; received ${parsedUrl.protocol}` }
  }

  if (parsedUrl.hostname.length === 0) {
    return { valid: false, error: 'URL must include a hostname' }
  }

  return { valid: true, url: parsedUrl }
}
