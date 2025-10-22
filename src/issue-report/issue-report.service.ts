import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config';
import { IssueReportInputDto, IssueReportOutputDto } from '@lambda/issue-report/issue-report.dto'

@Injectable()
export class IssueReportService {
  private readonly logger = new Logger(IssueReportService.name)
  constructor (
    private readonly configService: ConfigService,
  ) {}
  async process (input: IssueReportInputDto): Promise<IssueReportOutputDto> {
    const dummy = this.configService.get<string>('dummy')
    this.logger.log(`dummy: ${dummy}`)
    return {
      name: `${dummy} ${input.name}`
    }
  }
}
