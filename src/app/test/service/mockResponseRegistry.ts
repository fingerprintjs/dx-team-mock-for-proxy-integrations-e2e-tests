export type ResponseRegistryKey = string

export type MockResponse = {
  status?: number
  headers?: Record<string, string>
  body?: any
}

export type MockResponseFunction = () => MockResponse

const registry = new Map<ResponseRegistryKey, MockResponseFunction>()

export function setMockResponse(testName: string, response: MockResponseFunction) {
  registry.set(testName, response)
}

export function getMockResponse(testName: string): MockResponseFunction | undefined {
  return registry.get(testName)
}

export function clearMockResponsesForTest(testName: string) {
  registry.delete(testName)
}
