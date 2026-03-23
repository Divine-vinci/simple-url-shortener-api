import { describe, expect, it } from 'vitest'
import { normalizeUrl } from '../../src/services/normalize-url-service.js'

describe('normalizeUrl', () => {
  it('normalizes scheme, host, default ports, query order, trailing slash, and fragment', () => {
    const normalized = normalizeUrl(new URL('HTTP://EXAMPLE.COM:80/Path/?z=1&a=2#frag'))

    expect(normalized).toBe('http://example.com/Path?a=2&z=1')
  })

  it('preserves non-default ports', () => {
    const normalized = normalizeUrl(new URL('https://Example.COM:8443/path/?b=2&a=1'))

    expect(normalized).toBe('https://example.com:8443/path?a=1&b=2')
  })

  it('preserves the root path', () => {
    const normalized = normalizeUrl(new URL('https://Example.COM/?b=2&a=1#section'))

    expect(normalized).toBe('https://example.com/?a=1&b=2')
  })

  it('removes trailing slashes from non-root paths', () => {
    const normalized = normalizeUrl(new URL('https://example.com/path/to///'))

    expect(normalized).toBe('https://example.com/path/to')
  })

  it('returns identical normalized values for equivalent URLs', () => {
    const first = normalizeUrl(new URL('https://Example.com:443/path/?z=1&a=2#top'))
    const second = normalizeUrl(new URL('https://example.com/path?a=2&z=1'))

    expect(first).toBe(second)
  })

  it('keeps path casing while canonicalizing encoding', () => {
    const normalized = normalizeUrl(new URL('https://EXAMPLE.com/A%20Path/?q=1'))

    expect(normalized).toBe('https://example.com/A%20Path?q=1')
  })

  it('supports URLs without query parameters beyond the root path', () => {
    const normalized = normalizeUrl(new URL('http://Example.COM:80'))

    expect(normalized).toBe('http://example.com/')
  })
})
