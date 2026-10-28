import { Logger } from 'pino'

type LogMethod = (message: string, meta?: unknown) => void

export type AbstractLogger = Record<'debug' | 'info' | 'warn' | 'error', LogMethod>

// express-zod-api passes the message first and arbitrary `meta`, pino takes the fields first
export function toAbstractLogger(logger: Logger): AbstractLogger {
  const fieldsFrom = (meta: unknown) => {
    if (meta instanceof Error) {
      return { error: meta }
    }

    return typeof meta === 'object' && meta !== null && !Array.isArray(meta) ? meta : { meta }
  }

  const method =
    (level: keyof AbstractLogger): LogMethod =>
    (message, meta) =>
      meta === undefined ? logger[level](message) : logger[level](fieldsFrom(meta), message)

  return { debug: method('debug'), info: method('info'), warn: method('warn'), error: method('error') }
}
