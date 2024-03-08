import { Request as ExpressRequest, Response as ExpressResponse } from 'express'
import { TestCaseApi } from './TestCaseApi'
import { assert } from './assert'
import { RequestsFromProxyRecord } from './requestFromProxy'

export type SendRequestResult = {
  requestFromProxy: ExpressRequest
  // TODO: Not sure if this will be needed
  sendResponse: (response: ExpressResponse) => void
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
  test: (api: TestCaseApi) => Promise<void>
}

// Returns random loader version: e.g 3.4.7
function getLoaderVersion() {
  return `3.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`
}

export const testCases: TestCase[] = [
  {
    name: 'agent request query params',
    test: async (api) => {
      const query = new URLSearchParams()

      query.set('apiKey', Math.random().toString(36).substring(7))
      query.set('version', '3')
      query.set('loaderVersion', getLoaderVersion())

      const { requestFromProxy } = await api.sendRequestToCdn(query)

      const splitPath = requestFromProxy.path.split('/').slice(1)

      assert(splitPath.length, 3)

      const [version, apiKey, loader] = splitPath

      assert(apiKey, query.get('apiKey'))
      assert(version, 'v3')
      assert(loader, `loader_v${query.get('loaderVersion')}.js`)
    },
  },

  {
    name: 'ingress request headers',
    test: async (api) => {
      const BLACK_LISTED_HEADERS = new Set([
        'expect',
        'keep-alive',
        'proxy-authenticate',
        'proxy-authorization',
        'proxy-connection',
        'trailer',
        'upgrade',
        'x-accel-buffering',
        'x-accel-charset',
        'x-accel-limit-rate',
        'x-accel-redirect',
        'x-amzn-auth',
        'x-amzn-cf-billing',
        'x-amzn-cf-id',
        'x-amzn-cf-xff',
        'x-amzn-errortype',
        'x-amzn-fle-profile',
        'x-amzn-header-count',
        'x-amzn-header-order',
        'x-amzn-lambda-integration-tag',
        'x-amzn-requestid',
        'x-cache',
        'strict-transport-security',
      ])

      const { requestFromProxy } = await api.sendRequestToIngress({
        headers: {
          cookie: '_iidt=123;test=123',
          'fpjs-proxy-secret': 'secret',
        },
      })

      const cookieArray = requestFromProxy
        .get('cookie')
        .split(';')
        .map((v) => v.trim())

      // Some proxy integrations, e.g Akamai send duplicated cookies. It doesn't impact identification accuracy, but we need to make sure that all cookies are the same.
      cookieArray.forEach((cookie) => {
        assert(cookie, '_iidt=123')
      })

      assert(requestFromProxy.get('fpjs-proxy-secret'), 'secret')

      BLACK_LISTED_HEADERS.forEach((header) => {
        assert(requestFromProxy.get(header), undefined, `Header ${header} should not be present`)
      })

      assert(`https://${requestFromProxy.get('fpjs-proxy-forwarded-host')}`, api.testSession.host)
    },
  },
]
