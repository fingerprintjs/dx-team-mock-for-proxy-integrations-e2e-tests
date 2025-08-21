import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'
import { generateRequestId } from '../../../../utils/generateRequestId'

const testCase: TestCase = {
  name: 'cache-control preserved on Browser Cache responses',
  test: async (api) => {
    const { responseFromProxy } = await api.sendRequestToCacheEndpoint({}, undefined, undefined, {
      requestId: generateRequestId(),
      response: {
        headers: {
          'cache-control': 'public, max-age=600',
        },
      },
    })

    const value = responseFromProxy.headers['cache-control']
    assert(value, 'public, max-age=600', `Expected 'cache-control: public, max-age=600' header, got: ${value}`)
  },
}

export default testCase
