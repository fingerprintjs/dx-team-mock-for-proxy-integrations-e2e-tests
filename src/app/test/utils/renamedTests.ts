import { makePatternMatcher } from '../../../utils/patternMatcher'

/**
 * Region test cases that were merged into one case.
 */
export const RENAMED_REGION_TESTS: Record<string, string> = {
  'ingress request regions': 'ingress request region',
  'ingress request us region': 'ingress request region',
  'ingress request invalid region': 'ingress request region',
  'v4 ingress request regions': 'v4 ingress request region',
  'v4 ingress request us region': 'v4 ingress request region',
  'v4 ingress request invalid region': 'v4 ingress request region',
  'browser cache request regions': 'browser cache request region',
  'browser cache request us region': 'browser cache request region',
  'browser cache request invalid region': 'browser cache request region',
  'v4 browser cache request regions': 'v4 browser cache request region',
  'v4 browser cache request us region': 'v4 browser cache request region',
  'v4 browser cache request invalid region': 'v4 browser cache request region',
}

/**
 * Returns a warning for each include/exclude filter that matches a removed test name.
 */
export function getRenamedTestFilterWarnings(filters: string[]): string[] {
  const warnings: string[] = []

  for (const filter of filters) {
    const matches = makePatternMatcher([filter])
    const replacements = new Set<string>()

    for (const [removed, replacement] of Object.entries(RENAMED_REGION_TESTS)) {
      if (matches(removed) && !matches(replacement)) {
        replacements.add(replacement)
      }
    }

    if (replacements.size > 0) {
      warnings.push(
        `Filter "${filter}" matches region tests that were removed. ` +
          `Use ${[...replacements].map((name) => `"${name}"`).join(', ')} and the \`region\` option instead.`
      )
    }
  }

  return warnings
}
