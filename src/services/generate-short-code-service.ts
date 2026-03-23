import * as crypto from 'node:crypto'
import { ShortCodeCollisionError } from '../lib/errors.js'

export const SHORT_CODE_LENGTH = 7
export const BASE62_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
export const MAX_RETRIES = 3
const TOTAL_ATTEMPTS = MAX_RETRIES + 1

export type ShortCodeExistsFn = (code: string) => boolean
export type RandomBytesFn = (size: number) => Uint8Array

export function generateShortCode(randomBytesFn: RandomBytesFn = crypto.randomBytes): string {
  const bytes = randomBytesFn(SHORT_CODE_LENGTH)
  let code = ''

  for (const byte of bytes) {
    code += BASE62_ALPHABET[byte % BASE62_ALPHABET.length]
  }

  return code
}

export function generateUniqueShortCode(
  existsFn: ShortCodeExistsFn,
  generateCode: () => string = generateShortCode
): string {
  for (let attempt = 0; attempt < TOTAL_ATTEMPTS; attempt += 1) {
    const code = generateCode()

    if (!existsFn(code)) {
      return code
    }
  }

  throw new ShortCodeCollisionError(`Failed to generate unique short code after ${TOTAL_ATTEMPTS} attempts`)
}
