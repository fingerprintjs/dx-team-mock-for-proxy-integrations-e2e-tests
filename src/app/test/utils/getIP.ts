import { httpClient } from '../../../utils/httpClient'

const IP_ADDRESS_PROVIDER = 'https://checkip.amazonaws.com'
export const getIP = async () => {
  return (await httpClient.get<string>(IP_ADDRESS_PROVIDER).then((res) => res.data)).trim()
}
