import { it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { IssueReportService } from './issue-report.service'

it.each([false, true])('retains accepted evidence and separates counts (mixed=%s)', async mixed => {
  const uploadFile = vi.fn()
  const service = new IssueReportService({ get: () => 'bucket' } as any, { uploadFile } as any, readFileSync('src/templates/report.html', 'utf8'))
  const finding = { title: 'MD5', description: 'Legacy hashing', severity: 'LOW', path: 'src/a', line: 1, code: 'md5()', summary: 'Evidence', recommendation: 'Replace' }
  const acceptance = { reason: '<script>legacy</script>', accepted_by: '<Security>', expires_on: '2030-01-01' }
  await service.process({ status: 'COMPLETED', annotations: [{ ...finding, acceptance }, ...(mixed ? [finding] : [])] } as any)
  const html = uploadFile.mock.calls[0][2].toString()
  expect(html).toContain('Accepted risks: <span>1</span>')
  expect(html).toContain(`Active findings: <span>${mixed ? 1 : 0}</span>`)
  for (const text of ['MD5', 'Legacy hashing', 'md5()', 'Evidence', 'Replace', 'Bajo', '&lt;script&gt;legacy&lt;&#x2F;script&gt;', '&lt;Security&gt;', '2030-01-01']) expect(html).toContain(text)
  expect(html).not.toContain('<script>legacy</script>')
})
