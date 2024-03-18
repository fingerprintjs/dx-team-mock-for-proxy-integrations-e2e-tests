import { addProxyRequestListener, ProxyRequestType } from '../../proxy-receiver/service/proxyRequestHandler'
import { TEST_CASE_HOST_HEADER, TEST_CASE_PROXY_TYPE_HEADER } from './const'
import { createRequestFromProxy, RequestsFromProxyRecord } from './requestFromProxy'
import { TestSession } from './session'
import { SendRequestResult } from './testCases'

export class TestCaseApi {
  readonly requestsFromProxy: RequestsFromProxyRecord = {
    [ProxyRequestType.Cdn]: [],
    [ProxyRequestType.Ingress]: [],
    [ProxyRequestType.Cache]: [],
  }

  constructor(
    private readonly ingressProxyUrl: URL,
    private readonly cdnProxyUrl: URL,
    public readonly testSession: TestSession
  ) {}

  async sendRequestToCdn(query?: URLSearchParams, requestInit?: Partial<RequestInit>): Promise<SendRequestResult> {
    return new Promise(async (resolve) => {
      const url = new URL(this.cdnProxyUrl)

      if (query) {
        url.search = query.toString()
      }

      addProxyRequestListener(ProxyRequestType.Cdn, this.testSession.host, (request) => {
        this.requestsFromProxy[ProxyRequestType.Cdn].push(createRequestFromProxy(request))

        resolve({
          requestFromProxy: request,
        })
      })

      console.info(`Sending request to CDN at ${url.toString()}`)

      fetch(url.toString(), {
        ...requestInit,
        headers: {
          ...requestInit?.headers,
          [TEST_CASE_HOST_HEADER]: this.testSession.host,
          [TEST_CASE_PROXY_TYPE_HEADER]: ProxyRequestType.Cdn,
        },
      })
        .then((response) => {
          console.info(`CDN responded with ${response.status} at ${url.toString()}`)
        })
        .catch((error) => {
          console.error(`Failed to send request to CDN at ${url.toString()}`, error)
        })
    })
  }

  async sendRequestToCacheEndpoint(request: Partial<RequestInit>, query?: URLSearchParams): Promise<SendRequestResult> {
    return new Promise(async (resolve) => {
      const url = new URL(this.ingressProxyUrl)

      if (query) {
        url.search = query.toString()
      }

      addProxyRequestListener(ProxyRequestType.Cache, this.testSession.host, (request) => {
        this.requestsFromProxy[ProxyRequestType.Cache].push(createRequestFromProxy(request))

        resolve({
          requestFromProxy: request,
        })
      })

      console.info(`Sending request to cache endpoint at ${url.toString()}`)

      fetch(url.toString(), {
        credentials: 'include',
        method: 'GET',
        ...request,
        headers: {
          ...request.headers,
          [TEST_CASE_HOST_HEADER]: this.testSession.host,
          [TEST_CASE_PROXY_TYPE_HEADER]: ProxyRequestType.Cache,
        },
      })
        .then((response) => {
          console.info(`Cache endpoint responded with ${response.status} at ${url.toString()}`)
        })
        .catch((error) => {
          console.error(`Failed to send request to Cache endpoint at ${url.toString()}`, error)
        })
    })
  }

  async sendRequestToIngress(request: Partial<RequestInit>, query?: URLSearchParams): Promise<SendRequestResult> {
    return new Promise(async (resolve) => {
      const url = new URL(this.ingressProxyUrl)

      if (query) {
        url.search = query.toString()
      }

      addProxyRequestListener(ProxyRequestType.Ingress, this.testSession.host, (request) => {
        this.requestsFromProxy[ProxyRequestType.Ingress].push(createRequestFromProxy(request))

        resolve({
          requestFromProxy: request,
        })
      })

      console.info(`Sending request to ingress at ${url.toString()}`)

      fetch(url.toString(), {
        credentials: 'include',
        method: 'POST',
        ...request,
        headers: {
          ...request.headers,
          [TEST_CASE_HOST_HEADER]: this.testSession.host,
          [TEST_CASE_PROXY_TYPE_HEADER]: ProxyRequestType.Ingress,
        },
      })
        .then((response) => {
          console.info(`Ingress responded with ${response.status} at ${url.toString()}`)
        })
        .catch((error) => {
          console.error(`Failed to send request to Ingress at ${url.toString()}`, error)
        })
    })
  }
}
