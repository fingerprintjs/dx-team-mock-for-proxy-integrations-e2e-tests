import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'
import { generateRequestId } from '../../../../utils/generateRequestId'

const testCase: TestCase = {
  name: 'no header changes on Browser Cache responses',
  test: async (api) => {
    const { responseFromProxy } = await api.sendRequestToCacheEndpoint({}, undefined, undefined, {
      requestId: generateRequestId(),
      response: {
        headers: {
          'x-foo': 'bar',
          'x-bar': 'baz',
        },
      },
    })

    assert(responseFromProxy.headers['x-foo'], 'bar', `Expected header 'x-foo: bar'`)
    assert(responseFromProxy.headers['x-bar'], 'baz', `Expected header 'x-bar: baz'`)
  },
}

export default testCase
