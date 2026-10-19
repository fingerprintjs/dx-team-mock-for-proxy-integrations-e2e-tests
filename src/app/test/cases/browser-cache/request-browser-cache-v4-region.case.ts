import { TestCase } from '../../types/testCase'
import { assertRegionRouting } from '../../utils/region'

const testCase: TestCase = {
  name: 'v4 browser cache request region',
  test: async (api) => {
    await assertRegionRouting(api, (query) => api.sendRequestToV4CacheEndpoint({ query }))
  },
}

export default testCase
