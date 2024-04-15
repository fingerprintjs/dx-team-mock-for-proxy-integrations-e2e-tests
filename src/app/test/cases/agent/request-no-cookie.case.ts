import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'agent request no cookie',
  test: async (api) => {
    const { requestFromProxy } = await api.sendRequestToCdn(undefined, {
      headers: { cookie: 'test=123; _iidt=test' },
    })
    assert(requestFromProxy.get('cookie'), undefined)
  },
}

export default testCase
