import { TestCase } from '../../types/testCase'
import { assert } from '../../service/assert'

const testCase: TestCase = {
  name: 'v4 agent response body integrity protected with 301 status code',
  test: async (api) => {
    const body = ``
    const location = `https://${api.testSession.host}/path?withQuery=param#1`

    const { responseFromProxy } = await api.sendRequestToV4Cdn({
      mockResponse: {
        status: 301,
        headers: {
          'content-type': 'text/javascript; charset=utf-8',
          location,
        },
        body,
      },
    })

    assert(responseFromProxy.status, 301)
    assert(responseFromProxy.body, body)
    assert(responseFromProxy.headers['content-type'], 'text/javascript; charset=utf-8')
    assert(responseFromProxy.headers['location'], location)
  },
}

export default testCase
