import { z } from 'zod'

export const RunTestsRequestSchema = z.object({
  integrationUrl: z.string().url(),
  ingressPath: z.string(),
  cdnPath: z.string(),
  trafficName: z.string(),
  integrationVersion: z.string(),
  testsFilter: z.array(z.string()).optional(),
})

export type RunTestsRequest = z.infer<typeof RunTestsRequestSchema>
