import * as express from 'express';
import { ProxyRequestType, notifyProxyRequestListeners } from './service/proxyRequestHandler';
import { resolveRemoteHostMiddleware } from '../../middlewares/resolveRemoteHost.middleware';

export function proxyReceiverRouter() {
  const router = express.Router();

  router.get('/:version/:apiKey/:loader', resolveRemoteHostMiddleware(ProxyRequestType.Cdn), async (req, res) => {
    notifyProxyRequestListeners(ProxyRequestType.Cdn, req.get('host'), req);

    res.send();
  });

  return router;
}
