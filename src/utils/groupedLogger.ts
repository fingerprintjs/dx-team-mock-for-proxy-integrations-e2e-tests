import { AsyncLocalStorage } from 'node:async_hooks'
import { format } from 'node:util'

type Level = 'log' | 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  level: Level
  message: string
  at: number
}

interface LogContext {
  label: string
  entries: LogEntry[]
}

const als = new AsyncLocalStorage<LogContext>()
const LEVELS: Level[] = ['log', 'info', 'warn', 'error', 'debug']

// Capture the real console methods up front so flushing never recurses
// back through our patched versions.
const real = Object.fromEntries(LEVELS.map((l) => [l, console[l].bind(console)])) as Record<
  Level,
  (...args: unknown[]) => void
>

export type LogMode =
  | 'grouped' // buffer per group, flush as one block when the group settles
  | 'live' //    write immediately, prefixed with the group label (survives hangs)

let mode: LogMode = 'grouped'
let patched = false

/**
 * Patches the global console once, at startup. After this, any console.* call
 * made inside a runWithgroupLog() context is attributed to that group - no need
 * to touch existing console.log calls inside rungroup().
 *
 * Calls made outside any group context (global setup/teardown) pass straight
 * through to the real console unchanged.
 */
export function installLogger(opts: { mode?: LogMode } = {}): void {
  mode = opts.mode ?? 'grouped'
  if (patched) return
  patched = true

  for (const level of LEVELS) {
    console[level] = (...args: unknown[]) => {
      const ctx = als.getStore()
      if (!ctx) {
        real[level](...args)
        return
      }
      const message = format(...args)
      ctx.entries.push({ level, message, at: Date.now() })

      if (mode === 'live') {
        real[level](`[${ctx.label}] ${message}`)
      }
    }
  }
}

/**
 * Run a single group inside its own logging context. The try/finally guarantees the buffer
 * flushes even when the group throws, so failing groups still print their logs.
 */
export function runWithGroupedLog<T>(label: string, fn: () => Promise<T>): Promise<{ result?: T; logs: string[] }> {
  let result: T
  let logs: string[] = []

  const ctx: LogContext = { label, entries: [] }
  return als.run(ctx, async () => {
    try {
      result = await fn()
    } finally {
      logs = flush(ctx, mode)
    }

    return {
      result,
      logs,
    }
  })
}

function flush(ctx: LogContext, mode: LogMode): string[] {
  if (ctx.entries.length === 0) {
    return []
  }

  const header = `\n──────── ${ctx.label} ────────`
  const headerEnd = `\n──────── ${ctx.label} (end) ────────`
  const body = ctx.entries.map((e) => {
    const level = `[${e.level.toUpperCase()}]`
    return `${level} ${new Date(e.at).toISOString()} ${e.message}`
  })

  if (mode === 'grouped') {
    real.log(header)
    body.forEach((line) => {
      real.log(`  ${line}`)
    })
    real.log(headerEnd)
  }

  return body
}
