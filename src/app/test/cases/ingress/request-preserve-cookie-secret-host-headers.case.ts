import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'
import { getIP } from '../../utils/getIP'

const testCase: TestCase = {
  name: 'ingress request with cookie filter, proxy secret, forwarded host and preservation of headers',
  test: async (api) => {
    const { requestFromProxy } = await api.sendRequestToIngress({
      headers: {
        cookie: '_iidt=123;test=123',
        'x-custom-header': '123',
      },
    })

    const ipOfClient = await getIP()

    assert(requestFromProxy.get('x-custom-header'), '123')
    assert(requestFromProxy.get('fpjs-proxy-client-ip'), ipOfClient)
    assert(requestFromProxy.get('cookie'), '_iidt=123')
    assert(requestFromProxy.get('fpjs-proxy-secret'), 'secret')
    assert(`https://${requestFromProxy.get('fpjs-proxy-forwarded-host')}`, api.testSession.host)
  },
}

export default testCase
