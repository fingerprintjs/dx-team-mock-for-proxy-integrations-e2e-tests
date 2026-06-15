import { wait } from './wait'

/**
 * Options controlling {@link withRetry} behavior.
 *
 * @template T - Type of the value resolved by the callback.
 * @property condition - Predicate evaluated against the callback's resolved value.
 *   When it returns `true`, the retry loop succeeds and resolves with that value.
 *   When it returns `false`, the attempt counter is incremented and the loop retries.
 *   Defaults to a function that always returns `true` (succeed on first non-throwing call).
 * @property interval - Delay in milliseconds between attempts.
 * @property maxAttempts - Maximum number of attempts before rejecting with
 *   `Error('Max attempts reached')` (when the condition never matched) or the last
 *   thrown error (when the callback kept throwing). Defaults to `5`.
 * @property onRetry - Invoked before each retry (i.e. starting from the second attempt)
 *   with the current attempt index and the most recent error, if any.
 */
export type RetryUntilParams<T> = {
  condition?: (value: T) => boolean
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
 * Repeatedly invokes `callback` until it resolves with a value that satisfies
 * `condition`, or until `maxAttempts` is reached.
 *
 * Behavior:
 * - If the callback resolves and `condition(value)` returns `true`, the returned
 *   promise resolves with that value.
 * - If `condition(value)` returns `false`, the attempt is counted and the loop
 *   waits `interval` ms before trying again.
 * - If the callback throws, the attempt is counted; once `maxAttempts` is reached
 *   the returned promise rejects with the last thrown error.
 * - If `maxAttempts` is reached without the condition ever matching, the promise
 *   rejects with `Error('Max attempts reached')`.
 *
 * Between attempts (after a failed attempt and before the next one), the function waits
 * `interval` ms via {@link wait}.
 * @template T - Type of the value resolved by the callback.
 * @param callback - Async function to invoke on each attempt. Receives the current
 *   {@link RetryContext}.
 * @param params - See {@link RetryUntilParams}.
 * @returns A promise that resolves with the first value passing `condition`, or
 *   rejects once `maxAttempts` is exhausted.
 */
export async function withRetry<T>(
  callback: (context: RetryContext) => Promise<T>,
  { interval, condition = () => true, maxAttempts = 5, onRetry }: RetryUntilParams<T>
): Promise<T> {
  let attempts = 0
  let lastError: Error | undefined = undefined

  while (attempts < maxAttempts) {
    if (attempts > 0) {
      onRetry?.({ attempt: attempts, error: lastError })
    }

    try {
      const value = await callback({ attempt: attempts })
      if (condition(value)) {
        return value
      }
      attempts++
    } catch (error) {
      attempts++
      if (attempts >= maxAttempts) {
        throw error
      }
      lastError = error instanceof Error ? error : new Error(String(error))
    }

    if (attempts < maxAttempts) {
      await wait(interval)
    }
  }

  throw new Error('Max attempts reached')
}
