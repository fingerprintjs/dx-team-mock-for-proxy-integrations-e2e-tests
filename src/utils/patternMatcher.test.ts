import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { makePatternMatcher } from './patternMatcher'

describe('makePatternMatcher', () => {
  const names = ['ingress request region', 'v4 ingress request region', 'browser cache request region']

  it('matches by case-insensitive substring', () => {
    const matches = makePatternMatcher(['REQUEST region'])

    assert.deepEqual(names.map(matches), [true, true, true])
    assert.equal(matches('agent request headers'), false)
  })

  it('matches glob patterns against the whole name', () => {
    const matches = makePatternMatcher(['ingress*'])

    assert.deepEqual(names.map(matches), [true, false, false])
  })

  it('matches regex literals', () => {
    const matches = makePatternMatcher(['/^v4 .* region$/i'])

    assert.deepEqual(names.map(matches), [false, true, false])
  })

  it('gives the same answer for every name with stateful regex flags', () => {
    for (const flags of ['g', 'y', 'gi', 'gy']) {
      const matches = makePatternMatcher([`/^.*region$/${flags}`])

      assert.deepEqual(names.map(matches), [true, true, true], `flags: ${flags}`)
      assert.deepEqual(names.map(matches), [true, true, true], `second pass, flags: ${flags}`)
    }
  })

  it('matches when any of the patterns matches', () => {
    const matches = makePatternMatcher(['browser', '/^v4/'])

    assert.deepEqual(names.map(matches), [false, true, true])
  })
})
