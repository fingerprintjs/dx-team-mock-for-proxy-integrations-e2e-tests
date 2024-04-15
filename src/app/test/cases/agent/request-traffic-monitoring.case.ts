import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'agent request traffic monitoring',
  test: async (api) => {
    const query = new URLSearchParams()
    query.set('customQuery', '123')

    const { requestFromProxy } = await api.sendRequestToCdn(query)
    const { ii, customQuery } = requestFromProxy.query
    const [integration, version, type] = ii.toString().split('/')

    assert(integration, api.testSession.trafficName)
    assert(version, api.testSession.integrationVersion)
    assert(type, 'procdn')
    assert(customQuery, '123')
  },
}

export default testCase
