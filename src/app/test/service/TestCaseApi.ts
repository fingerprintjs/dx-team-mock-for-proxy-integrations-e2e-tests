import type { Method } from 'axios'
import { AxiosInstance, AxiosRequestConfig } from 'axios'
import { createNewHttpClient, sendAxiosRequestWithRequestConfig } from '../../../utils/httpClient'
import {
  addProxyRequestListener,
  createProxyRequestHandlerKey,
  ProxyRequestType,
} from '../../proxy-receiver/service/proxyRequestHandler'
import { RequestSentToProxy, ResponseFromProxy, SendRequestResult } from '../types/testCase'
import {
  TEST_CASE_HOST_HEADER,
  TEST_CASE_NAME_HEADER,
  TEST_CASE_PROXY_TYPE_HEADER,
  TEST_CASE_REQUEST_ID,
} from './const'
import { createRequestFromProxy, RequestsFromProxyRecord } from './requestFromProxy'
import { TestSession } from './session'
import { Request } from 'express'
import { MockResponse, setMockResponse } from './mockResponseRegistry'
import { generateRequestId } from '../../../utils/generateRequestId'
import { getApiKey } from '../utils/getApiKey'
import { getRandomString } from '../utils/getRandomString'
import { NoProxyRequestReceivedError } from '../errors'

interface SendRequestOptions {
  method: Method
  path?: string
  query?: URLSearchParams
  requestConfig?: Partial<AxiosRequestConfig>
  listenerType?: ProxyRequestType
  mockResponse?: MockResponse
}

interface RequestToCdnParams {
  query?: URLSearchParams
  request?: Partial<AxiosRequestConfig>
  mockResponse?: MockResponse
  apiKey?: string
  pathOverride?: string
}

interface RequestToCacheEndpointParams {
  pathname?: string
  request?: Partial<AxiosRequestConfig>
  query?: URLSearchParams
  mockResponse?: MockResponse
}

interface RequestToIngressParams {
  request?: Partial<AxiosRequestConfig>
  query?: URLSearchParams
  mockResponse?: MockResponse
}

export class TestCaseApi {
  readonly requestsFromProxy: RequestsFromProxyRecord = {
    [ProxyRequestType.Cdn]: [],
    [ProxyRequestType.Ingress]: [],
    [ProxyRequestType.Cache]: [],
  }
  public readonly httpClientInstance: AxiosInstance
  public requestIdList: string[] = []

  constructor(
    private readonly testName: string,
    private readonly integrationUrl: URL,
    private readonly ingressPath: string,
    private readonly cdnPath: string,
    public readonly testSession: TestSession
  ) {
    this.httpClientInstance = createNewHttpClient()
  }

