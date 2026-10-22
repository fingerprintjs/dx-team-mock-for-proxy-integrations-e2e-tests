export type TestEndpoint = 'agent' | 'ingress' | 'browser cache' | 'other'
export type TestApiVersion = 'v3' | 'v4'

export type TestCaseLabels = {
  endpoint: TestEndpoint
  apiVersion: TestApiVersion
}

const ENDPOINT_PREFIXES: Record<Exclude<TestEndpoint, 'other'>, string> = {
  agent: 'agent',
  ingress: 'ingress',
  'browser cache': 'browser cache',
}

/** Read from the test name: a `v4 ` prefix marks v4 tests (anything else is v3), the endpoint follows. */
export function getTestCaseLabels(testName: string): TestCaseLabels {
  const isV4 = testName.startsWith('v4 ')
  const rest = isV4 ? testName.slice('v4 '.length) : testName
  const endpoint = (Object.keys(ENDPOINT_PREFIXES) as (keyof typeof ENDPOINT_PREFIXES)[]).find(
    (key) => rest === ENDPOINT_PREFIXES[key] || rest.startsWith(`${ENDPOINT_PREFIXES[key]} `)
  )

  return { endpoint: endpoint ?? 'other', apiVersion: isV4 ? 'v4' : 'v3' }
}
