import { Request as ExpressRequest, Response as ExpressResponse } from 'express';

export type SendRequestResult = {
  requestFromProxy: ExpressRequest;
  // TODO: Not sure if this will be needed
  sendResponse: (response: ExpressResponse) => void;
};

export type TestCaseApi = {
  sendRequestToCdn: (query?: URLSearchParams, headers?: Headers) => Promise<SendRequestResult>;
  sendRequestToIngress: (request: Request) => Promise<SendRequestResult>;
  assert: <T>(expected: T, actual: T) => void;
};

export type FailedTestResult = {
  passed: false;
  reason: string;
};

export type PassedTestResult = {
  passed: true;
};

export type TestResult = FailedTestResult | PassedTestResult;

export type TestCase = {
  name: string;
  test: (api: TestCaseApi) => Promise<void>;
};

export const testCases: TestCase[] = [
  {
    name: 'agent request query params',
    test: async (api) => {
      const query = new URLSearchParams();
      query.set('apiKey', 'test');
      query.set('version', '3');
      query.set('loaderVersion', '1');

      const { requestFromProxy } = await api.sendRequestToCdn(query);

      api.assert(requestFromProxy.query['apiKey'], query.get('apiKey'));
      api.assert(requestFromProxy.query['version'], query.get('version'));
      api.assert(requestFromProxy.query['loaderVersion'], query.get('loaderVersion'));
    },
  },
];
