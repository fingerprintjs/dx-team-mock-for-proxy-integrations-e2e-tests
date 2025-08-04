import { AxiosInstance, AxiosRequestConfig } from 'axios'
import { createNewHttpClient, sendAxiosRequestWithRequestConfig } from '../../../utils/httpClient'
import {
  addProxyRequestListener,
  createProxyRequestHandlerKey,
  ProxyRequestType,
} from '../../proxy-receiver/service/proxyRequestHandler'
import { SendRequestResult } from '../types/testCase'
import { TEST_CASE_HOST_HEADER, TEST_CASE_NAME_HEADER, TEST_CASE_PROXY_TYPE_HEADER } from './const'
import { createRequestFromProxy, RequestsFromProxyRecord } from './requestFromProxy'
import { TestSession } from './session'
import { Request } from 'express'

export class TestCaseApi {
  readonly requestsFromProxy: RequestsFromProxyRecord = {
    [ProxyRequestType.Cdn]: [],
    [ProxyRequestType.Ingress]: [],
    [ProxyRequestType.Cache]: [],
  }
  public readonly httpClientInstance: AxiosInstance

  constructor(
    private readonly testName: string,
    private readonly ingressProxyUrl: URL,
    private readonly cdnProxyUrl: URL,
    public readonly testSession: TestSession
  ) {
    this.httpClientInstance = createNewHttpClient()
  }

  async sendRequestToCdn(
    query?: URLSearchParams,
    axiosRequestConfig?: Partial<AxiosRequestConfig>
  ): Promise<SendRequestResult> {
    const url = new URL(this.cdnProxyUrl)

    if (query) {
      url.search = query.toString()
    }

    const key = createProxyRequestHandlerKey(this.testSession.host, this.testName)

    const requestFromProxyPromise = new Promise<Request>((resolveRequest) => {
      addProxyRequestListener(ProxyRequestType.Cdn, key, (request) => {
        this.requestsFromProxy[ProxyRequestType.Cdn].push(createRequestFromProxy(request))
        resolveRequest(request)
      })
    })

    console.info(`Sending request to CDN at ${url.toString()}`)

    let responseFromProxy: SendRequestResult['responseFromProxy']

    try {
      const response = await sendAxiosRequestWithRequestConfig(
        url,
        {
          ...axiosRequestConfig,
          method: 'GET',
          headers: {
            ...axiosRequestConfig?.headers,
            ...this.createTestHeaders(ProxyRequestType.Cdn),
          },
        },
        this.httpClientInstance
      )

      responseFromProxy = {
        status: response.status,
        headers: response.headers,
        body: response.data,
      }

      console.info(`CDN responded with ${response.status} at ${url.toString()}`, {
        body: response.data,
        headers: response.headers,
      })
    } catch (error) {
      console.error(`Failed to send request to CDN at ${url.toString()}`, error)

      responseFromProxy = {
        status: error?.response?.status ?? 500,
        headers: error?.response?.headers ?? {},
        body: error?.response?.data ?? error?.message ?? 'Unknown error',
      }
    }

    const requestFromProxy = await requestFromProxyPromise
    return { requestFromProxy, responseFromProxy }
  }

  async sendRequestToCacheEndpoint(
    request: Partial<AxiosRequestConfig>,
    query?: URLSearchParams,
    pathname?: string
  ): Promise<SendRequestResult> {
    const url = new URL(this.ingressProxyUrl)

    if (pathname) {
      url.pathname += pathname
    }

    if (query) {
      url.search = query.toString()
    }

    const key = createProxyRequestHandlerKey(this.testSession.host, this.testName)

    const requestFromProxyPromise = new Promise<Request>((resolveRequest) => {
      addProxyRequestListener(ProxyRequestType.Cache, key, (request) => {
        this.requestsFromProxy[ProxyRequestType.Cache].push(createRequestFromProxy(request))
        resolveRequest(request)
      })
    })

    console.info(`Sending request to cache endpoint at ${url.toString()}`)

    let responseFromProxy: SendRequestResult['responseFromProxy']

    try {
      const response = await sendAxiosRequestWithRequestConfig(
        url,
        {
          ...request,
          method: 'GET',
          headers: {
            ...request.headers,
            ...this.createTestHeaders(ProxyRequestType.Cache),
          },
        },
        this.httpClientInstance
      )

      responseFromProxy = {
        status: response.status,
        headers: response.headers,
        body: response.data,
      }

      console.info(`Cache endpoint responded with ${response.status} at ${url.toString()}`, {
        body: response.data,
        headers: response.headers,
      })
    } catch (error) {
      console.error(`Failed to send request to Cache endpoint at ${url.toString()}`, error)

      responseFromProxy = {
        status: error?.response?.status ?? 500,
        headers: error?.response?.headers ?? {},
        body: error?.response?.data ?? error?.message ?? 'Unknown error',
      }
    }

    const requestFromProxy = await requestFromProxyPromise
    return { requestFromProxy, responseFromProxy }
  }

  async sendRequestToIngress(
    request: Partial<AxiosRequestConfig>,
    query?: URLSearchParams
  ): Promise<SendRequestResult> {
    const url = new URL(this.ingressProxyUrl)

    if (query) {
      url.search = query.toString()
    }

    const key = createProxyRequestHandlerKey(this.testSession.host, this.testName)

    const requestFromProxyPromise = new Promise<Request>((resolveRequest) => {
      addProxyRequestListener(ProxyRequestType.Ingress, key, (request) => {
        this.requestsFromProxy[ProxyRequestType.Ingress].push(createRequestFromProxy(request))
        resolveRequest(request)
      })
    })

    console.info(`Sending request to ingress at ${url.toString()}`)

    let responseFromProxy: SendRequestResult['responseFromProxy']

    try {
      const response = await sendAxiosRequestWithRequestConfig(
        url,
        {
          ...request,
          method: 'POST',
          headers: {
            ...request.headers,
            ...this.createTestHeaders(ProxyRequestType.Ingress),
          },
        },
        this.httpClientInstance
      )

      responseFromProxy = {
        status: response.status,
        headers: response.headers,
        body: response.data,
      }

      console.info(`Ingress responded with ${response.status} at ${url.toString()}`, {
        body: response.data,
        headers: response.headers,
      })
    } catch (error) {
      console.error(`Failed to send request to Ingress at ${url.toString()}`, error)

      responseFromProxy = {
        status: error?.response?.status ?? 500,
        headers: error?.response?.headers ?? {},
        body: error?.response?.data ?? error?.message ?? 'Unknown error',
      }
    }

    const requestFromProxy = await requestFromProxyPromise
    return { requestFromProxy, responseFromProxy }
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
