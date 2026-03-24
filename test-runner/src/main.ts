#!/usr/bin/env node

import { argumentParser } from 'zodcli'
import { RunTestsRequest, RunTestsRequestSchema } from '../../src/app/test/request.types'
import { TestResponse } from '../../src/app/test/service/session'
import { createConsola, LogLevels } from 'consola'
import { DetailedTestResult } from '../../src/app/test/service/testRunner'
import { ExponentialBackoff, handleWhen, retry } from 'cockatiel'
import { z } from 'zod'
import { FailedTestResult } from '../../src/app/test/types/testCase'
import { httpClient } from '../../src/utils/httpClient'
import { versionInfo } from './version'
import { BuildInfo } from '../../src/version'

const logger = createConsola()

const BooleanUnion = z.union([
  z.literal('true').transform(() => true),
  z.literal('false').transform(() => false),
  z.null().transform(() => true),
])

type BooleanUnionParams = {
  valueWhenNull: boolean
  defaultValue: boolean
}

function createBooleanUnion({ valueWhenNull, defaultValue }: BooleanUnionParams) {
  return z
    .union([
      z.literal('true').transform(() => true),
      z.literal('false').transform(() => false),
      z.null().transform(() => valueWhenNull),
    ])
    .default(defaultValue ? 'true' : 'false')
}

const OptionsSchema = RunTestsRequestSchema.omit({ enableV4Tests: true }).extend({
  attempts: z.number().default(3),
  apiUrl: z.string().url(),
  integrationUrl: z.string().url().optional(),
  ingressPath: z.string().optional(),
  cdnPath: z.string().optional(),
  cdnProxyUrl: z.string().url().optional(),
  ingressProxyUrl: z.string().url().optional(),
  verbose: createBooleanUnion({ valueWhenNull: true, defaultValue: false }),
  // zodcli disallows numbers in properties, so we need to enableNewTests maps to enableV4Tests in the request body
  enableNewTests: createBooleanUnion({
    valueWhenNull: false,
    defaultValue: false,
  }),
})

const args = argumentParser({
  options: OptionsSchema.strict(),
}).parse(process.argv.slice(2)) as z.infer<typeof OptionsSchema>

function parsePaths() {
  if (args.integrationUrl) {
    if (!args.ingressPath || !args.cdnPath) {
      throw new Error("Missing required params: provide 'ingressPath' and 'cdnPath' when using 'integrationUrl'.")
    }

    return {
      integrationUrl: args.integrationUrl,
      ingressPath: args.ingressPath,
      cdnPath: args.cdnPath,
    }
  }

  if (!args.cdnProxyUrl || !args.ingressProxyUrl) {
    throw new Error(
      "Missing required params: provide 'ingressProxyUrl' and 'cdnProxyUrl' when not using 'integrationUrl'."
    )
  }

  const cdnProxyUrl = new URL(args.cdnProxyUrl)
  const ingressProxyUrl = new URL(args.ingressProxyUrl)

  if (cdnProxyUrl.origin !== ingressProxyUrl.origin) {
    throw new Error("Invalid arguments: 'cdnProxyUrl' and 'ingressProxyUrl' must share the same origin.")
  }

  const splitParts = (p: string) =>
    p
      .replace(/\/+/g, '/') // if there are multiple `/` character, makes them single
      .replace(/^\/|\/$/g, '') // if there are starting `/` character or ending `/` character, remove it
      .split('/')
      .filter(Boolean)

  const findCommonPrefix = (a: string[], b: string[]) => {
    const res: string[] = []
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] !== b[i]) {
        break
      }
      res.push(a[i])
    }
    return res
  }

  const cdnSegments = splitParts(cdnProxyUrl.pathname)
  const ingressSegments = splitParts(ingressProxyUrl.pathname)
  const commonPathSegments = findCommonPrefix(cdnSegments, ingressSegments)

  const integrationPath = commonPathSegments.length ? `/${commonPathSegments.join('/')}` : ''
  const integrationUrl = cdnProxyUrl.origin + integrationPath

  const findSubPath = (full: string[], length: number) => full.slice(length).join('/')

  const cdnPath = findSubPath(cdnSegments, commonPathSegments.length) || '/'
  const ingressPath = findSubPath(ingressSegments, commonPathSegments.length) || '/'

  return {
    integrationUrl,
    cdnPath,
    ingressPath,
  }
}

async function fetchApiBuildInfo(apiUrl: string): Promise<BuildInfo | null> {
  const url = new URL(apiUrl)
  try {
    url.pathname = '/version'
    const res = await httpClient.get<BuildInfo>(url.toString(), { headers: { accept: 'application/json' } })
    if (res.status === 200) {
      return res.data
    }
  } catch {
    logger.error("Couldn't fetch the target api version information.")
  }
  return null
}

async function main() {
  if (args.verbose) {
    logger.level = LogLevels.verbose
  }

  logger.box(`${versionInfo.name}@${versionInfo.version}`)

  const apiUrl = new URL(args.apiUrl)
  const apiInfo = await fetchApiBuildInfo(args.apiUrl)
  if (apiInfo) {
    logger.box(`API Version: ${apiInfo.version} - ${apiInfo.gitSha}`)
  }

  apiUrl.pathname = '/api/test/run-tests'

  if (args.testsFilter) {
    logger.box('[DEPRECATION] --tests-filter is deprecated. Use --include and/or --exclude instead.')
  }

  if (args.ingressProxyUrl || args.cdnProxyUrl) {
    logger.box(
      '[DEPRECATION] ingressProxyUrl and cdnProxyUrl will be removed in a future release. Use integration, ingress-path, and cdn-path parameters.'
    )
  }

  const { integrationUrl, cdnPath, ingressPath } = parsePaths()

  logger.info(`Found integrationUrl: ${integrationUrl}`)
  logger.info(`Found cdnPath: ${cdnPath}`)
  logger.info(`Found ingressPath: ${ingressPath}`)

  logger.info(`Using ${apiUrl} as API url`)
  logger.start(`Sending request...`)

  const shouldRetry = (err: any) => {
    const status = err?.response?.status as number | undefined
    if (typeof status === 'number') {
      return status >= 500 || status === 429
    }
    return true
  }

  const policy = retry(handleWhen(shouldRetry), {
    maxAttempts: args.attempts,
    backoff: new ExponentialBackoff(),
  })

  await policy.execute(async (context) => {
    logger.info(`Attempt ${context.attempt + 1}...`)

    const requestBody = {
      integrationUrl,
      ingressPath,
      cdnPath,
      trafficName: args.trafficName,
      integrationVersion: args.integrationVersion,
      include: args.include && args.include.length > 0 ? args.include : args.testsFilter,
      exclude: args.exclude,
      testsFilter: args.testsFilter,
      enableV4Tests: args.enableNewTests,
    } satisfies RunTestsRequest

    if (requestBody.enableV4Tests) {
      logger.info('V4 tests are enabled')
    }

    const response = await httpClient.post<TestResponse>(apiUrl.toString(), JSON.stringify(requestBody), {
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
  const status = error?.response?.status

  if (status) {
    try {
      const message = error?.response?.data?.error?.message ?? error.message
      logger.box(`API error ${status}: ${message}`)
    } catch {
      logger.error(`HTTP ${status}: ${error?.message ?? 'Request failed'}`)
    }
  } else {
    logger.error(error?.message ?? 'Request failed')
  }

  logger.debug(error)

  process.exit(1)
})
