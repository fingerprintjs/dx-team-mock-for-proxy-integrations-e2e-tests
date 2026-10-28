import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { bindLogContext, createLogger, runWithLogContext, setLogFields } from '.'
import { MAX_BUFFERED_LINES } from './context'
import { wait } from '../utils/wait'

function setup() {
  const lines: string[] = []
  const logger = createLogger({ destination: { write: (line) => lines.push(line) } })

  return { logger, entries: () => lines.map((line) => JSON.parse(line)) }
}

describe('log context', () => {
  it('attaches its fields to every line written inside it, and only inside it', async () => {
    const { logger, entries } = setup()

    await runWithLogContext({ integrationHost: 'example.com', testName: 'case-a' }, async () => {
      logger.info('inside')
      await wait(1)
      logger.info('after await')
    })
    logger.info('outside')

    assert.deepEqual(
      entries().map(({ message, integrationHost, testName }) => ({ message, integrationHost, testName })),
      [
        { message: 'inside', integrationHost: 'example.com', testName: 'case-a' },
        { message: 'after await', integrationHost: 'example.com', testName: 'case-a' },
        { message: 'outside', integrationHost: undefined, testName: undefined },
      ]
    )
  })

  it('lets the fields of a call win over those of the context', async () => {
    const { logger, entries } = setup()

    await runWithLogContext({ attempt: 1 }, async () => {
      logger.info({ attempt: 2 }, 'retrying')
    })

    assert.equal(entries()[0].attempt, 2)
  })

  it('keeps concurrent contexts apart, and captures each one its own JSON lines', async () => {
    const { logger, entries } = setup()

    const [a, b] = await Promise.all([
      runWithLogContext({ testName: 'a' }, async () => {
        logger.info('a1')
        await wait(5)
        logger.info('a2')
      }),
      runWithLogContext({ testName: 'b' }, async () => {
        await wait(1)
        logger.info('b1')
      }),
    ])

    assert.deepEqual(
      a.logs.map((line) => JSON.parse(line).message),
      ['a1', 'a2']
    )
    assert.deepEqual(
      b.logs.map((line) => JSON.parse(line).message),
      ['b1']
    )
    for (const entry of entries()) {
      assert.equal(entry.testName, entry.message.startsWith('a') ? 'a' : 'b')
    }
  })

  it('updates fields mid-run, e.g. for a retry, and ignores that outside a context', async () => {
    const { logger, entries } = setup()

    await runWithLogContext({ attempt: 1 }, async () => {
      logger.info('first')
      setLogFields({ attempt: 2 })
      logger.info('second')
    })

    assert.deepEqual(
      entries().map((entry) => entry.attempt),
      [1, 2]
    )
    assert.doesNotThrow(() => setLogFields({ attempt: 3 }))
  })

  it('keeps the context of a bound callback that is invoked from elsewhere', async () => {
    const { logger, entries } = setup()
    let bound: () => void = () => {}

    await runWithLogContext({ testName: 'a' }, async () => {
      bound = bindLogContext(() => logger.info('bound'))
    })
    bound()

    assert.equal(entries()[0].testName, 'a')
  })

  it('does not capture the lines dropped by the level', async () => {
    const { logger } = setup()

    const { logs } = await runWithLogContext({}, async () => {
      logger.debug('hidden')
      logger.info('shown')
    })

    assert.equal(logs.length, 1)
  })

  it('returns what the callback returns, and propagates its error', async () => {
    assert.equal((await runWithLogContext({}, async () => 'done')).result, 'done')
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
  })
})
