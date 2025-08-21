import { TestCase } from '../../types/testCase'
import { getApiKey } from '../../utils/getApiKey'
import { assert } from '../../service/assert'
import { generateRequestId } from '../../../../utils/generateRequestId'

const testCase: TestCase = {
  name: 'successful response passthrough on ProCDN responses',
  test: async (api) => {
    const query = new URLSearchParams()
    query.set('apiKey', getApiKey())
    const { responseFromProxy } = await api.sendRequestToCdn(query, undefined, {
      status: 200,
      headers: {
        'x-foo': 'bar',
      },
      body: 'ok',
    })

    assert(responseFromProxy.status, 200)
    assert(responseFromProxy.body, 'ok')
    assert(responseFromProxy.headers['x-foo'], 'bar')
  },
}

export default testCase
