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
  jobId: string
  data: {
    status: ReportStatus
    annotations: Annotation[]
  }
}
export class IssueReportOutputDto {
  jobId: string
  success: boolean
  message: string
  data: {
    reportURL: string
  }
}