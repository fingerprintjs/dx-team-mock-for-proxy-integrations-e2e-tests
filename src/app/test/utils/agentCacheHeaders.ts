import { assert, assertToBeFalsy, assertToBeTruthy } from '../service/assert'
import { MockResponse } from '../service/mockResponseRegistry'
import { SendCacheableRequestResult, TestCaseApi } from '../service/TestCaseApi'
import { AgentCacheMode } from '../request.types'
import { getApiKey } from './getApiKey'

/** Real `procdn` serves ~1h. The value only has to be recognisable, nothing in the tests waits for it to pass. */
const AGENT_MAX_AGE_SECONDS = 2

/**
 * Edge caches are spread over many nodes, and an integration can misbehave only on some of them. Checking a few
 * consecutive responses keeps an intermittent bug from passing by luck. A `passthrough` integration reaches the
 * upstream on every request, so it is checked once.
 */
const EDGE_RESPONSES_TO_CHECK = 4

/** A follow-up request can land on an edge node that has not stored the agent yet. Extra requests make up for them. */
const EXTRA_EDGE_ATTEMPTS = 4

const AGENT_BODY = '/* mock agent */'

/** The purge tag `procdn` puts on its own cache misses. */
const AGENT_CACHE_TAG = 'fpjs-agent'

export type AgentCacheTarget = {
  /**
   * - `cached`: the integration caches the agent itself, so it must fix up the headers of cache hits.
   * - `passthrough`: the integration leaves the agent to the upstream CDN, so the response has to match
   *   what the upstream sent. Whether the integration serves some of the requests from its own cache is not checked.
   *
   * Picked per integration with the `agentCacheMode` run option. Without it, API v3 is `cached` and API v4 `passthrough`.
   */
  mode: AgentCacheMode
  /** Sends a cacheable request to the agent endpoint. Every call from one scenario must hit the same URL. */
  send: (api: TestCaseApi, params: SendParams) => Promise<SendCacheableRequestResult>
}

type SendParams = {
  mockResponse: MockResponse
  headers?: Record<string, string>
}

/**
 * Mirrors what `procdn` answers with after JA-539: `max-age` only (no `s-maxage`) and, on its own cache miss,
 * the `cache-tag` purge tag.
 */
function createAgentMockResponse(etag: string, extraHeaders: Record<string, string> = {}): MockResponse {
  return {
    status: 200,
    headers: {
      'cache-control': `public, max-age=${AGENT_MAX_AGE_SECONDS}`,
      'content-type': 'text/javascript; charset=utf-8',
      etag,
      ...extraHeaders,
    },
    body: AGENT_BODY,
  }
}

function createOriginMissResponse(etag: string) {
  return createAgentMockResponse(etag, { 'cache-tag': AGENT_CACHE_TAG })
}

/**
 * An origin response after `procdn` already has the agent cached: no `cache-tag`.
 * A `cached` integration is handed a stale `age` it has to reset, a `passthrough` one gets the `age: 0` that
 * `procdn` itself answers with and has to leave it alone.
 */
function createOriginWarmResponse(etag: string, target: AgentCacheTarget) {
  return createAgentMockResponse(etag, { age: target.mode === 'cached' ? '120' : '0' })
}

function getHeader(result: SendCacheableRequestResult, name: string) {
  const value = result.responseFromProxy.headers[name]
  return Array.isArray(value) ? value.join(', ') : value
}

/** The directives of `cache-control`, lowercased, so that `max-age=10` is not mistaken for `max-age=100`. */
function getCacheControlDirectives(result: SendCacheableRequestResult) {
  return `${getHeader(result, 'cache-control') ?? ''}`
    .toLowerCase()
    .split(',')
    .map((directive) => directive.trim())
    .filter(Boolean)
}

function assertNoSMaxAge(result: SendCacheableRequestResult) {
  const directives = getCacheControlDirectives(result)
  assert(
    directives.some((directive) => directive === 's-maxage' || directive.startsWith('s-maxage=')),
    false,
    `Expected no s-maxage in cache-control, got: ${directives.join(', ')}`
  )
}

function assertMaxAgePreserved(result: SendCacheableRequestResult) {
  const directives = getCacheControlDirectives(result)
  assert(
    directives.includes(`max-age=${AGENT_MAX_AGE_SECONDS}`),
    true,
    `Expected max-age=${AGENT_MAX_AGE_SECONDS} to be preserved in cache-control, got: ${directives.join(', ')}`
  )
}

/** A response that reached the origin carries no `age` of its own: it is absent or `0`, never a stale upstream one. */
function assertAgeAbsentOrZero(result: SendCacheableRequestResult, step: string) {
  const age = getHeader(result, 'age')
  assert(age === undefined || age === '0', true, `${step}: expected no age or 'age: 0', got: ${age}`)
}

