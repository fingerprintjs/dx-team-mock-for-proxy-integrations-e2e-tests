import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'v4 agent request _iidt cookie',
  test: async (api) => {
    const { requestFromProxy } = await api.sendRequestToV4Cdn({
      request: {
        headers: { cookie: 'test=123; _iidt=test' },
      },
    })
    assert(requestFromProxy.get('cookie'), '_iidt=test', 'cookie')
  },
}

export default testCase
