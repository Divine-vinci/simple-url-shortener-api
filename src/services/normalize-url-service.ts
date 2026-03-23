function normalizePathname(pathname: string): string {
  const canonicalPath = encodeURI(decodeURI(pathname))

  if (canonicalPath === '/') {
    return canonicalPath
  }

  return canonicalPath.replace(/\/+$/u, '') || '/'
}

export function normalizeUrl(url: URL): string {
  const normalizedUrl = new URL(url.toString())

  normalizedUrl.protocol = normalizedUrl.protocol.toLowerCase()
  normalizedUrl.hostname = normalizedUrl.hostname.toLowerCase()
  normalizedUrl.hash = ''
  normalizedUrl.pathname = normalizePathname(normalizedUrl.pathname)

  if (
    (normalizedUrl.protocol === 'http:' && normalizedUrl.port === '80') ||
    (normalizedUrl.protocol === 'https:' && normalizedUrl.port === '443')
  ) {
    normalizedUrl.port = ''
  }

  normalizedUrl.searchParams.sort()

  return normalizedUrl.toString()
}
