import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { TestCaseApi } from './TestCaseApi';

export type SendRequestResult = {
  requestFromProxy: ExpressRequest;
  // TODO: Not sure if this will be needed
  sendResponse: (response: ExpressResponse) => void;
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
      query.set('loaderVersion', '3.6.5');

      const { requestFromProxy } = await api.sendRequestToCdn(query);

      const params = requestFromProxy.params as Record<string, string | undefined>;

      api.assert(params.apiKey, query.get('apiKey'));
      api.assert(params.version, 'v3');
      api.assert(params.loader, 'loader_v3.6.5.js');
    },
  },
];
