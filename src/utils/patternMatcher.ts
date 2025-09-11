export const hasGlob = (p: string) => /[*?]/.test(p)

const escapeRegex = (s: string) => s.replace(/[.*+?${}()|[\]\\]/g, '\\$&')

export const globToRegex = (p: string) => {
  let constructed = ''
  for (const char of p) {
    if (char === '*') {
      constructed += '.*'
    } else if (char === '?') {
      constructed += '.'
    } else {
      constructed += escapeRegex(char)
    }
  }
  return new RegExp(`^${constructed}$`, 'i')
}

export function makePatternMatcher(patterns: string[]) {
  const compiled = patterns.map((p) => (hasGlob(p) ? globToRegex(p) : p.toLowerCase()))
  return (name: string) => {
    const hay = name.toLowerCase()
    return compiled.some((c) => (typeof c === 'string' ? hay.includes(c) : c.test(name)))
  }
}
