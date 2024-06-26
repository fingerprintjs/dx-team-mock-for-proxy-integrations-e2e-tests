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

    assert(requestFromProxy.get('x-custom-header'), '123', 'x-custom-header')
    assert(requestFromProxy.get('cookie'), '_iidt=123', 'cookie')
  },
}

export default testCase
