import * as assertImpl from 'assert'

export function assert<T>(actual: T, expected: T, message?: string | Error) {
  assertImpl.deepStrictEqual(actual, expected, message)
}

export function assertLowerThanOrEqual(actual: number, expected: number, message?: string | Error) {
  if (!(actual <= expected)) {
    assertImpl.fail(message)
  }
}

export function assertRegExp(actual: string, regExp: RegExp, message?: string | Error) {
  if (!regExp.test(actual)) {
    assertImpl.fail(message)
  }
}
