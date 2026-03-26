import { assert, assertToBeFalsy } from '../../service/assert'
import { TestCase } from '../../types/testCase'
import { getApiKey } from '../../utils/getApiKey'

const testCase: TestCase = {
  name: 'agent request traffic monitoring',
  test: async (api) => {
    const query = new URLSearchParams()
    query.set('customQuery', '123')
    query.set('apiKey', getApiKey())

    const { requestFromProxy } = await api.sendRequestToCdn({ query })
    const { ii, customQuery } = requestFromProxy.query

    assertToBeFalsy('ii', ii)
    assert(customQuery, '123', 'customQuery')
  },
}

export default testCase
