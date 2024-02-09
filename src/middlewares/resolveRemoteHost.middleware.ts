import { NextFunction, Request, Response } from 'express';
import { ProxyRequestType, hasProxyRequestListener } from '../app/proxy-receiver/service/proxyRequestHandler';

type RemoteHostResolver = (req: Request, res: Response) => Promise<string | undefined>;

export const resolveRemoteHostMiddleware =
  (type: ProxyRequestType) => async (req: Request, res: Response, next: NextFunction) => {
    for (const resolver of resolvers) {
      const host = await resolver(req, res);

      if (host && hasProxyRequestListener(type, host)) {
        req.headers['host'] = host;

        return next();
      }
    }

    next(new Error('Could not resolve remote host'));
  };

const resolvers: RemoteHostResolver[] = [
  // Azure might use this header to pass the original host
  async (req) => req.get('disguised-host'),
];
