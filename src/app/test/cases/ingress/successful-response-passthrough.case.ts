import { TestCase } from '../../types/testCase'
import { assert } from '../../service/assert'
import { generateRequestId } from '../../../../utils/generateRequestId'

const testCase: TestCase = {
  name: 'successful response passthrough on Identification responses',
  test: async (api) => {
    const { responseFromProxy } = await api.sendRequestToIngress({}, undefined, {
      requestId: generateRequestId(),
      response: {
        status: 200,
        headers: {
          'x-foo': 'bar',
        },
        body: 'ok',
      },
    })

    assert(responseFromProxy.status, 200)
    assert(responseFromProxy.body, 'ok')
    assert(responseFromProxy.headers['x-foo'], 'bar')
  },
}

export default testCase
