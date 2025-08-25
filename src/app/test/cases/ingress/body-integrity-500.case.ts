import { TestCase } from '../../types/testCase'
import { assert } from '../../service/assert'

const testCase: TestCase = {
  name: 'body integrity protected with 500 status code on Identification responses',
  test: async (api) => {
    const body =
      '<html><head><title>Internal Server Error</title></head><body><h1>Internal Server Error</h1></body></html>'

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
