import { httpClient } from '../../../utils/httpClient'

const IPv4_ADDRESS_PROVIDER = 'http://169.254.169.254/latest/meta-data/public-ipv4' // Local IP address of Amazon Public Services
const IPv6_ADDRESS_PROVIDER = 'http://169.254.169.254/latest/meta-data/ipv6' // Local IP address of Amazon Public Services
// See here for more information: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instancedata-data-retrieval.html

export const getIPv4 = async () => {
  return (await httpClient.get<string>(IPv4_ADDRESS_PROVIDER).then((res) => res.data)).trim()
}

export const getIPv6 = async () => {
  return (await httpClient.get<string>(IPv6_ADDRESS_PROVIDER).then((res) => res.data)).trim()
}
