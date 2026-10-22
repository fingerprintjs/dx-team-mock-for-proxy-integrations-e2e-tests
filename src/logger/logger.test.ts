import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createLogger, LoggerOptions } from './logger'
import { wait } from '../utils/wait'
import { bindLogContext, runWithLogContext, setLogFields, MAX_BUFFERED_LINES } from './context'

function setup(options: LoggerOptions = {}) {
  const lines: string[] = []
  const logger = createLogger({
    write: (line) => lines.push(line),
    now: () => new Date('2026-01-02T03:04:05.678Z'),
    ...options,
  })

  return { lines, logger, parsed: () => lines.map((line) => JSON.parse(line)) }
}

describe('createLogger', () => {
  it('writes one JSON object per line with level, message and timestamp', () => {
    const { logger, lines, parsed } = setup()

    logger.info('hello', { answer: 42 })

    assert.equal(lines.length, 1)
    assert.deepEqual(parsed()[0], {
      timestamp: '2026-01-02T03:04:05.678Z',
      level: 'info',
      message: 'hello',
      answer: 42,
    })
  })

  it('puts the core keys first, then the base fields', () => {
    const { logger, lines } = setup({ base: { service: 'mock-warden', version: '1.2.3' } })

    logger.warn('careful', { extra: true })

    assert.deepEqual(Object.keys(JSON.parse(lines[0])), [
      'timestamp',
      'level',
      'message',
      'service',
      'version',
      'extra',
    ])
  })

  it('uses lowercase string levels', () => {
    const { logger, parsed } = setup({ level: 'debug' })

    logger.debug('a')
    logger.info('b')
    logger.warn('c')
    logger.error('d')

    assert.deepEqual(
      parsed().map((line) => line.level),
      ['debug', 'info', 'warn', 'error']
    )
  })

  it('drops lines below the configured level', () => {
    const { logger, parsed } = setup({ level: 'warn' })

    logger.debug('a')
    logger.info('b')
    logger.warn('c')
    logger.error('d')

    assert.deepEqual(
      parsed().map((line) => line.message),
      ['c', 'd']
    )
  })

  it('does not let fields override level, message, timestamp or base fields', () => {
    const { logger, parsed } = setup({ base: { service: 'mock-warden' } })

    logger.info('real message', { level: 'fatal', message: 'spoofed', timestamp: 'never', service: 'other' })

    assert.deepEqual(parsed()[0], {
      timestamp: '2026-01-02T03:04:05.678Z',
      level: 'info',
      message: 'real message',
      service: 'mock-warden',
    })
  })

  it('keeps a multi-line message on a single line', () => {
    const { logger, lines, parsed } = setup()

    logger.error('first\nsecond\nthird')

    assert.equal(lines.length, 1)
    assert.equal(lines[0].includes('\n'), false)
    assert.equal(parsed()[0].message, 'first\nsecond\nthird')
  })

  it('serializes errors as structured fields on one line', () => {
    const { logger, lines, parsed } = setup()

    logger.error('request failed', { error: new RangeError('out of range') })

    assert.equal(lines[0].includes('\n'), false)
    assert.equal(parsed()[0].error.kind, 'RangeError')
    assert.equal(parsed()[0].error.message, 'out of range')
    assert.match(parsed()[0].error.stack, /RangeError: out of range/)
  })

  it('does not throw on fields that cannot be serialized normally', () => {
    const { logger, parsed } = setup()
    const circular: Record<string, unknown> = {}
    circular.self = circular

    assert.doesNotThrow(() => logger.info('odd', { circular, big: 1n, body: Buffer.from('abc') }))
    assert.deepEqual(parsed()[0].circular, { self: '[Circular]' })
    assert.equal(parsed()[0].body, '[binary 3 bytes]')
  })

  it('does not throw when the sink throws', () => {
    const logger = createLogger({
      write: () => {
        throw new Error('stdout closed')
      },
    })

    assert.doesNotThrow(() => logger.info('hello'))
  })

  it('does not throw when the message is not a string', () => {
    const { logger, parsed } = setup()

    assert.doesNotThrow(() => logger.info(undefined as unknown as string))
    assert.equal(parsed()[0].message, 'undefined')
  })

  it('writes human-readable lines in pretty format, with the stack below an error', () => {
    const { logger, lines } = setup({ format: 'pretty', base: { service: 'mock-warden' } })

    logger.info('started', { port: 3000 })
    logger.error('failed', { error: new Error('boom') })

    assert.equal(lines[0], '2026-01-02T03:04:05.678Z INFO  started {"port":3000}')
    assert.match(lines[1], /^2026-01-02T03:04:05\.678Z ERROR failed\nError: boom\n\s+at /)
  })
})

