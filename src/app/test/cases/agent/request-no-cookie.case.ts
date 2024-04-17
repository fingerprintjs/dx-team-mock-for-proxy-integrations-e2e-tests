import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'agent request no cookie',
  test: async (api) => {
    const { requestFromProxy } = await api.sendRequestToCdn(new URLSearchParams(), {
      headers: { cookie: 'test=123; _iidt=test' },
    })
    assert(requestFromProxy.get('cookie'), undefined, 'cookie')
  },
}

export default testCase
