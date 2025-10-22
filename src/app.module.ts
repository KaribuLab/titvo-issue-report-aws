import { Module } from '@nestjs/common'
import configuration from '@lambda/configuration';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino'
import * as pino from 'pino'
import { IssueReportModule } from '@lambda/issue-report/issue-report.module'

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        timestamp: pino.stdTimeFunctions.isoTime,
        formatters: {
          level (label: string): { level: string } {
            return { level: label }
          }
        }
      }
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    IssueReportModule,
  ]
})
export class AppModule {}
