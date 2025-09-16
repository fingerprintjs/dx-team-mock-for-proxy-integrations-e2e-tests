import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'
import { generateRequestId } from '../../../../utils/generateRequestId'

const testCase: TestCase = {
  name: 'browser cache response cache-control preserved',
  test: async (api) => {
    const { responseFromProxy } = await api.sendRequestToCacheEndpoint({}, undefined, 'cache-control-test', {
      headers: {
        'cache-control': 'public, max-age=600',
      },
    })

    const value = responseFromProxy.headers['cache-control']
    assert(value, 'public, max-age=600', `Expected 'cache-control: public, max-age=600' header, got: ${value}`)
  },
}

export default testCase
