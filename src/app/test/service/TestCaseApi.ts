import type { Method } from 'axios'
import { AxiosInstance, AxiosRequestConfig } from 'axios'
import { createNewHttpClient, sendAxiosRequestWithRequestConfig } from '../../../utils/httpClient'
import {
  addProxyRequestListener,
  createProxyRequestHandlerKey,
  ProxyRequestType,
  removeProxyRequestListener,
} from '../../proxy-receiver/service/proxyRequestHandler'
import { ResponseFromProxy, SendRequestResult } from '../types/testCase'
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
import { NoProxyRequestReceivedError, ProxyRequestTimeoutError } from '../errors'
import { createLogger, Logger } from '../../../utils/logger'

interface SendRequestOptions {
  method: Method
  path?: string
  query?: URLSearchParams
  requestConfig?: Partial<AxiosRequestConfig>
  listenerType?: ProxyRequestType
  mockResponse?: MockResponse
  /**
   * Lets the edge cache answer the request. By default every request tells the proxy not to cache
   * (`cache-control: no-cache, no-store`), so a cache hit could never be observed.
   */
  cacheable?: boolean
}

type SendRequestOutcome = Omit<SendRequestResult, 'requestFromProxy'> & {
  /** `null` when the proxy answered without calling the mock server, e.g. on a cache hit. */
  requestFromProxy: Request | null
}

export type SendCacheableRequestResult = SendRequestOutcome

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

interface ArbitraryV4RequestParams {
  method: Method
  path?: string
  request?: Partial<AxiosRequestConfig>
  query?: URLSearchParams
  mockResponse?: MockResponse
}

function isTimeoutError(error: { code?: string; message?: string }): boolean {
  return (
    error?.code === 'ECONNABORTED' ||
    error?.code === 'ETIMEDOUT' ||
    /timeout of \d+ms exceeded/.test(error?.message ?? '')
  )
}

export class TestCaseApi {
  readonly requestsFromProxy: RequestsFromProxyRecord = {
    [ProxyRequestType.Cdn]: [],
    [ProxyRequestType.Ingress]: [],
    [ProxyRequestType.Cache]: [],
  }
  public readonly httpClientInstance: AxiosInstance
  public requestIdList: string[] = []

  public logMetadata: { attempt: number } = { attempt: 0 }

  public readonly logger: Logger

  constructor(
    private readonly testName: string,
    private readonly integrationUrl: URL,
    private readonly ingressPath: string,
    private readonly cdnPath: string,
    public readonly testSession: TestSession
  ) {
    this.httpClientInstance = createNewHttpClient()
    this.logger = createLogger(this.logMetadata)
  }

  async sendRequest(options: SendRequestOptions): Promise<SendRequestResult> {
    const outcome = await this.performRequest(options)

    if (!outcome.requestFromProxy) {
      throw new NoProxyRequestReceivedError(outcome.requestSentToProxy, outcome.responseFromProxy)
    }

    return { ...outcome, requestFromProxy: outcome.requestFromProxy }
  }

  /**
   * Like {@link sendRequest}, but a response that never reached the mock server is not an error.
   * Used to observe the edge cache: `requestFromProxy` is `null` when the request was a cache hit.
   */
  async sendCacheableRequest(options: SendRequestOptions): Promise<SendCacheableRequestResult> {
    return await this.performRequest({ ...options, cacheable: true })
  }

