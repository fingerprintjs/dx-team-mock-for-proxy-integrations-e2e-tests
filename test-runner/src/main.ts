#!/usr/bin/env node

import { argumentParser } from 'zodcli'
import { RunTestsRequestSchema } from '../../src/app/test/request.types'
import { TestResponse } from '../../src/app/test/service/session'
import { createConsola } from 'consola'
import { DetailedTestResult } from '../../src/app/test/service/testRunner'
import { ExponentialBackoff, handleAll, retry } from 'cockatiel'
import { z } from 'zod'
import { FailedTestResult } from '../../src/app/test/types/testCase'
import { httpClient } from '../../src/utils/httpClient'

const logger = createConsola()

const args = argumentParser({
  options: RunTestsRequestSchema.extend({
    attempts: z.number().default(3),
    apiUrl: z.string().url(),
  }).strict(),
}).parse(process.argv.slice(2))

async function main() {
  const url = new URL(args.apiUrl)
  url.pathname = '/api/test/run-tests'

  logger.info(`Using ${url} as API url`)
  logger.start(`Sending request...`)

  const policy = retry(handleAll, {
    maxAttempts: args.attempts,
    backoff: new ExponentialBackoff(),
  })

  await policy.execute(async (context) => {
    logger.info(`Attempt ${context.attempt}...`)

    const response = await httpClient.post<TestResponse>(url.toString(), JSON.stringify(args), {
      headers: {
        'content-type': 'application/json',
      },
    })

    logger.ready(`API replied with status code ${response.status}`)

    logger.debug(`Response`, response.data)

    const hasFailedTests = response.data.results.some((result) => !result.passed)

    const results = response.data.results.map((result) => {
      return result.passed
        ? `✅ "${result.testName}" passed in ${result.requestDurationMs}MS`
        : getFailedTestMessage(result as DetailedTestResult & FailedTestResult)
    })

    results.unshift(`Test results (${results.length}):`)

    logger.box(results.join('\n'))

    if (hasFailedTests) {
      throw new Error('Tests failed')
    }
  })
}

function getFailedTestMessage(result: DetailedTestResult & FailedTestResult): string {
  const proxyRequests = Object.entries(result.meta?.requestsFromProxy ?? {})
    .filter(([, requests]) => requests.length > 0)
    .map(([type, requests]) => {
      return [
        `  ${type} requests:`,
        ...requests.map(
          (request) =>
            `  - ${request.method.toUpperCase()} "${request.url}", Headers: ${JSON.stringify(request.headers)}`
        ),
      ].join('\n')
    })

  if (proxyRequests.length > 0) {
    proxyRequests.unshift('  Received proxy requests:')
  }

  return [`❌ "${result.testName}" failed: "${result.reason}" in ${result.requestDurationMs}MS`, ...proxyRequests].join(
    '\n'
  )
}

main().catch((error) => {
  logger.fatal(error)

  process.exit(1)
})
