import { describe, expect, it } from 'vitest'
import { validateUrl } from '../../src/services/url-validation-service.js'

describe('validateUrl', () => {
  it('accepts valid http and https URLs', () => {
    const httpResult = validateUrl('http://example.com')
    const httpsResult = validateUrl('https://example.com/some/path?x=1#frag')

    expect(httpResult.valid).toBe(true)
    expect(httpsResult.valid).toBe(true)

    if (httpResult.valid) {
      expect(httpResult.url.toString()).toBe('http://example.com/')
    }

    if (httpsResult.valid) {
      expect(httpsResult.url.toString()).toBe('https://example.com/some/path?x=1#frag')
    }
  })

  it('accepts URLs with localhost hosts and explicit ports', () => {
    const result = validateUrl('http://localhost:8080/health')

    expect(result).toEqual({ valid: true, url: new URL('http://localhost:8080/health') })
  })

  it('rejects unsupported schemes with descriptive errors', () => {
    expect(validateUrl('ftp://files.example.com')).toEqual({
      valid: false,
      error: 'URL protocol must be http or https; received ftp:'
    })
    expect(validateUrl('javascript:alert(1)')).toEqual({
      valid: false,
      error: 'URL protocol must be http or https; received javascript:'
    })
    expect(validateUrl('data:text/html,<h1>hi</h1>')).toEqual({
      valid: false,
      error: 'URL protocol must be http or https; received data:'
    })
    expect(validateUrl('file:///tmp/demo.txt')).toEqual({
      valid: false,
      error: 'URL protocol must be http or https; received file:'
    })
  })

  it('rejects empty, whitespace-only, non-string, and malformed values', () => {
    expect(validateUrl('')).toEqual({ valid: false, error: 'URL is required' })
    expect(validateUrl('   ')).toEqual({ valid: false, error: 'URL is required' })
    expect(validateUrl(123 as unknown as string)).toEqual({ valid: false, error: 'URL must be a string' })
    expect(validateUrl('not-a-url')).toEqual({
      valid: false,
      error: 'URL must be a valid absolute http or https URL'
    })
  })

  it('rejects malformed URLs missing a host', () => {
    expect(validateUrl('http://')).toEqual({
      valid: false,
      error: 'URL must be a valid absolute http or https URL'
    })
    expect(validateUrl('https://')).toEqual({
      valid: false,
      error: 'URL must be a valid absolute http or https URL'
    })
  })
})
