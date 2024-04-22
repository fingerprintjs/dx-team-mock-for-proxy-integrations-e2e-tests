import { Request } from 'express'

export enum ProxyRequestType {
  Ingress = 'Ingress',
  Cdn = 'Cdn',
  Cache = 'Cache',
}

export type RequestListener = (request: Request) => void

const ingressListeners = new Map<Key, RequestListener>()
const cdnListeners = new Map<Key, RequestListener>()

type Key = string & {
  __keyBrand: never
}

export function createProxyRequestHandlerKey(hostname: string, testName: string) {
  return `${hostname}-${testName}` as Key
}

function getStoreByType(type: ProxyRequestType) {
  return type === ProxyRequestType.Ingress ? ingressListeners : cdnListeners
}

export function addProxyRequestListener(type: ProxyRequestType, key: Key, listener: RequestListener) {
  getStoreByType(type).set(key, listener)
}

export function removeProxyRequestListener(type: ProxyRequestType, key: Key) {
  getStoreByType(type).delete(key)
}

export function hasProxyRequestListener(type: ProxyRequestType, key: Key) {
  return getStoreByType(type).has(key)
}

export function notifyProxyRequestListener(type: ProxyRequestType, key: Key, request: Request) {
  const listener = getStoreByType(type).get(key)

  if (listener) {
    console.info('Notifying proxy request listener', { type, key })

    listener(request)
  } else {
    console.warn('No listener found for proxy request', { type, key })
  }

  removeProxyRequestListener(type, key)
}
