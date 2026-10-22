import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { Server } from 'node:http'
import { AddressInfo } from 'node:net'
import { createApp } from './app'
import { createLogger } from './logger'
import { assertNoReservedAttributes } from './test-helpers/assertNoReservedAttributes'
import { wait } from './utils/wait'

describe('app logging', () => {
  const lines: string[] = []
  const logger = createLogger({ write: (line) => lines.push(line), level: 'info' })
  let server: Server
  let baseUrl: string

  before(async () => {
    server = createApp({ logger }).listen(0)
    await once(server, 'listening')
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    // Drop what the framework logs while starting up
    lines.length = 0
  })

  after(() => {
    server.close()
  })

  /** The request log is written when the response finishes, which can be just after fetch resolves. */
  async function requestLines(count = 1) {
    for (let i = 0; i < 50 && lines.length < count; i++) {
      await wait(10)
    }
    return lines.splice(0).map((line) => JSON.parse(line))
  }

  it('does not log /health, whatever the method', async () => {
    await fetch(`${baseUrl}/health`)
    await fetch(`${baseUrl}/health`, { method: 'POST' })
    await fetch(`${baseUrl}/health`, { method: 'HEAD' })
    await wait(50)

    assert.deepEqual(lines.splice(0), [])
  })

  it('logs one structured line for a normal request', async () => {
    const response = await fetch(`${baseUrl}/version`)
    assert.equal(response.status, 200)

    const [entry, ...rest] = await requestLines()

    assert.equal(rest.length, 0)
    assert.equal(entry.level, 'info')
    assert.equal(entry.message, 'HTTP request completed')
    assert.equal(entry.event, 'http.request')
    assert.equal(entry.http.method, 'GET')
    assert.equal(entry.http.url_details.path, '/version')
    assert.equal(entry.http.status_code, 200)
    assert.match(entry.http.content_type, /application\/json/)
    assert.equal(typeof entry.duration_ms, 'number')
    assert.equal(entry.http.url_details.host, baseUrl.replace('http://', ''))
  })

  it('never logs headers or query strings', async () => {
    await fetch(`${baseUrl}/version?apiKey=query-secret`, {
      headers: {
        cookie: '_iidt=cookie-secret',
        authorization: 'Bearer auth-secret',
        'fpjs-proxy-secret': 'proxy-secret',
      },
    })

    const output = JSON.stringify(await requestLines())

    for (const secret of ['query-secret', 'cookie-secret', 'auth-secret', 'proxy-secret']) {
      assert.equal(output.includes(secret), false, `${secret} leaked into the logs`)
    }
  })

  it('logs requests that the body parser rejects', async () => {
    const malformed = await fetch(`${baseUrl}/api/test/run-tests`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not json',
    })
    const tooLarge = await fetch(`${baseUrl}/api/test/run-tests`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ filler: 'x'.repeat(200_000) }),
    })

    const requests = (await requestLines(4)).filter((entry) => entry.event === 'http.request')

    assert.deepEqual(
      requests.map((entry) => entry.http.status_code),
      [malformed.status, tooLarge.status]
    )
    assert.ok(requests.every((entry) => entry.http.status_code >= 400))
  })

  it('logs the status of unknown routes', async () => {
    await fetch(`${baseUrl}/does-not-exist`)

    const [entry] = await requestLines()

    assert.equal(entry.http.url_details.path, '/does-not-exist')
    assert.equal(entry.http.status_code, 404)
  })

  it('logs a failed API call with its error, as one parseable line each', async () => {
    const response = await fetch(`${baseUrl}/api/test/run-tests`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ integrationUrl: 'not a url' }),
    })
    assert.ok(response.status >= 400)

    const entries = await requestLines(2)
    const failure = entries.find((entry) => entry.message === 'Request failed')

    assert.ok(failure, 'expected a "Request failed" line')
    assert.equal(typeof failure.http.status_code, 'number')
    assert.equal('status' in failure, false)
    assert.ok(['warn', 'error'].includes(failure.level))
    assert.equal(typeof failure.error.message, 'string')
    assert.ok(entries.some((entry) => entry.event === 'http.request'))
  })

  it('emits only valid JSON lines with a level and a message', async () => {
    await fetch(`${baseUrl}/version`)
    await fetch(`${baseUrl}/nope`)
    await wait(50)

    const output = lines.splice(0)

    assert.ok(output.length > 0)
    for (const line of output) {
      const entry = JSON.parse(line)
      assert.equal(typeof entry.level, 'string')
      assert.equal(typeof entry.message, 'string')
      assert.equal(line.includes('\n'), false)
      assertNoReservedAttributes(entry)
    }
  })
})
