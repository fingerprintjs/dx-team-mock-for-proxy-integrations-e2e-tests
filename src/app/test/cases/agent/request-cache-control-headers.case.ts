import { assertLowerThanOrEqual, assertRegExp } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'cache control headers for agent request',
  test: async (api) => {
    const { requestFromProxy } = await api.sendRequestToCdn()
    assertRegExp(requestFromProxy.get('Cache-Control'), new RegExp(/max-age=[0-9]*/g))
    const maxAge = Number(requestFromProxy.get('Cache-Control').replace('max-age=', ''))
    console.log({ maxAge })
    assertLowerThanOrEqual(maxAge, 3600)
  },
}

export default testCase
