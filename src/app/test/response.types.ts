import { z } from 'zod'
import { TestSessionStatus } from './service/session'

export const TestResponseSchema = z.object({
  host: z.hostname(),
  status: z.enum(TestSessionStatus),
  results: z.array(
    z.object({
      testName: z.string(),
      requestDurationMs: z.number(),
      logs: z.array(z.string()).optional(),
    })
  ),
})

export type TestResponseSchema = z.infer<typeof TestResponseSchema>
