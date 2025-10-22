export enum ReportStatus {
  OPEN = 'SUCCESS',
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
  repository: string
  status: ReportStatus
  annotations: Annotation[]
}
export class IssueReportOutputDto {
  reportURL: string
}