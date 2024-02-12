import { ProxyRequestType, addProxyRequestListener } from '../../proxy-receiver/service/proxyRequestHandler';
import { SendRequestResult } from './testCases';
import { TEST_CASE_HOST_HEADER } from './const';
import { assert } from './assert';

export class TestCaseApi {
  constructor(
    private readonly ingressProxyUrl: URL,
    private readonly cdnProxyUrl: URL,
  ) {}

  public assert = assert;

  async sendRequestToCdn(query?: URLSearchParams, headers?: Headers): Promise<SendRequestResult> {
    return new Promise((resolve) => {
      const url = new URL(this.cdnProxyUrl);

      if (query) {
        url.search = query.toString();
      }

      addProxyRequestListener(ProxyRequestType.Cdn, this.cdnProxyUrl.host, (request) => {
        resolve({
          requestFromProxy: request,
          sendResponse: this.makeSendResponse(),
        });
      });

      console.info(`Sending request to CDN at ${url.toString()}`);

      fetch(url.toString(), {
        headers: {
          ...headers,
          [TEST_CASE_HOST_HEADER]: this.cdnProxyUrl.host,
        },
      })
        .then((response) => {
          console.info(`CDN responded with ${response.status} at ${url.toString()}`);
        })
        .catch((error) => {
          console.error(`Failed to send request to CDN at ${url.toString()}`, error);
        });
    });
  }

  async sendRequestToIngress(request: Request): Promise<SendRequestResult> {
    return {
      sendResponse: () => {
        throw new Error('Not implemented');
      },
      requestFromProxy: {} as any,
    };
  }

  private makeSendResponse() {
    return () => {
      throw new Error('Not implemented');
    };
  }
}
