import { TestCase } from '../../types/testCase'
import { getApiKey } from '../../utils/getApiKey'
import { assert } from '../../service/assert'
import { HTML_500_ERROR } from '../../utils/constants'

const testCase: TestCase = {
  name: 'agent response body integrity protected with 500 status code',
  test: async (api) => {
    const apiKey = getApiKey()

    const body = HTML_500_ERROR

    const { responseFromProxy } = await api.sendRequestToCdn({
      pathOverride: `/web/v4/${apiKey}`,

      mockResponse: {
        status: 500,
        headers: {
          'content-type': 'text/html; charset=utf-8',
        },
        body,
      },
    })

    assert(responseFromProxy.status, 500)
    assert(responseFromProxy.body, body)
    assert(responseFromProxy.headers['content-type'], 'text/html; charset=utf-8')
  },
}

export default testCase
