import { TestCase } from '../../types/testCase'
import { assertRegionRouting } from '../../utils/region'

const testCase: TestCase = {
  name: 'v4 ingress request region',
  test: async (api) => {
    await assertRegionRouting(api, (query) => api.sendRequestToV4Ingress({ query }))
  },
}

export default testCase
