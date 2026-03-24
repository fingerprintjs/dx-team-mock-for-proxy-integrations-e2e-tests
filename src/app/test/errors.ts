import { RequestSentToProxy, ResponseFromProxy } from './types/testCase'

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export class NoMatchingTestsError extends HttpError {
  constructor(message = 'No tests matched the provided include/exclude filters.') {
    super(422, 'NO_MATCHING_TESTS', message)
    this.name = 'NoMatchingTestsError'
  }
}

export class TestSessionAlreadyExistsError extends HttpError {
  constructor(message = 'Test session already exists.') {
    super(409, 'TEST_SESSION_ALREADY_EXISTS', message)
    this.name = 'TestSessionAlreadyExistsError'
  }
}

export class NoProxyRequestReceivedError extends Error {
  constructor(
    public readonly requestSentToProxy: RequestSentToProxy,
    public readonly responseFromProxy: ResponseFromProxy
  ) {
    super('No request received from proxy.')
    this.name = 'NoProxyRequestReceivedError'
  }
}
