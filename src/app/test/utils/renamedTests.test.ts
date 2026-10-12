import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getRenamedTestFilterWarnings } from './renamedTests'

describe('getRenamedTestFilterWarnings', () => {
  it('warns for an exact removed name and names the replacement', () => {
    const warnings = getRenamedTestFilterWarnings(['ingress request regions'])

    assert.equal(warnings.length, 1)
    assert.match(warnings[0], /"ingress request regions"/)
    assert.match(warnings[0], /"ingress request region"/)
  })

  it('warns for removed us and invalid region names', () => {
    assert.equal(getRenamedTestFilterWarnings(['v4 browser cache request us region']).length, 1)
    assert.equal(getRenamedTestFilterWarnings(['browser cache request invalid region']).length, 1)
  })

  it('warns for partial patterns that only match removed names', () => {
    assert.equal(getRenamedTestFilterWarnings(['us region']).length, 1)
    assert.equal(getRenamedTestFilterWarnings(['invalid region']).length, 1)
    assert.equal(getRenamedTestFilterWarnings(['request regions']).length, 1)
  })

  it('warns for glob and regex patterns that only match removed names', () => {
    assert.equal(getRenamedTestFilterWarnings(['*us region']).length, 1)
    assert.equal(getRenamedTestFilterWarnings(['/request (us|invalid) region$/i']).length, 1)
  })

  it('lists every replacement a filter points to', () => {
    const [warning] = getRenamedTestFilterWarnings(['us region'])

    assert.match(warning, /"ingress request region"/)
    assert.match(warning, /"v4 browser cache request region"/)
  })

  it('does not warn for the new names', () => {
    assert.deepEqual(
      getRenamedTestFilterWarnings([
        'ingress request region',
        'v4 ingress request region',
        'browser cache request region',
        'v4 browser cache request region',
      ]),
      []
    )
  })

  it('does not warn for broad filters that still match the new names', () => {
    assert.deepEqual(getRenamedTestFilterWarnings(['region', 'ingress', 'agent*', 'v4', 'request']), [])
  })

  it('does not warn for unrelated filters or an empty list', () => {
    assert.deepEqual(getRenamedTestFilterWarnings(['body integrity', 'ipv6']), [])
    assert.deepEqual(getRenamedTestFilterWarnings([]), [])
  })
})
