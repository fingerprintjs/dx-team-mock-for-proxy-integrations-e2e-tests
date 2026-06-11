export function createLogger(...prefix: any[]) {
  return new Proxy(console, {
    get: (target, prop) => {
      if (typeof target[prop] === 'function') {
        return (...args: any[]) => {
          target[prop](...prefix, ...args)
        }
      }
      return target[prop]
    },
  })
}

export type Logger = ReturnType<typeof createLogger>
