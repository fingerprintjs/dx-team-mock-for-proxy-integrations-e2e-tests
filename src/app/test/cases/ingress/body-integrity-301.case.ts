import { TestCase } from '../../types/testCase'
import { assert } from '../../service/assert'
import { diverseUnicode } from '../../utils/diverseUnicode'

const testCase: TestCase = {
  name: 'body integrity protected with 301 status code on Identification responses',
  test: async (api) => {
    const body = ''
    const location = 'https://www.domain.tld/path?withQuery=param#1'

    const { responseFromProxy } = await api.sendRequestToIngress({}, undefined, {
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
