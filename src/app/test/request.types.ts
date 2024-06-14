import { z } from 'zod'

export const RunTestsRequestSchema = z.object({
  ingressProxyUrl: z.string().url(),
  cdnProxyUrl: z.string().url(),
  trafficName: z.string(),
  integrationVersion: z.string(),
  testsFilter: z.array(z.string()).optional(),
})

export type RunTestsRequest = z.infer<typeof RunTestsRequestSchema>
