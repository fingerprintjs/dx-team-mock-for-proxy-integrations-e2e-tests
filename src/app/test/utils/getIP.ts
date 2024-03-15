const IP_ADDRESS_PROVIDER = 'https://checkip.amazonaws.com'
export const getIP = async () => (await fetch(IP_ADDRESS_PROVIDER).then((res) => res.text())).trim()
