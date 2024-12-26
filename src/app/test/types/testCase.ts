import { Request as ExpressRequest } from 'express'
import { RequestsFromProxyRecord } from '../service/requestFromProxy'
import { TestSession } from '../service/session'
import { TestCaseApi } from '../service/TestCaseApi'

export type SendRequestResult = {
  requestFromProxy: ExpressRequest
}

export type FailedTestCaseMetadata = {
  error: Error
  requestsFromProxy: RequestsFromProxyRecord
}

export type FailedTestResult = {
  passed: false
  reason: string
  meta: FailedTestCaseMetadata
}

export type PassedTestResult = {
  passed: true
}

export type TestResult = FailedTestResult | PassedTestResult

export type TestCase = {
  name: string
  before?: (testCaseApi: TestCaseApi, session: TestSession) => Promise<void> | void
  after?: (testCaseApi: TestCaseApi, session: TestSession) => Promise<void> | void
  test: (testCaseApi: TestCaseApi) => Promise<void>
}