describe('pretty format with unusual errors', () => {
  it('does not lose the event when the error is null, as a hook throwing null produces', async () => {
    const { logger, lines } = setup({ format: 'pretty' })

    const { logs } = await runWithLogContext({ testName: 'a' }, async () => {
      logger.error('failed', { error: null })
    })

    assert.equal(lines.length, 1)
    assert.match(lines[0], /ERROR failed/)
    assert.equal(JSON.parse(logs[0]).error, null)
  })

  it('shows what was compared by a failed assertion, which the stack alone does not say', () => {
    const { logger, lines } = setup({ format: 'pretty' })
    const error = Object.assign(new Error('loader'), {
      code: 'ERR_ASSERTION',
      operator: 'assert',
      actual: 'loader_v3.js',
      expected: 'loader_v4.js',
    })

    logger.error('Test attempt failed', { error })

    assert.match(lines[0], /^2026-01-02T03:04:05\.678Z ERROR Test attempt failed\nError: loader\n\s+at /)
    assert.match(lines[0], /\n\s+code: "ERR_ASSERTION"/)
    assert.match(lines[0], /\n\s+operator: "assert"/)
    assert.match(lines[0], /\n\s+actual: "loader_v3\.js"/)
    assert.match(lines[0], /\n\s+expected: "loader_v4\.js"/)
  })

  it('shows the code and the cause of an error', () => {
    const { logger, lines } = setup({ format: 'pretty' })
    const error = Object.assign(new Error('request failed'), {
      code: 'ECONNRESET',
      cause: new Error('socket hang up'),
    })

    logger.error('failed', { error })

    assert.match(lines[0], /\n\s+code: "ECONNRESET"/)
    assert.match(lines[0], /\n\s+cause: .*socket hang up/)
  })

  it('does not print sensitive values of the error fields', () => {
    const { logger, lines } = setup({ format: 'pretty' })
    const error = Object.assign(new Error('x'), { code: { authorization: 'Bearer pretty-secret' } })

    logger.error('failed', { error })

    assert.equal(lines[0].includes('pretty-secret'), false)
  })

  it('keeps one line for an error without extra fields', () => {
    const { logger, lines } = setup({ format: 'pretty' })

    logger.error('failed', { error: new Error('plain') })

    assert.doesNotMatch(lines[0], /\n\s+(code|operator|actual|expected|cause):/)
  })

  it('renders errors that are not Error objects without throwing', () => {
    const { logger, lines } = setup({ format: 'pretty' })

    logger.error('string', { error: 'plain text' })
    logger.error('object', { error: { code: 42 } })
    logger.error('number', { error: 7 })

    assert.equal(lines.length, 3)
    assert.match(lines[0], /ERROR string\nplain text$/)
    assert.match(lines[1], /ERROR object\n\{"code":42\}$/)
    assert.match(lines[2], /ERROR number\n7$/)
  })
})

