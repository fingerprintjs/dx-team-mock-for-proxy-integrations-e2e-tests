import { z } from 'zod'

export const RunTestsRequestSchema = z.object({
  integrationUrl: z.string().url(),
  ingressPath: z.string().optional(),
  cdnPath: z.string().optional(),
  trafficName: z.string(),
  integrationVersion: z.string(),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
  testsFilter: z.array(z.string()).optional(),
})

export type RunTestsRequest = z.infer<typeof RunTestsRequestSchema>
