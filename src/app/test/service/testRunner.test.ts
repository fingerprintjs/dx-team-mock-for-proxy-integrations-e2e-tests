import { after, afterEach, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer, Server } from 'node:http'
import { AddressInfo } from 'node:net'
import { runWithLogContext } from '../../../logger'
import { assertNoReservedAttributes } from '../../../test-helpers/assertNoReservedAttributes'
import { captureLogs } from '../../../test-helpers/captureLogs'
import { TestSession, TestSessionStatus } from './session'
import { runTest, runTestInLogContext } from './testRunner'
import { TestCase } from '../types/testCase'
import { assert as assertEqual } from './assert'
import { NoProxyRequestReceivedError } from '../errors'

function createSession(integrationUrl: string) {
  return new TestSession('example.com', integrationUrl, '', '', 'traffic', '1.0.0', TestSessionStatus.Running)
}

describe('runTest logging', () => {
  let capture: ReturnType<typeof captureLogs>

  beforeEach(() => {
    capture = captureLogs()
  })

  afterEach(() => {
    capture?.restore()
  })

  const run = (testCase: TestCase) => runTestInLogContext(createSession('http://127.0.0.1:1'), testCase)

  it('logs a finished event with the duration and outcome of a passing test', async () => {
    const { result, logs } = await run({ name: 'passing-case', test: async () => {} })

    assert.equal(result.passed, true)

    const finished = capture.entries().find((entry) => entry.event === 'test.finished')
    assert.ok(finished, 'expected a test.finished line')
    assert.equal(finished.level, 'info')
    assert.equal(finished.passed, true)
    assert.equal(finished.failed_attempts, 0)
    assert.equal(typeof finished.duration_ms, 'number')
    // The event covers the hooks too, the result only the test
    assert.ok(finished.duration_ms >= result.requestDurationMs)
    assert.equal(capture.entries().filter((entry) => entry.event === 'test.finished').length, 1)
    assert.equal(logs.length, 1)
  })

  it('reports a failing before hook as one failed test.finished event, and rethrows', async () => {
    await assert.rejects(
      run({
        name: 'before-hook-case',
        before: () => {
          throw new Error('before failed')
        },
        test: async () => {},
      }),
      /before failed/
    )

    const finished = capture.entries().filter((entry) => entry.event === 'test.finished')
    assert.equal(finished.length, 1)
    assert.equal(finished[0].passed, false)
    assert.equal(finished[0].error.message, 'before failed')
  })

  it('reports a failing after hook as one failed test.finished event, even if the test passed', async () => {
    await assert.rejects(
      run({
        name: 'after-hook-case',
        test: async () => {},
        after: async () => {
          throw new Error('after failed')
        },
      }),
      /after failed/
    )

    const finished = capture.entries().filter((entry) => entry.event === 'test.finished')
    assert.equal(finished.length, 1)
    assert.equal(finished[0].passed, false)
    assert.equal(finished[0].error.message, 'after failed')
  })

  it('tags every line with the host, test name and attempt', async () => {
    await run({ name: 'tagged-case', test: async () => {} })

    for (const entry of capture.entries()) {
      assertNoReservedAttributes(entry)
      assert.equal(entry.integrationHost, 'example.com')
      assert.equal(entry.testName, 'tagged-case')
      assert.equal(entry.attempt, 1)
    }
  })

  it('logs the failed attempt as a structured error, then the failed outcome', async () => {
    const { result, logs } = await run({
      name: 'failing-case',
      test: async () => {
        assertEqual('actual', 'expected', 'values differ')
      },
    })

    assert.equal(result.passed, false)

    const [failure, finished] = capture.entries()
    assert.equal(failure.level, 'error')
    assert.equal(failure.message, 'Test attempt failed')
    assert.equal(failure.error.kind, 'AssertionError')
    assert.equal(failure.error.message, 'values differ')
    assert.equal(failure.error.actual, 'actual')
    assert.equal(failure.error.expected, 'expected')
    assert.equal(failure.error.operator, 'assert')
    assert.equal(finished.event, 'test.finished')
    assert.equal(finished.passed, false)
    assert.equal(finished.failed_attempts, 1)

    assert.deepEqual(
      logs.map((line) => JSON.parse(line).message),
      ['Test attempt failed', 'Test finished']
    )
  })
})

describe('TestCaseApi logging', () => {
  let server: Server
  let url: string
  let capture: ReturnType<typeof captureLogs>

  before(async () => {
    server = createServer((_, res) => {
      res.setHeader('set-cookie', 'session=server-cookie-secret')
      res.end('body-marker')
    }).listen(0)
    await once(server, 'listening')
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  after(() => {
    server.close()
  })

  beforeEach(() => {
    capture = captureLogs()
  })

  afterEach(() => {
    capture?.restore()
  })

  it('logs requests and responses with the test context, keeping bodies and cookies out at info level', async () => {
    const seen: string[] = []
    await runWithLogContext({ integrationHost: 'example.com', testName: 'request-case', attempt: 1 }, async () => {
      const testCase: TestCase = {
        name: 'request-case',
        test: async (api) => {
          // No proxy is involved, so sendRequest ends in NoProxyRequestReceivedError, after logging the response
          await api.sendRequest({ method: 'GET', path: '/hello' }).catch((error) => {
            if (!(error instanceof NoProxyRequestReceivedError)) {
              throw error
            }
            seen.push(String(error.responseFromProxy.body))
          })
        },
      }
      await runTest(createSession(url), testCase)
    })

    assert.deepEqual(seen, ['body-marker'])

    const entries = capture.entries()
    const sending = entries.find((entry) => entry.message === 'Sending request')
    const received = entries.find((entry) => entry.message === 'Received response')

    assert.equal(sending.testName, 'request-case')
    assert.equal(sending.method, 'GET')
    assert.match(sending.url, /\/hello$/)
    assert.equal(received.http.status_code, 200)

    for (const entry of entries) {
      assertNoReservedAttributes(entry)
    }

    const output = JSON.stringify(entries)
    assert.equal(output.includes('body-marker'), false, 'the response body should only be logged at debug level')
    assert.equal(output.includes('server-cookie-secret'), false)
  })

  it('logs a failed request as a structured error', async () => {
    await runWithLogContext({ integrationHost: 'example.com', testName: 'unreachable-case', attempt: 1 }, async () => {
      const testCase: TestCase = {
        name: 'unreachable-case',
        test: async (api) => {
          await api.sendRequest({ method: 'GET', path: '/' }).catch(() => undefined)
        },
      }
      await runTest(createSession('http://127.0.0.1:1'), testCase)
    })

    const failure = capture.entries().find((entry) => entry.message === 'Failed to send request')

    assert.ok(failure)
    assert.equal(failure.level, 'error')
    assert.equal(typeof failure.error.message, 'string')
  })
})
