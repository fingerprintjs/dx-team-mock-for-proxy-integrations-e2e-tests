import * as express from 'express'
import {
  ProxyRequestType,
  notifyProxyRequestListener,
  createProxyRequestHandlerKey,
} from './service/proxyRequestHandler'

import { TEST_CASE_HOST_HEADER, TEST_CASE_NAME_HEADER, TEST_CASE_PROXY_TYPE_HEADER } from '../test/service/const'
import { z } from 'zod'

const proxyRequestTypeSchema = z.nativeEnum(ProxyRequestType)

export function proxyReceiverRouter() {
  const router = express.Router()

  router.all('*', (req, res, next) => {
    const testType = proxyRequestTypeSchema.safeParse(req.get(TEST_CASE_PROXY_TYPE_HEADER))

    console.info('Received potential proxy request', {
      headers: req.headers,
      url: req.url,
      path: req.path,
      isProxyRequest: testType.success,
    })

    if (testType.success) {
      const host = req.get(TEST_CASE_HOST_HEADER)
      const testName = req.get(TEST_CASE_NAME_HEADER)
      const key = createProxyRequestHandlerKey(host, testName)

      notifyProxyRequestListener(testType.data, key, req)

      res.setHeader('cache-control', 'no-cache')
      res.send()

      return
    }

    next()
  })

  return router
}
