import { assert, assertToBeFalsy, assertToBeTruthy } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'v4 ingress arbitrary HEAD request',
  test: async (api) => {
    const { requestFromProxy } = await api.sendArbitraryRequestToV4Ingress({
      method: 'HEAD',
      path: '/some_path',
      request: {
        headers: {
          'x-custom-header': '123',
        },
      },
    })

    // Method and path should reach us as is.
    assert(requestFromProxy.method, 'HEAD', 'method')
    assertToBeTruthy('path', requestFromProxy.path === '/some_path')

    // Custom header should be preserved.
    assert(requestFromProxy.get('x-custom-header'), '123', 'x-custom-header')

    // ii query param and fpjs headers should not be added by the integration, it should only happen for POST requests
    assertToBeFalsy('fpjs-proxy-forwarded-host', requestFromProxy.get('fpjs-proxy-forwarded-host'))
    assertToBeFalsy('fpjs-proxy-secret', requestFromProxy.get('fpjs-proxy-secret'))
    const { ii } = requestFromProxy.query
    assertToBeFalsy('ii', ii)
  },
}

export default testCase
