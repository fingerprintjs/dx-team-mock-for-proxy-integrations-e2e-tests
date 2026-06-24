import { assert, assertToBeFalsy, assertToBeTruthy } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'v4 ingress arbitrary PUT request with binary body',
  test: async (api) => {
    const body = Buffer.from([0x00, 0x01, 0x02, 0xfd, 0xfe, 0xff])

    const query = new URLSearchParams()
    query.set('customQuery', '123')

    const { requestFromProxy } = await api.sendArbitraryRequestToV4Ingress({
      method: 'PUT',
      path: '/some_path',
      query,
      request: {
        headers: {
          'content-type': 'application/octet-stream',
          'x-custom-header': '123',
        },
        data: body,
      },
    })

    // Method and path should reach us as is.
    assert(requestFromProxy.method, 'PUT', 'method')
    assert(requestFromProxy.path, '/some_path', 'path')

    // Custom header and binary body should be preserved.
    assert(requestFromProxy.get('x-custom-header'), '123', 'x-custom-header')
    assertToBeTruthy('body is buffer', Buffer.isBuffer(requestFromProxy.body))
    assert(Buffer.compare(requestFromProxy.body, body), 0, 'body')

    // Arbitrary query parameter should be preserved.
    const { ii, customQuery } = requestFromProxy.query
    assert(`${customQuery}`, '123', 'customQuery')

    // ii query param and fpjs headers should not be added by the integration, it should only happen for POST requests
    assertToBeFalsy('fpjs-proxy-forwarded-host', requestFromProxy.get('fpjs-proxy-forwarded-host'))
    assertToBeFalsy('fpjs-proxy-secret', requestFromProxy.get('fpjs-proxy-secret'))
    assertToBeFalsy('ii', ii)
  },
}

export default testCase
