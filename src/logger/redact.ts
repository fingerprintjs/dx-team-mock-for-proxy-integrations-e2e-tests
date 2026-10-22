export const REDACTED = '[REDACTED]'

const SENSITIVE_KEY =
  /^(authorization|proxy-authorization|cookie|set-cookie|fpjs-proxy-secret|x-api-key|api[-_]?key|token|password|secret)$/i

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key)
}

export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength)}…[truncated ${value.length - maxLength} chars]`
}
