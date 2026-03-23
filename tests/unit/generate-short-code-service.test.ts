import { afterEach, describe, expect, it, vi } from 'vitest'
import { ShortCodeCollisionError } from '../../src/lib/errors.js'
import {
  BASE62_ALPHABET,
  generateShortCode,
  generateUniqueShortCode,
  MAX_RETRIES,
  SHORT_CODE_LENGTH
} from '../../src/services/generate-short-code-service.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('generateShortCode', () => {
  it('returns a 7 character base62 code', () => {
    const code = generateShortCode()

    expect(code).toHaveLength(SHORT_CODE_LENGTH)
    expect(code).toMatch(/^[A-Za-z0-9]{7}$/)
  })

  it('maps random bytes with the configured base62 alphabet', () => {
    const code = generateShortCode(() => Uint8Array.from([0, 1, 25, 26, 52, 26, 51]))

    expect(code).toBe('ABZa0az')
    expect([...code].every((character) => BASE62_ALPHABET.includes(character))).toBe(true)
  })

  it('produces unique values across repeated generations', () => {
    const samples = new Set<string>()

    for (let index = 0; index < 100; index += 1) {
      samples.add(generateShortCode())
    }

    expect(samples.size).toBe(100)
  })
})

describe('generateUniqueShortCode', () => {
  it('returns the first generated code when no collision exists', () => {
    const existsFn = vi.fn(() => false)
    const generateCode = vi.fn(() => 'ABC1234')

    const code = generateUniqueShortCode(existsFn, generateCode)

    expect(code).toBe('ABC1234')
    expect(generateCode).toHaveBeenCalledTimes(1)
    expect(existsFn).toHaveBeenCalledTimes(1)
    expect(existsFn).toHaveBeenCalledWith('ABC1234')
  })

  it('retries on collision and returns the first available code', () => {
    const existsFn = vi.fn((code: string) => code !== 'UNIQUE77')
    const generateCode = vi
      .fn<() => string>()
      .mockReturnValueOnce('COLLIDE')
      .mockReturnValueOnce('TAKEN22')
      .mockReturnValueOnce('UNIQUE77')

    const code = generateUniqueShortCode(existsFn, generateCode)

    expect(code).toBe('UNIQUE77')
    expect(generateCode).toHaveBeenCalledTimes(3)
    expect(existsFn).toHaveBeenNthCalledWith(1, 'COLLIDE')
    expect(existsFn).toHaveBeenNthCalledWith(2, 'TAKEN22')
    expect(existsFn).toHaveBeenNthCalledWith(3, 'UNIQUE77')
  })

  it('throws after exhausting the maximum retry budget', () => {
    const existsFn = vi.fn(() => true)
    const generateCode = vi.fn(() => 'COLLIDE')

    expect(() => generateUniqueShortCode(existsFn, generateCode)).toThrowError(ShortCodeCollisionError)
    expect(() => generateUniqueShortCode(existsFn, generateCode)).toThrowError(
      `Failed to generate unique short code after ${MAX_RETRIES + 1} attempts`
    )
    expect(generateCode).toHaveBeenCalledTimes((MAX_RETRIES + 1) * 2)
    expect(existsFn).toHaveBeenCalledTimes((MAX_RETRIES + 1) * 2)
  })
})
