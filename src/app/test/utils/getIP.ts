import { Agent as HttpAgent } from 'node:http'
import { Agent as HttpsAgent } from 'node:https'
import { httpClient } from '../../../utils/httpClient'

const DEFAULT_IPV4_PROVIDER = 'http://169.254.169.254/latest/meta-data/public-ipv4'
const DEFAULT_IPV6_PROVIDER = 'http://169.254.169.254/latest/meta-data/ipv6'
const IMDS_TOKEN_PROVIDER = 'http://169.254.169.254/latest/api/token'

/**
 * Defines the structure for network metadata configuration, including environment variables
 * and metadata service providers (IMDS or external providers).
 */
interface NetworkMetadataConfig {
  /**
   * Predefined public IPv4 address of the server, if available.
   * If set, no network request will be made to fetch the address.
   */
  publicIPv4?: string

  /**
   * Predefined public IPv6 address of the server, if available.
   * If set, no network request will be made to fetch the address.
   */
  publicIPv6?: string

  /**
   * Custom IPv4 address provider endpoint (if specified by environment variables).
   * If set, this will be queried instead of the default metadata provider.
   */
  ipv4Provider?: string

  /**
   * Custom IPv6 address provider endpoint (if specified by environment variables).
   * If set, this will be queried instead of the default metadata provider.
   */
  ipv6Provider?: string
}

const networkConfig: NetworkMetadataConfig = Object.freeze({
  publicIPv4: process.env.PUBLIC_IPV4_ADDRESS,
  publicIPv6: process.env.PUBLIC_IPV6_ADDRESS,
  ipv4Provider: process.env.IPV4_ADDRESS_PROVIDER,
  ipv6Provider: process.env.IPV6_ADDRESS_PROVIDER,
})

let imdsAuthTokenCache: { value: string; expiresAt: number } | null = null

const configureHttpFamily = (family: 4 | 6): void => {
  httpClient.defaults.httpAgent = new HttpAgent({ family })
  httpClient.defaults.httpsAgent = new HttpsAgent({ family, rejectUnauthorized: false })
  httpClient.defaults.family = family
}

const fetchData = async (
  url: string,
  headers: Record<string, string> = {},
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' = 'GET'
): Promise<string> => {
  const response = await httpClient.request<string>({ url, method, headers })
  const data = response.data?.trim()

  if (!data || data.length === 0) {
    throw new Error(`fetchData failed: ${JSON.stringify({ url, headers, method })}`)
  }

  return data
}

/**
 * Sends an HTTP GET request using an IMDS token for authentication.
 *
 * If the token is expired or invalid, it will be refreshed.
 */
const fetchWithIMDSToken = async (address: string): Promise<string> => {
  if (!imdsAuthTokenCache || Date.now() >= imdsAuthTokenCache.expiresAt) {
    await ensureValidIMDSToken()
  }

  try {
    return fetchData(address, { 'X-aws-ec2-metadata-token': imdsAuthTokenCache!.value })
  } catch (error) {
    if ((error as any)?.response?.status === 401) {
      console.warn(`IMDS token rejected, refreshing and retrying...`)
      await ensureValidIMDSToken()
      return fetchData(address, { 'X-aws-ec2-metadata-token': imdsAuthTokenCache!.value })
    }
    throw error
  }
}

/**
 * Retrieves the public IP address (IPv4 or IPv6) using the best available source.
 *
 * - If a predefined public IP is available, it is returned immediately.
 * - Otherwise, the function selects between a custom provider (`ipv4Provider`/`ipv6Provider`)
 *   or the default metadata service.
 * - If no custom provider is specified, authentication via IMDS may be required.
 */
const retrievePublicIP = async (family: 4 | 6): Promise<string> => {
  const publicIP = family === 4 ? networkConfig.publicIPv4 : networkConfig.publicIPv6
  const provider = family === 4 ? networkConfig.ipv4Provider : networkConfig.ipv6Provider
  const defaultProvider = family === 4 ? DEFAULT_IPV4_PROVIDER : DEFAULT_IPV6_PROVIDER

  if (publicIP) {
    return publicIP
  }

  configureHttpFamily(family)

  const finalProvider = provider ?? defaultProvider
  return provider ? fetchData(finalProvider) : fetchWithIMDSToken(finalProvider)
}

/**
 * Refreshes the IMDS authentication token.
 * The token is cached and automatically refreshed before expiration.
 */
const ensureValidIMDSToken = async (): Promise<void> => {
  const token = await fetchData(
    IMDS_TOKEN_PROVIDER,
    {
      'X-aws-ec2-metadata-token-ttl-seconds': '21600',
    },
    'PUT'
  )

  imdsAuthTokenCache = {
    value: token,
    expiresAt: Date.now() + 21600 * 1000, // Token valid for 6 hours
  }
}

export const getPublicIPv4 = async (): Promise<string> => retrievePublicIP(4)

export const getPublicIPv6 = async (): Promise<string> => retrievePublicIP(6)
