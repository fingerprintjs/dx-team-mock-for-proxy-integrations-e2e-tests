import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveLogFormat, resolveLogLevel } from './config'

describe('resolveLogLevel', () => {
  it('defaults to info', () => {
    assert.equal(resolveLogLevel(undefined), 'info')
    assert.equal(resolveLogLevel(''), 'info')
  })

  it('accepts known levels, ignoring case and whitespace', () => {
    assert.equal(resolveLogLevel('debug'), 'debug')
    assert.equal(resolveLogLevel(' WARN '), 'warn')
    assert.equal(resolveLogLevel('Error'), 'error')
  })

  it('falls back to info for unknown values', () => {
    assert.equal(resolveLogLevel('verbose'), 'info')
  })
})

describe('resolveLogFormat', () => {
  it('honors an explicit LOG_FORMAT over everything else', () => {
    assert.equal(resolveLogFormat({ LOG_FORMAT: 'pretty', NODE_ENV: 'production' }, false), 'pretty')
    assert.equal(resolveLogFormat({ LOG_FORMAT: 'JSON' }, true), 'json')
  })

  it('is json when there is no terminal, e.g. in a container, even if NODE_ENV is unset', () => {
    assert.equal(resolveLogFormat({}, false), 'json')
    assert.equal(resolveLogFormat({ NODE_ENV: 'development' }, false), 'json')
  })

  it('is pretty on a terminal outside production', () => {
    assert.equal(resolveLogFormat({}, true), 'pretty')
    assert.equal(resolveLogFormat({ NODE_ENV: 'development' }, true), 'pretty')
  })

  it('is json on a terminal in production', () => {
    assert.equal(resolveLogFormat({ NODE_ENV: 'production' }, true), 'json')
  })

  it('ignores an invalid LOG_FORMAT', () => {
    assert.equal(resolveLogFormat({ LOG_FORMAT: 'xml' }, false), 'json')
  })
})
