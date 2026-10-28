import pino from 'pino'

export type LogFormat = 'json' | 'pretty'

type LogEnv = {
  LOG_LEVEL?: string
  LOG_FORMAT?: string
  NODE_ENV?: string
}

// pino throws on a level it does not know
export function resolveLogLevel(value: string | undefined): pino.Level {
  const level = value?.trim().toLowerCase()

  return level !== undefined && level in pino.levels.values ? (level as pino.Level) : 'info'
}

// JSON unless LOG_FORMAT says otherwise, or a developer is on a terminal outside production
export function resolveLogFormat(env: LogEnv, isTTY: boolean): LogFormat {
  const format = env.LOG_FORMAT?.trim().toLowerCase()
  if (format === 'json' || format === 'pretty') {
    return format
  }

  return isTTY && env.NODE_ENV !== 'production' ? 'pretty' : 'json'
}
