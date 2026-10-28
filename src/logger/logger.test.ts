import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { PassThrough } from 'node:stream'
import { AxiosError, AxiosHeaders } from 'axios'
import { createLogger, runWithLogContext } from '.'
import { wait } from '../utils/wait'

function setup(options: Parameters<typeof createLogger>[0] = {}) {
  const lines: string[] = []
  const logger = createLogger({ destination: { write: (line) => lines.push(line) }, ...options })

  return { logger, lines, entries: () => lines.map((line) => JSON.parse(line)) }
}

describe('createLogger', () => {
  it('writes one JSON object per line with level, message, timestamp, service and version', () => {
    const { logger, lines, entries } = setup()

    logger.info({ answer: 42 }, 'hello')

    assert.equal(lines.length, 1)
    assert.deepEqual(Object.keys(entries()[0]).sort(), [
      'answer',
      'level',
      'message',
      'service',
      'timestamp',
      'version',
    ])
    assert.equal(entries()[0].level, 'info')
    assert.equal(entries()[0].message, 'hello')
    assert.equal(entries()[0].service, 'mock-warden')
    assert.equal(new Date(entries()[0].timestamp).toISOString(), entries()[0].timestamp)
  })

  it('keeps a multi-line message on one line', () => {
    const { logger, lines, entries } = setup()

    logger.error('first\nsecond')

    assert.equal(lines.length, 1)
    assert.equal(entries()[0].message, 'first\nsecond')
  })

  it('drops lines below the level, and writes debug lines when asked to', () => {
    const quiet = setup()
    quiet.logger.debug('hidden')
    quiet.logger.info('shown')

    const verbose = setup({ level: 'debug' })
    verbose.logger.debug('shown too')

    assert.deepEqual(
      quiet.entries().map((entry) => entry.message),
      ['shown']
    )
    assert.deepEqual(
      verbose.entries().map((entry) => entry.message),
      ['shown too']
    )
  })

  it('writes readable output in pretty format, and still captures JSON for the log context', async () => {
    const destination = new PassThrough()
    const { logger } = setup({ format: 'pretty', destination })

    const { logs } = await runWithLogContext({ testName: 'a' }, async () => {
      logger.info({ attempt: 2 }, 'hello')
    })
    await wait(20)

    const output = String(destination.read())
    assert.match(output, /INFO: hello/)
    assert.doesNotMatch(output, /^\{/)
    assert.equal(JSON.parse(logs[0]).testName, 'a')
  })
})

describe('errors', () => {
  it('are logged with their kind, message, stack and code', () => {
    const { logger, entries } = setup()
    const error = Object.assign(new RangeError('out of range'), { code: 'E_RANGE' })

    logger.error({ error }, 'failed')

    assert.equal(entries()[0].error.kind, 'RangeError')
    assert.equal(entries()[0].error.message, 'out of range')
    assert.match(entries()[0].error.stack, /RangeError: out of range/)
    assert.equal(entries()[0].error.code, 'E_RANGE')
  })

  it('keep what an assertion compared, which its message may not say', () => {
    const { logger, entries } = setup()
    const error = Object.assign(new Error('loader'), {
      code: 'ERR_ASSERTION',
      operator: 'assert',
      actual: 'loader_v3.js',
      expected: 'loader_v4.js',
    })

    logger.error({ error }, 'failed')

    assert.deepEqual(
      [entries()[0].error.actual, entries()[0].error.expected, entries()[0].error.operator],
      ['loader_v3.js', 'loader_v4.js', 'assert']
    )
  })

  it('do not carry the config, request and response of an axios error, with their credentials', () => {
    const { logger, lines, entries } = setup()
    const error = new AxiosError(
      'Request failed',
      'ERR_BAD_REQUEST',
      { headers: { Authorization: 'Bearer secret-token' } } as never,
      {},
      { status: 404, headers: { 'set-cookie': 'sid=secret-cookie' }, data: 'body' } as never
    )

    logger.error({ error }, 'failed')

    assert.equal(lines.join('').includes('secret-token'), false)
    assert.equal(lines.join('').includes('secret-cookie'), false)
    assert.equal(entries()[0].error.kind, 'AxiosError')
    assert.equal(entries()[0].error.code, 'ERR_BAD_REQUEST')
  })

  it('are passed through when what was thrown is not an Error', () => {
    const { logger, entries } = setup()

    logger.error({ error: null }, 'null')
    logger.error({ error: 'text' }, 'string')

    assert.deepEqual(
      entries().map((entry) => entry.error),
      [null, 'text']
    )
  })

  it('survive a long cause chain', () => {
    const { logger, entries } = setup()
    let error = new Error('root')
    for (let i = 0; i < 5000; i++) {
      error = Object.assign(new Error(`level ${i}`), { cause: error })
    }

    logger.error({ error }, 'failed')

    assert.equal(entries().length, 1)
  })
})

describe('redaction', () => {
  it('hides credential headers, at the top level and one level down', () => {
    const { logger, lines, entries } = setup()

    logger.info(
      {
        headers: {
          cookie: 'sid=secret-1',
          authorization: 'Bearer secret-2',
          'set-cookie': 'secret-3',
          'x-ok': 'visible',
        },
        request: { headers: { 'fpjs-proxy-secret': 'secret-4' } },
      },
      'headers'
    )

    assert.equal(/secret-\d/.test(lines.join('')), false)
    assert.equal(entries()[0].headers['x-ok'], 'visible')
    assert.equal(entries()[0].headers.cookie, '[REDACTED]')
  })

  it('hides credential headers of an axios response', () => {
    const { logger, lines, entries } = setup()
    const headers = new AxiosHeaders({ 'set-cookie': 'secret-cookie', 'content-type': 'text/plain' })

    logger.info({ headers }, 'response')

    assert.equal(lines.join('').includes('secret-cookie'), false)
    assert.equal(entries()[0].headers['content-type'], 'text/plain')
  })
})

describe('bodies', () => {
  it('replace binary data with its size', () => {
    const { logger, entries } = setup()

    logger.info({ body: Buffer.from('hello') }, 'binary')

    assert.equal(entries()[0].body, '[binary 5 bytes]')
  })

  it('are truncated when long, and kept when short', () => {
    const { logger, entries } = setup()

    logger.info({ body: 'x'.repeat(10_000) }, 'long')
    logger.info({ body: 'short' }, 'short')

    assert.ok(entries()[0].body.length < 5000)
    assert.equal(entries()[1].body, 'short')
  })
})
