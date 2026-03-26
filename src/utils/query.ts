export function withCacheDisablingQueryParam(query: URLSearchParams) {
  // Proxy integration should use `loaderVersion` and `version` as cache key,
  // Providing a random value will ensure that the request it not cached
  query.set('loaderVersion', Date.now().toString())
}
