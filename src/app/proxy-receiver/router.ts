import * as express from 'express'
import { ProxyRequestType, notifyProxyRequestListener } from './service/proxyRequestHandler'

import { TEST_CASE_HOST_HEADER, TEST_CASE_PROXY_TYPE_HEADER } from '../test/service/const'
import { z } from 'zod'

const proxyRequestTypeSchema = z.nativeEnum(ProxyRequestType)

export function proxyReceiverRouter() {
  const router = express.Router()

  router.all('*', (req, res, next) => {
    const testType = proxyRequestTypeSchema.safeParse(req.get(TEST_CASE_PROXY_TYPE_HEADER))

    if (testType.success) {
      notifyProxyRequestListener(testType.data, req.get(TEST_CASE_HOST_HEADER), req)

      res.send()

      return
    }

    next()
  })

  return router
}