describe('log context', () => {
  it('attaches the context fields to every line written inside it', async () => {
    const { logger, parsed } = setup()

    await runWithLogContext({ integrationHost: 'example.com', testName: 'case-a' }, async () => {
      logger.info('inside')
      await wait(1)
      logger.info('after await')
    })
    logger.info('outside')

    assert.deepEqual(
      parsed().map(({ message, integrationHost, testName }) => ({ message, integrationHost, testName })),
      [
        { message: 'inside', integrationHost: 'example.com', testName: 'case-a' },
        { message: 'after await', integrationHost: 'example.com', testName: 'case-a' },
        { message: 'outside', integrationHost: undefined, testName: undefined },
      ]
    )
  })

  it('lets call fields override context fields, but not core keys', async () => {
    const { logger, parsed } = setup()

    await runWithLogContext({ attempt: 1, level: 'fatal' }, async () => {
      logger.info('retrying', { attempt: 2 })

      assert.equal(parsed()[0].attempt, 2)
      assert.equal(parsed()[0].level, 'info')
    })
  })

  it('keeps concurrent contexts apart', async () => {
    const { logger, parsed } = setup()

    const [a, b] = await Promise.all([
      runWithLogContext({ testName: 'a' }, async () => {
        logger.info('a1')
        await wait(5)
        logger.info('a2')
      }),
      runWithLogContext({ testName: 'b' }, async () => {
        await wait(1)
        logger.info('b1')
        await wait(10)
        logger.info('b2')
      }),
    ])

    assert.deepEqual(
      a.logs.map((line) => JSON.parse(line).message),
      ['a1', 'a2']
    )
    assert.deepEqual(
      b.logs.map((line) => JSON.parse(line).message),
      ['b1', 'b2']
    )
    for (const line of parsed()) {
      assert.equal(line.testName, line.message.startsWith('a') ? 'a' : 'b')
    }
  })

  it('updates fields mid-run, e.g. for a retry', async () => {
    const { logger, parsed } = setup()

    await runWithLogContext({ attempt: 1 }, async () => {
      logger.info('first try')
      setLogFields({ attempt: 2 })
      logger.info('second try')
    })

    assert.deepEqual(
      parsed().map((line) => line.attempt),
      [1, 2]
    )
  })

  it('keeps the context for a callback bound to it and invoked from elsewhere', async () => {
    const { logger, parsed } = setup()
    let bound: () => void = () => {}

    await runWithLogContext({ testName: 'a' }, async () => {
      bound = bindLogContext(() => logger.info('bound'))
    })
    bound()
    logger.info('unbound')

    assert.equal(parsed()[0].testName, 'a')
    assert.equal(parsed()[1].testName, undefined)
  })

  it('ignores setLogFields outside a context', () => {
    assert.doesNotThrow(() => setLogFields({ attempt: 3 }))
  })

  it('captures the same JSON lines it writes, even when stdout is pretty', async () => {
    const { logger, lines } = setup({ format: 'pretty' })

    const { logs } = await runWithLogContext({ testName: 'a' }, async () => {
      logger.info('hello', { n: 1 })
    })

    assert.equal(logs.length, 1)
    assert.equal(logs[0].includes('\n'), false)
    assert.deepEqual(JSON.parse(logs[0]), {
      timestamp: '2026-01-02T03:04:05.678Z',
      level: 'info',
      message: 'hello',
      testName: 'a',
      n: 1,
    })
    assert.notEqual(lines[0], logs[0])
  })

  it('does not capture lines dropped by the level filter', async () => {
    const { logger } = setup({ level: 'info' })

    const { logs } = await runWithLogContext({}, async () => {
      logger.debug('hidden')
      logger.info('shown')
    })

    assert.equal(logs.length, 1)
  })

  it('keeps the logs when the callback returns a value, and propagates its error', async () => {
    const { result } = await runWithLogContext({}, async () => 'done')
    assert.equal(result, 'done')

    await assert.rejects(
      runWithLogContext({}, async () => {
        throw new Error('failed')
      }),
      /failed/
    )
  })

  it('caps the captured lines, dropping the oldest', async () => {
    const { logger } = setup()

    const { logs } = await runWithLogContext({}, async () => {
      for (let i = 0; i < MAX_BUFFERED_LINES + 5; i++) {
        logger.info(`line ${i}`)
      }
    })

    assert.equal(logs.length, MAX_BUFFERED_LINES)
    assert.equal(JSON.parse(logs[0]).message, 'line 5')
    assert.equal(JSON.parse(logs[logs.length - 1]).message, `line ${MAX_BUFFERED_LINES + 4}`)
  })
})
