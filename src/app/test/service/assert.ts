import * as assertImpl from 'assert'
import { FailedTestResult } from './testCases'

export class TestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AssertionError'
  }

  toTestResult(): FailedTestResult {
    return {
      passed: false,
      reason: this.message,
    }
  }
}

/**
 * Asserts that at least one of the variants is equal to the actual value.
 * */
export function assertVariants<T>(actual: T, variants: T[], message?: string | Error) {
  for (const variant of variants) {
    try {
      assert(actual, variant, message)
    } catch {
      // Nothing here...
    }
  }

  throw new assertImpl.AssertionError({
    message: `Expected ${actual} to be one of ${variants.join(', ')}`,
    actual,
    expected: variants,
  })
}

export function assert<T>(actual: T, expected: T, message?: string | Error) {
  assertImpl.deepStrictEqual(actual, expected, message)
}
