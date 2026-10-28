import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { once } from 'node:events'
import { wait } from './utils/wait'
import { assertNoReservedAttributes } from './test-helpers/assertNoReservedAttributes'

async function getFreePort() {
  const server = createServer().listen(0)
  await once(server, 'listening')
  const { port } = server.address() as { port: number }
  server.close()
  await once(server, 'close')
  return port
}

async function startApp() {
  const port = await getFreePort()
  // The test runner marks its children with NODE_TEST_CONTEXT, which would turn the app into one
  const { NODE_TEST_CONTEXT: _context, ...parentEnv } = process.env
  const child = spawn(process.execPath, ['--require', 'ts-node/register', 'src/index.ts'], {
    env: { ...parentEnv, PORT: String(port), LOG_LEVEL: 'info', LOG_FORMAT: 'json' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let stdout = ''
  let stderr = ''
  child.stdout.on('data', (chunk) => (stdout += chunk))
  child.stderr.on('data', (chunk) => (stderr += chunk))

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`app did not start. stdout: ${stdout} stderr: ${stderr}`)), 60_000)
    child.stdout.on('data', () => {
      if (stdout.includes('Application started')) {
        clearTimeout(timer)
        resolve()
      }
    })
    child.once('exit', (code) => reject(new Error(`app exited with ${code}. stdout: ${stdout} stderr: ${stderr}`)))
  })

  return {
    child,
    url: `http://127.0.0.1:${port}`,
    stdout: () => stdout,
    stderr: () => stderr,
    stop: async () => {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill()
        await once(child, 'exit')
      }
    },
  }
}

describe('application process', () => {
  it('writes nothing but JSON log lines to stdout', async () => {
    const app = await startApp()

    try {
      await fetch(`${app.url}/health`)
      await fetch(`${app.url}/version`)
      await fetch(`${app.url}/missing`)
      // Let late log lines arrive
      await wait(100)
    } finally {
      await app.stop()
    }

    const lines = app
      .stdout()
      .split('\n')
      .filter((line) => line.trim() !== '')
    assert.ok(lines.length >= 3, `expected the startup line and two request lines, got: ${app.stdout()}`)

    for (const line of lines) {
      let entry: { level?: unknown; message?: unknown }
      try {
        entry = JSON.parse(line)
      } catch {
        assert.fail(`not a JSON line: ${line}`)
      }
      assert.equal(typeof entry.level, 'string', line)
      assert.equal(typeof entry.message, 'string', line)
      assertNoReservedAttributes(entry)
    }

    const paths = lines.map((line) => JSON.parse(line).http?.url_details.path)
    assert.equal(paths.includes('/health'), false, '/health must not be logged')
    assert.ok(paths.includes('/version'))
  })

  it('keeps serving requests when nobody reads its stdout any more', async () => {
    const app = await startApp()

    try {
      app.child.stdout.destroy()
      for (let i = 0; i < 5; i++) {
        const response = await fetch(`${app.url}/version`)
        assert.equal(response.status, 200)
        await wait(20)
      }

      assert.equal(app.child.exitCode, null, `the app exited. stderr: ${app.stderr()}`)
    } finally {
      await app.stop()
    }
  })
})
