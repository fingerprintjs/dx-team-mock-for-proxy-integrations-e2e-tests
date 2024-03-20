import { Request as ExpressRequest } from 'express'
import { getIP } from '../utils/getIP'
import { TestCaseApi } from './TestCaseApi'
import { assert, assertLowerThanOrEqual, assertRegExp } from './assert'
import { RequestsFromProxyRecord } from './requestFromProxy'

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
    name: 'agent request without loader',
    test: async (api) => {
      const query = new URLSearchParams()

      query.set('apiKey', Math.random().toString(36).substring(7))
      query.set('version', '3')

      const { requestFromProxy } = await api.sendRequestToCdn(query)

      const splitPath = requestFromProxy.path.split('/').slice(1)

      assert(splitPath.length, 2)

      const [version, apiKey] = splitPath

      assert(apiKey, query.get('apiKey'))
      assert(version, 'v3')
    },
  },
  {
    name: 'agent request traffic monitoring',
    test: async (api) => {
      const query = new URLSearchParams()
      query.set('customQuery', '123')

      const { requestFromProxy } = await api.sendRequestToCdn(query)
      const { ii, customQuery } = requestFromProxy.query
      const [integration, version, type] = ii.toString().split('/')

      assert(integration, api.testSession.trafficName)
      assert(version, api.testSession.integrationVersion)
      assert(type, 'procdn')
      assert(customQuery, '123')
    },
  },
  {
    name: 'cache endpoint request traffic monitoring',
    test: async (api) => {
      const { requestFromProxy } = await api.sendRequestToCacheEndpoint({})
      const { ii } = requestFromProxy.query
      const [integration, version, type] = ii.toString().split('/')

      assert(integration, api.testSession.trafficName)
      assert(version, api.testSession.integrationVersion)
      assert(type, 'ingress')
    },
  },
  {
    name: 'ingress request traffic monitoring',
    test: async (api) => {
      const { requestFromProxy } = await api.sendRequestToIngress({})
      const { ii } = requestFromProxy.query
      const [integration, version, type] = ii.toString().split('/')

      assert(integration, api.testSession.trafficName)
      assert(version, api.testSession.integrationVersion)
      assert(type, 'ingress')
    },
  },
  {
    name: 'agent request preserve header and query',
    test: async (api) => {
      const query = new URLSearchParams()
      query.set('customQuery', '123')

      const { requestFromProxy } = await api.sendRequestToCdn(query, { headers: { 'X-Custom': '123' } })
      assert(requestFromProxy.get('X-Custom'), '123')
      assert(requestFromProxy.query.customQuery, '123')
    },
  },
  {
    name: 'cache control headers for agent request',
    test: async (api) => {
      const { requestFromProxy } = await api.sendRequestToCdn()
      assertRegExp(requestFromProxy.get('Cache-Control'), new RegExp(/max-age=[0-9]*/g))
      const maxAge = Number(requestFromProxy.get('Cache-Control').replace('max-age=', ''))
      console.log({ maxAge })
      assertLowerThanOrEqual(maxAge, 3600)
    },
  },
  {
    name: 'agent request no cookie',
    test: async (api) => {
      const { requestFromProxy } = await api.sendRequestToCdn(undefined, {
        headers: { cookie: 'test=123; _iidt=test' },
      })
      assert(requestFromProxy.get('cookie'), undefined)
    },
  },
  {
    name: 'ingress delete all cookies if iidt not present',
    test: async (api) => {
      const { requestFromProxy } = await api.sendRequestToIngress({
        headers: {
          cookie: 'random=123;test=123',
        },
      })
      assert(requestFromProxy.get('cookie'), undefined)
    },
  },
  {
    name: 'ingress request with single ii query parameter',
    test: async (api) => {
      const query = new URLSearchParams()
      query.set('customQuery', '123')
      const { requestFromProxy } = await api.sendRequestToIngress({}, query)
      const { ii, customQuery } = requestFromProxy.query
      const [integration, version, type] = ii.toString().split('/')
      assert(integration, api.testSession.trafficName)
      assert(version, api.testSession.integrationVersion)
      assert(type, 'ingress')
      assert(customQuery, '123')
    },
  },
  {
    name: 'ingress request with multiple ii query parameter',
    test: async (api) => {
      const query = new URLSearchParams()
      const reactTrafficMonitoring = 'fingerprintjs-pro-react/2.6.2/next/14.1.0'
      query.set('ii', reactTrafficMonitoring)
      query.set('customQuery', '123')
      const { requestFromProxy } = await api.sendRequestToIngress({}, query)
      const { ii, customQuery } = requestFromProxy.query
      const proxyIntegrationInfo = `${api.testSession.trafficName}/${api.testSession.integrationVersion}/ingress`
      assert((ii as string[]).includes(proxyIntegrationInfo), true)
      assert((ii as string[]).includes(reactTrafficMonitoring), true)
      assert(customQuery, '123')
    },
  },
  {
    name: 'ingress request with cookie filter, proxy secret, forwarded host and preservation of headers',
    test: async (api) => {
      const { requestFromProxy } = await api.sendRequestToIngress({
        headers: {
          cookie: '_iidt=123;test=123',
          'x-custom-header': '123',
        },
      })

      const ipOfClient = await getIP()

      assert(requestFromProxy.get('x-custom-header'), '123')
      assert(requestFromProxy.get('fpjs-proxy-client-ip'), ipOfClient)
      assert(requestFromProxy.get('cookie'), '_iidt=123')
      assert(requestFromProxy.get('fpjs-proxy-secret'), 'secret')
      assert(`https://${requestFromProxy.get('fpjs-proxy-forwarded-host')}`, api.testSession.host)
    },
  },
]
