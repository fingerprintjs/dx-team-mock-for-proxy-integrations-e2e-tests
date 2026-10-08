import { z } from 'zod'
import { RUN_REGIONS } from './utils/region'

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
})

export type RunTestsRequest = z.input<typeof RunTestsRequestSchema>
