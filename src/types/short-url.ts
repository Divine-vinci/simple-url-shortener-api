export interface ShortUrlRecord {
  id: number
  shortCode: string
  originalUrl: string
  normalizedUrl: string
  createdAt: string
}

export interface ShortUrlInsert {
  shortCode: string
  originalUrl: string
  normalizedUrl: string
}
