import { wait } from './wait'

/**
 * Options controlling {@link withRetry} behavior.
 *
 * @property interval - Delay in milliseconds between attempts.
 * @property maxAttempts - Maximum number of attempts before rejecting with
 *   the last thrown error (when the callback kept throwing). Defaults to `5`.
 * @property onRetry - Invoked before each retry (i.e. starting from the second attempt)
 *   with the current attempt index and the most recent error, if any.
 * @property onAttemptError - Invoked the moment an attempt fails, before any wait or retry
 *   decision, so the failure can be reported while it is happening rather than once the whole
 *   retry cycle has played out.
 * @property shouldRetry - Decides whether a given error is worth retrying. Defaults to retrying
 *   everything. Deterministic failures (a failed assertion, say) produce the same result on every
 *   attempt, so retrying them only delays the verdict.
 */
export type RetryUntilParams = {
  interval: number
  maxAttempts?: number
  onRetry?: (context: RetryContext & { error?: Error }) => void
  onAttemptError?: (context: RetryContext & { error: unknown }) => void
  shouldRetry?: (error: unknown) => boolean
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
  { interval, maxAttempts = 5, onRetry, onAttemptError, shouldRetry }: RetryUntilParams
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
      onAttemptError?.({ attempt: attempts, error })
      attempts++
      if (attempts >= maxAttempts || (shouldRetry && !shouldRetry(error))) {
        throw error
      }
      lastError = error instanceof Error ? error : new Error(String(error))

      await wait(interval)
    }
  }
  throw lastError || new Error('withRetry failed without an error')
}
