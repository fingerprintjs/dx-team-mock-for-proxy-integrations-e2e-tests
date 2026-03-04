import { TestCase } from '../../types/testCase'
import { assert } from '../../service/assert'

const testCase: TestCase = {
  name: 'v4 ingress response successful response passthrough',
  test: async (api) => {
    const { responseFromProxy } = await api.sendRequestToIngress({
      pathOverride: '/',
      mockResponse: {
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
