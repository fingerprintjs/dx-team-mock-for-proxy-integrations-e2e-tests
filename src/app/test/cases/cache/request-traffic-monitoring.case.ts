import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'cache endpoint request traffic monitoring',
  test: async (api) => {
    const { requestFromProxy } = await api.sendRequestToCacheEndpoint({})
    const { ii } = requestFromProxy.query
    const [integration, version, type] = ii.toString().split('/')

    assert(integration, api.testSession.trafficName)
    assert(version, api.testSession.integrationVersion)
    assert(type, 'ingress')
  },
}

export default testCase
