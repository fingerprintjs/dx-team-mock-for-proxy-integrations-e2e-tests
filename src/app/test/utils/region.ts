import { AssertionError } from 'node:assert'
import type { SendRequestResult } from '../types/testCase'
import type { TestSession } from '../service/session'

/** Regions a test run can be limited to. `all` runs every region check. */
export const RUN_REGIONS = ['us', 'eu', 'ap', 'all'] as const

export type RunRegion = (typeof RUN_REGIONS)[number]

/**
 * A single region check done by a region test case.
 * `invalid` sends an unknown region and expects the default host, so it is only used when the run region is `all`.
 */
export type CheckedRegion = 'us' | 'eu' | 'ap' | 'invalid'

const ALL_CHECKED_REGIONS: readonly CheckedRegion[] = ['us', 'eu', 'ap', 'invalid']

/** Returns the regions a region test case must check for the given run region. */
export function regionsToCheck(region: RunRegion): CheckedRegion[] {
  return region === 'all' ? [...ALL_CHECKED_REGIONS] : [region]
}

/** `eu` and `ap` must be routed to a regional host. `us` and `invalid` must fall back to the default host. */
function expectsRegionalHost(region: CheckedRegion): boolean {
  return region === 'eu' || region === 'ap'
}

/**
 * Prefixes the host must not start with. `us` and `invalid` fall back to the default host, which has no
 * regional prefix, so the prefix of any supported region (`us.`, `eu.`, `ap.`) is a routing error.
 */
function forbiddenPrefixes(region: CheckedRegion): string[] {
  return [...new Set([`${region}.`, 'us.', 'eu.', 'ap.'])]
}

/** The minimal API surface the helper needs, so it can be tested without a full `TestCaseApi`. */
type RegionRoutingApi = { testSession: Pick<TestSession, 'region'> }

/**
 * Sends one request per region to check and asserts the host the proxy forwarded to.
 *
 * Every region is checked before failing, so one failing region does not hide the others.
 * Failed checks throw a single `AssertionError`, so the runner treats it as deterministic and does not retry.
 * Any other error from `send` (timeouts, missing proxy request) is rethrown as is.
 *
 * @param api The minimal API surface the helper needs, so it can be tested without a full `TestCaseApi`.
 * @param send Sends the request for one query. Called once per region, so it can generate fresh paths.
 */
export async function assertRegionRouting(
  api: RegionRoutingApi,
  send: (query: URLSearchParams) => Promise<SendRequestResult>
): Promise<void> {
  const failures: string[] = []

  for (const region of regionsToCheck(api.testSession.region)) {
    const { requestFromProxy } = await send(new URLSearchParams({ region }))

    const host = new URL(`https://${requestFromProxy.get('host')}${requestFromProxy.url}`).host
    const prefix = `${region}.`

    if (expectsRegionalHost(region)) {
      if (!host.startsWith(prefix)) {
        failures.push(`${region}: expected host to start with ${prefix}, but got ${host}`)
      }
    } else {
      const forbidden = forbiddenPrefixes(region)

      if (forbidden.some((forbiddenPrefix) => host.startsWith(forbiddenPrefix))) {
        failures.push(`${region}: expected host to not start with ${forbidden.join(' or ')}, but got ${host}`)
      }
    }
  }

  if (failures.length > 0) {
    throw new AssertionError({
      operator: 'assertRegionRouting',
      actual: failures,
      expected: 'host',
      message: failures.join('; '),
    })
  }
}
