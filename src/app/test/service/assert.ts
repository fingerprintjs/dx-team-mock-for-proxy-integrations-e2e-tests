import * as assertImpl from 'assert'
import { FailedTestResult } from './testCases'

export class AssertionError extends Error {
  constructor(actual: unknown, expected: unknown) {
    super(`Expected "${expected}" but got "${actual}"`)
    this.name = 'AssertionError'
  }

  toTestResult(): FailedTestResult {
    return {
      passed: false,
      reason: this.message,
    }
  }
}

export function assert<T>(actual: T, expected: T) {
  try {
    assertImpl.deepStrictEqual(actual, expected)
  } catch {
    throw new AssertionError(actual, expected)
  }
}
