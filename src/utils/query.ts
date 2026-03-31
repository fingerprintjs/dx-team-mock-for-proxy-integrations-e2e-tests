import { randomUUID } from 'crypto'

export function withCacheDisablingQueryParam(query: URLSearchParams) {
  // Proxy integration should use `loaderVersion` and `version` as cache key,
  // Providing a random value will ensure that the request is not cached
  query.set('loaderVersion', randomUUID())
}
