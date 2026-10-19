import { TestCase } from '../../types/testCase'
import { testAgentCacheHit, createAgentCacheTargets } from '../../utils/agentCacheHeaders'

const testCase: TestCase = {
  name: 'v4 agent response cache headers on cache hit',
  test: async (api) => {
    await testAgentCacheHit(api, createAgentCacheTargets(api).v4)
  },
}

export default testCase
