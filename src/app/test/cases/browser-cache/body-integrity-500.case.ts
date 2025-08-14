import { TestCase } from '../../types/testCase'
import { getApiKey } from '../../utils/getApiKey'
import { assert } from '../../service/assert'
import { diverseUnicode } from '../../utils/diverseUnicode'

const body = diverseUnicode

const testCase: TestCase = {
  name: 'body integrity protected with 500 status code on Browser Cache responses',
  response: {
    status: 500,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
    },
    body,
  },
  test: async (api) => {
    const query = new URLSearchParams()
    query.set('apiKey', getApiKey())
    const { responseFromProxy } = await api.sendRequestToCdn(query)

    assert(responseFromProxy.status, 500)
    assert(responseFromProxy.body, body)
    assert(responseFromProxy.headers['content-type'], 'text/plain; charset=utf-8')
  },
}

export default testCase
