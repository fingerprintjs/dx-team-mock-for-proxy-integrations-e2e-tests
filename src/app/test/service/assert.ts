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

/**
 * Removes port from IP address. Sometimes IP address is returned with port, which is not needed.
 * */
function removePortFromIp(ip: string) {
  const url = new URL(`http://${ip}`)

  return url.hostname
}

export function assertEqualIp(actualIp: string, expectedIp: string, message?: string) {
  assert(removePortFromIp(actualIp), removePortFromIp(expectedIp), message)
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
