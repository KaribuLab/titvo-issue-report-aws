import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config';
import { IssueReportInputDto, IssueReportOutputDto } from '@lambda/issue-report/issue-report.dto'
import { S3Service } from '@lambda/aws/s3.service';
import { randomUUID } from 'crypto';
import Mustache from 'mustache';

@Injectable()
export class IssueReportService {
  private readonly logger = new Logger(IssueReportService.name)
  constructor(
    private readonly configService: ConfigService,
    private readonly s3Service: S3Service,
    @Inject('REPORT_TEMPLATE') private readonly reportTemplate: string,
  ) { }
  async process(input: IssueReportInputDto): Promise<IssueReportOutputDto> {
    try {
      const bucketName = this.configService.get<string>('titvoReportBucketName') as string;
      const websiteUrl = this.configService.get<string>('titvoReportBucketWebsiteUrl') as string;
      this.logger.debug(`Uploading report to bucket ${bucketName} with website URL ${websiteUrl}`);
      const key = `reports/${randomUUID()}.html`;
      const renderedHtml = Mustache.render(this.reportTemplate, this.prepareTemplateData(input));
      await this.s3Service.uploadFile(bucketName, 'text/html; charset=utf-8', Buffer.from(renderedHtml), key);
      this.logger.debug(`Report uploaded to bucket ${bucketName} with website URL ${websiteUrl}/${key}`);
      return {
        reportURL: `${websiteUrl}/${key}`,
      };
    } catch (error) {
      throw new Error(`Error processing issue report: ${error}`);
    }
  }

  private prepareTemplateData(data: IssueReportInputDto) {
    const annotations = data.annotations || [];

    // Calcular contadores por severidad
    const severityCounts = annotations.reduce((acc, issue) => {
      const severity = issue.severity.toUpperCase();
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Mapear issues agregando campos necesarios para Mustache
    const issues = annotations.map((issue, index) => ({
      ...issue,
      index: index + 1,
      severity_lower: issue.severity.toLowerCase(),
      severity_label: this.getSeverityLabel(issue.severity)
    }));

    return {
      scan_date: new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      total_issues: annotations.length,
      critical_issues: severityCounts['CRITICAL'] || 0,
      high_issues: severityCounts['HIGH'] || 0,
      medium_issues: severityCounts['MEDIUM'] || 0,
      low_issues: severityCounts['LOW'] || 0,
      issues
    };
  }

  private getSeverityLabel(severity: string): string {
    const labels: Record<string, string> = {
      'CRITICAL': 'Crítico',
      'HIGH': 'Alto',
      'MEDIUM': 'Medio',
      'LOW': 'Bajo'
    };
    return labels[severity.toUpperCase()] || severity;
  }
}
