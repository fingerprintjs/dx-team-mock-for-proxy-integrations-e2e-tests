import pino, { DestinationStream, Logger } from 'pino'
import pretty from 'pino-pretty'
import { buildInfo } from '../version'
import { LogFormat, resolveLogFormat, resolveLogLevel } from './config'
import { captureLine, getLogContext } from './context'
import { REDACT_PATHS, REDACTED } from './redact'

export type { Logger } from 'pino'
export { bindLogContext, runWithLogContext, setLogFields } from './context'
export { toAbstractLogger } from './adapters'

const MAX_BODY_LENGTH = 4096

type LoggerOptions = {
  level?: pino.Level
  format?: LogFormat
  destination?: DestinationStream
}

// The standard error serializer copies every property of the error, including the config, request and response of
// an axios error, with their headers
function serializeError(error: unknown) {
  if (!(error instanceof Error)) {
    return error
  }

  const {
    type,
    message,
    stack,
    config: _config,
    request: _request,
    response: _response,
    ...details
  } = pino.stdSerializers.err(error)

  return { kind: type, message, stack, ...details }
}

function serializeBody(body: unknown) {
  if (Buffer.isBuffer(body)) {
    return `[binary ${body.length} bytes]`
  }

  return typeof body === 'string' && body.length > MAX_BODY_LENGTH ? `${body.slice(0, MAX_BODY_LENGTH)}…` : body
}

// The JSON line of every log also goes to the context of the test case that logs it, for `result.logs`
const captureStream: DestinationStream = {
  write(line) {
    const context = getLogContext()
    if (context) {
      captureLine(context, line.trimEnd())
    }
  },
}

export function createLogger({ level = 'info', format = 'json', destination }: LoggerOptions = {}): Logger {
  const output =
    format === 'pretty'
      ? pretty({
          sync: true,
          messageKey: 'message',
          timestampKey: 'timestamp',
          ignore: 'service,version',
          destination: destination ?? 1,
        })
      : (destination ?? pino.destination({ dest: 1, sync: true }))

  return pino(
    {
      level,
      messageKey: 'message',
      base: { service: 'mock-warden', version: buildInfo.version },
      timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
      formatters: { level: (label) => ({ level: label }) },
      mixin: () => getLogContext()?.fields ?? {},
      redact: { paths: REDACT_PATHS, censor: REDACTED },
      serializers: { error: serializeError, body: serializeBody },
    },
    // Each stream filters by its own level, which is info unless told otherwise: leave it to the logger's level
    pino.multistream([
      { stream: output, level: 'trace' },
      { stream: captureStream, level: 'trace' },
    ])
  )
}

export const logger = createLogger({
  level: resolveLogLevel(process.env.LOG_LEVEL),
  format: resolveLogFormat(process.env, Boolean(process.stdout.isTTY)),
})
