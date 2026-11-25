import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { runInNewContext } from 'vm'
import { IssueReportService } from './issue-report.service'
import { IssueReportInputDto, ReportStatus } from './issue-report.dto'

const template = readFileSync(path.resolve(__dirname, '../templates/report.html'), 'utf-8')

// Ejecuta el script real del reporte con APIs del navegador simuladas.
function buildLinkContext(writeText?: ReturnType<typeof vi.fn>) {
  const label = { textContent: 'Copiar enlace' }
  const button = { dataset: { issueId: 'issue-2' }, disabled: false, querySelector: vi.fn(() => label), classList: { add: vi.fn(), remove: vi.fn() } }
  const field = { value: '', setAttribute: vi.fn(), style: { cssText: '' }, select: vi.fn(), remove: vi.fn() }
  const toast = { textContent: '', classList: { add: vi.fn(), remove: vi.fn() } }
  const context = {
    window: { location: { href: 'https://reports.example.com/report.html?token=abc#old', hash: '' }, isSecureContext: true, prompt: vi.fn() },
    navigator: { clipboard: writeText ? { writeText } : undefined },
    URL,
    document: { getElementById: vi.fn(() => toast), createElement: vi.fn(() => field), body: { appendChild: vi.fn() }, execCommand: vi.fn(() => true), activeElement: { focus: vi.fn() } },
    setTimeout: vi.fn(),
  }
  const scripts = [...template.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  return { context, button, label, field, toast, copy: runInNewContext(`${scripts.at(-1)![1]}; copyIssueLink`, context) }
}

describe('Enlaces directos a issues', () => {
  it('asigna anclas únicas incluso con hallazgos repetidos', async () => {
    const { service, uploaded } = buildService()
    await service.process({ status: ReportStatus.WARNING, annotations: [annotation, annotation] })
    const html = uploaded[0].html
    expect([...html.matchAll(/\sid="issue-(\d+)"/g)].map(match => match[1])).toEqual(['1', '2'])
    expect(html).toContain('data-issue-id="issue-1"')
    expect(html).toContain('data-issue-id="issue-2"')
  })

  it('copia la URL preservando parámetros y reemplazando el fragmento anterior', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const { context, copy, button, label } = buildLinkContext(writeText)
    await copy(button)
    expect(context.window.location.hash).toBe('')
    expect(writeText).toHaveBeenCalledWith('https://reports.example.com/report.html?token=abc#issue-2')
    expect(context.window.prompt).not.toHaveBeenCalled()
    expect(context.document.execCommand).not.toHaveBeenCalled()
    expect(label.textContent).toBe('✓ Copiado')
    const reset = context.setTimeout.mock.calls.find(call => call[1] === 2000)![0]
    reset()
    expect(label.textContent).toBe('Copiar enlace')
    expect(button.disabled).toBe(false)
  })

  it.each([undefined, vi.fn().mockRejectedValue(new Error('denied'))])('copia automáticamente sin diálogo si falta o falla Clipboard API', async (writeText) => {
    const { context, copy, button, field, label } = buildLinkContext(writeText)
    await copy(button)
    expect(field.value).toBe('https://reports.example.com/report.html?token=abc#issue-2')
    expect(field.select).toHaveBeenCalled()
    expect(context.document.execCommand).toHaveBeenCalledWith('copy')
    expect(field.remove).toHaveBeenCalled()
    expect(context.document.activeElement.focus).toHaveBeenCalled()
    expect(context.window.prompt).not.toHaveBeenCalled()
    expect(label.textContent).toBe('✓ Copiado')
  })

  it('usa selección directamente en HTTP', async () => {
    const writeText = vi.fn()
    const { context, copy, button } = buildLinkContext(writeText)
    context.window.isSecureContext = false
    await copy(button)
    expect(writeText).not.toHaveBeenCalled()
    expect(context.document.execCommand).toHaveBeenCalledWith('copy')
  })

  it.each([false, 'throw'])('no informa éxito si el navegador bloquea ambas alternativas (%s)', async (failure) => {
    const { context, copy, button, label, field, toast } = buildLinkContext()
    context.document.execCommand.mockImplementation(() => {
      if (failure === 'throw') throw new Error('blocked')
      return false
    })
    await copy(button)
    expect(label.textContent).toBe('Copiar enlace')
    expect(button.disabled).toBe(false)
    expect(toast.textContent).toContain('No se pudo copiar')
    expect(field.remove).toHaveBeenCalled()
    expect(context.window.prompt).not.toHaveBeenCalled()
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
