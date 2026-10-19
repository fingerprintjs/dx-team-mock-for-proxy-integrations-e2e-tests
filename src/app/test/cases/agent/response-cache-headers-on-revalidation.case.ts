import { TestCase } from '../../types/testCase'
import { testAgentRevalidation, createAgentCacheTargets } from '../../utils/agentCacheHeaders'

const testCase: TestCase = {
  name: 'agent response cache headers on revalidation',
  test: async (api) => {
    await testAgentRevalidation(api, createAgentCacheTargets(api).v3)
  },
}

export default testCase
