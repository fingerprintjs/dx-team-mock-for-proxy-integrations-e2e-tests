import { assert, assertToBeFalsy, assertToBeTruthy } from '../service/assert'
import { MockResponse } from '../service/mockResponseRegistry'
import { SendCacheableRequestResult, TestCaseApi } from '../service/TestCaseApi'
import { getApiKey } from './getApiKey'

/** Real `procdn` serves ~1h. The value only has to be recognisable, nothing in the tests waits for it to pass. */
const AGENT_MAX_AGE_SECONDS = 10

/**
 * Edge caches are spread over many nodes, and an integration can misbehave only on some of them. Checking a few
 * consecutive responses keeps an intermittent bug from passing by luck. A `passthrough` integration reaches the
 * upstream on every request, so it is checked once.
 */
const EDGE_RESPONSES_TO_CHECK = 4

/** A follow-up request can land on an edge node that has not stored the agent yet. Extra requests make up for them. */
const EXTRA_EDGE_ATTEMPTS = 4

const AGENT_BODY = '/* mock agent */'

export type AgentCacheTarget = {
  /**
   * - `cached`: the integration caches the agent itself (API v3), so it must fix up the headers of cache hits.
   * - `passthrough`: the integration leaves the agent to the upstream CDN (API v4), so the response has to match
   *   what the upstream sent. Whether the integration serves some of the requests from its own cache is not checked.
   */
  mode: 'cached' | 'passthrough'
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
      'content-type': 'application/javascript',
      etag,
      ...extraHeaders,
    },
    body: AGENT_BODY,
  }
}

function createOriginMissResponse(etag: string) {
  return createAgentMockResponse(etag, { 'cache-tag': 'fpjs-agent' })
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

function assertAgeIsZero(result: SendCacheableRequestResult, step: string) {
  assert(getHeader(result, 'age'), '0', `${step}: expected 'age: 0', got: ${getHeader(result, 'age')}`)
}

function assertNoCacheTag(result: SendCacheableRequestResult, step: string) {
  assertToBeFalsy('cache-tag', getHeader(result, 'cache-tag'), `${step}: expected no cache-tag`)
}

/** A response that reached the origin is a miss, so `age` is gone. What it must not do is pass on the stale upstream one. */
function assertNoStaleAge(result: SendCacheableRequestResult, step: string) {
  const age = getHeader(result, 'age')
  assert(age === undefined || age === '0', true, `${step}: expected no age or 'age: 0', got: ${age}`)
}

function assertAgentResponse(result: SendCacheableRequestResult, step: string) {
  assert(result.responseFromProxy.status, 200, `${step}: expected status 200`)
  assertNoSMaxAge(result)
  assertMaxAgePreserved(result)
}

type FollowUp = SendParams & {
  step: string
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
  { step, requireEdge, checkOrigin, ...params }: FollowUp,
  check: (result: SendCacheableRequestResult) => void
) {
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
  const result = await target.send(api, { mockResponse: createOriginMissResponse(etag) })

  assert(result.responseFromProxy.status, 200, `priming request: expected status 200`)

  return { result, etag }
}

/** Step 1: the first request reaches the origin and keeps `cache-tag`, with no `age`. */
export async function testAgentCacheMiss(api: TestCaseApi, target: AgentCacheTarget) {
  const { result } = await primeAgentCache(api, target)

  assertAgentResponse(result, 'cache miss')
  assertToBeTruthy('etag', getHeader(result, 'etag'), 'cache miss: expected an etag')
  assertToBeFalsy('age', getHeader(result, 'age'), `cache miss: expected no age, got: ${getHeader(result, 'age')}`)
  assertToBeTruthy('cache-tag', getHeader(result, 'cache-tag'), 'cache miss: expected cache-tag to be kept')
}

/** Step 2: the second request is served by the edge with `age: 0` and no `cache-tag`. */
export async function testAgentCacheHit(api: TestCaseApi, target: AgentCacheTarget) {
  const { etag } = await primeAgentCache(api, target)

  await checkFollowUps(
    api,
    target,
    { mockResponse: createOriginWarmResponse(etag, target), step: 'cache hit', requireEdge: true },
    (result) => {
      assertAgentResponse(result, 'cache hit')
      assertAgeIsZero(result, 'cache hit')
      assertNoCacheTag(result, 'cache hit')
    }
  )
}

/**
 * Step 3: once `max-age` has passed, the agent is revalidated and still served with `age: 0`.
 *
 * Waiting for a real edge TTL to run out would take up to 60s (Fastly Compute ignores the origin's `max-age`), so the
 * request carries `cache-control: no-cache` instead, which asks the edge to validate its copy before using it.
 * Integrations that honor it go back to the origin, which makes the response a cache miss: it has no `age` of its own
 * but must not pass on the stale one. The responses an integration answers from its cache anyway are checked as hits.
 */
export async function testAgentRevalidation(api: TestCaseApi, target: AgentCacheTarget) {
  const { etag } = await primeAgentCache(api, target)

  await checkFollowUps(
    api,
    target,
    {
      mockResponse: createOriginWarmResponse(etag, target),
      headers: { 'cache-control': 'no-cache' },
      step: 'revalidation',
      requireEdge: false,
      checkOrigin: (result) => {
        assertAgentResponse(result, 'revalidation')
        assertNoStaleAge(result, 'revalidation')
        assertNoCacheTag(result, 'revalidation')
      },
    },
    (result) => {
      assertAgentResponse(result, 'revalidation')
      assertAgeIsZero(result, 'revalidation')
      assertNoCacheTag(result, 'revalidation')
    }
  )
}

/** Step 4: a conditional request with the cached `etag` is answered with 304, the same `max-age`, `age: 0` and no `cache-tag`. */
export async function testAgentConditionalRequest(api: TestCaseApi, target: AgentCacheTarget) {
  const { result: primeResult } = await primeAgentCache(api, target)
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
      assertAgeIsZero(result, 'if-none-match')
      assertNoCacheTag(result, 'if-none-match')
    }
  )
}

/** A URL has to be stable across the requests of one scenario, and unique between scenarios. */
export function createAgentCacheTargets() {
  const apiKey = getApiKey()
  const query = new URLSearchParams({ apiKey })

  const v3: AgentCacheTarget = {
    mode: 'cached',
    send: (api, { mockResponse, headers }) =>
      api.sendCacheableRequestToCdn({ query, mockResponse, request: { headers } }),
  }

  const v4: AgentCacheTarget = {
    mode: 'passthrough',
    send: (api, { mockResponse, headers }) =>
      api.sendCacheableRequestToV4Cdn({ apiKey, mockResponse, request: { headers } }),
  }

  return { v3, v4 }
}
