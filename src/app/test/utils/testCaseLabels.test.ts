import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { glob } from 'glob'
import { getTestCaseLabels } from './testCaseLabels'
import { TestCase } from '../types/testCase'

describe('getTestCaseLabels', () => {
  it('reads the endpoint from the name', () => {
    assert.equal(getTestCaseLabels('agent request query params').endpoint, 'agent')
    assert.equal(getTestCaseLabels('ingress response body integrity 200').endpoint, 'ingress')
    assert.equal(getTestCaseLabels('browser cache request region').endpoint, 'browser cache')
  })

  it('treats names starting with v4 as v4 and everything else as v3', () => {
    assert.equal(getTestCaseLabels('v4 agent request query params').apiVersion, 'v4')
    assert.equal(getTestCaseLabels('agent request query params').apiVersion, 'v3')
  })

  it('finds the endpoint of v4 test cases too', () => {
    assert.deepEqual(getTestCaseLabels('v4 ingress request proxy secret'), { endpoint: 'ingress', apiVersion: 'v4' })
    assert.deepEqual(getTestCaseLabels('v4 browser cache request region'), {
      endpoint: 'browser cache',
      apiVersion: 'v4',
    })
  })

  it('does not take a word that merely starts like an endpoint for it', () => {
    assert.equal(getTestCaseLabels('agentless request').endpoint, 'other')
    assert.equal(getTestCaseLabels('v4agent request').apiVersion, 'v3')
  })

  it('falls back to other for names it does not know', () => {
    assert.deepEqual(getTestCaseLabels('something else entirely'), { endpoint: 'other', apiVersion: 'v3' })
    assert.deepEqual(getTestCaseLabels(''), { endpoint: 'other', apiVersion: 'v3' })
  })
})

describe('labels of the real test cases', () => {
  const casesDir = path.join(__dirname, '..', 'cases')
  const folderEndpoint: Record<string, string> = {
    agent: 'agent',
    ingress: 'ingress',
    'browser-cache': 'browser cache',
  }

  async function loadCases() {
    const files = await glob('**/*.case.ts', { cwd: casesDir, absolute: false })
    return Promise.all(
      files.map(async (file) => ({
        file,
        testCase: (await import(path.join(casesDir, file))).default as TestCase,
      }))
    )
  }

  it('give every test case a known endpoint that matches its folder', async () => {
    const cases = await loadCases()
    assert.ok(cases.length > 0)

    for (const { file, testCase } of cases) {
      const [folder] = file.split(path.sep)
      assert.equal(
        getTestCaseLabels(testCase.name).endpoint,
        folderEndpoint[folder],
        `"${testCase.name}" (${file}) should start with its endpoint, e.g. "${folderEndpoint[folder]}" or "v4 ${folderEndpoint[folder]}"`
      )
    }
  })

  it('mark exactly the v4 files as v4', async () => {
    for (const { file, testCase } of await loadCases()) {
      assert.equal(
        getTestCaseLabels(testCase.name).apiVersion,
        path.basename(file).includes('-v4-') ? 'v4' : 'v3',
        `"${testCase.name}" (${file}) has the wrong API version prefix`
      )
    }
  })
})
