import { DynamicModule, Module } from '@nestjs/common'
import { IssueReportService } from '@lambda/issue-report/issue-report.service'
import { AwsModule } from '@lambda/aws/aws.module'

export const REPORT_TEMPLATE = 'REPORT_TEMPLATE'

@Module({})
export class IssueReportModule {
  static forRoot(options: {
    useFactory: () => string;
  }): DynamicModule {
    return {
      module: IssueReportModule,
      imports: [AwsModule.forRoot()],
      providers: [
        {
          provide: REPORT_TEMPLATE,
          useFactory: options.useFactory,
        },
        IssueReportService,
      ],
      exports: [
        REPORT_TEMPLATE,
        IssueReportService,
      ],
    }
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<string>;
  }): DynamicModule {
    return {
      module: IssueReportModule,
      imports: [AwsModule.forRoot()],
      providers: [
        {
          provide: REPORT_TEMPLATE,
          useFactory: options.useFactory,
        },
        IssueReportService,
      ],
      exports: [
        REPORT_TEMPLATE,
        IssueReportService,
      ],
    }
  }
}
