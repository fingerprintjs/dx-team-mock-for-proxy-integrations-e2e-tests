import { LOG_LEVELS, LogFormat, LogLevel } from './logger'

export type LogEnv = {
  LOG_LEVEL?: string
  LOG_FORMAT?: string
  NODE_ENV?: string
}

export function resolveLogLevel(value: string | undefined): LogLevel {
  const level = value?.trim().toLowerCase()

  return LOG_LEVELS.find((it) => it === level) ?? 'info'
}

// JSON unless LOG_FORMAT says otherwise, or a developer is on a terminal outside production
export function resolveLogFormat(env: LogEnv, isTTY: boolean): LogFormat {
  const format = env.LOG_FORMAT?.trim().toLowerCase()
  if (format === 'json' || format === 'pretty') {
    return format
  }

  return isTTY && env.NODE_ENV !== 'production' ? 'pretty' : 'json'
}
