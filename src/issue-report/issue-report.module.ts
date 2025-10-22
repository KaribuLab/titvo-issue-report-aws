import { Module } from '@nestjs/common'
import { IssueReportService } from '@lambda/issue-report/issue-report.service'
import { createS3Service, S3Service } from '@lambda/aws/s3.service'
import { ConfigService } from '@nestjs/config'
import { EventBridgeService, createEventBridgeService } from '@lambda/aws/eventbridge'

@Module({
  providers: [
    IssueReportService,
    {
      provide: S3Service,
      useFactory: (configService: ConfigService) => createS3Service({
        awsStage: configService.get<string>('awsStage') ?? 'prod',
        awsEndpoint: configService.get<string>('awsEndpoint') as string,
        awsRegion: configService.get<string>('awsRegion') as string,
      }),
      inject: [ConfigService],
    },
    {
      provide: EventBridgeService,
      useFactory: (configService: ConfigService) => createEventBridgeService({
        awsStage: configService.get<string>('awsStage') ?? 'prod',
        awsEndpoint: configService.get<string>('awsEndpoint') as string,
        awsRegion: configService.get<string>('awsRegion') as string,
      }),
      inject: [ConfigService],
    }
  ],
})
export class IssueReportModule { }
