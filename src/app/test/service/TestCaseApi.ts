import { AxiosRequestConfig } from 'axios'
import { sendAxiosRequestWithRequestInit } from '../../../utils/httpClient'
import {
  addProxyRequestListener,
  createProxyRequestHandlerKey,
  ProxyRequestType,
} from '../../proxy-receiver/service/proxyRequestHandler'
import { SendRequestResult } from '../types/testCase'
import { TEST_CASE_HOST_HEADER, TEST_CASE_NAME_HEADER, TEST_CASE_PROXY_TYPE_HEADER } from './const'
import { createRequestFromProxy, RequestsFromProxyRecord } from './requestFromProxy'
import { TestSession } from './session'

export class TestCaseApi {
  readonly requestsFromProxy: RequestsFromProxyRecord = {
    [ProxyRequestType.Cdn]: [],
    [ProxyRequestType.Ingress]: [],
    [ProxyRequestType.Cache]: [],
  }

  constructor(
    private readonly testName: string,
    private readonly ingressProxyUrl: URL,
    private readonly cdnProxyUrl: URL,
    public readonly testSession: TestSession
  ) {}

  async sendRequestToCdn(
    query?: URLSearchParams,
    requestInit?: Partial<AxiosRequestConfig>
  ): Promise<SendRequestResult> {
    return new Promise(async (resolve) => {
      const url = new URL(this.cdnProxyUrl)

      if (query) {
        url.search = query.toString()
      }

      const key = createProxyRequestHandlerKey(this.testSession.host, this.testName)

      addProxyRequestListener(ProxyRequestType.Cdn, key, (request) => {
        this.requestsFromProxy[ProxyRequestType.Cdn].push(createRequestFromProxy(request))

        resolve({
          requestFromProxy: request,
        })
      })

      console.info(`Sending request to CDN at ${url.toString()}`)

      try {
        const response = await sendAxiosRequestWithRequestInit(url, {
          ...requestInit,
          method: 'GET',
          headers: {
            ...requestInit?.headers,
            ...this.createTestHeaders(ProxyRequestType.Cdn),
          },
        })

        console.info(`CDN responded with ${response.status} at ${url.toString()}`, {
          body: response.data,
          headers: response.headers,
        })
      } catch (error) {
        console.error(`Failed to send request to CDN at ${url.toString()}`, error)
      }
    })
  }

  async sendRequestToCacheEndpoint(
    request: Partial<AxiosRequestConfig>,
    query?: URLSearchParams,
    pathname?: string
  ): Promise<SendRequestResult> {
    return new Promise(async (resolve) => {
      const url = new URL(this.ingressProxyUrl)

      if (pathname) {
        url.pathname += pathname
      }

      if (query) {
        url.search = query.toString()
      }

      const key = createProxyRequestHandlerKey(this.testSession.host, this.testName)

      addProxyRequestListener(ProxyRequestType.Cache, key, (request) => {
        this.requestsFromProxy[ProxyRequestType.Cache].push(createRequestFromProxy(request))

        resolve({
          requestFromProxy: request,
        })
      })

      console.info(`Sending request to cache endpoint at ${url.toString()}`)

      try {
        const response = await sendAxiosRequestWithRequestInit(url, {
          ...request,
          method: 'GET',
          headers: {
            ...request.headers,
            ...this.createTestHeaders(ProxyRequestType.Cache),
          },
        })

        console.info(`Cache endpoint responded with ${response.status} at ${url.toString()}`, {
          body: response.data,
          headers: response.headers,
        })
      } catch (error) {
        console.error(`Failed to send request to Cache endpoint at ${url.toString()}`, error)
      }
    })
  }

  async sendRequestToIngress(
    request: Partial<AxiosRequestConfig>,
    query?: URLSearchParams
  ): Promise<SendRequestResult> {
    return new Promise(async (resolve) => {
      const url = new URL(this.ingressProxyUrl)

      if (query) {
        url.search = query.toString()
      }

      const key = createProxyRequestHandlerKey(this.testSession.host, this.testName)

      addProxyRequestListener(ProxyRequestType.Ingress, key, (request) => {
        this.requestsFromProxy[ProxyRequestType.Ingress].push(createRequestFromProxy(request))

        resolve({
          requestFromProxy: request,
        })
      })

      console.info(`Sending request to ingress at ${url.toString()}`)

      try {
        const response = await sendAxiosRequestWithRequestInit(url, {
          ...request,
          method: 'POST',
          headers: {
            ...request.headers,
            ...this.createTestHeaders(ProxyRequestType.Ingress),
          },
        })

        console.info(`Ingress responded with ${response.status} at ${url.toString()}`, {
          body: response.data,
          headers: response.headers,
        })
      } catch (error) {
        console.error(`Failed to send request to Ingress at ${url.toString()}`, error)
      }
    })
  }

  private createTestHeaders(requestType: ProxyRequestType) {
    return {
      [TEST_CASE_HOST_HEADER]: this.testSession.host,
      [TEST_CASE_PROXY_TYPE_HEADER]: requestType,
      [TEST_CASE_NAME_HEADER]: this.testName,
      'cache-control': 'no-cache',
    }
  }
}
