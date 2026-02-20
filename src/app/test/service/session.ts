import { RunTestsRequest } from '../request.types'
import { DetailedTestResult } from './testRunner'
import { TestSessionAlreadyExistsError } from '../errors'

export enum TestSessionStatus {
  Created = 'created',
  Running = 'running',
  Finished = 'finished',
}

export interface TestResponse {
  status: TestSessionStatus
  host: string
  results: DetailedTestResult[]
}

export class TestSession implements RunTestsRequest {
  constructor(
    public host: string,
    public integrationUrl: string,
    public ingressPath: string,
    public cdnPath: string,
    public trafficName: string,
    public integrationVersion: string,
    public status: TestSessionStatus,
    public results: DetailedTestResult[] = []
  ) {}

  start() {
    this.status = TestSessionStatus.Running
  }

  finish() {
    this.status = TestSessionStatus.Finished
  }

  addResult(result: DetailedTestResult) {
    this.results.push(result)
  }

  toTestResponse(): TestResponse {
    return {
      host: this.host,
      status: this.status,
      results: this.results,
    }
  }
}

const testSessions = new Map<string, TestSession>()

function getHost(request: RunTestsRequest) {
  const integrationUrl = new URL(request.integrationUrl)

  console.log(`Found integration hostname: ${integrationUrl.hostname}`)

  return integrationUrl.hostname
}

export function createTestSession(request: RunTestsRequest) {
  const host = getHost(request)

  if (testSessions.has(host)) {
    throw new TestSessionAlreadyExistsError()
  }

  const session = new TestSession(
    host,
    request.integrationUrl,
    request.ingressPath ?? '',
    request.cdnPath ?? '',
    request.trafficName,
    request.integrationVersion,
    TestSessionStatus.Created
  )

  testSessions.set(host, session)

  return session
}

export function getTestSession(host: string) {
  const testSession = testSessions.get(host)

  if (!testSession) {
    throw new Error('Test session not found')
  }

  return testSession
}

export function cleanupTestSession(host: string) {
  testSessions.delete(host)
}

export function finalizeTestSession(testSession: TestSession) {
  testSession.finish()

  testSessions.delete(testSession.host)

  return testSession
}
