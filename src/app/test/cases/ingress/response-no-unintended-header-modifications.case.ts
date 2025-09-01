import { TestCase } from '../../types/testCase'
import { assert } from '../../service/assert'
import { generateRequestId } from '../../../../utils/generateRequestId'

const testCase: TestCase = {
  name: 'ingress response no unintended header modifications',
  test: async (api) => {
    const { responseFromProxy } = await api.sendRequestToIngress({}, undefined, {
      headers: {
        'x-foo': 'bar',
        'x-bar': 'baz',
      },
    })

    assert(responseFromProxy.headers['x-foo'], 'bar', `Expected header 'x-foo: bar'`)
    assert(responseFromProxy.headers['x-bar'], 'baz', `Expected header 'x-bar: baz'`)
  },
}

export default testCase
