import { TestCase } from '../../types/testCase'
import { assert } from '../../service/assert'
import { generateRequestId } from '../../../../utils/generateRequestId'

const testCase: TestCase = {
  name: 'ingress response non-successful response passthrough',
  test: async (api) => {
    const { responseFromProxy } = await api.sendRequestToIngress({}, undefined, {
      status: 500,
      headers: {
        'x-error': 'upstream-fail',
      },
      body: 'Internal Server Error',
    })

    assert(responseFromProxy.status, 500)
    assert(responseFromProxy.body, 'Internal Server Error')
    assert(responseFromProxy.headers['x-error'], 'upstream-fail')
  },
}

export default testCase
