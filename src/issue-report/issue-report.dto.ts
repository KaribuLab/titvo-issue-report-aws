export enum ReportStatus {
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  WARNING = 'WARNING',
}

export class Annotation {
  title: string
  description: string
  severity: string
  path: string
  line: number
  summary: string
  code: string
  recommendation: string
}

export class FailedBatch {
  expert: string
  batch_index: number
  paths: string[]
  error: string
}

/**
 * Presente cuando uno o más lotes de análisis fallaron. El reporte sigue
 * generándose pero debe indicar que el análisis quedó incompleto.
 */
export class IncompleteAnalysis {
  failed_batches?: FailedBatch[]
  files_not_fully_analyzed?: string[]
  message?: string
}

export class IssueReportInputDto {
  status: ReportStatus
  annotations: Annotation[]
  incomplete?: IncompleteAnalysis
}
export class IssueReportOutputDto {
  reportURL: string
}