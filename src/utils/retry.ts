import { wait } from './wait'

/**
 * Options controlling {@link withRetry} behavior.
 *
 * @property interval - Delay in milliseconds between attempts.
 * @property maxAttempts - Maximum number of attempts before rejecting with
 *   the last thrown error (when the callback kept throwing). Defaults to `5`.
 * @property onRetry - Invoked before each retry (i.e. starting from the second attempt)
 *   with the current attempt index and the most recent error, if any.
 */
export type RetryUntilParams = {
  interval: number
  maxAttempts?: number
  onRetry?: (context: RetryContext & { error?: Error }) => void
}

/**
 * Context passed to the retry callback and `onRetry` hook.
 *
 * @property attempt - Zero-based attempt index for the call about to run.
 */
export type RetryContext = {
  attempt: number
}

/**
 * Executes a callback function and retries it upon failure until the maximum number of attempts is reached.
 **/
export async function withRetry<T>(
  callback: (context: RetryContext) => Promise<T>,
  { interval, maxAttempts = 5, onRetry }: RetryUntilParams
): Promise<T> {
  let attempts = 0
  let lastError: Error | undefined = undefined

  while (attempts < maxAttempts) {
    if (attempts > 0) {
      onRetry?.({ attempt: attempts, error: lastError })
    }

    try {
      return await callback({ attempt: attempts })
    } catch (error) {
      attempts++
      if (attempts >= maxAttempts) {
        throw error
      }
      lastError = error instanceof Error ? error : new Error(String(error))

      await wait(interval)
    }
  }

  throw new Error('Max attempts reached')
}
