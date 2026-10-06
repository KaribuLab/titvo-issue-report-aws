import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { IssueReportService } from './issue-report.service'
import { IssueReportInputDto, ReportStatus } from './issue-report.dto'

const template = readFileSync(path.resolve(__dirname, '../templates/report.html'), 'utf-8')

const annotation = {
  title: 'Secreto expuesto',
  description: 'desc',
  severity: 'HIGH',
  path: 'src/a.ts',
  line: 3,
  summary: 'sum',
  code: 'const k = "x"',
  recommendation: 'rec',
}

function buildService() {
  const uploaded: { html: string }[] = []
  const s3Service = {
    uploadFile: vi.fn(async (_bucket: string, _type: string, body: Buffer) => {
      uploaded.push({ html: body.toString('utf-8') })
    }),
  }
  const configService = {
    get: vi.fn((key: string) =>
      key === 'titvoReportBucketName' ? 'bucket' : 'https://reports.example.com'),
  }
  const service = new IssueReportService(configService as any, s3Service as any, template)
  return { service, uploaded }
}

describe('IssueReportService incomplete banner', () => {
  let ctx: ReturnType<typeof buildService>

  beforeEach(() => {
    ctx = buildService()
  })

  it('renderiza el banner con mensaje y archivos cuando viene incomplete', async () => {
    const input: IssueReportInputDto = {
      status: ReportStatus.WARNING,
      annotations: [annotation],
      incomplete: {
        failed_batches: [{ expert: 'owasp_api', batch_index: 1, paths: ['src/a.ts', 'src/b.ts'], error: 'boom' }],
        files_not_fully_analyzed: ['src/a.ts', 'src/b.ts'],
        message: 'Análisis incompleto: 1 de 5 lotes fallaron; 2 archivos sin analizar completamente',
      },
    }

    const result = await ctx.service.process(input)

    expect(result.reportURL).toMatch(/^https:\/\/reports\.example\.com\/reports\/.+\.html$/)
    const html = ctx.uploaded[0].html
    expect(html).toContain('id="incomplete-banner"')
    expect(html).toContain('Análisis incompleto: 1 de 5 lotes fallaron; 2 archivos sin analizar completamente')
    // Mustache escapa HTML en las rutas ('/' → '&#x2F;'); evita inyección vía nombres de archivo.
    expect(html).toContain('<li>src&#x2F;a.ts</li>')
    expect(html).toContain('<li>src&#x2F;b.ts</li>')
    // El banner aparece antes de los hallazgos
    expect(html.indexOf('incomplete-banner')).toBeLessThan(html.indexOf('Problemas Detectados'))
  })

  it('no renderiza el banner cuando el análisis fue completo', async () => {
    const input: IssueReportInputDto = {
      status: ReportStatus.WARNING,
      annotations: [annotation],
    }

    await ctx.service.process(input)

    const html = ctx.uploaded[0].html
    expect(html).not.toContain('id="incomplete-banner"')
    expect(html).not.toContain('Análisis incompleto')
    expect(html).toContain('Secreto expuesto')
  })

  it('genera un mensaje por defecto si incomplete no trae message', async () => {
    const input: IssueReportInputDto = {
      status: ReportStatus.WARNING,
      annotations: [],
      incomplete: { files_not_fully_analyzed: ['x.ts'] },
    }

    await ctx.service.process(input)

    const html = ctx.uploaded[0].html
    expect(html).toContain('Análisis incompleto: 0 lote(s) fallaron; 1 archivo(s) sin analizar completamente')
    expect(html).toContain('<li>x.ts</li>')
  })
})
