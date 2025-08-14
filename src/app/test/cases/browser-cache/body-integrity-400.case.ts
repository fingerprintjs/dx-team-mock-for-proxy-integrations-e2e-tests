import { TestCase } from '../../types/testCase'
import { getApiKey } from '../../utils/getApiKey'
import { assert } from '../../service/assert'
import { diverseUnicode } from '../../utils/diverseUnicode'

const testCase: TestCase = {
  name: 'body integrity protected with 400 status code on Browser Cache responses',
  test: async (api) => {
    const query = new URLSearchParams()
    query.set('apiKey', getApiKey())

    const body = diverseUnicode

    const { responseFromProxy } = await api.sendRequestToCdn(query, undefined, {
      status: 400,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
      },
      body,
    })

    assert(responseFromProxy.status, 400)
    assert(responseFromProxy.body, body)
    assert(responseFromProxy.headers['content-type'], 'text/plain; charset=utf-8')
  },
}

export default testCase
