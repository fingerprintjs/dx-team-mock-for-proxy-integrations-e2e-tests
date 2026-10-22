import assert from 'node:assert/strict'

// Datadog gives these names a special meaning (sending host, severity, source, trace): log lines must
// not use them for something else, e.g. `integrationHost` and `http.status_code` instead
const RESERVED_DATADOG_ATTRIBUTES = ['host', 'status', 'source', 'trace_id']

export function assertNoReservedAttributes(entry: Record<string, unknown>) {
  for (const key of RESERVED_DATADOG_ATTRIBUTES) {
    assert.equal(key in entry, false, `"${key}" is a reserved Datadog attribute: ${JSON.stringify(entry)}`)
  }
}
