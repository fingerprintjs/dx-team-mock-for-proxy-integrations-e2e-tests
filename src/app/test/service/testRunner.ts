import { glob } from 'glob'
import {
  createProxyRequestHandlerKey,
  ProxyRequestType,
  removeProxyRequestListener,
} from '../../proxy-receiver/service/proxyRequestHandler'
import { TestCase, TestResult } from '../types/testCase'
import { finalizeTestSession, TestSession } from './session'
import { TestCaseApi } from './TestCaseApi'
import { clearMockResponsesForTest } from './mockResponseRegistry'
import { makePatternMatcher } from '../../../utils/patternMatcher'
import { sanitizeStringArray } from '../utils/sanitizeStringArray'
import { NoMatchingTestsError } from '../errors'
import { prependSlash } from '../../../utils/paths'
import { withRetry } from '../../../utils/retry'
import { logger, runWithLogContext, setLogFields } from '../../../logger'
import { AssertionError } from 'node:assert'

/** One failed attempt of a test case, recorded as it happens rather than after the retries settle. */
export type FailedAttempt = {
  attempt: number
  name: string
  reason: string
  at: string
}

export type DetailedTestResult = TestResult & {
  testName: string
  requestDurationMs: number
  logs?: string[]
  /** Every attempt that failed, including the ones a later attempt recovered from. */
  attempts?: FailedAttempt[]
}

type TestFilterOptions = {
  include?: string[]
  exclude?: string[]
}

export async function loadTestCases() {
  const ext = process.env.TEST_CASE_EXT ?? '.js'

  const caseFiles = await glob(`../**/*.case${ext}`, { absolute: true })
  return await Promise.all(caseFiles.map(async (file) => import(file).then((module) => module.default as TestCase)))
}

export async function runTests(testSession: TestSession, filter?: TestFilterOptions) {
  testSession.start()
  const sessionStartedAt = Date.now()

  let testCases = await loadTestCases()

  const include = filter?.include ? sanitizeStringArray(filter.include) : []
  const exclude = filter?.exclude ? sanitizeStringArray(filter.exclude) : []

  if (include.length > 0) {
    const matchInclude = makePatternMatcher(include)
    testCases = testCases.filter((t) => matchInclude(t.name))
  }

  if (exclude.length > 0) {
    const matchExclude = makePatternMatcher(exclude)
    testCases = testCases.filter((t) => !matchExclude(t.name))
  }

  if (testCases.length === 0) {
    throw new NoMatchingTestsError()
  }

  logger.info('Test session started', {
    event: 'session.started',
    integrationHost: testSession.host,
    total: testCases.length,
    region: testSession.region,
    trafficName: testSession.trafficName,
    integrationVersion: testSession.integrationVersion,
  })

  const settled = await Promise.allSettled(
    testCases.map(async (testCase) => {
      const { logs, result } = await runTestInLogContext(testSession, testCase)

      testSession.addResult({
        ...result,
        logs,
      })
    })
  )

  // runTest only throws when a before/after hook does, which would otherwise go unnoticed
  settled.forEach((outcome, index) => {
    if (outcome.status === 'rejected') {
      logger.error('Test case crashed', {
        integrationHost: testSession.host,
        testName: testCases[index].name,
        error: outcome.reason,
      })
    }
  })

  const passed = testSession.results.filter((it) => it.passed).length
  logger.info('Test session finished', {
    event: 'session.finished',
    integrationHost: testSession.host,
    total: testCases.length,
    passed,
    failed: testCases.length - passed,
    duration_ms: Date.now() - sessionStartedAt,
  })

  return finalizeTestSession(testSession)
}

function isDeterministicFailure(error: unknown): boolean {
  return error instanceof AssertionError || (error as { name?: string } | null)?.name === 'AssertionError'
}

export function runTestInLogContext(testSession: TestSession, testCase: TestCase) {
  return runWithLogContext(
    {
      integrationHost: testSession.host,
      testName: testCase.name,
      attempt: 1,
    },
    async () => runTest(testSession, testCase)
  )
}

// Logs exactly one `test.finished` event for the whole lifecycle, hooks included:
// a hook that throws fails the test case and is rethrown
export async function runTest(testSession: TestSession, testCase: TestCase): Promise<DetailedTestResult> {
  const startedAt = Date.now()
  const attempts: FailedAttempt[] = []

  const logFinished = (passed: boolean, error?: unknown) => {
    logger.info('Test finished', {
      event: 'test.finished',
      passed,
      duration_ms: Date.now() - startedAt,
      failed_attempts: attempts.length,
      ...(error === undefined ? {} : { error }),
    })
  }

  try {
    const result = await runTestLifecycle(testSession, testCase, attempts)
    logFinished(result.passed)

    return result
  } catch (error) {
    logFinished(false, error)

    throw error
  }
}

async function runTestLifecycle(
  testSession: TestSession,
  testCase: TestCase,
  attempts: FailedAttempt[]
): Promise<DetailedTestResult> {
  const startTime = Date.now()

  const integrationUrl = new URL(testSession.integrationUrl)

  const api = new TestCaseApi(
    testCase.name,
    integrationUrl,
    prependSlash(testSession.ingressPath),
    prependSlash(testSession.cdnPath),
    testSession
  )

  if (testCase.before) {
    await testCase.before(api, testSession)
  }

  let result: TestResult

  try {
    await withRetry(async () => await testCase.test(api), {
      maxAttempts: 3,
      interval: 10_000,
      // A failed assertion is deterministic: the proxy answered, the answer was wrong, and
      // asking again changes nothing. Retrying it only pushes the verdict past the client's
      // timeout, which turns a clear assertion failure into an opaque one.
      shouldRetry: (error) => !isDeterministicFailure(error),
      // Report the failure as it happens. onRetry only runs after the retry interval has
      // elapsed, so hooking it would still hide a timeout for the length of the wait.
      onAttemptError: ({ attempt, error }) => {
        attempts.push({
          attempt: attempt + 1,
          name: error instanceof Error ? error.name : 'Error',
          reason: error instanceof Error ? error.message : String(error),
          at: new Date().toISOString(),
        })
        api.logger.error('Test attempt failed', { error })
      },
      onRetry: ({ attempt }) => {
        setLogFields({ attempt: attempt + 1 })
      },
    })

    result = {
      passed: true,
    }
  } catch (error) {
    // Not logged here: onAttemptError already logged and flushed this error when the attempt
    // failed, and logging it again duplicates it in the console and in result.logs.
    result = {
      passed: false,
      reason: error instanceof Error ? error.message : String(error),
      meta: {
        error: error instanceof Error ? error : new Error(String(error)),
        requestsFromProxy: api.requestsFromProxy,
      },
    }
  } finally {
    api.requestIdList.forEach((id) => {
      clearMockResponsesForTest(id)
    })
  }

  const key = createProxyRequestHandlerKey(testSession.host, testCase.name)

  // In case if test failed without removing listeners
  Object.values(ProxyRequestType).forEach((type) => {
    removeProxyRequestListener(type, key)
  })

  const requestDurationMs = Date.now() - startTime

  if (testCase.after) {
    await testCase.after(api, testSession)
  }

  return {
    ...result,
    testName: testCase.name,
    requestDurationMs,
    attempts,
  }
}
