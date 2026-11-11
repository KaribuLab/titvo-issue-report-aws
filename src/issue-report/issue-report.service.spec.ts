import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { runInNewContext } from 'vm'
import { IssueReportService } from './issue-report.service'
import { IssueReportInputDto, ReportStatus } from './issue-report.dto'

const template = readFileSync(path.resolve(__dirname, '../templates/report.html'), 'utf-8')

// Ejecuta el script real del reporte con APIs del navegador simuladas.
function buildLinkContext(writeText?: ReturnType<typeof vi.fn>) {
  const context = {
    window: { location: { href: 'https://reports.example.com/report.html?token=abc#old', hash: '' }, prompt: vi.fn() },
    navigator: { clipboard: writeText ? { writeText } : undefined },
    URL,
    document: { getElementById: vi.fn(() => ({ textContent: '', classList: { add: vi.fn(), remove: vi.fn() } })) },
    setTimeout: vi.fn(),
  }
  const scripts = [...template.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  return { context, copy: runInNewContext(`${scripts.at(-1)![1]}; copyIssueLink`, context) }
}

describe('Enlaces directos a issues', () => {
  it('asigna anclas únicas incluso con hallazgos repetidos', async () => {
    const { service, uploaded } = buildService()
    await service.process({ status: ReportStatus.WARNING, annotations: [annotation, annotation] })
    const html = uploaded[0].html
    expect([...html.matchAll(/id="issue-(\d+)"/g)].map(match => match[1])).toEqual(['1', '2'])
    expect(html).toContain('href="#issue-1"')
    expect(html).toContain('href="#issue-2"')
  })

  it('copia la URL preservando parámetros y reemplazando el fragmento anterior', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const { context, copy } = buildLinkContext(writeText)
    const event = { preventDefault: vi.fn() }
    await copy(event, { hash: '#issue-2' })
    expect(event.preventDefault).toHaveBeenCalled()
    expect(context.window.location.hash).toBe('#issue-2')
    expect(writeText).toHaveBeenCalledWith('https://reports.example.com/report.html?token=abc#issue-2')
    expect(context.window.prompt).not.toHaveBeenCalled()
  })

  it.each([undefined, vi.fn().mockRejectedValue(new Error('denied'))])('permite copiar manualmente si falla el portapapeles', async (writeText) => {
    const { context, copy } = buildLinkContext(writeText)
    await copy({ preventDefault: vi.fn() }, { hash: '#issue-1' })
    expect(context.window.prompt).toHaveBeenCalledWith('Copia el enlace a este issue:', 'https://reports.example.com/report.html?token=abc#issue-1')
  })
})

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
