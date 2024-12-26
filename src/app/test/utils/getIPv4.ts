import { httpClient } from '../../../utils/httpClient'

const IPv4_ADDRESS_PROVIDER = 'https://checkip.amazonaws.com'
const IPv6_ADDRESS_PROVIDER = 'https://api6.ipify.org'

export const getIPv4 = async () => {
  return (await httpClient.get<string>(IPv4_ADDRESS_PROVIDER).then((res) => res.data)).trim()
}

export const getIPv6 = async () => {
  return (await httpClient.get<string>(IPv6_ADDRESS_PROVIDER).then((res) => res.data)).trim()
}
