#!/usr/bin/env node

import { argumentParser } from 'zodcli'
import { RunTestsRequestSchema } from '../../src/app/test/request.types'
import { TestResponse } from '../../src/app/test/service/session'
import { createConsola } from 'consola'
import { FailedTestResult } from '../../src/app/test/service/testCases'
import { DetailedTestResult } from '../../src/app/test/service/testRunner'

const logger = createConsola()

const API_URL = process.env.API_URL ?? 'https://mock-warden.fpjs.sh'

const args = argumentParser({
  options: RunTestsRequestSchema.strict(),
}).parse(process.argv.slice(2))

async function main() {
  const url = new URL(API_URL)
  url.pathname = '/api/test/run-tests'

  logger.info(`Using ${url} as API url`)
  logger.start(`Sending request...`)

  const response = await fetch(url, {
    method: 'POST',
    mode: 'cors',
    body: JSON.stringify(args),
    headers: {
      'content-type': 'application/json',
    },
  })

  logger.ready(`API replied with status code ${response.status}`)

  const json = (await response.json()) as TestResponse

  logger.debug(`Response`, json)

  const results = json.results.map((result) => {
    return result.passed
      ? `✅ "${result.testName}" passed in ${result.requestDurationMs}MS`
      : getFailedTestMessage(result as DetailedTestResult & FailedTestResult)
  })

  results.unshift(`Test results (${results.length}):`)

  logger.box(results.join('\n'))
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
