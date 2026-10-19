import { TestCase } from '../../types/testCase'
import { assertRegionRouting } from '../../utils/region'
import { getRandomString } from '../../utils/getRandomString'

const testCase: TestCase = {
  name: 'browser cache request region',
  test: async (api) => {
    await assertRegionRouting(api, (query) =>
      api.sendRequestToCacheEndpoint({ pathname: `/browser-cache/${getRandomString()}`, query })
    )
  },
}

export default testCase
