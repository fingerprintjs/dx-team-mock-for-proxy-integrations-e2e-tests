/* eslint-disable no-console */
import { format } from 'node:util'
import { Logger } from './logger'
import { normalize, SerializedError } from './serialize'

const METHODS = {
  log: 'info',
  info: 'info',
  debug: 'debug',
  warn: 'warn',
  error: 'error',
} as const

// Objects go through the serializer first: once flattened into the message, no key is left to redact.
// Primitives stay as they are, for placeholders like %d.
function sanitize(arg: unknown): unknown {
  // Functions are objects too: util.format prints their enumerable properties
  if (typeof arg === 'function') {
    return normalize(arg)
  }

  if (typeof arg !== 'object' || arg === null) {
    return arg
  }

  const normalized = normalize(arg)
  if (arg instanceof Error && typeof normalized === 'object' && normalized !== null) {
    const error = normalized as SerializedError
    return error.stack ?? `${error.kind}: ${error.message}`
  }

  return normalized
}

// The logger writes to stdout directly, so this cannot loop
export function installConsoleBridge(logger: Logger): () => void {
  const originals = {} as Record<keyof typeof METHODS, (...args: unknown[]) => void>

  for (const method of Object.keys(METHODS) as (keyof typeof METHODS)[]) {
    originals[method] = console[method]
    const level = METHODS[method]

    console[method] = (...args: unknown[]) => {
      logger[level](format(...args.map(sanitize)))
    }
  }

  return () => {
    Object.assign(console, originals)
  }
}
