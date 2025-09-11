export function sanitizeStringArray(arr: string[]) {
  return arr.map((s) => (s ?? '').trim()).filter((s) => s.length > 0)
}
