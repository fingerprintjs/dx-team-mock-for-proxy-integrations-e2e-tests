import { AsyncLocalStorage } from 'node:async_hooks'
import { LogFields } from './serialize'

export const MAX_BUFFERED_LINES = 2000

export interface LogContext {
  fields: LogFields
  lines: string[]
}

const storage = new AsyncLocalStorage<LogContext>()

export function getLogContext(): LogContext | undefined {
  return storage.getStore()
}

// Every line logged while `fn` runs, however deep in the async call chain, gets `fields` and is captured as `logs`
export async function runWithLogContext<T>(
  fields: LogFields,
  fn: () => Promise<T>
): Promise<{ result: T; logs: string[] }> {
  const context: LogContext = { fields: { ...fields }, lines: [] }
  const result = await storage.run(context, fn)

  return { result, logs: context.lines }
}

// For callbacks that another request invokes (the proxy listeners): they run outside the test's async chain
export function bindLogContext<F extends (...args: any[]) => any>(fn: F): F {
  return AsyncLocalStorage.bind(fn)
}

export function setLogFields(fields: LogFields): void {
  const context = storage.getStore()
  if (context) {
    Object.assign(context.fields, fields)
  }
}

export function captureLine(context: LogContext, line: string): void {
  context.lines.push(line)
  if (context.lines.length > MAX_BUFFERED_LINES) {
    context.lines.shift()
  }
}
