export const REDACTED = '[REDACTED]'

const SENSITIVE_HEADERS = [
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'fpjs-proxy-secret',
  'x-api-key',
]

// pino redacts explicit paths only, with no wildcard for any depth: cover headers at the top level and one level down
export const REDACT_PATHS = SENSITIVE_HEADERS.flatMap((header) => [`headers["${header}"]`, `*.headers["${header}"]`])

const SENSITIVE_KEYS = [...SENSITIVE_HEADERS, 'api-key', 'api_key', 'apikey', 'token', 'password', 'secret']

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.includes(key.toLowerCase())
}
