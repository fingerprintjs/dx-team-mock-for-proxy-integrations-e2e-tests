import { ProxyRequestType } from '../../proxy-receiver/service/proxyRequestHandler'
import { Request as ExpressRequest } from 'express'

export type RequestFromProxy = {
  url: string
  headers: Record<string, string>
  method: string
  statusCode?: number
}
export type RequestsFromProxyRecord = Record<ProxyRequestType, RequestFromProxy[]>

export function createRequestFromProxy(request: ExpressRequest): RequestFromProxy {
  return {
    url: request.url,
    headers: request.headers as Record<string, string>,
    method: request.method,
    statusCode: request.statusCode,
  }
}
