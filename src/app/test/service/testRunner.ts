import { glob } from 'glob'
import {
  createProxyRequestHandlerKey,
  ProxyRequestType,
  removeProxyRequestListener,
} from '../../proxy-receiver/service/proxyRequestHandler'
import { TestCase, TestResult } from '../types/testCase'
import { finalizeTestSession, TestSession } from './session'
import { TestCaseApi } from './TestCaseApi'
import { withTimeout } from '../../../utils/timeout'
import { clearMockResponsesForTest } from './mockResponseRegistry'

const TEST_TIMEOUT_MS = 10_000

export type DetailedTestResult = TestResult & {
  testName: string
  requestDurationMs: number
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

  let testCases = await loadTestCases()

  const hasGlob = (p: string) => /[*?]/.test(p)
  const escapeRegex = (s: string) => s.replace(/[.+${}()|[\]\\]/g, '\\$&')
  const globToRegex = (p: string) => {
    let constructed = ''
    for (const char of p) {
      if (char === '*') {
        constructed += '.*'
      } else if (char === '?') {
        constructed += '.'
      } else {
        constructed += escapeRegex(char)
      }
    }
    return new RegExp(`${constructed}$`, 'i')
  }

  const makeMatcher = (patterns: string[]) => {
    const compiled = patterns.map((p) => (hasGlob(p) ? globToRegex(p) : p.toLowerCase()))
    return (name: string) => {
      const hay = name.toLowerCase()
      return compiled.some((c) => (typeof c === 'string' ? hay.includes(c) : c.test(name)))
    }
  }

  const { include, exclude } = filter ?? {}

  if (include && include.length > 0) {
    const matchInclude = makeMatcher(include)
    testCases = testCases.filter((t) => matchInclude(t.name))
  }

  if (exclude && exclude.length > 0) {
    const matchExclude = makeMatcher(exclude)
    testCases = testCases.filter((t) => !matchExclude(t.name))
  }

  if (testCases.length === 0) {
    throw new Error('No tests matched the provided include/exclude filters.')
  }

  await Promise.allSettled(
    testCases.map(async (testCase) => {
      const result = await runTest(testSession, testCase)

      testSession.addResult(result)
    })
  )

  return finalizeTestSession(testSession)
}

export async function runTest(testSession: TestSession, testCase: TestCase): Promise<DetailedTestResult> {
  const startTime = Date.now()

  const integrationUrl = new URL(testSession.integrationUrl)
  if (!integrationUrl.pathname.endsWith('/')) {
    integrationUrl.pathname += '/'
  }

  const api = new TestCaseApi(testCase.name, integrationUrl, testSession.ingressPath, testSession.cdnPath, testSession)

  if (testCase.before) {
    await testCase.before(api, testSession)
  }

  let result: TestResult

  try {
    await withTimeout(() => testCase.test(api), TEST_TIMEOUT_MS)

    result = {
      passed: true,
    }
  } catch (error) {
    result = {
      passed: false,
      reason: error instanceof Error ? error.message : String(error),
      meta: {
        error,
        requestsFromProxy: api.requestsFromProxy,
      },
    }
  } finally {
    api.requestIdList.forEach(id => {
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
  }
}
