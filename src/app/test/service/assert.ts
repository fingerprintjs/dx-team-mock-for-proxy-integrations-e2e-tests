import * as assertImpl from 'assert'

export function assert<T>(actual: T, expected: T, message?: string | Error) {
  assertImpl.deepStrictEqual(actual, expected, message)
}
