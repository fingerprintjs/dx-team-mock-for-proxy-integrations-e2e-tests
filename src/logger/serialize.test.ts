import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { normalize, safeStringify, serializeError, DEFAULT_SERIALIZE_OPTIONS } from './serialize'
import { REDACTED } from './redact'
import { assert as assertEqual } from '../app/test/service/assert'

describe('safeStringify', () => {
  it('produces a single line of JSON', () => {
    const line = safeStringify({ message: 'line one\nline two', nested: { a: [1, 2, 3] } })

    assert.equal(line.includes('\n'), false)
    assert.deepEqual(JSON.parse(line), { message: 'line one\nline two', nested: { a: [1, 2, 3] } })
  })

  it('does not throw on circular references', () => {
    const a: Record<string, unknown> = { name: 'a' }
    a.self = a
    a.list = [a]

    const parsed = JSON.parse(safeStringify(a))

    assert.equal(parsed.self, '[Circular]')
    assert.deepEqual(parsed.list, ['[Circular]'])
  })

  it('does not mark a repeated, non-circular reference as circular', () => {
    const shared = { value: 1 }

    assert.deepEqual(JSON.parse(safeStringify({ a: shared, b: shared })), { a: { value: 1 }, b: { value: 1 } })
  })

  it('does not throw on BigInt, symbols and functions', () => {
    const parsed = JSON.parse(safeStringify({ big: 10n, sym: Symbol('x'), fn: function named() {} }))

    assert.deepEqual(parsed, { big: '10', sym: 'Symbol(x)', fn: '[Function named]' })
  })

  it('replaces binary bodies with a size placeholder', () => {
    const parsed = JSON.parse(
      safeStringify({ buffer: Buffer.from('hello'), bytes: new Uint8Array(3), arrayBuffer: new ArrayBuffer(8) })
    )

    assert.deepEqual(parsed, {
      buffer: '[binary 5 bytes]',
      bytes: '[binary 3 bytes]',
      arrayBuffer: '[binary 8 bytes]',
    })
  })

  it('does not throw when a getter throws or toJSON fails', () => {
    const hostile = {
      get boom() {
        throw new Error('nope')
      },
    }
    const brokenToJSON = {
      toJSON() {
        throw new Error('bad toJSON')
      },
    }

    assert.doesNotThrow(() => safeStringify(hostile))
    assert.match(safeStringify(brokenToJSON), /Unserializable: bad toJSON/)
  })

  it('truncates long strings', () => {
    const parsed = JSON.parse(
      safeStringify({ body: 'x'.repeat(100) }, { ...DEFAULT_SERIALIZE_OPTIONS, maxStringLength: 10 })
    )

    assert.equal(parsed.body, `${'x'.repeat(10)}…[truncated 90 chars]`)
  })

  it('limits nesting depth', () => {
    const deep = { a: { b: { c: { d: 'end' } } } }

    const parsed = JSON.parse(safeStringify(deep, { ...DEFAULT_SERIALIZE_OPTIONS, maxDepth: 2 }))

    assert.deepEqual(parsed, { a: { b: '[Object]' } })
  })

  it('serializes maps, sets, dates and objects with toJSON', () => {
    const parsed = JSON.parse(
      safeStringify({
        map: new Map([['k', 'v']]),
        set: new Set([1, 2]),
        date: new Date('2026-01-02T03:04:05.000Z'),
        url: new URL('https://example.com/path?q=1'),
      })
    )

    assert.deepEqual(parsed, {
      map: { k: 'v' },
      set: [1, 2],
      date: '2026-01-02T03:04:05.000Z',
      url: 'https://example.com/path?q=1',
    })
  })

  it('serializes non-finite numbers and drops undefined fields', () => {
    assert.deepEqual(JSON.parse(safeStringify({ nan: NaN, inf: Infinity, missing: undefined })), {
      nan: 'NaN',
      inf: 'Infinity',
    })
  })

  it('redacts sensitive keys at any depth, case-insensitively', () => {
    const parsed = JSON.parse(
      safeStringify({
        headers: {
          Cookie: '_iidt=abc',
          Authorization: 'Bearer token',
          'fpjs-proxy-secret': 's3cr3t',
          'content-type': 'text/plain',
        },
        query: { apiKey: 'key', ci: 'js/4' },
        list: [{ 'Set-Cookie': 'a=b' }],
      })
    )

    assert.deepEqual(parsed, {
      headers: {
        Cookie: REDACTED,
        Authorization: REDACTED,
        'fpjs-proxy-secret': REDACTED,
        'content-type': 'text/plain',
      },
      query: { apiKey: REDACTED, ci: 'js/4' },
      list: [{ 'Set-Cookie': REDACTED }],
    })
  })
})

