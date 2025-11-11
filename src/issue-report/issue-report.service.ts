import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config';
import { IssueReportInputDto, IssueReportOutputDto } from '@lambda/issue-report/issue-report.dto'
import { S3Service } from '@lambda/aws/s3.service';
import { randomUUID } from 'crypto';
import Mustache from 'mustache';
import { EventBridgeService } from '@lambda/aws/eventbridge';
import { REPORT_TEMPLATE } from '@lambda/issue-report/issue-report.module';

@Injectable()
export class IssueReportService {
  private readonly logger = new Logger(IssueReportService.name)
  constructor (
    private readonly configService: ConfigService,
    private readonly s3Service: S3Service,
    private readonly eventBridgeService: EventBridgeService,
    @Inject('REPORT_TEMPLATE') private readonly reportTemplate: string,
  ) {}
  async process (input: IssueReportInputDto): Promise<IssueReportOutputDto> {
    const bucketName = this.configService.get<string>('titvoReportBucketName') as string;
    const websiteUrl = this.configService.get<string>('titvoReportBucketWebsiteUrl') as string;
    this.logger.debug(`Uploading report to bucket ${bucketName} with website URL ${websiteUrl}`);
    const key = `reports/${randomUUID()}.html`;
    const renderedHtml = Mustache.render(this.reportTemplate, this.prepareTemplateData(input.data));
    await this.s3Service.uploadFile(bucketName, 'text/html; charset=utf-8', Buffer.from(renderedHtml), key);
    this.logger.debug(`Report uploaded to bucket ${bucketName} with website URL ${websiteUrl}/${key}`);
    await this.eventBridgeService.putEvents([{
      Source: 'mcp.tool.issue.report',
      DetailType: 'output',
      Detail: JSON.stringify({
        job_id: input.jobId,
        success: true,
        message: 'Report uploaded successfully',
        data: {
          report_url: `${websiteUrl}/${key}`
        }
      }),
      EventBusName: this.configService.get<string>('titvoEventBusName') as string
    }]);
    this.logger.debug(`EventBridge event sent for job ${input.jobId}`);
    return {
      jobId: input.jobId,
      success: true,
      message: 'Report uploaded successfully',
      data: {
        reportURL: `${websiteUrl}/${key}`
      }
    }
  }

  private prepareTemplateData(data: IssueReportInputDto['data']) {
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
