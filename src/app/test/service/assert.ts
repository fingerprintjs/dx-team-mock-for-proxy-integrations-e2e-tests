import { AssertionError } from 'assert'

export function assert<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new AssertionError({
      operator: 'assert',
      actual,
      expected,
      message,
    })
  }
}

export function assertLowerThanOrEqual(actual: number, expected: number, message?: string) {
  if (!(actual <= expected)) {
    throw new AssertionError({
      operator: 'assertLowerThanOrEqual',
      actual,
      expected,
      message,
    })
  }
}

export function assertRegExp(actual: string, regExp: RegExp, message?: string) {
  if (!regExp.test(actual)) {
    throw new AssertionError({
      operator: 'assertRegExp',
      actual,
      expected: regExp.source,
      message,
    })
  }
}

export function assertToBeTruthy(field: string, actual: any, message?: string) {
  if (!actual) {
    throw new AssertionError({
      operator: 'assertToBeTruthy',
      actual,
      expected: field,
      message,
    })
  }
}
