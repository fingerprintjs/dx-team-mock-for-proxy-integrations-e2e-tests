import * as loggerModule from '../logger'
import { createLogger } from '../logger'

// The code under test imports the default logger, so swap it for one that writes into an array
export function captureLogs() {
  const lines: string[] = []
  const original = loggerModule.logger
  ;(loggerModule as { logger: unknown }).logger = createLogger({ destination: { write: (line) => lines.push(line) } })

  return {
    entries: () => lines.map((line) => JSON.parse(line)),
    restore: () => {
      ;(loggerModule as { logger: unknown }).logger = original
    },
  }
}
