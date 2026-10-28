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
import { bindLogContext, logger, Logger } from '../../../logger'

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

export type SendCacheableRequestResult = Omit<SendRequestResult, 'requestFromProxy'> & {
  /** `null` when the proxy answered without calling the mock server, e.g. on a cache hit. */
  requestFromProxy: Request | null
}

const CACHEABLE_REQUEST_TIMEOUT_MS = 30_000

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

  public readonly logger: Logger

  constructor(
    private readonly testName: string,
    private readonly integrationUrl: URL,
    private readonly ingressPath: string,
    public readonly cdnPath: string,
    public readonly testSession: TestSession
  ) {
    this.httpClientInstance = createNewHttpClient()
    // Test context fields come from the log context
    this.logger = logger
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
  }: SendRequestOptions): Promise<SendCacheableRequestResult> {
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
      // The proxy calls this from its own request, so keep the test's log context
      addProxyRequestListener(
        listenerType,
        key,
        bindLogContext((request: Request) => {
          const proxyRequest = createRequestFromProxy(request)
          this.requestsFromProxy[listenerType].push(proxyRequest)

          this.logger.info(
            {
              listener: listenerType,
              method: proxyRequest.method,
              url: proxyRequest.url,
            },
            'Received request from proxy'
          )
          this.logger.debug({ listener: listenerType, headers: proxyRequest.headers }, 'Request from proxy details')

          requestFromProxy = request
        })
      )

      this.logger.debug({ listener: listenerType, key }, 'Prepared proxy listener')
    }

    const requestId = generateRequestId()

    if (mockResponse) {
      this.requestIdList.push(requestId)
      setMockResponse(requestId, mockResponse)
    }

    this.logger.info({ listener: listenerType, method, url: url.toString() }, 'Sending request')

    let responseFromProxy: ResponseFromProxy
    let timeoutMessage: string | undefined

    const requestToSend = {
      ...(cacheable ? { timeout: CACHEABLE_REQUEST_TIMEOUT_MS } : {}),
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

      this.logger.info(
        {
          listener: listenerType,
          http: { status_code: response.status },
          url: url.toString(),
        },
        'Received response'
      )
      this.logger.debug(
        {
          listener: listenerType,
          headers: responseFromProxy.headers,
          body: responseFromProxy.body,
        },
        'Response details'
      )
    } catch (error: any) {
      if (isTimeoutError(error)) {
        timeoutMessage = error.message
      }

      this.logger.error({ listener: listenerType, url: url.toString(), error }, 'Failed to send request')

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
