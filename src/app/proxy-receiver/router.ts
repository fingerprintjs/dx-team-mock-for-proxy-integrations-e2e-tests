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

export function proxyReceiverRouter() {
  const router = express.Router()

  router.all('*', (req, res, next) => {
    const testType = proxyRequestTypeSchema.safeParse(req.get(TEST_CASE_PROXY_TYPE_HEADER))

    if (testType.success) {
      const host = req.get(TEST_CASE_HOST_HEADER)
      const testName = req.get(TEST_CASE_NAME_HEADER)
      const requestId = req.get(TEST_CASE_REQUEST_ID)
      const key = createProxyRequestHandlerKey(host, testName)

      notifyProxyRequestListener(testType.data, key, req)

      if (requestId) {
        const disableCache = () => {
          res.setHeader('cache-control', 'no-cache, no-store')
        }

        const mockResponse = getMockResponse(requestId)
        if (mockResponse) {
          let hasCacheControl = false
          for (const [header, value] of Object.entries(mockResponse.headers || {})) {
            res.setHeader(header, value)
            if (header.toLowerCase() === 'cache-control') {
              hasCacheControl = true
            }
          }

          if (!hasCacheControl) {
            disableCache()
          }
          res.status(mockResponse.status ?? 200).send(mockResponse.body)
        } else {
          disableCache()
        }

        return res.send()
      }

      return next()
    }

    return next()
  })

  return router
}
