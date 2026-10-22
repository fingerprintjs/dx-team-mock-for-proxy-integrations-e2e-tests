import { Logger } from './logger'
import { LogFields } from './serialize'

type Meta = unknown

export type AbstractLogger = Record<'debug' | 'info' | 'warn' | 'error', (message: string, meta?: Meta) => void>

// express-zod-api passes arbitrary `meta`: objects become fields, anything else is kept under `meta`
export function toAbstractLogger(logger: Logger): AbstractLogger {
  const fieldsFrom = (meta: Meta): LogFields | undefined => {
    if (meta === undefined) {
      return undefined
    }

    return typeof meta === 'object' && meta !== null && !Array.isArray(meta) && !(meta instanceof Error)
      ? (meta as LogFields)
      : { meta }
  }

  return {
    debug: (message, meta) => logger.debug(message, fieldsFrom(meta)),
    info: (message, meta) => logger.info(message, fieldsFrom(meta)),
    warn: (message, meta) => logger.warn(message, fieldsFrom(meta)),
    error: (message, meta) => logger.error(message, fieldsFrom(meta)),
  }
}