/**
 * A response served from the edge cache is as old as the entry. Some CDNs report that real age (CloudFront counts it
 * in whole seconds), some report `0`, some drop `age`. All of them are fine as long as the entry can have been stored
 * that long ago, which is the time since the priming request (plus a second for rounding). A stale upstream `age`
 * the integration should have reset, like the `120` of a `cached` mock, is always older than that.
 */
function assertAgeNotStale(result: SendCacheableRequestResult, step: string, primedAt: number) {
  const age = getHeader(result, 'age')
  const maxAge = Math.ceil((Date.now() - primedAt) / 1000) + 1
  assert(
    age === undefined || (/^\d+$/.test(age) && Number(age) <= maxAge),
    true,
    `${step}: expected no age or an age of at most ${maxAge}s (the time since the first request), got: ${age}`
  )
}

function assertNoCacheTag(result: SendCacheableRequestResult, step: string) {
  assertToBeFalsy('cache-tag', getHeader(result, 'cache-tag'), `${step}: expected no cache-tag`)
}

/**
 * What a response that reached the origin (a miss) has to look like, in step 1 and in the origin-reaching part of step 3:
 * - `age` is absent or `0`, the stale upstream one is not passed on.
 * - `cache-tag` is what the origin sent, or absent. An integration that stores the response and replays it on hits has
 *   to drop `cache-tag` for the hits, so it can't keep it on the miss either. It must not hold on to a tag the origin
 *   did not send (e.g. one of the primed response).
 */
function assertOriginResponse(result: SendCacheableRequestResult, step: string, originCacheTag?: string) {
  assertAgeAbsentOrZero(result, step)

  const cacheTag = getHeader(result, 'cache-tag')
  assert(
    cacheTag === undefined || cacheTag === originCacheTag,
    true,
    `${step}: expected ${originCacheTag ? `no cache-tag or '${originCacheTag}'` : 'no cache-tag'}, got: ${cacheTag}`
  )
}

function assertAgentResponse(result: SendCacheableRequestResult, step: string) {
  assert(result.responseFromProxy.status, 200, `${step}: expected status 200`)
  assertNoSMaxAge(result)
  assertMaxAgePreserved(result)
}

type FollowUp = SendParams & {
  step: string
  /** Pause before the first follow-up, for the scenarios that need `max-age` to pass. */
  delayMs?: number
  /** At least one response has to come from the edge. Not every request can be expected to (see `revalidation`). */
  requireEdge: boolean
  /**
   * Checks the responses that had to reach the origin. Without it they are skipped, as a hit-type case has nothing to
   * say about them. It makes a case that is answered from the origin by design (see `revalidation`) check something.
   */
  checkOrigin?: (result: SendCacheableRequestResult) => void
}

/**
 * Sends the follow-up request until enough responses have come from the edge and checks each one of them.
 *
 * A `cached` integration can answer on its own only when the request lands on an edge node that holds the agent. A
 * response that had to reach the origin is a cache miss by definition, `cache miss` covers those, so it is not
 * judged as a hit and a few extra requests are made instead, unless the case brings its own `checkOrigin`. A `passthrough` integration is checked once.
 */
async function checkFollowUps(
  api: TestCaseApi,
  target: AgentCacheTarget,
  { step, requireEdge, checkOrigin, delayMs, ...params }: FollowUp,
  check: (result: SendCacheableRequestResult) => void
) {
  if (delayMs) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, delayMs)
    })
  }

  if (target.mode === 'passthrough') {
    check(await target.send(api, params))
    return
  }

  let checked = 0

  for (
    let sent = 0;
    sent < EDGE_RESPONSES_TO_CHECK + EXTRA_EDGE_ATTEMPTS && checked < EDGE_RESPONSES_TO_CHECK;
    sent++
  ) {
    const result = await target.send(api, params)

    if (result.requestFromProxy) {
      if (checkOrigin) {
        checkOrigin(result)
        checked++
      }

      continue
    }

    check(result)
    checked++
  }

  if (requireEdge) {
    assert(
      checked > 0,
      true,
      `${step}: expected the agent to be served from the edge cache, but every request reached the origin`
    )
  }
}

/**
 * Fills the edge cache. The origin sees a miss, so it answers with `cache-tag` and no `age`.
 * Returns the response so scenarios that need the `etag` the proxy hands out can read it.
 */
async function primeAgentCache(api: TestCaseApi, target: AgentCacheTarget) {
  const etag = `"mock-warden-${getApiKey()}"`
  const primedAt = Date.now()
  const result = await target.send(api, { mockResponse: createOriginMissResponse(etag) })

  assert(result.responseFromProxy.status, 200, `priming request: expected status 200`)

  return { result, etag, primedAt }
}

