import { TestCase } from '../../types/testCase'
import { testAgentCacheMiss, createAgentCacheTargets } from '../../utils/agentCacheHeaders'

const testCase: TestCase = {
  name: 'v4 agent response cache headers on cache miss',
  test: async (api) => {
    await testAgentCacheMiss(api, createAgentCacheTargets(api).v4)
  },
}

export default testCase
