import { buildInfo } from '../version'
import { resolveLogFormat, resolveLogLevel } from './config'
import { createLogger } from './logger'

export const logger = createLogger({
  level: resolveLogLevel(process.env.LOG_LEVEL),
  format: resolveLogFormat(process.env, Boolean(process.stdout.isTTY)),
  base: { service: 'mock-warden', version: buildInfo.version },
})

export { createLogger } from './logger'
export type { Logger, LogLevel, LogFormat, LoggerOptions } from './logger'
export type { LogFields } from './serialize'
export { bindLogContext, runWithLogContext, setLogFields } from './context'
export { installConsoleBridge } from './consoleBridge'
export { toAbstractLogger } from './adapters'
