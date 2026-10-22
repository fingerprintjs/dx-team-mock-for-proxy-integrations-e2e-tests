import { captureLine, getLogContext } from './context'
import { createStdoutWriter } from './stdout'
import { DEFAULT_SERIALIZE_OPTIONS, LogFields, normalize, safeStringify } from './serialize'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogFormat = 'json' | 'pretty'

export const LOG_LEVELS: readonly LogLevel[] = ['debug', 'info', 'warn', 'error']

export interface Logger {
  debug(message: string, fields?: LogFields): void
  info(message: string, fields?: LogFields): void
  warn(message: string, fields?: LogFields): void
  error(message: string, fields?: LogFields): void
}

export interface LoggerOptions {
  level?: LogLevel
  format?: LogFormat
  /** Must not log through `console`, which may be routed back here. */
  write?: (line: string) => void
  /** Fields on every line that callers cannot override, e.g. `service`. */
  base?: LogFields
  now?: () => Date
}

let stdoutWriter: ((line: string) => void) | undefined

// Created on first use, so that importing the module does not touch stdout
const writeToStdout = (line: string) => {
  stdoutWriter ??= createStdoutWriter()
  stdoutWriter(line)
}

/** Core keys and `base` always win, call fields win over context fields. Never throws. */
export function createLogger({
  level = 'info',
  format = 'json',
  write = writeToStdout,
  base = {},
  now = () => new Date(),
}: LoggerOptions = {}): Logger {
  const minimum = LOG_LEVELS.indexOf(level)

  const log = (lineLevel: LogLevel, message: string, fields?: LogFields) => {
    if (LOG_LEVELS.indexOf(lineLevel) < minimum) {
      return
    }

    try {
      const context = getLogContext()
      const record = buildRecord(
        { timestamp: now().toISOString(), level: lineLevel, message: String(message), ...base },
        { ...context?.fields, ...fields }
      )

      const json = safeStringify(record)
      write(format === 'pretty' ? formatPretty(record) : json)

      // The captured copy is always JSON, whatever the console format is, as it ends up in the API response.
      if (context) {
        captureLine(context, json)
      }
    } catch (error) {
      writeFallback(write, lineLevel, message, error)
    }
  }

  return {
    debug: (message, fields) => log('debug', message, fields),
    info: (message, fields) => log('info', message, fields),
    warn: (message, fields) => log('warn', message, fields),
    error: (message, fields) => log('error', message, fields),
  }
}

function buildRecord(core: LogFields, extras: LogFields): LogFields {
  const record = { ...core }
  for (const [key, value] of Object.entries(extras)) {
    if (!(key in core)) {
      record[key] = value
    }
  }
  return record
}

function formatPretty(record: LogFields): string {
  const { timestamp, level, message, service: _service, version: _version, ...rest } = record
  const { error, ...extras } = rest

  const parts = [`${timestamp} ${String(level).toUpperCase().padEnd(5)} ${message}`]
  if (Object.keys(extras).length > 0) {
    parts.push(safeStringify(extras))
  }

  let line = parts.join(' ')
  if (error !== undefined) {
    line += `\n${renderError(normalize(error, DEFAULT_SERIALIZE_OPTIONS))}`
  }
  return line
}

const ERROR_DETAILS = ['code', 'operator', 'actual', 'expected', 'cause'] as const

// Anything can be thrown, so the error is not always an Error. Details follow the stack:
// what an assertion compared, why a request failed
function renderError(serialized: unknown): string {
  if (typeof serialized !== 'object' || serialized === null) {
    return String(serialized)
  }

  const error = serialized as Record<string, unknown>
  const head =
    typeof error.stack === 'string' ? error.stack : typeof error.message === 'string' ? error.message : undefined
  if (head === undefined) {
    return safeStringify(serialized)
  }

  const details = ERROR_DETAILS.filter((key) => error[key] !== undefined).map(
    (key) => `  ${key}: ${safeStringify(error[key])}`
  )

  return [head, ...details].join('\n')
}

function writeFallback(write: (line: string) => void, level: LogLevel, message: string, cause: unknown) {
  try {
    write(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message: String(message),
        loggingError: cause instanceof Error ? cause.message : String(cause),
      })
    )
  } catch {
    // Logging must never take the application down
  }
}
