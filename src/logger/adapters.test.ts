import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createLogger, toAbstractLogger } from '.'

function setup() {
  const lines: string[] = []
  const logger = createLogger({ level: 'debug', destination: { write: (line) => lines.push(line) } })

  return { abstract: toAbstractLogger(logger), entries: () => lines.map((line) => JSON.parse(line)) }
}

describe('toAbstractLogger', () => {
  it('maps every severity to the same level, with the message first', () => {
    const { abstract, entries } = setup()

    abstract.debug('a')
    abstract.info('b')
    abstract.warn('c')
    abstract.error('d')

    assert.deepEqual(
      entries().map(({ level, message }) => [level, message]),
      [
        ['debug', 'a'],
        ['info', 'b'],
        ['warn', 'c'],
        ['error', 'd'],
      ]
    )
  })

  it('spreads object meta into fields', () => {
    const { abstract, entries } = setup()

    abstract.info('request', { method: 'GET' })

    assert.equal(entries()[0].method, 'GET')
  })

  it('logs an Error as an error, and other meta under `meta`', () => {
    const { abstract, entries } = setup()

    abstract.error('failed', new Error('boom'))
    abstract.info('text', 'plain')
    abstract.info('list', [1, 2])

    assert.equal(entries()[0].error.message, 'boom')
    assert.equal(entries()[1].meta, 'plain')
    assert.deepEqual(entries()[2].meta, [1, 2])
  })
})
