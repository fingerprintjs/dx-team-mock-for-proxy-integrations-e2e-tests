# mock-for-e2e

## 0.9.0

### Minor Changes

- Log structured JSON, one object per line with `level` and `message`, so Datadog can parse and filter the logs. `/health` requests are no longer logged, `LOG_LEVEL` and `LOG_FORMAT` configure the output, and `result.logs` in the `run-tests` response now holds JSON lines. ([e6994d2](https://github.com/fingerprintjs/dx-team-mock-for-proxy-integrations-e2e-tests/commit/e6994d2b342ed6239feaccb44833b479b5d07004))

## 0.8.0

### Minor Changes

- Add test cases for the agent cache headers (`cache-control`, `age`, `cache-tag`, `etag`) on cache miss, hit and revalidation for API v3 and v4. Set whether the integration caches the agent itself with the new `agentCacheMode` run option (`--agent-cache-mode` in the CLI). ([2e4d246](https://github.com/fingerprintjs/dx-team-mock-for-proxy-integrations-e2e-tests/commit/2e4d2465ed995fd0732c2854ed015f2a112ece8a))

### Patch Changes

- Manage releases and `CHANGELOG.md` with changesets. ([c4aa5ce](https://github.com/fingerprintjs/dx-team-mock-for-proxy-integrations-e2e-tests/commit/c4aa5cedee3495b303bb0545f83472c0fab80387))

## 0.7.0

### Minor Changes

- Choose the region for test runs with the `--region` option (`us`, `eu`, `ap` or `all`). Region test cases are consolidated into a single case per API version. ([#66](https://github.com/fingerprintjs/dx-team-mock-for-proxy-integrations-e2e-tests/pull/66))

## 0.6.0

### Minor Changes

- Add support for arbitrary V4 ingress requests with `HEAD` and `PUT` test cases. ([#61](https://github.com/fingerprintjs/dx-team-mock-for-proxy-integrations-e2e-tests/pull/61))

### Patch Changes

- Fix the report mechanism of `withRetry`. ([#63](https://github.com/fingerprintjs/dx-team-mock-for-proxy-integrations-e2e-tests/pull/63))
- Ecosystem maintenance: stricter request and CLI schema validation (`apiUrl`, `trafficName` and `integrationVersion` are required), Node 24 Docker image. ([#62](https://github.com/fingerprintjs/dx-team-mock-for-proxy-integrations-e2e-tests/pull/62))
- Fix broken Preparation anchor in README. ([#65](https://github.com/fingerprintjs/dx-team-mock-for-proxy-integrations-e2e-tests/pull/65))

## 0.5.1

### Patch Changes

- Apply the mock response status code. ([#59](https://github.com/fingerprintjs/dx-team-mock-for-proxy-integrations-e2e-tests/pull/59))

## 0.5.0

### Minor Changes

- Improve cache control, logging, and retry mechanisms in `TestCaseApi`. ([#57](https://github.com/fingerprintjs/dx-team-mock-for-proxy-integrations-e2e-tests/pull/57))

## 0.4.3

### Patch Changes

- Update tests for the latest V4 design choices. ([#55](https://github.com/fingerprintjs/dx-team-mock-for-proxy-integrations-e2e-tests/pull/55))

## 0.4.2

### Patch Changes

- Update dependencies. ([#54](https://github.com/fingerprintjs/dx-team-mock-for-proxy-integrations-e2e-tests/pull/54))

## 0.4.1

### Patch Changes

- Improve error reporting for the "no proxy request received" case. ([#52](https://github.com/fingerprintjs/dx-team-mock-for-proxy-integrations-e2e-tests/pull/52))

## 0.4.0

### Minor Changes

- Add V4 support. ([#50](https://github.com/fingerprintjs/dx-team-mock-for-proxy-integrations-e2e-tests/pull/50))

### Patch Changes

- Fix 7 dependency vulnerabilities reported by Snyk. ([#51](https://github.com/fingerprintjs/dx-team-mock-for-proxy-integrations-e2e-tests/pull/51))

For releases before 0.4.0, see the git history.
