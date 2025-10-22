import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config';
import { IssueReportInputDto, IssueReportOutputDto } from '@lambda/issue-report/issue-report.dto'
import { S3Service } from '@lambda/aws/s3.service';
import { randomUUID } from 'crypto';

@Injectable()
export class IssueReportService {
  private readonly logger = new Logger(IssueReportService.name)
  constructor (
    private readonly configService: ConfigService,
    private readonly s3Service: S3Service,
  ) {}
  async process (input: IssueReportInputDto): Promise<IssueReportOutputDto> {
    const bucketName = this.configService.get<string>('titvoReportBucketName') as string;
    const websiteUrl = this.configService.get<string>('titvoReportBucketWebsiteUrl') as string;
    this.logger.debug(`Uploading report to bucket ${bucketName} with website URL ${websiteUrl}`);
    const key = `reports/${randomUUID()}.html`;
    const html = `
    <html>
    <body>
    <h1>Issue Report</h1>
    <p>${JSON.stringify(input)}</p>
    </body>
    </html>
    `;
    await this.s3Service.uploadFile(bucketName, 'text/html', Buffer.from(html), key);
    this.logger.debug(`Report uploaded to bucket ${bucketName} with website URL ${websiteUrl}/${key}`);
    return {
      reportURL: `${websiteUrl}/${key}`
    }
  }
}
