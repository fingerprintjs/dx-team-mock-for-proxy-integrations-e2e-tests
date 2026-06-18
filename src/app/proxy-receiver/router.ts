import * as express from 'express'
import {
  ProxyRequestType,
  notifyProxyRequestListener,
  createProxyRequestHandlerKey,
} from './service/proxyRequestHandler'

import {
  TEST_CASE_HOST_HEADER,
  TEST_CASE_NAME_HEADER,
  TEST_CASE_PROXY_TYPE_HEADER,
  TEST_CASE_REQUEST_ID,
} from '../test/service/const'
import { z } from 'zod'
import { getMockResponse } from '../test/service/mockResponseRegistry'

const proxyRequestTypeSchema = z.nativeEnum(ProxyRequestType)

function handleProxyRequest(req: express.Request, res: express.Response, next: express.NextFunction) {
  const testType = proxyRequestTypeSchema.safeParse(req.get(TEST_CASE_PROXY_TYPE_HEADER))

  if (!testType.success) {
    return next()
  }

  const host = req.get(TEST_CASE_HOST_HEADER)
  const testName = req.get(TEST_CASE_NAME_HEADER)
  const requestId = req.get(TEST_CASE_REQUEST_ID)
  const key = createProxyRequestHandlerKey(host, testName)

  if (!requestId) {
    return next()
  }

  notifyProxyRequestListener(testType.data, key, req)

  const mockResponse = getMockResponse(requestId)
  let hasCacheControl = false

  if (mockResponse) {
    for (const [header, value] of Object.entries(mockResponse.headers || {})) {
      res.setHeader(header, value)
      if (header.toLowerCase() === 'cache-control') {
        hasCacheControl = true
      }
    }
  }

  if (!hasCacheControl) {
    res.setHeader('cache-control', 'no-cache, no-store')
  }

  res.status(mockResponse?.status ?? 200)

  if (mockResponse?.body !== undefined) {
    return res.send(mockResponse.body)
  }

  return res.send()
}

export function proxyReceiverRouter() {
  const router = express.Router()

  router.all('*', handleProxyRequest)

  return router
}
