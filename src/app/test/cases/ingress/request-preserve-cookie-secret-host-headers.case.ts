import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'
import { getIP } from '../../utils/getIP'

const testCase: TestCase = {
  name: 'ingress request with cookie filter, proxy secret, forwarded host, proxy client ip and preservation of headers',
  test: async (api) => {
    const { requestFromProxy } = await api.sendRequestToIngress({
      headers: {
        cookie: '_iidt=123;test=123',
        'x-custom-header': '123',
      },
    })

    const ipOfClient = await getIP()

    const testSessionHostURL = new URL(api.testSession.host)
    const testSessionHost = `${testSessionHostURL.protocol}//${testSessionHostURL.host}`

    assert(requestFromProxy.get('x-custom-header'), '123', 'x-custom-header')
    assert(requestFromProxy.get('fpjs-proxy-client-ip'), ipOfClient, 'fpjs-proxy-client-ip')
    assert(requestFromProxy.get('cookie'), '_iidt=123', 'cookie')
    assert(requestFromProxy.get('fpjs-proxy-secret'), 'secret', 'fpjs-proxy-secret')
    assert(`https://${requestFromProxy.get('fpjs-proxy-forwarded-host')}`, testSessionHost, 'fpjs-proxy-forwarded-host')
  },
}

export default testCase
