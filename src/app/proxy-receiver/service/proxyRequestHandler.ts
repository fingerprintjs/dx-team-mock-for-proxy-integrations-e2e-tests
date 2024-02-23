import { Request } from 'express'

export enum ProxyRequestType {
  Ingress = 'Ingress',
  Cdn = 'Cdn',
}

export type RequestListener = (request: Request) => void

const ingressListeners = new Map<string, RequestListener>()
const cdnListeners = new Map<string, RequestListener>()

function getStoreByType(type: ProxyRequestType) {
  return type === ProxyRequestType.Ingress ? ingressListeners : cdnListeners
}

export function addProxyRequestListener(type: ProxyRequestType, hostname: string, listener: RequestListener) {
  getStoreByType(type).set(hostname, listener)
}

export function removeProxyRequestListener(type: ProxyRequestType, hostname: string) {
  getStoreByType(type).delete(hostname)
}

export function hasProxyRequestListener(type: ProxyRequestType, hostname: string) {
  return getStoreByType(type).has(hostname)
}

export function notifyProxyRequestListener(type: ProxyRequestType, hostname: string, request: Request) {
  const listener = getStoreByType(type).get(hostname)

  if (listener) {
    console.info('Notifying proxy request listener', { type, hostname })

    listener(request)
  } else {
    console.warn('No listener found for proxy request', { type, hostname })
  }

  removeProxyRequestListener(type, hostname)
}
