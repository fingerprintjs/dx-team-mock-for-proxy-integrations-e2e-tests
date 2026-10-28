import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveLogFormat, resolveLogLevel } from './config'

describe('resolveLogLevel', () => {
  it('defaults to info, and for a level pino does not know', () => {
    assert.equal(resolveLogLevel(undefined), 'info')
    assert.equal(resolveLogLevel(''), 'info')
    assert.equal(resolveLogLevel('verbose'), 'info')
  })

  it('accepts known levels, ignoring case and whitespace', () => {
    assert.equal(resolveLogLevel(' WARN '), 'warn')
    assert.equal(resolveLogLevel('debug'), 'debug')
  })
})

describe('resolveLogFormat', () => {
  it('honors LOG_FORMAT over everything else, and ignores an invalid one', () => {
    assert.equal(resolveLogFormat({ LOG_FORMAT: 'pretty', NODE_ENV: 'production' }, false), 'pretty')
    assert.equal(resolveLogFormat({ LOG_FORMAT: 'JSON' }, true), 'json')
    assert.equal(resolveLogFormat({ LOG_FORMAT: 'xml' }, false), 'json')
  })

  it('is json without a terminal, e.g. in a container, even if NODE_ENV is unset', () => {
    assert.equal(resolveLogFormat({}, false), 'json')
  })

  it('is pretty on a terminal outside production, and json in production', () => {
    assert.equal(resolveLogFormat({}, true), 'pretty')
    assert.equal(resolveLogFormat({ NODE_ENV: 'production' }, true), 'json')
  })
})
