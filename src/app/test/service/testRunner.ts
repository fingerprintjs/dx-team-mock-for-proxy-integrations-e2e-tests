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
import {clearMockResponsesForTest, setMockResponse} from "./mockResponseRegistry";

const TEST_TIMEOUT_MS = 10_000

export type DetailedTestResult = TestResult & {
  testName: string
  requestDurationMs: number
}

export async function loadTestCases() {
  const ext = process.env.TEST_CASE_EXT ?? '.js'

  const caseFiles = await glob(`../**/*.case${ext}`, { absolute: true })
  console.log(caseFiles)
  return await Promise.all(caseFiles.map(async (file) => import(file).then((module) => module.default as TestCase)))
}

export async function runTests(testSession: TestSession, filter?: string[]) {
  testSession.start()

  let testCases = await loadTestCases()

  if (filter) {
    testCases = testCases.filter((t) => filter.includes(t.name))
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
    if (testCase.response) {
      setMockResponse(testCase.name, {
        status: testCase.response.status ?? 200,
        headers: testCase.response.headers ?? {},
        body: testCase.response.body ?? '',
      })
    }

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
    clearMockResponsesForTest(testCase.name)
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
