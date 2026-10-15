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

const parseRegex = (p: string) => {
  const m = p.match(/^\/(.+)\/([a-z]*)$/i)
  if (!m) {
    return null
  }

  try {
    return new RegExp(m[1], m[2])
  } catch {
    console.warn(`${p} is not a valid RegEx pattern, ignoring.`)
    return null
  }
}

export function makePatternMatcher(patterns: string[]) {
  const compiled = patterns.map((p) => {
    const regex = parseRegex(p)
    if (regex) {
      return regex
    }

    return hasGlob(p) ? globToRegex(p) : p.toLowerCase()
  })
  return (name: string) => {
    const hay = name.toLowerCase()
    return compiled.some((c) => {
      if (typeof c === 'string') {
        return hay.includes(c)
      }

      // Regexes with the `g` or `y` flag keep `lastIndex` between calls, which makes later names fail to match.
      c.lastIndex = 0
      return c.test(name)
    })
  }
}
