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
