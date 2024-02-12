import * as express from 'express';
import { ProxyRequestType, notifyProxyRequestListeners } from './service/proxyRequestHandler';

import { TEST_CASE_HOST_HEADER } from '../test/service/const';

export function proxyReceiverRouter() {
  const router = express.Router();

  router.get('/:version/:apiKey/:loader', async (req, res) => {
    notifyProxyRequestListeners(ProxyRequestType.Cdn, req.get(TEST_CASE_HOST_HEADER), req);

    res.send();
  });

  return router;
}