/** Step 1: the first request reaches the origin, so it has no stale `age` (absent or `0`) and no altered `cache-tag`. */
export async function testAgentCacheMiss(api: TestCaseApi, target: AgentCacheTarget) {
  const { result } = await primeAgentCache(api, target)

  assertAgentResponse(result, 'cache miss')
  assertToBeTruthy('etag', getHeader(result, 'etag'), 'cache miss: expected an etag')
  assertOriginResponse(result, 'cache miss', AGENT_CACHE_TAG)
}

/** Step 2: the second request is served by the edge with a fresh `age` (see `assertAgeNotStale`) and no `cache-tag`. */
export async function testAgentCacheHit(api: TestCaseApi, target: AgentCacheTarget) {
  const { etag, primedAt } = await primeAgentCache(api, target)

  await checkFollowUps(
    api,
    target,
    { mockResponse: createOriginWarmResponse(etag, target), step: 'cache hit', requireEdge: true },
    (result) => {
      assertAgentResponse(result, 'cache hit')
      assertAgeNotStale(result, 'cache hit', primedAt)
      assertNoCacheTag(result, 'cache hit')
    }
  )
}

/**
 * Step 3: once `max-age` has passed, the agent is revalidated and still served with a fresh `age`.
 *
 * Waiting for a real edge TTL to run out would take up to 60s (Fastly Compute ignores the origin's `max-age`), so the
 * request carries `cache-control: no-cache` instead, which asks the edge to validate its copy before using it.
 * Integrations that honor it go back to the origin, which makes the response a cache miss: it has no `age` of its own
 * but must not pass on the stale one. The responses an integration answers from its cache anyway are checked as hits.
 */
export async function testAgentRevalidation(api: TestCaseApi, target: AgentCacheTarget) {
  const { etag, primedAt } = await primeAgentCache(api, target)

  await checkFollowUps(
    api,
    target,
    {
      mockResponse: createOriginWarmResponse(etag, target),
      delayMs: (AGENT_MAX_AGE_SECONDS + 1) * 1000,
      step: 'revalidation',
      requireEdge: false,
      checkOrigin: (result) => {
        assertAgentResponse(result, 'revalidation')
        // The warm origin response has no `cache-tag`, so there must be none
        assertOriginResponse(result, 'revalidation')
      },
    },
    (result) => {
      assertAgentResponse(result, 'revalidation')
      assertAgeNotStale(result, 'revalidation', primedAt)
      assertNoCacheTag(result, 'revalidation')
    }
  )
}

/** Step 4: a conditional request with the cached `etag` is answered with 304, the same `max-age`, a fresh `age` and no `cache-tag`. */
export async function testAgentConditionalRequest(api: TestCaseApi, target: AgentCacheTarget) {
  const { result: primeResult, primedAt } = await primeAgentCache(api, target)
  const etag = getHeader(primeResult, 'etag') as string
  assertToBeTruthy('etag', etag, 'if-none-match: expected the first response to have an etag')

  await checkFollowUps(
    api,
    target,
    {
      mockResponse: createOriginWarmResponse(etag, target),
      headers: { 'if-none-match': etag },
      step: 'if-none-match',
      requireEdge: true,
    },
    (result) => {
      assert(
        result.responseFromProxy.status,
        304,
        `if-none-match: expected status 304, got: ${result.responseFromProxy.status}`
      )
      assertNoSMaxAge(result)
      assertMaxAgePreserved(result)
      assertAgeNotStale(result, 'if-none-match', primedAt)
      assertNoCacheTag(result, 'if-none-match')
    }
  )
}

/** A URL has to be stable across the requests of one scenario, and unique between scenarios. */
export function createAgentCacheTargets(api: TestCaseApi) {
  const configuredMode = api.testSession.agentCacheMode
  const apiKey = getApiKey()
  // Some integrations (CloudFront) leave `apiKey` out of their cache key and only key on `version`/`loaderVersion`, so
  // scenarios would share one cache entry. A unique `version` keeps them apart. `loaderVersion` can't be used for that:
  // integrations turn it into a `/loader_v<loaderVersion>.js` path, which CDNs treat as a static file.
  const query = new URLSearchParams({ apiKey, version: `3-${apiKey}` })

  const v3: AgentCacheTarget = {
    mode: configuredMode ?? 'cached',
    send: (api, { mockResponse, headers }) =>
      api.sendCacheableRequestToCdn({ query, mockResponse, request: { headers } }),
  }

  const v4: AgentCacheTarget = {
    mode: configuredMode ?? 'passthrough',
    send: (api, { mockResponse, headers }) =>
      api.sendCacheableRequestToV4Cdn({ apiKey, mockResponse, request: { headers } }),
  }

  return { v3, v4 }
}
