import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { Writable } from 'node:stream'
import { wait } from '../utils/wait'
import { createStdoutWriter, createStreamNotifier } from './stdout'

/** Fails every write asynchronously, like a closed pipe */
function brokenStream() {
  const written: string[] = []
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      written.push(String(chunk))
      callback(new Error('write EPIPE'))
    },
  })

  return { stream, written }
}

describe('createStreamNotifier', () => {
  it('survives an asynchronous stream error', async () => {
    const { stream, written } = brokenStream()
    const notify = createStreamNotifier(stream)

    notify('one')
    // With no listener the error would be an uncaught exception, failing this test
    await wait(20)
    notify('two')
    await wait(20)

    assert.equal(written[0], 'one')
  })
})

describe('createStdoutWriter', () => {
  it('writes each line followed by a newline', () => {
    const written: string[] = []
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        written.push(String(chunk))
        callback()
      },
    })

    const write = createStdoutWriter(stream)
    write('one')
    write('two')

    assert.deepEqual(written, ['one\n', 'two\n'])
  })

  it('survives an asynchronous stream error, which would otherwise crash the process', async () => {
    const { stream } = brokenStream()
    const notices: string[] = []
    const write = createStdoutWriter(stream, (message) => notices.push(message))

    write('first')
    await wait(20)

    assert.equal(notices.length, 1)
    assert.match(notices[0], /Logging to stdout failed \(write EPIPE\)/)
  })

  it('drops lines after the stream broke, and reports the failure once', async () => {
    const { stream, written } = brokenStream()
    const notices: string[] = []
    const write = createStdoutWriter(stream, (message) => notices.push(message))

    write('first')
    await wait(20)
    write('second')
    write('third')
    await wait(20)

    assert.deepEqual(written, ['first\n'])
    assert.equal(notices.length, 1)
  })

  it('survives both streams failing, which would otherwise crash the process', async () => {
    const stdout = brokenStream()
    const stderr = brokenStream()
    const write = createStdoutWriter(stdout.stream, createStreamNotifier(stderr.stream))

    write('first')
    // stdout fails, the notice goes to stderr, which fails asynchronously as well
    await wait(40)
    write('second')
    await wait(20)

    assert.equal(stderr.written.length, 1)
    assert.match(stderr.written[0], /Logging to stdout failed \(write EPIPE\)/)
    assert.deepEqual(stdout.written, ['first\n'])
  })

  it('does not throw when reporting the failure fails too', async () => {
    const { stream } = brokenStream()
    const write = createStdoutWriter(stream, () => {
      throw new Error('stderr closed')
    })

    write('first')

    await wait(20)
  })
})
