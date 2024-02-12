export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Timeout of ${ms}ms exceeded`)
    this.name = 'TimeoutError'
  }
}

export function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function withTimeout<T>(callback: () => Promise<T>, ms: number) {
  return new Promise((resolve, reject) => {
    wait(ms).then(() => {
      reject(new TimeoutError(ms))
    })

    callback().then(resolve, reject)
  })
}