  private async performRequest({
    method,
    path,
    query,
    requestConfig,
    listenerType,
    mockResponse,
    cacheable,
  }: SendRequestOptions): Promise<SendRequestOutcome> {
    const url = new URL(this.integrationUrl)
    const basePath = url.pathname.replace(/\/+$/, '')
    const requestPath = (path ?? '/').replace(/^\/+/, '')

    url.pathname = requestPath ? `${basePath}/${requestPath}` : basePath || '/'

    if (query) {
      url.search = query.toString()
    }

    const key = createProxyRequestHandlerKey(this.testSession.host, this.testName)

    // This request will be set before the response from the proxy is received IF
    // the proxy integration correctly forwards the request.
    let requestFromProxy: Request | null = null
    if (listenerType) {
      addProxyRequestListener(listenerType, key, (request) => {
        const proxyRequest = createRequestFromProxy(request)
        this.requestsFromProxy[listenerType].push(proxyRequest)

        this.logger.info(`Received request from ${listenerType} at ${key}`, proxyRequest)

        requestFromProxy = request
      })

      this.logger.info(`Prepared listener for ${listenerType} at ${key}`)
    }

    const requestId = generateRequestId()

    if (mockResponse) {
      this.requestIdList.push(requestId)
      setMockResponse(requestId, mockResponse)
    }

    if (listenerType) {
      this.logger.info(`Sending request to ${listenerType.toString()} at ${url.toString()}`)
    } else {
      this.logger.info(`Sending request to ${url.toString()}`)
    }

    let responseFromProxy: ResponseFromProxy
    let timeoutMessage: string | undefined

    const requestToSend = {
      ...requestConfig,
      method,
      headers: {
        ...requestConfig?.headers,
        ...(listenerType ? this.createTestHeaders(listenerType, requestId, cacheable) : {}),
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
        this.logger.info(`${listenerType} responded with ${response.status} at ${url.toString()}`, {
          body: responseFromProxy.body,
          headers: responseFromProxy.headers,
        })
      } else {
        this.logger.info(`Responded with ${response.status} at ${url.toString()}`, {
          body: responseFromProxy.body,
          headers: responseFromProxy.headers,
        })
      }
    } catch (error: any) {
      if (isTimeoutError(error)) {
        timeoutMessage = error.message
      }

      if (listenerType) {
        this.logger.error(`Failed to send request to ${listenerType} at ${url.toString()}`, error.message)
      } else {
        this.logger.error(`Failed to send request to ${url.toString()}`, error.message)
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
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            headers[name] = value.map((v) => v.toString())
          } else {
            headers[name] = value.toString()
          }
        }
      }
    }

    const requestSentToProxy = {
      method: requestToSend.method,
      url: url.toString(),
      headers,
      body: requestToSend.data,
    }

    if (listenerType) {
      removeProxyRequestListener(listenerType, key)
    }

    if (timeoutMessage) {
      throw new ProxyRequestTimeoutError(requestSentToProxy, timeoutMessage)
    }

    return { requestFromProxy, responseFromProxy, requestSentToProxy }
  }

  async sendRequestToCdn({ query, request, mockResponse }: RequestToCdnParams): Promise<SendRequestResult> {
    return await this.sendRequest({
      method: 'GET',
      path: this.cdnPath,
      query,
      requestConfig: request,
      listenerType: ProxyRequestType.Cdn,
      mockResponse,
    })
  }

  async sendCacheableRequestToCdn({
    query,
    request,
    mockResponse,
  }: RequestToCdnParams): Promise<SendCacheableRequestResult> {
    return await this.sendCacheableRequest({
      method: 'GET',
      path: this.cdnPath,
      query,
      requestConfig: request,
      listenerType: ProxyRequestType.Cdn,
      mockResponse,
    })
  }

  async sendCacheableRequestToV4Cdn({
    query,
    request,
    mockResponse,
    apiKey = getApiKey(),
    pathOverride,
  }: RequestToCdnParams = {}): Promise<SendCacheableRequestResult> {
    return await this.sendCacheableRequest({
      method: 'GET',
      path: pathOverride || `/web/v4/${apiKey}`,
      query,
      requestConfig: request,
      listenerType: ProxyRequestType.Cdn,
      mockResponse,
    })
  }

  async sendRequestToCacheEndpoint({
    pathname,
    request,
    query,
    mockResponse,
  }: RequestToCacheEndpointParams): Promise<SendRequestResult> {
    return await this.sendRequest({
      method: 'GET',
      path: this.ingressPath + (pathname ? pathname : ''),
      query,
      requestConfig: request,
      listenerType: ProxyRequestType.Cache,
      mockResponse,
    })
  }

  async sendRequestToIngress({
    request,
    query,
    mockResponse,
  }: RequestToIngressParams = {}): Promise<SendRequestResult> {
    return await this.sendRequest({
      method: 'POST',
      path: this.ingressPath,
      query,
      requestConfig: request,
      listenerType: ProxyRequestType.Ingress,
      mockResponse,
    })
  }

  async sendRequestToV4Cdn({
    query,
    request,
    mockResponse,
    apiKey = getApiKey(),
    pathOverride,
  }: RequestToCdnParams = {}): Promise<SendRequestResult> {
    return await this.sendRequest({
      method: 'GET',
      path: pathOverride || `/web/v4/${apiKey}`,
      query,
      requestConfig: request,
      listenerType: ProxyRequestType.Cdn,
      mockResponse,
    })
  }

  async sendRequestToV4CacheEndpoint({
    pathname,
    request,
    query,
    mockResponse,
  }: RequestToCacheEndpointParams = {}): Promise<SendRequestResult> {
    return await this.sendRequest({
      method: 'GET',
      path: pathname ?? `/browser-cache/${getRandomString()}`,
      query,
      requestConfig: request,
      listenerType: ProxyRequestType.Cache,
      mockResponse,
    })
  }

  async sendRequestToV4Ingress({
    request,
    query,
    mockResponse,
  }: RequestToIngressParams = {}): Promise<SendRequestResult> {
    return await this.sendRequest({
      method: 'POST',
      path: '/',
      query,
      requestConfig: request,
      listenerType: ProxyRequestType.Ingress,
      mockResponse,
    })
  }

  async sendArbitraryRequestToV4Ingress({
    method,
    path = '/',
    request,
    query,
    mockResponse,
  }: ArbitraryV4RequestParams): Promise<SendRequestResult> {
    return await this.sendRequest({
      method,
      path,
      query,
      requestConfig: request,
      listenerType: ProxyRequestType.Ingress,
      mockResponse,
    })
  }

  private createTestHeaders(requestType: ProxyRequestType, requestId?: string, cacheable?: boolean) {
    return {
      [TEST_CASE_HOST_HEADER]: this.testSession.host,
      [TEST_CASE_PROXY_TYPE_HEADER]: requestType || '',
      [TEST_CASE_NAME_HEADER]: this.testName,
      ...(cacheable ? {} : { 'cache-control': 'no-cache, no-store' }),
      [TEST_CASE_REQUEST_ID]: requestId,
    }
  }
}
