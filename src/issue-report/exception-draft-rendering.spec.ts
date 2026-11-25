import { expect, it, vi } from 'vitest'
import { readFileSync } from 'fs'
import { IssueReportService } from './issue-report.service'

const template = readFileSync('src/templates/report.html', 'utf8')
const finding = { title: 'MD5', description: 'Original evidence', severity: 'HIGH', path: 'src/a.py', line: 42, category: 'Cryptography', code: 'md5()', summary: 'Evidence', recommendation: 'Replace' }
const decode = (text: string) => text.replace(/&(amp|lt|gt|quot|#39|#x2F|#x60|#x3D);/g, entity => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#x2F;': '/', '&#x60;': '`', '&#x3D;': '=' }[entity]!))
async function render(annotation: object) {
  const uploadFile = vi.fn()
  const service = new IssueReportService({ get: () => 'local' } as any, { uploadFile } as any, template)
  await service.process({ status: 'FAILED', annotations: [annotation] } as any)
  expect(uploadFile).toHaveBeenCalledTimes(1)
  return uploadFile.mock.calls[0][2].toString() as string
}
it('renders selectable escaped YAML next to unchanged evidence using the real template and sink', async () => {
  const category = 'Exact"\nexceptions: []\u0085\u2028\u2029</code><script>hostile</script>'
  const html = await render({ ...finding, category })
  const block = html.match(/<pre><code class="language-yaml">([\s\S]*?)<\/code><\/pre>/)![1]
  expect(block).not.toContain('<script>')
  expect(block).toContain('&lt;')
  const yaml = decode(block)
  expect(JSON.parse(yaml.split('\n')[4].slice(14))).toBe(category)
  expect(yaml).toContain('    reason: null\n    accepted_by: null\n    expires_on: null')
  expect(yaml).toContain('  - path: "src/a.py"\n    line: 42')
  for (const text of ['MD5', 'Original evidence', 'Alto', 'md5()', 'Evidence', 'Replace', 'Problemas Altos: <span>1</span>', 'Total de Problemas: <span>1</span>', 'draft—not approval', 'Git review', 'all three', 'exact coordinates', 'existing exceptions']) expect(html).toContain(text)
})
it.each([{ category: undefined }, { category: 'Unknown' }, { path: '../a' }, { line: 0 }, { acceptance: { reason: '<reviewed>', accepted_by: 'Security', expires_on: '2030-01-01' } }])('preserves legacy and accepted rendering without a draft: %j', async patch => {
  const html = await render({ ...finding, ...patch })
  expect(html).not.toContain('language-yaml')
  expect(html).toContain('Original evidence')
  if ('acceptance' in patch) {
    expect(html).toContain('Accepted risks: <span>1</span>')
    expect(html).toContain('Active findings: <span>0</span>')
    expect(html).toContain('Reason: &lt;reviewed&gt;')
    expect(html).toContain('Expires on: 2030-01-01')
  }
})
