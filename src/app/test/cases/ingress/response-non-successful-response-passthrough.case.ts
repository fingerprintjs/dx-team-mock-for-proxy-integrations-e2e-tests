import { TestCase } from '../../types/testCase'
import { assert } from '../../service/assert'
import { generateRequestId } from '../../../../utils/generateRequestId'

const testCase: TestCase = {
  name: 'ingress response non-successful response passthrough',
  test: async (api) => {
    const { responseFromProxy } = await api.sendRequestToIngress({}, undefined, {
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
