type ResponseRegistryKey = string

type MockResponse = {
  status: number
  headers?: Record<string, string>
  body?: any
}

const registry = new Map<ResponseRegistryKey, MockResponse>()

export function setMockResponse(testName: string, response: MockResponse) {
  registry.set(testName, response)
}

export function getMockResponse(testName: string): MockResponse | undefined {
  return registry.get(testName)
}

export function clearMockResponsesForTest(testName: string) {
  registry.delete(testName)
}
