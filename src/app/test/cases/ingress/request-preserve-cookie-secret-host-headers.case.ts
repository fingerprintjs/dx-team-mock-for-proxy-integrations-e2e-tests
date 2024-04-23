import { assert, assertEqualIp } from '../../service/assert'
import { TestCase } from '../../types/testCase'
import { getIP } from '../../utils/getIP'

const testCase: TestCase = {
  name: 'ingress request with cookie filter and preservation of headers',
  test: async (api) => {
    const { requestFromProxy } = await api.sendRequestToIngress({
      headers: {
        cookie: '_iidt=123;test=123',
        'x-custom-header': '123',
      },
    })

    const ipOfClient = await getIP()

    assert(requestFromProxy.get('x-custom-header'), '123', 'x-custom-header')
    assertEqualIp(requestFromProxy.get('fpjs-proxy-client-ip'), ipOfClient, 'fpjs-proxy-client-ip')
    assert(requestFromProxy.get('cookie'), '_iidt=123', 'cookie')
  },
}

export default testCase
