import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createLogger } from './logger'
import { toAbstractLogger } from './adapters'

function setup() {
  const lines: string[] = []
  const logger = createLogger({ write: (line) => lines.push(line), level: 'debug' })

  return { abstract: toAbstractLogger(logger), parsed: () => lines.map((line) => JSON.parse(line)) }
}

describe('toAbstractLogger', () => {
  it('maps every severity to the same level', () => {
    const { abstract, parsed } = setup()

    abstract.debug('a')
    abstract.info('b')
    abstract.warn('c')
    abstract.error('d')

    assert.deepEqual(
      parsed().map(({ level, message }) => [level, message]),
      [
        ['debug', 'a'],
        ['info', 'b'],
        ['warn', 'c'],
        ['error', 'd'],
      ]
    )
  })

  it('spreads object meta into fields', () => {
    const { abstract, parsed } = setup()

    abstract.info('request', { method: 'GET', path: '/' })

    assert.equal(parsed()[0].method, 'GET')
    assert.equal(parsed()[0].path, '/')
  })

  it('keeps non-object meta under `meta`', () => {
    const { abstract, parsed } = setup()

    abstract.info('a', 'text')
    abstract.info('b', [1, 2])
    abstract.error('c', new Error('boom'))

    assert.equal(parsed()[0].meta, 'text')
    assert.deepEqual(parsed()[1].meta, [1, 2])
    assert.equal(parsed()[2].meta.message, 'boom')
  })
})
