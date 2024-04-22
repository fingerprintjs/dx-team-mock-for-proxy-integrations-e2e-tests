import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'

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

    const testSessionHostURL = new URL(api.testSession.ingressProxyUrl)
    const testSessionHost = `${testSessionHostURL.protocol}//${testSessionHostURL.host}`

    assert(requestFromProxy.get('x-custom-header'), '123', 'x-custom-header')
    assert(requestFromProxy.get('cookie'), '_iidt=123', 'cookie')
  },
}

export default testCase
