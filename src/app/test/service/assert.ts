import * as assertImpl from 'assert';
import { FailedTestResult } from './testCases';

export class AssertionError extends Error {
  constructor(expected: unknown, actual: unknown) {
    super(`Expected "${expected}" but got "${actual}"`);
    this.name = 'AssertionError';
  }

  toTestResult(): FailedTestResult {
    return {
      passed: false,
      reason: this.message,
    };
  }
}

export function assert<T>(expected: T, actual: T) {
  try {
    assertImpl.deepStrictEqual(expected, actual);
  } catch {
    throw new AssertionError(expected, actual);
  }
}
