import { TestCase } from '../../types/testCase'
import { assert } from '../../service/assert'
import { HTML_500_ERROR } from '../../utils/constants'

const testCase: TestCase = {
  name: 'body integrity protected with 500 status code on Identification responses',
  test: async (api) => {
    const body = HTML_500_ERROR

    const { responseFromProxy } = await api.sendRequestToIngress({}, undefined, {
      status: 500,
      headers: {
        'content-type': 'text/html; charset=utf-8',
      },
      body,
    })

    assert(responseFromProxy.status, 500)
    assert(responseFromProxy.body, body)
    assert(responseFromProxy.headers['content-type'], 'text/html; charset=utf-8')
  },
}

export default testCase
