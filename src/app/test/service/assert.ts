import { AssertionError } from 'assert'
import { isSensitiveKey } from '../../../logger/redact'

// Empty and missing values stay readable: they are not secret
function mask<T>(value: T): T {
  if (value === undefined || value === null || value === '') {
    return value
  }

  return String(value).slice(0, 3).padEnd(20, '*') as T
}

// Masked before the AssertionError is built: Node writes the values into its message and stack too
function maskIfSensitive<T>(label: string | undefined, value: T): T {
  return label !== undefined && isSensitiveKey(label) ? mask(value) : value
}

export function assert<T>(actual: T, expected: T, message?: string, sanitize: boolean = false) {
  if (actual !== expected) {
    throw new AssertionError({
      operator: 'assert',
      actual: sanitize ? mask(actual) : maskIfSensitive(message, actual),
      expected: maskIfSensitive(message, expected),
      message,
    })
  }
}

/**
 * Removes port from IP address. Sometimes IP address is returned with port, which is not needed.
 * */
function removePortFromIp(ip: string): string {
  return ip.replace(/(^\[[a-fA-F0-9:]+]):\d+$/, '$1').replace(/(^[0-9.]+):\d+$/, '$1')
}

export function assertEqualIp(actualIp: string | undefined, expectedIp: string, message?: string) {
  assert(removePortFromIp(actualIp || ''), removePortFromIp(expectedIp), message)
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
      actual: maskIfSensitive(message, actual),
      expected: regExp.source,
      message,
    })
  }
}

export function assertToBeTruthy(
  field: string,
  actual: unknown,
  message?: string
): asserts actual is NonNullable<unknown> {
  const safeActual = typeof actual === 'string' ? actual.trim() : actual
  if ((Array.isArray(safeActual) || typeof safeActual === 'string') && safeActual.length > 0) {
    return
  } else if (actual) {
    return
  }

  throw new AssertionError({
    operator: 'assertToBeTruthy',
    actual: maskIfSensitive(field, actual),
    expected: field,
    message,
  })
}

export function assertToBeFalsy(field: string, actual: unknown, message?: string) {
  if (!actual) {
    return
  }

  const safeActual = typeof actual === 'string' ? actual.trim() : actual

  if ((Array.isArray(safeActual) || typeof safeActual === 'string') && safeActual.length === 0) {
    return
  }

  throw new AssertionError({
    operator: 'assertToBeFalsy',
    actual: maskIfSensitive(field, actual),
    expected: field,
    message,
  })
}
