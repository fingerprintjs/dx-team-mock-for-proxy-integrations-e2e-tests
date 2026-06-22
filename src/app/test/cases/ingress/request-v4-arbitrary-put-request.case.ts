import { assert, assertToBeFalsy, assertToBeTruthy } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'v4 ingress arbitrary PUT request',
  test: async (api) => {
    const body = { hello: 'world', nested: { value: 123 } }

    const { requestFromProxy } = await api.sendArbitraryRequestToV4Ingress({
      method: 'PUT',
      path: '/some_path',
      request: {
        headers: {
          'content-type': 'application/json',
          'x-custom-header': '123',
        },
        data: body,
      },
    })

    // Method and path should reach us as is.
    assert(requestFromProxy.method, 'PUT', 'method')
    assertToBeTruthy('path', requestFromProxy.path === '/some_path')

    // Custom header and body should be preserved.
    assert(requestFromProxy.get('x-custom-header'), '123', 'x-custom-header')
    assert(JSON.stringify(requestFromProxy.body), JSON.stringify(body), 'body')

    // fpjs headers should be added by the integration.
    assertToBeFalsy('fpjs-proxy-forwarded-host', requestFromProxy.get('fpjs-proxy-forwarded-host'))
    assertToBeFalsy('fpjs-proxy-secret', requestFromProxy.get('fpjs-proxy-secret'))

    // ii query param should not be added by the integration, it should only happen for POST requests
    const { ii } = requestFromProxy.query
    assertToBeFalsy('ii', ii)
  },
}

export default testCase
