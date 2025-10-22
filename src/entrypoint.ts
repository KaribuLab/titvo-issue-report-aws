import { NestFactory } from '@nestjs/core'
import {
  Context,
  Handler,
  SQSEvent,
  SQSRecord
} from 'aws-lambda'
import { AppModule } from '@lambda/app.module'
import { INestApplicationContext, Logger as NestLogger } from '@nestjs/common'
import { Logger } from 'nestjs-pino'
import { IssueReportService } from '@lambda/issue-report/issue-report.service'
import { IssueReportInputDto } from './issue-report/issue-report.dto'

const logger = new NestLogger('issue-reportLambdaHandler')

async function initApp(): Promise<INestApplicationContext> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  await app.init()
  app.flushLogs()

  return app
}

let app: INestApplicationContext | undefined;

if (app === undefined) {
  app = await initApp();
}

const service = app.get(IssueReportService)

interface IssueReportEvent {
  detail: IssueReportInputDto
}

export const handler: Handler<SQSEvent> = async (
  event: SQSEvent,
  _context: Context
): Promise<void> => {
  if (event && event.Records && Array.isArray(event.Records)) {
    try {
      logger.log(`Iniciando issue-reportLambdaHandler: ${JSON.stringify(event)}`)

      const records: IssueReportEvent[] = event.Records.map(
        (record: SQSRecord) => JSON.parse(record.body) as IssueReportEvent
      )

      const promises = records.map(async (record) => {
        logger.debug(`Procesando mensaje: ${JSON.stringify(record)}`)
        return service.process(record.detail)
      })

      await Promise.all(promises)

      logger.log('issue-report LambdaHandler finalizado.')
    } catch (e) {
      logger.error('Error al procesar el servicio')
      logger.error(e)
      throw e
    }
  }
}