describe('serializeError', () => {
  it('captures kind, message and stack', () => {
    const error = new TypeError('bad input')

    const serialized = serializeError(error, DEFAULT_SERIALIZE_OPTIONS)

    assert.equal(serialized.kind, 'TypeError')
    assert.equal(serialized.message, 'bad input')
    assert.match(serialized.stack ?? '', /TypeError: bad input/)
  })

  it('keeps the error code and the cause chain', () => {
    const cause = Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' })
    const error = Object.assign(new Error('request failed'), { cause })

    const serialized = serializeError(error, DEFAULT_SERIALIZE_OPTIONS) as any

    assert.equal(serialized.cause.kind, 'Error')
    assert.equal(serialized.cause.message, 'socket hang up')
    assert.equal(serialized.cause.code, 'ECONNRESET')
  })

  it('does not leak an object attached to the error, like the axios request config', () => {
    const error = Object.assign(new Error('boom'), { config: { headers: { Authorization: 'Bearer secret-value' } } })

    assert.equal(safeStringify({ error }).includes('secret-value'), false)
  })

  it('normalizes an error code that is not a string', () => {
    const circular: Record<string, unknown> = { name: 'loop' }
    circular.self = circular

    const withObjectCode = Object.assign(new Error('a'), {
      code: { authorization: 'Bearer secret-value', status: 500 },
    })
    const withBigIntCode = Object.assign(new Error('b'), { code: 10n })
    const withCircularCode = Object.assign(new Error('c'), { code: circular })

    const output = safeStringify({ withObjectCode, withBigIntCode, withCircularCode })
    const parsed = JSON.parse(output)

    assert.equal(output.includes('secret-value'), false)
    assert.deepEqual(parsed.withObjectCode.code, {
      authorization: REDACTED,
      status: 500,
    })
    assert.equal(parsed.withBigIntCode.code, '10')
    assert.deepEqual(parsed.withCircularCode.code, { name: 'loop', self: '[Circular]' })
  })

  it('keeps simple error codes as they are', () => {
    const serialized = serializeError(Object.assign(new Error('x'), { code: 'ECONNRESET' }), DEFAULT_SERIALIZE_OPTIONS)

    assert.equal(serialized.code, 'ECONNRESET')
  })

  it('cuts a long cause chain off at the maximum depth', () => {
    let error = new Error('root cause')
    for (let i = 0; i < 5000; i++) {
      error = Object.assign(new Error(`level ${i}`), { cause: error })
    }

    const parsed = JSON.parse(safeStringify({ error }))

    let depth = 0
    let current = parsed.error
    while (typeof current === 'object') {
      depth++
      current = current.cause
    }
    assert.equal(current, '[Error]')
    assert.ok(depth <= DEFAULT_SERIALIZE_OPTIONS.maxDepth)
  })

  it('survives a cause that points back to the error', () => {
    const error = new Error('loop') as Error & { cause?: unknown }
    error.cause = error

    assert.doesNotThrow(() => safeStringify({ error }))
  })

  it('is applied to errors nested in fields', () => {
    const parsed = JSON.parse(safeStringify({ error: new Error('nested') }))

    assert.equal(parsed.error.message, 'nested')
  })
})

describe('serializeError of assertion errors', () => {
  function failure(run: () => void): Error {
    try {
      run()
    } catch (error) {
      return error as Error
    }
    throw new Error('expected the assertion to fail')
  }

  it('keeps the compared values and the operator, which a short custom message does not carry', () => {
    // How the test cases assert: the message only names what was compared
    const error = failure(() => assertEqual('loader_v3.js', 'loader_v4.js', 'loader'))

    const serialized = serializeError(error, DEFAULT_SERIALIZE_OPTIONS)

    assert.equal(serialized.message, 'loader')
    assert.equal(serialized.actual, 'loader_v3.js')
    assert.equal(serialized.expected, 'loader_v4.js')
    assert.equal(serialized.operator, 'assert')
  })

  it('keeps the diagnostics of node assertion errors too', () => {
    const error = failure(() => assert.strictEqual(1, 2))

    const serialized = serializeError(error, DEFAULT_SERIALIZE_OPTIONS)

    assert.equal(serialized.actual, 1)
    assert.equal(serialized.expected, 2)
    assert.equal(serialized.operator, 'strictEqual')
  })

  it('keeps the masking of the assert helper for sensitive values', () => {
    const error = failure(() => assertEqual('super-secret-proxy-value', 'secret', 'fpjs-proxy-secret', true))

    const output = safeStringify({ error })

    assert.equal(output.includes('super-secret-proxy-value'), false)
    assert.equal(JSON.parse(output).error.actual, 'sup*****************')
  })

  it('redacts credential-like keys in the compared objects', () => {
    // Node builds its message from the values, so only the structured fields are checked
    const error = failure(() =>
      assert.deepStrictEqual(
        { headers: { Authorization: 'Bearer actual-secret' } },
        { headers: { Authorization: 'Bearer expected-secret' } }
      )
    )

    const { actual, expected } = JSON.parse(safeStringify({ error })).error

    assert.deepEqual(actual, { headers: { Authorization: REDACTED } })
    assert.deepEqual(expected, { headers: { Authorization: REDACTED } })
  })

  it('truncates long compared values and survives circular ones', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    const error = failure(() => assertEqual('x'.repeat(10_000), circular as unknown as string, 'body'))

    const parsed = JSON.parse(safeStringify({ error }))

    assert.ok(parsed.error.actual.length < 5000)
    assert.deepEqual(parsed.error.expected, { self: '[Circular]' })
  })

  it('adds nothing to other errors', () => {
    const serialized = serializeError(new Error('plain'), DEFAULT_SERIALIZE_OPTIONS)

    assert.equal('actual' in serialized, false)
    assert.equal('expected' in serialized, false)
    assert.equal('operator' in serialized, false)
  })
})

describe('normalize', () => {
  it('keeps primitives as they are', () => {
    assert.equal(normalize('a'), 'a')
    assert.equal(normalize(1), 1)
    assert.equal(normalize(true), true)
    assert.equal(normalize(null), null)
  })
})
