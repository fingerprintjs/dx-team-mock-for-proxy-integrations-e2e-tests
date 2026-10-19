import { z } from 'zod'
import { RUN_REGIONS } from './utils/region'

/**
 * Whether the integration caches the agent itself (`cached`) or leaves it to the upstream CDN (`passthrough`).
 * It depends on the integration, not on the API version.
 */
export const AGENT_CACHE_MODES = ['cached', 'passthrough'] as const

export type AgentCacheMode = (typeof AGENT_CACHE_MODES)[number]

export const RunTestsRequestSchema = z.object({
  integrationUrl: z.url(),
  ingressPath: z.string().optional(),
  cdnPath: z.string().optional(),
  trafficName: z.string(),
  integrationVersion: z.string(),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
  testsFilter: z.array(z.string()).optional(),
  enableV4Tests: z.boolean().optional(),
  region: z.enum(RUN_REGIONS).default('all'),
  agentCacheMode: z.enum(AGENT_CACHE_MODES).optional(),
})

export type RunTestsRequest = z.input<typeof RunTestsRequestSchema>
