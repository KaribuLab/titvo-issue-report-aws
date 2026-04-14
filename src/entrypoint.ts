import { NestFactory } from '@nestjs/core'
import {
  Context,
  Handler,
} from 'aws-lambda'
import { AppModule } from '@lambda/app.module'
import { INestApplicationContext, Logger as NestLogger } from '@nestjs/common'
import { Logger } from 'nestjs-pino'
import { IssueReportService } from '@lambda/issue-report/issue-report.service'
import { IssueReportInputDto, IssueReportOutputDto } from '@lambda/issue-report/issue-report.dto'

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


export const handler: Handler<IssueReportInputDto> = async (
  event: IssueReportInputDto,
  _context: Context
): Promise<IssueReportOutputDto> => {
  try {
    logger.debug(`Iniciando issue-reportLambdaHandler: ${JSON.stringify(event)}`)
    return service.process(event)
  } catch (e) {
    logger.error('Error al procesar el servicio')
    logger.error(e)
    throw e
  }
}
