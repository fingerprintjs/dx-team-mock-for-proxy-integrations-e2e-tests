import { webcrypto } from 'node:crypto'

export function generateRequestId(): string {
  const timestamp = Math.floor(Date.now() / 1000)
  const array = new Uint8Array(3)
  webcrypto.getRandomValues(array)
  const randomString = Array.from(array, (b) => b.toString(36).padStart(2, '0')).join('')

  return `${timestamp}.${randomString}`
}
