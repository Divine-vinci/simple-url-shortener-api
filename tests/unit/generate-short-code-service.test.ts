import { describe, expect, it, vi } from 'vitest'
import { ShortCodeCollisionError } from '../../src/lib/errors.js'
import {
  BASE62_ALPHABET,
  generateShortCode,
  generateUniqueShortCode,
  MAX_RETRIES,
  SHORT_CODE_LENGTH
} from '../../src/services/generate-short-code-service.js'

describe('generateShortCode', () => {
  it('returns a 7 character base62 code', () => {
    const code = generateShortCode()

    expect(code).toHaveLength(SHORT_CODE_LENGTH)
    expect(code).toMatch(/^[A-Za-z0-9]{7}$/)
  })

  it('maps random bytes with the configured base62 alphabet', () => {
    // bytes [0,1,25,26,52,26,51] → alphabet indices [0%62=0, 1%62=1, 25%62=25, 26%62=26, 52%62=52, 26%62=26, 51%62=51]
    // → A(0) B(1) Z(25) a(26) 0(52) a(26) z(51)
    const code = generateShortCode(() => Uint8Array.from([0, 1, 25, 26, 52, 26, 51]))

    expect(code).toBe('ABZa0az')
    expect([...code].every((character) => BASE62_ALPHABET.includes(character))).toBe(true)
  })

  it('maps high byte values correctly via modulo wrapping', () => {
    // bytes [248,249,250,251,252,253,255] → indices [248%62=0, 249%62=1, 250%62=2, 251%62=3, 252%62=4, 253%62=5, 255%62=7]
    // → A(0) B(1) C(2) D(3) E(4) F(5) H(7)
    const code = generateShortCode(() => Uint8Array.from([248, 249, 250, 251, 252, 253, 255]))

    expect(code).toBe('ABCDEFH')
    expect(code).toHaveLength(SHORT_CODE_LENGTH)
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
    let caught: unknown

    try {
      generateUniqueShortCode(existsFn, generateCode)
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(ShortCodeCollisionError)
    expect((caught as ShortCodeCollisionError).message).toBe(
      `Failed to generate unique short code after ${MAX_RETRIES + 1} attempts`
    )
    expect(generateCode).toHaveBeenCalledTimes(MAX_RETRIES + 1)
    expect(existsFn).toHaveBeenCalledTimes(MAX_RETRIES + 1)
  })
})
