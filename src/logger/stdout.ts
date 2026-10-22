// Best-effort notices to a stream (stderr by default). The error listener is attached first and the failure
// ignored, as there is nowhere left to report it: an unhandled async EPIPE would crash the process
export function createStreamNotifier(stream: NodeJS.WritableStream = process.stderr): (message: string) => void {
  stream.on('error', () => {})

  return (message) => {
    stream.write(message)
  }
}

let stderrNotifier: ((message: string) => void) | undefined

// Created on first use, so stderr only gets an error listener when there is something to report
const notifyOnStderr = (message: string) => {
  stderrNotifier ??= createStreamNotifier()
  stderrNotifier(message)
}

// Survives the stream breaking: a closed pipe surfaces as an async error event that no try/catch around
// `write` sees. The first failure is reported once through `notify`, never through the logger, and later
// lines are dropped
export function createStdoutWriter(
  stream: NodeJS.WritableStream = process.stdout,
  notify: (message: string) => void = notifyOnStderr
): (line: string) => void {
  let broken = false

  stream.on('error', (error: Error) => {
    if (broken) {
      return
    }
    broken = true

    try {
      notify(`Logging to stdout failed (${error.message}), dropping further log lines\n`)
    } catch {}
  })

  return (line) => {
    if (!broken) {
      stream.write(`${line}\n`)
    }
  }
}
