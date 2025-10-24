import { Test } from '@nestjs/testing'
import { describe, it, expect } from 'vitest'
import { AppModule } from './app.module'
import { IssueReportService } from './issue-report/issue-report.service'

describe('AppModule', () => {
  it('debería crear la aplicación correctamente', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    expect(moduleRef).toBeDefined()
  })

  it('debería proveer IssueReportService', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    const service = moduleRef.get(IssueReportService)
    expect(service).toBeDefined()
  })

  it('debería inyectar el template correctamente', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    const service = moduleRef.get(IssueReportService)
    // Verificar que el servicio tiene el template inyectado
    expect((service as any).reportTemplate).toBeDefined()
    expect((service as any).reportTemplate).toContain('<!DOCTYPE html>')
    expect((service as any).reportTemplate).toContain('Reporte de Análisis de Seguridad')
  })
})
