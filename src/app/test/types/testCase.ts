import { Request as ExpressRequest } from 'express'
import { RequestsFromProxyRecord } from '../service/requestFromProxy'
import { TestSession } from '../service/session'
import { TestCaseApi } from '../service/TestCaseApi'
import { AxiosResponseHeaders, Method, RawAxiosResponseHeaders } from 'axios'

export type ResponseFromProxy = {
  status: number
  headers: RawAxiosResponseHeaders | AxiosResponseHeaders
  body: any
}

export type RequestSentToProxy = {
  method: Method
  url: string
  headers: Record<string, string | string[]>
  body?: any
}

export type SendRequestResult = {
  requestFromProxy: ExpressRequest
  responseFromProxy: ResponseFromProxy
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
