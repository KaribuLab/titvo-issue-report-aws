import { Module } from '@nestjs/common'
import { IssueReportService } from '@lambda/issue-report/issue-report.service'

@Module({
  providers: [IssueReportService]
})
export class IssueReportModule {}
