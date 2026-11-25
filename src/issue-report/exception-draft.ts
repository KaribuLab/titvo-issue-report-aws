/** A drafting aid only: null review fields deliberately fail policy validation. */
export function exceptionDraft(finding: { path?: unknown; line?: unknown; category?: unknown; acceptance?: unknown }): string | undefined {
  const { path, line, category } = finding
  if (finding.acceptance || typeof category !== 'string' || !category.trim() || category === 'Unknown' ||
    typeof path !== 'string' || !path.trim() || path.startsWith('/') || /[\\*?\[\]]/.test(path) ||
    path.split('/').some(part => part === '' || part === '.' || part === '..') ||
    typeof line !== 'number' || !Number.isSafeInteger(line) || line <= 0) return undefined

  // JSON strings are a YAML subset; escape YAML line breaks and nonprintables too.
  const quote = (value: string) => JSON.stringify(value).replace(/[\u007f-\u009f\u2028\u2029\ufffe\uffff]/g,
    char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`)
  return `version: 1\nexceptions:\n  - path: ${quote(path)}\n    line: ${line}\n    category: ${quote(category)}\n    reason: null\n    accepted_by: null\n    expires_on: null`
}
