import { TestCase } from '../../types/testCase'
import { testAgentRevalidation, createAgentCacheTargets } from '../../utils/agentCacheHeaders'

const testCase: TestCase = {
  name: 'v4 agent response cache headers on revalidation',
  test: async (api) => {
    await testAgentRevalidation(api, createAgentCacheTargets(api).v4)
  },
}

export default testCase
