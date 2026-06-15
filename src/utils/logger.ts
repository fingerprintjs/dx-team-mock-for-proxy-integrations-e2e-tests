export function createLogger(...prefix: any[]) {
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

export type Logger = ReturnType<typeof createLogger>
