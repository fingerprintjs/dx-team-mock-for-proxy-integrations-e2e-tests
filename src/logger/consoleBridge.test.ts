/* eslint-disable no-console */
import { afterEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createLogger } from './logger'
import { installConsoleBridge } from './consoleBridge'

describe('installConsoleBridge', () => {
  let restore: (() => void) | undefined

  afterEach(() => {
    restore?.()
    restore = undefined
  })

  function setup() {
    const lines: string[] = []
    const logger = createLogger({ write: (line) => lines.push(line), level: 'debug' })
    restore = installConsoleBridge(logger)

    return { parsed: () => lines.map((line) => JSON.parse(line)) }
  }

  it('routes console methods to the matching level', () => {
    const { parsed } = setup()
    console.log('a')
    console.info('b')
    console.debug('c')
    console.warn('d')
    console.error('e')

    assert.deepEqual(
      parsed().map(({ level, message }) => [level, message]),
      [
        ['info', 'a'],
        ['info', 'b'],
        ['debug', 'c'],
        ['warn', 'd'],
        ['error', 'e'],
      ]
    )
  })

  it('formats arguments like console does and keeps multi-line output on one line', () => {
    const { parsed } = setup()
    console.log('port %d', 3000, { a: 1 }, 'x\ny')

    assert.equal(parsed().length, 1)
    assert.match(parsed()[0].message, /^port 3000 \{ a: 1 \} x\ny$/)
  })

  it('redacts credential-like keys in objects before they are flattened into the message', () => {
    const { parsed } = setup()

    console.info('request', { headers: { Authorization: 'Bearer secret-value', accept: '*/*' } })
    console.log([{ cookie: 'session=secret-cookie' }])
    console.warn('proxy %j', { 'fpjs-proxy-secret': 'secret-proxy' })

    const output = JSON.stringify(parsed())
    for (const secret of ['secret-value', 'secret-cookie', 'secret-proxy']) {
      assert.equal(output.includes(secret), false, `${secret} leaked into the logs`)
    }
    assert.match(parsed()[0].message, /accept: '\*\/\*'/)
    assert.match(parsed()[0].message, /\[REDACTED\]/)
  })

  it('does not leak properties of a function argument', () => {
    const { parsed } = setup()
    const client = Object.assign(function client() {}, { authorization: 'Bearer secret-value', retries: 3 })

    console.info('request', client)
    console.log('%s and %o', client, { callback: client })

    const output = JSON.stringify(parsed())
    assert.equal(output.includes('secret-value'), false)
    assert.match(parsed()[0].message, /\[Function client\]/)
  })

  it('does not leak what an error carries besides its message and stack', () => {
    const { parsed } = setup()
    const error = Object.assign(new Error('boom'), { config: { headers: { Authorization: 'Bearer secret-value' } } })

    console.error('failed', error)

    assert.equal(JSON.stringify(parsed()).includes('secret-value'), false)
    assert.match(parsed()[0].message, /^failed Error: boom\n\s+at /)
  })

  it('logs a thrown error, stack included, as a single record', () => {
    const { parsed } = setup()
    console.error(new Error('boom'))

    assert.equal(parsed().length, 1)
    assert.match(parsed()[0].message, /^Error: boom\n\s+at /)
  })

  it('restores the original console', () => {
    const original = console.log
    const { parsed } = setup()
    assert.notEqual(console.log, original)

    restore?.()
    restore = undefined

    assert.equal(console.log, original)
    assert.equal(parsed().length, 0)
  })
})
