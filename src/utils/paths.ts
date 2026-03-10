export function prependSlash(path: string) {
  return path.startsWith('/') ? path : `/${path}`
}
