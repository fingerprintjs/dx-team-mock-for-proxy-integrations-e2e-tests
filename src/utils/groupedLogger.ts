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
  /** Number of entries already written out, so repeated flushes never duplicate lines. */
  flushed: number
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

  const ctx: LogContext = { label, entries: [], flushed: 0 }
  return als.run(ctx, async () => {
    try {
      result = await fn()
    } finally {
      flushPending(ctx)
      logs = formatEntries(ctx.entries)
    }

    return {
      result,
      logs,
    }
  })
}

/**
 * Writes out whatever the current group has buffered so far, without ending the group.
 *
 * Grouped mode only prints when a group settles, so a test case that is retried - after a
 * timeout, say - stays invisible for as long as the retries take, and is lost entirely if the
 * process is killed first. Calling this on each failed attempt makes the failure observable
 * at the moment it happens. No-op outside a group context.
 */
export function flushGroupedLog(): void {
  const ctx = als.getStore()
  if (ctx) {
    flushPending(ctx)
  }
}

function formatEntries(entries: LogEntry[]): string[] {
  return entries.map((e) => {
    const level = `[${e.level.toUpperCase()}]`
    return `${level} ${new Date(e.at).toISOString()} ${e.message}`
  })
}

function flushPending(ctx: LogContext): void {
  const pending = ctx.entries.slice(ctx.flushed)
  ctx.flushed = ctx.entries.length

  if (pending.length === 0 || mode !== 'grouped') {
    return
  }

  real.log(`\n──────── ${ctx.label} ────────`)
  formatEntries(pending).forEach((line) => {
    real.log(`  ${line}`)
  })
  real.log(`\n──────── ${ctx.label} (end) ────────`)
}
