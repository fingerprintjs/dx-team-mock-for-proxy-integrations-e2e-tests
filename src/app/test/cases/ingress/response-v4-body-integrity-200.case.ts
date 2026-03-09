import { TestCase } from '../../types/testCase'
import { assert } from '../../service/assert'
import { diverseUnicode } from '../../utils/diverseUnicode'

const testCase: TestCase = {
  name: 'v4 ingress response body integrity protected with 200 status code',
  test: async (api) => {
    const body = diverseUnicode

    const { responseFromProxy } = await api.sendRequestToV4Ingress({
      mockResponse: {
        status: 200,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
        },
        body,
      },
    })

    assert(responseFromProxy.status, 200)
    assert(responseFromProxy.body, body)
    assert(responseFromProxy.headers['content-type'], 'text/plain; charset=utf-8')
  },
}

export default testCase
