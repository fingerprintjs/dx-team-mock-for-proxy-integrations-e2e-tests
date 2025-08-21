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

import type { Method } from 'axios'

interface SendRequestOptions {
  method: Method
  path?: string
  query?: URLSearchParams
  requestConfig?: Partial<AxiosRequestConfig>
  listenerType?: ProxyRequestType
}

export class TestCaseApi {
  readonly requestsFromProxy: RequestsFromProxyRecord = {
    [ProxyRequestType.Cdn]: [],
    [ProxyRequestType.Ingress]: [],
    [ProxyRequestType.Cache]: [],
  }
  public readonly httpClientInstance: AxiosInstance

  constructor(
    private readonly testName: string,
    private readonly integrationUrl: URL,
    private readonly ingressPath: string,
    private readonly cdnPath: string,
    public readonly testSession: TestSession
  ) {
    this.httpClientInstance = createNewHttpClient()
  }

  async sendRequest({
    method,
    path,
    query,
    requestConfig,
    listenerType,
  }: SendRequestOptions): Promise<SendRequestResult> {
    const url = new URL(path ?? '', this.integrationUrl)

    if (query) {
      url.search = query.toString()
    }

    const key = createProxyRequestHandlerKey(this.testSession.host, this.testName)

    let requestFromProxyPromise: Promise<Request | undefined>
    if (listenerType) {
      requestFromProxyPromise = new Promise<Request>((resolveRequest) => {
        addProxyRequestListener(listenerType, key, (request) => {
          this.requestsFromProxy[listenerType].push(createRequestFromProxy(request))

          resolveRequest(request)
        })
      })
    } else {
      requestFromProxyPromise = Promise.resolve(undefined)
    }

    if (listenerType) {
      console.info(`Sending request to ${listenerType.toString()} at ${url.toString()}`)
    } else {
      console.info(`Sending request to ${url.toString()}`)
    }

    let responseFromProxy: SendRequestResult['responseFromProxy']

    try {
      const response = await sendAxiosRequestWithRequestConfig(
        url,
        {
          ...requestConfig,
          method,
          headers: {
            ...requestConfig?.headers,
            ...this.createTestHeaders(listenerType),
          },
        },
        this.httpClientInstance
      )

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

    const requestFromProxy = await requestFromProxyPromise
    return { requestFromProxy, responseFromProxy }
  }

  async sendRequestToCdn(
    query?: URLSearchParams,
    axiosRequestConfig?: Partial<AxiosRequestConfig>
  ): Promise<SendRequestResult> {
    return this.sendRequest({
      method: 'GET',
      path: this.cdnPath,
      query,
      requestConfig: axiosRequestConfig,
      listenerType: ProxyRequestType.Cdn,
    })
  }

  async sendRequestToCacheEndpoint(
    request: Partial<AxiosRequestConfig>,
    query?: URLSearchParams,
    pathname?: string
  ): Promise<SendRequestResult> {
    return this.sendRequest({
      method: 'GET',
      path: this.ingressPath + (pathname ? pathname : ''),
      query,
      requestConfig: request,
      listenerType: ProxyRequestType.Cache,
    })
  }

  async sendRequestToIngress(
    request: Partial<AxiosRequestConfig>,
    query?: URLSearchParams
  ): Promise<SendRequestResult> {
    return this.sendRequest({
      method: 'POST',
      path: this.ingressPath,
      query,
      requestConfig: request,
      listenerType: ProxyRequestType.Ingress,
    })
  }

  private createTestHeaders(requestType?: ProxyRequestType) {
    return {
      [TEST_CASE_HOST_HEADER]: this.testSession.host,
      [TEST_CASE_PROXY_TYPE_HEADER]: requestType || '',
      [TEST_CASE_NAME_HEADER]: this.testName,
      'cache-control': 'no-cache',
    }
  }
}
