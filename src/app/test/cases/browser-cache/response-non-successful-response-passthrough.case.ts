import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'
import { generateRequestId } from '../../../../utils/generateRequestId'

const testCase: TestCase = {
  name: 'non-successful response passthrough on Browser Cache responses',
  test: async (api) => {
    const { responseFromProxy } = await api.sendRequestToCacheEndpoint({}, undefined, undefined, {
      status: 502,
      headers: {
        'x-error': 'upstream-fail',
      },
      body: 'Bad gateway',
    })

    assert(responseFromProxy.status, 502)
    assert(responseFromProxy.body, 'Bad gateway')
    assert(responseFromProxy.headers['x-error'], 'upstream-fail')
  },
}

export default testCase
