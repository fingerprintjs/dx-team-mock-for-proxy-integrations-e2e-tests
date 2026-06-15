/**
 * Creates a logger that prefixes all log messages with the specified values.
 *
 * @param {...any[]} prefix - The values to prefix to all log messages.
 * @return {Proxy} A proxy wrapping the `console` object, adding the specified prefix to all log methods.
 */
export function createLogger(...prefix: any[]): Logger {
  return new Proxy(console, {
    get: (target, prop) => {
      const value = Reflect.get(target as any, prop, target)
      if (typeof value === 'function') {
        return (...args: any[]) => Reflect.apply(value, target, [...prefix, ...args])
      }
      return value
    },
  })
}

export type Logger = Console
