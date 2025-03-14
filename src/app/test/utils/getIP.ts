import { httpClient } from '../../../utils/httpClient'

const IPv4_ADDRESS_PROVIDER = 'https://ifconfig.me' // Local IP address of Amazon Public Services
const IPv6_ADDRESS_PROVIDER = 'http://169.254.169.254/latest/meta-data/ipv6' // Local IP address of Amazon Public Services
const IMDS_TOKEN_PROVIDER = 'http://169.254.169.254/latest/api/token' // The endpoint for returns the IMDS token required for authentication
// See here for more information: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instancedata-data-retrieval.html

export const getIPv4 = async () => {
  return (await httpClient.get<string>(IPv4_ADDRESS_PROVIDER).then((res) => res.data)).trim()
}

export const getIPv6 = async () => {
  const token = await getTokenForIMDS()
  return (
    await httpClient
      .get<string>(IPv6_ADDRESS_PROVIDER, { headers: { 'X-aws-ec2-metadata-token': token } })
      .then((res) => res.data)
  ).trim()
}

export const getTokenForIMDS = async () => {
  return (
    await httpClient
      .put<string>(IMDS_TOKEN_PROVIDER, null, {
        headers: { 'X-aws-ec2-metadata-token-ttl-seconds': '21600' },
      })
      .then((res) => res.data)
  ).trim()
}
