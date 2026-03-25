import { assert, assertToBeFalsy } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'v4 agent request traffic monitoring',
  test: async (api) => {
    const query = new URLSearchParams()
    query.set('customQuery', '123')

    const { requestFromProxy } = await api.sendRequestToV4Cdn({
      query,
    })
    const { ii, customQuery } = requestFromProxy.query

    assertToBeFalsy('ii', ii)
    assert(customQuery, '123', 'customQuery')
  },
}

export default testCase
