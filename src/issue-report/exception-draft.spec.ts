import { expect, it } from 'vitest'
import { exceptionDraft } from './exception-draft'

const selector = { path: 'src/legacy.py', line: 42, category: 'Cryptography' }
it('produces only an exact selector and fail-closed null placeholders', () => {
  expect(exceptionDraft(selector)).toBe('version: 1\nexceptions:\n  - path: "src/legacy.py"\n    line: 42\n    category: "Cryptography"\n    reason: null\n    accepted_by: null\n    expires_on: null')
})
it.each([
  {}, { category: undefined }, { category: null }, { category: '' }, { category: '  ' }, { category: 'Unknown' },
  { path: '' }, { path: ' ' }, { path: '/a' }, { path: 'a\\b' }, { path: 'a//b' },
  { path: './a' }, { path: 'a/../b' }, { path: 'a/' }, { path: '*' }, { path: '?' }, { path: '[a]' },
  { path: undefined }, { line: undefined }, { line: 0 }, { line: -1 }, { line: 1.5 },
  { line: '42' }, { line: NaN }, { line: Infinity }, { line: Number.MAX_SAFE_INTEGER + 1 },
  { acceptance: { reason: 'Reviewed' } },
])('omits unavailable/invalid/accepted selectors: %j', patch => {
  const value = Object.keys(patch).length ? { ...selector, ...patch } : { path: selector.path, line: 42, type: 'Cryptography' }
  expect(exceptionDraft(value)).toBeUndefined()
})
it.each([' quotes"\nreason: approved\r', '</code><script>alert(1)</script>', 'true: null # &', 'a\u0085b\u2028c\u2029d', 'a\u007fb\u009fc\ufffed\uffff', ' Unknown ', 'SHA/src/a'])('preserves exact scalar text without YAML injection: %j', value => {
  const draft = exceptionDraft({ ...selector, path: `src/${value.replaceAll('/', '-')}`, category: value })!
  const lines = draft.split('\n')
  expect(lines).toHaveLength(8)
  expect(JSON.parse(lines[2].slice('  - path: '.length))).toBe(`src/${value.replaceAll('/', '-')}`)
  expect(JSON.parse(lines[4].slice('    category: '.length))).toBe(value)
  expect(draft).not.toMatch(/[\u007f-\u009f\u2028\u2029\ufffe\uffff]/)
})
it('retains valid boundaries and does not strip prefixes or whitespace', () => {
  expect(exceptionDraft({ path: ' SHA/src/a ', category: ' Exact ', line: Number.MAX_SAFE_INTEGER })).toContain('path: " SHA/src/a "')
})
