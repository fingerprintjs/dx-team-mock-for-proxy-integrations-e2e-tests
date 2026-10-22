---
"mock-for-e2e": minor
---

Add test cases for the agent cache headers (`cache-control`, `age`, `cache-tag`, `etag`) on cache miss, hit and revalidation for API v3 and v4. Set whether the integration caches the agent itself with the new `agentCacheMode` run option (`--agent-cache-mode` in the CLI).
