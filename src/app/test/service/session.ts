import { RunTestsRequest } from '../request.types'
import { TestResult } from './testCases'

export enum TestSessionStatus {
  Created = 'created',
  Running = 'running',
  Finished = 'finished',
}

export class TestSession implements RunTestsRequest {
  constructor(
    public host: string,
    public ingressProxyPath: string,
    public cdnProxyPath: string,
    public status: TestSessionStatus,
    public results: TestResult[]
  ) {}

  start() {
    this.status = TestSessionStatus.Running
  }

  finish() {
    this.status = TestSessionStatus.Finished
  }

  addResult(result: TestResult) {
    this.results.push(result)
  }

  toJSON() {
    return {
      host: this.host,
      status: this.status,
      results: this.results,
    }
  }
}

const testSessions = new Map<string, TestSession>()

export function createTestSession(request: RunTestsRequest) {
  if (testSessions.has(request.host)) {
    throw new Error('Test session already exists')
  }

  const session = new TestSession(
    request.host,
    request.ingressProxyPath,
    request.cdnProxyPath,
    TestSessionStatus.Created,
    []
  )

  testSessions.set(request.host, session)

  return session
}

export function getTestSession(host: string) {
  const testSession = testSessions.get(host)

  if (!testSession) {
    throw new Error('Test session not found')
  }

  return testSession
}

export function finalizeTestSession(testSession: TestSession) {
  testSession.finish()

  testSessions.delete(testSession.host)

  return testSession
}
