import { TestCase } from '../../types/testCase'
import { getApiKey } from '../../utils/getApiKey'
import { assert } from '../../service/assert'
import { HTML_500_ERROR } from '../../utils/constants'
import { getRandomString } from '../../utils/getRandomString'

const testCase: TestCase = {
  name: 'browser cache response body integrity protected with 500 status code',
  test: async (api) => {
    const query = new URLSearchParams()
    query.set('apiKey', getApiKey())

    const body = HTML_500_ERROR

    const { responseFromProxy } = await api.sendRequestToCacheEndpoint({
      query,
      pathname: `/browser-cache/${getRandomString()}`,

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