  async sendRequest({ method, path, query, requestConfig, listenerType, mockResponse }: SendRequestOptions): Promise<{
    responseFromProxy: ResponseFromProxy
    requestFromProxy: Request | null
    requestSentToProxy: RequestSentToProxy
  }> {
    const url = new URL(this.integrationUrl)
    if (url.pathname.endsWith('/')) {
      url.pathname += path.replace(/^\//, '')
    } else if (path !== '/') {
      url.pathname += path
    }

    if (query) {
      url.search = query.toString()
    }

    const key = createProxyRequestHandlerKey(this.testSession.host, this.testName)

    // This request will be set before the response from the proxy is received IF
    // the proxy integration correctly forwards the request.
    let requestFromProxy: Request | null = null
    if (listenerType) {
      addProxyRequestListener(listenerType, key, (request) => {
        this.requestsFromProxy[listenerType].push(createRequestFromProxy(request))

        requestFromProxy = request
      })
    }

    const requestId = generateRequestId()

    if (mockResponse) {
      this.requestIdList.push(requestId)
      setMockResponse(requestId, mockResponse)
    }

    if (listenerType) {
      console.info(`Sending request to ${listenerType.toString()} at ${url.toString()}`)
    } else {
      console.info(`Sending request to ${url.toString()}`)
    }

    let responseFromProxy: ResponseFromProxy

    const requestToSend = {
      ...requestConfig,
      method,
      headers: {
        ...requestConfig?.headers,
        ...this.createTestHeaders(listenerType, requestId),
      },
    }

    try {
      const response = await sendAxiosRequestWithRequestConfig(url, requestToSend, this.httpClientInstance)

      responseFromProxy = {
        status: response.status,
        headers: response.headers,
        body: response.data,
      }

      if (listenerType) {
        console.info(`${listenerType} responded with ${response.status} at ${url.toString()}`, {
          body: responseFromProxy.body,
          headers: responseFromProxy.headers,
        })
      } else {
        console.info(`Responded with ${response.status} at ${url.toString()}`, {
          body: responseFromProxy.body,
          headers: responseFromProxy.headers,
        })
      }
    } catch (error) {
      if (listenerType) {
        console.error(`Failed to send request to ${listenerType} at ${url.toString()}`, error)
      } else {
        console.error(`Failed to send request to ${url.toString()}`, error)
      }

      responseFromProxy = {
        status: error?.response?.status ?? 500,
        headers: error?.response?.headers ?? {},
        body: error?.response?.data ?? error?.message ?? 'Unknown error',
      }
    }

    const headers: Record<string, string | string[]> = {}
    if (requestToSend.headers) {
      for (const [name, value] of Object.entries(requestToSend.headers)) {
        if (Array.isArray(value)) {
          headers[name] = value.map((v) => v.toString())
        } else {
          headers[name] = value.toString()
        }
      }
    }

    const requestSentToProxy = {
      method: requestToSend.method,
      url: url.toString(),
      headers,
      body: requestToSend.data,
    }

    return { requestFromProxy, responseFromProxy, requestSentToProxy }
  }

  async sendRequestToCdn({ query, request, mockResponse }: RequestToCdnParams): Promise<SendRequestResult> {
    const result = await this.sendRequest({
      method: 'GET',
      path: this.cdnPath,
      query,
      requestConfig: request,
      listenerType: ProxyRequestType.Cdn,
      mockResponse,
    })

    if (!result.requestFromProxy) {
      throw new NoProxyRequestReceivedError(result.requestSentToProxy, result.responseFromProxy)
    }
    return result
  }

  async sendRequestToCacheEndpoint({
    pathname,
    request,
    query,
    mockResponse,
  }: RequestToCacheEndpointParams): Promise<SendRequestResult> {
    const result = await this.sendRequest({
      method: 'GET',
      path: this.ingressPath + (pathname ? pathname : ''),
      query,
      requestConfig: request,
      listenerType: ProxyRequestType.Cache,
      mockResponse,
    })

    if (!result.requestFromProxy) {
      throw new NoProxyRequestReceivedError(result.requestSentToProxy, result.responseFromProxy)
    }
    return result
  }

  async sendRequestToIngress({
    request,
    query,
    mockResponse,
  }: RequestToIngressParams = {}): Promise<SendRequestResult> {
    const result = await this.sendRequest({
      method: 'POST',
      path: this.ingressPath,
      query,
      requestConfig: request,
      listenerType: ProxyRequestType.Ingress,
      mockResponse,
    })

    if (!result.requestFromProxy) {
      throw new NoProxyRequestReceivedError(result.requestSentToProxy, result.responseFromProxy)
    }
    return result
  }

  async sendRequestToV4Cdn({
    query,
    request,
    mockResponse,
    apiKey = getApiKey(),
    pathOverride,
  }: RequestToCdnParams = {}): Promise<SendRequestResult> {
    const result = await this.sendRequest({
      method: 'GET',
      path: pathOverride || `/web/v4/${apiKey}`,
      query,
      requestConfig: request,
      listenerType: ProxyRequestType.Cdn,
      mockResponse,
    })

    if (!result.requestFromProxy) {
      throw new NoProxyRequestReceivedError(result.requestSentToProxy, result.responseFromProxy)
    }
    return result
  }

  async sendRequestToV4CacheEndpoint({
    pathname,
    request,
    query,
    mockResponse,
  }: RequestToCacheEndpointParams = {}): Promise<SendRequestResult> {
    const result = await this.sendRequest({
      method: 'GET',
      path: pathname ?? `/browser-cache/${getRandomString()}`,
      query,
      requestConfig: request,
      listenerType: ProxyRequestType.Cache,
      mockResponse,
    })

    if (!result.requestFromProxy) {
      throw new NoProxyRequestReceivedError(result.requestSentToProxy, result.responseFromProxy)
    }
    return result
  }

  async sendRequestToV4Ingress({
    request,
    query,
    mockResponse,
  }: RequestToIngressParams = {}): Promise<SendRequestResult> {
    const result = await this.sendRequest({
      method: 'POST',
      path: '/',
      query,
      requestConfig: request,
      listenerType: ProxyRequestType.Ingress,
      mockResponse,
    })

    if (!result.requestFromProxy) {
      throw new NoProxyRequestReceivedError(result.requestSentToProxy, result.responseFromProxy)
    }
    return result
  }

  private createTestHeaders(requestType: ProxyRequestType, requestId?: string) {
    return {
      [TEST_CASE_HOST_HEADER]: this.testSession.host,
      [TEST_CASE_PROXY_TYPE_HEADER]: requestType || '',
      [TEST_CASE_NAME_HEADER]: this.testName,
      'cache-control': 'no-cache',
      [TEST_CASE_REQUEST_ID]: requestId,
    }
  }
}
