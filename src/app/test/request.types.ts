import { z } from 'zod';

export const RunTestsRequestSchema = z.object({
  host: z.string().url(),
  ingressProxyPath: z.string(),
  cdnProxyPath: z.string(),
});

export type RunTestsRequest = z.infer<typeof RunTestsRequestSchema>;

export const StartTestsRequestSchema = z.object({
  host: z.string().url(),
});

export type StartTestsRequest = z.infer<typeof StartTestsRequestSchema>;
