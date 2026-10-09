import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { AssertionError } from 'node:assert'
import type { SendRequestResult } from '../types/testCase'
import { RunTestsRequestSchema } from '../request.types'
import { assertRegionRouting, regionsToCheck, RunRegion } from './region'

const DEFAULT_HOST = 'api.example.com'

function hostFor(region: string): string {
  return region === 'eu' || region === 'ap' ? `${region}.${DEFAULT_HOST}` : DEFAULT_HOST
}

function fakeResult(host: string): SendRequestResult {
  return { requestFromProxy: { get: () => host, url: '/path' } } as unknown as SendRequestResult
}

function runRouting(region: RunRegion, resolveHost: (region: string) => string = hostFor) {
  const sentRegions: string[] = []
  const promise = assertRegionRouting({ testSession: { region } }, async (query) => {
    const sent = query.get('region') as string
    sentRegions.push(sent)
    return fakeResult(resolveHost(sent))
  })

  return { sentRegions, promise }
}

describe('regionsToCheck', () => {
  it('returns every check, including invalid, for all', () => {
    assert.deepEqual(regionsToCheck('all'), ['us', 'eu', 'ap', 'invalid'])
  })

  for (const region of ['us', 'eu', 'ap'] as const) {
    it(`returns only ${region} for ${region}`, () => {
      assert.deepEqual(regionsToCheck(region), [region])
    })
  }
})

describe('RunTestsRequestSchema region', () => {
  const base = { integrationUrl: 'https://example.com', trafficName: 'traffic', integrationVersion: '1.0.0' }

  it('defaults to all', () => {
    assert.equal(RunTestsRequestSchema.parse(base).region, 'all')
  })

  for (const region of ['us', 'eu', 'ap', 'all']) {
    it(`accepts ${region}`, () => {
      assert.equal(RunTestsRequestSchema.parse({ ...base, region }).region, region)
    })
  }

  it('rejects unknown regions', () => {
    assert.equal(RunTestsRequestSchema.safeParse({ ...base, region: 'invalid' }).success, false)
    assert.equal(RunTestsRequestSchema.safeParse({ ...base, region: 'EU' }).success, false)
  })
})

describe('assertRegionRouting', () => {
  it('sends one request per region for all and passes on correct hosts', async () => {
    const { sentRegions, promise } = runRouting('all')

    await promise
    assert.deepEqual(sentRegions, ['us', 'eu', 'ap', 'invalid'])
  })

  for (const region of ['us', 'eu', 'ap'] as const) {
    it(`only sends the ${region} request when ${region} is selected`, async () => {
      const { sentRegions, promise } = runRouting(region)

      await promise
      assert.deepEqual(sentRegions, [region])
    })
  }

  it('fails when a regional host is not used for eu', async () => {
    const { promise } = runRouting('eu', () => DEFAULT_HOST)

    await assert.rejects(promise, (error: Error) => {
      assert.ok(error instanceof AssertionError)
      assert.match(error.message, /eu: expected host to start with eu\., but got api\.example\.com/)
      return true
    })
  })

  it('fails when us falls into a regional host', async () => {
    const { promise } = runRouting('us', (region) => `${region}.${DEFAULT_HOST}`)

    await assert.rejects(promise, /us: expected host to not start with us\., but got us\.api\.example\.com/)
  })

  it('fails when an invalid region is treated as a regional host', async () => {
    const { promise } = runRouting('all', (region) =>
      region === 'invalid' ? `invalid.${DEFAULT_HOST}` : hostFor(region)
    )

    await assert.rejects(promise, /invalid: expected host to not start with invalid\./)
  })

  it('checks every region and reports all failures in one AssertionError', async () => {
    const { sentRegions, promise } = runRouting('all', () => DEFAULT_HOST)

    await assert.rejects(promise, (error: Error) => {
      assert.ok(error instanceof AssertionError)
      assert.match(error.message, /eu: /)
      assert.match(error.message, /ap: /)
      assert.doesNotMatch(error.message, /us: /)
      assert.doesNotMatch(error.message, /invalid: /)
      return true
    })
    assert.deepEqual(sentRegions, ['us', 'eu', 'ap', 'invalid'])
  })

  it('rethrows errors from send unchanged', async () => {
    const failure = new Error('timeout of 5000ms exceeded')
    const promise = assertRegionRouting({ testSession: { region: 'all' } }, async () => {
      throw failure
    })

    await assert.rejects(promise, (error) => error === failure)
  })
})
