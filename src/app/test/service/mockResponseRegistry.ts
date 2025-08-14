export type ResponseRegistryKey = string

export type MockResponse = {
  status?: number
  headers?: Record<string, string>
  body?: any
}

const registry = new Map<ResponseRegistryKey, MockResponse>()

export function setMockResponse(requestId: string, response: MockResponse) {
  registry.set(requestId, response)
}

export function getMockResponse(requestId: string): MockResponse | undefined {
  return registry.get(requestId)
}

export function clearMockResponsesForTest(requestId: string) {
  registry.delete(requestId)
}
