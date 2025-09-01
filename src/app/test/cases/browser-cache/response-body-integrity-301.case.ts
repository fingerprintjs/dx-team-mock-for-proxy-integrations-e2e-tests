import { TestCase } from '../../types/testCase'
import { getApiKey } from '../../utils/getApiKey'
import { assert } from '../../service/assert'

const testCase: TestCase = {
  name: 'browser cache response body integrity protected with 301 status code',
  test: async (api) => {
    const query = new URLSearchParams()
    query.set('apiKey', getApiKey())

    const body = ''
    const location = `https://${api.testSession.host}/path?withQuery=param#1`

    const { responseFromProxy } = await api.sendRequestToCdn(query, undefined, {
      status: 301,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        location,
      },
      body,
    })

    assert(responseFromProxy.status, 301)
    assert(responseFromProxy.body, body)
    assert(responseFromProxy.headers['content-type'], 'text/plain; charset=utf-8')
    assert(responseFromProxy.headers['location'], location)
  },
}

export default testCase
