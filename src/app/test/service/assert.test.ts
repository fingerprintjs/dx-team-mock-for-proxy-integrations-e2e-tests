import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { assert as assertEqual, assertRegExp, assertToBeFalsy, assertToBeTruthy } from './assert'
import { createLogger } from '../../../logger'

type AssertionFailure = Error & { actual?: unknown; expected?: unknown }

function failure(run: () => void): AssertionFailure {
  try {
    run()
  } catch (error) {
    return error as Error
  }
  throw new Error('expected the assertion to fail')
}

function logged(error: Error) {
  const lines: string[] = []
  createLogger({ destination: { write: (line) => lines.push(line) } }).error({ error }, 'failed')

  return lines.join('')
}

function everythingAbout(error: AssertionFailure) {
  return [
    error.message,
    error.stack,
    JSON.stringify({ actual: error.actual, expected: error.expected }),
    logged(error),
  ].join('\n')
}

describe('assertion helpers and sensitive values', () => {
  it('mask a forwarded credential found by assertToBeFalsy, e.g. a proxy secret that should have been removed', () => {
    const error = failure(() => assertToBeFalsy('fpjs-proxy-secret', 'leaked-proxy-secret-value'))

    assert.equal(everythingAbout(error).includes('leaked-proxy-secret-value'), false)
    assert.equal(error.actual, 'lea*****************')
    assert.equal(error.expected, 'fpjs-proxy-secret')
  })

  it('mask a cookie that was expected to be absent', () => {
    const error = failure(() => assertToBeFalsy('cookie', '_iidt=session-cookie-value'))

    assert.equal(everythingAbout(error).includes('session-cookie-value'), false)
  })

  it('mask both sides of a comparison labelled with a sensitive name', () => {
    const error = failure(() => assertEqual('_iidt=actual-cookie', '_iidt=expected-cookie', 'cookie'))

    const text = everythingAbout(error)
    assert.equal(text.includes('actual-cookie'), false)
    assert.equal(text.includes('expected-cookie'), false)
    assert.equal(error.message, 'cookie')
  })

  it('mask an api key compared by its query parameter name', () => {
    const error = failure(() => assertEqual('received-api-key-1', 'sent-api-key-2', 'apiKey'))

    assert.equal(everythingAbout(error).includes('received-api-key-1'), false)
  })

  it('keep masking when the caller asks for it, whatever the label', () => {
    const error = failure(() => assertEqual('super-secret-proxy-value', 'secret', 'proxy header', true))

    assert.equal(everythingAbout(error).includes('super-secret-proxy-value'), false)
    assert.equal(error.actual, 'sup*****************')
  })

  it('mask the value of a regular expression assertion with a sensitive label', () => {
    const error = failure(() => assertRegExp('Bearer regexp-secret', /^Basic /, 'authorization'))

    assert.equal(everythingAbout(error).includes('regexp-secret'), false)
  })

  it('leave comparisons of ordinary values readable', () => {
    const error = failure(() => assertEqual('loader_v3.js', 'loader_v4.js', 'loader'))

    assert.equal(error.actual, 'loader_v3.js')
    assert.equal(error.expected, 'loader_v4.js')
    assert.equal(failure(() => assertToBeFalsy('x-custom-header', 'visible')).actual, 'visible')
  })

  it('do not turn empty or missing values into asterisks', () => {
    assert.equal(failure(() => assertEqual('', 'secret', 'fpjs-proxy-secret')).actual, '')
    assert.equal(failure(() => assertEqual(undefined, 'secret', 'cookie')).actual, undefined)
    assert.equal(failure(() => assertToBeTruthy('cookie', '')).actual, '')
  })

  it('still pass when the values are equal or falsy', () => {
    assert.doesNotThrow(() => assertEqual('a', 'a', 'cookie'))
    assert.doesNotThrow(() => assertToBeFalsy('cookie', undefined))
    assert.doesNotThrow(() => assertToBeFalsy('cookie', ''))
  })
})
