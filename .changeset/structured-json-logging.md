---
"mock-for-e2e": minor
---

Log structured JSON, one object per line with `level` and `message`, so Datadog can parse and filter the logs. `/health` requests are no longer logged, `LOG_LEVEL` and `LOG_FORMAT` configure the output, and `result.logs` in the `run-tests` response now holds JSON lines.
