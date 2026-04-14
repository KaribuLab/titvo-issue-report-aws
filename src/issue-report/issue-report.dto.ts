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

export class IssueReportInputDto {
  status: ReportStatus
  annotations: Annotation[]
}
export class IssueReportOutputDto {
  reportURL: string
}