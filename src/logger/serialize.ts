import { isSensitiveKey, REDACTED, truncate } from './redact'

export type LogFields = Record<string, unknown>

export type SerializedError = {
  kind: string
  message: string
  stack?: string
  code?: unknown
  cause?: unknown
  /** Assertion errors only: what was compared, and how. Their message is often just a label. */
  actual?: unknown
  expected?: unknown
  operator?: unknown
}

export type SerializeOptions = {
  maxStringLength: number
  maxDepth: number
}

export const DEFAULT_SERIALIZE_OPTIONS: SerializeOptions = {
  maxStringLength: 4096,
  maxDepth: 6,
}

export function serializeError(
  error: Error,
  opts: SerializeOptions,
  seen: WeakSet<object> = new WeakSet(),
  depth = 0
): SerializedError {
  // Errors are never serialized through toJSON: axios errors, for one, carry the whole request config,
  // headers included.
  const serialized: SerializedError = {
    kind: error.name,
    message: truncate(error.message, opts.maxStringLength),
    stack: error.stack ? truncate(error.stack, opts.maxStringLength) : undefined,
  }

  const { code, cause } = error as { code?: unknown; cause?: unknown }
  // node's AssertionError, which our own assert helper throws too
  const isAssertion = code === 'ERR_ASSERTION'
  if (code === undefined && cause === undefined) {
    return serialized
  }

  seen.add(error)
  try {
    // The cause counts as one level deeper, so a long chain is cut off like any deep structure
    if (code !== undefined) {
      serialized.code = normalize(code, opts, seen, depth + 1)
    }
    if (cause !== undefined) {
      serialized.cause = normalize(cause, opts, seen, depth + 1)
    }
    if (isAssertion) {
      const { actual, expected, operator } = error as { actual?: unknown; expected?: unknown; operator?: unknown }
      serialized.actual = normalize(actual, opts, seen, depth + 1)
      serialized.expected = normalize(expected, opts, seen, depth + 1)
      serialized.operator = normalize(operator, opts, seen, depth + 1)
    }
  } finally {
    seen.delete(error)
  }

  return serialized
}

/** Turns any value into something JSON.stringify handles without throwing, on a single line. */
export function normalize(
  value: unknown,
  opts: SerializeOptions = DEFAULT_SERIALIZE_OPTIONS,
  seen: WeakSet<object> = new WeakSet(),
  depth = 0
): unknown {
  switch (typeof value) {
    case 'string':
      return truncate(value, opts.maxStringLength)
    case 'number':
      return Number.isFinite(value) ? value : String(value)
    case 'boolean':
    case 'undefined':
      return value
    case 'bigint':
      return value.toString()
    case 'symbol':
      return value.toString()
    case 'function':
      return `[Function ${value.name || 'anonymous'}]`
  }

  if (value === null) {
    return null
  }

  const obj = value as object

  if (obj instanceof Error) {
    if (seen.has(obj)) {
      return '[Circular]'
    }

    return depth >= opts.maxDepth ? '[Error]' : serializeError(obj, opts, seen, depth)
  }

  if (obj instanceof Uint8Array) {
    // Binary bodies are useless in a log
    return `[binary ${obj.byteLength} bytes]`
  }

  if (obj instanceof ArrayBuffer) {
    return `[binary ${obj.byteLength} bytes]`
  }

  if (obj instanceof Date) {
    return Number.isNaN(obj.getTime()) ? 'Invalid Date' : obj.toISOString()
  }

  if (seen.has(obj)) {
    return '[Circular]'
  }

  if (depth >= opts.maxDepth) {
    return Array.isArray(obj) ? '[Array]' : '[Object]'
  }

  seen.add(obj)
  try {
    if (Array.isArray(obj)) {
      return obj.map((item) => normalize(item, opts, seen, depth + 1))
    }

    if (obj instanceof Map) {
      return normalizeEntries(obj.entries(), opts, seen, depth)
    }

    if (obj instanceof Set) {
      return Array.from(obj, (item) => normalize(item, opts, seen, depth + 1))
    }

    const toJSON = (obj as { toJSON?: unknown }).toJSON
    if (typeof toJSON === 'function') {
      // Covers URL, AxiosHeaders and anything else that describes itself
      return normalize(toJSON.call(obj), opts, seen, depth + 1)
    }

    return normalizeEntries(Object.entries(obj), opts, seen, depth)
  } catch (error) {
    return `[Unserializable: ${error instanceof Error ? error.message : String(error)}]`
  } finally {
    seen.delete(obj)
  }
}

function normalizeEntries(
  entries: Iterable<[unknown, unknown]>,
  opts: SerializeOptions,
  seen: WeakSet<object>,
  depth: number
): LogFields {
  const result: LogFields = {}
  for (const [key, entry] of entries) {
    const name = String(key)
    result[name] = isSensitiveKey(name) ? REDACTED : normalize(entry, opts, seen, depth + 1)
  }
  return result
}

/** Serializes to one line of JSON. Never throws. */
export function safeStringify(value: unknown, opts: SerializeOptions = DEFAULT_SERIALIZE_OPTIONS): string {
  try {
    return JSON.stringify(normalize(value, opts)) ?? 'null'
  } catch (error) {
    return JSON.stringify({ serializationError: error instanceof Error ? error.message : String(error) })
  }
}
