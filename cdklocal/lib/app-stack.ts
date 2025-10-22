import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import * as path from 'path';

export const basePath = '/tvo/security-scan/localstack/infra';

export interface AppStackProps extends cdk.StackProps {
  s3ReportBucketArn: string;
  s3ReportBucketName: string;
  s3ReportWebsiteUrl: string;
  eventBusName: string;
}
export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    // Importar cola SQS existente de LocalStack
    const inputQueue = Queue.fromQueueArn(
      this,
      'InputQueue',
      `arn:aws:sqs:${props?.env?.region || 'us-east-1'}:${props?.env?.account || '000000000000'}:tvo-mcp-issue-report-input-local`
    );

    // Lambda Function
    const lambdaFunction = new Function(this, 'IssueReportFunction', {
      functionName: 'mcp-issue-report-local',
      runtime: Runtime.NODEJS_22_X,
      handler: 'src/entrypoint.handler',
      code: Code.fromAsset(path.join(__dirname, '../../dist/lambda.zip')),
      timeout: cdk.Duration.seconds(300),
      memorySize: 512,
      description: 'Lambda function for MCP Issue Report',
      environment: {
        AWS_STAGE: 'local',
        LOG_LEVEL: 'debug',
        TITVO_REPORT_BUCKET_NAME: props.s3ReportBucketName,
        TITVO_REPORT_BUCKET_WEBSITE_URL: props.s3ReportWebsiteUrl,
        TITVO_EVENT_BUS_NAME: props.eventBusName,
        NODE_OPTIONS: '--enable-source-maps',
      },
    });

    // Conectar Lambda con SQS
    lambdaFunction.addEventSource(new SqsEventSource(inputQueue, {
      batchSize: 10,
      maxBatchingWindow: cdk.Duration.seconds(5),
      reportBatchItemFailures: true,
    }));

    // Parámetros SSM para la Lambda
    new StringParameter(this, 'SSMParameterLambdaArn', {
      parameterName: `${basePath}/lambda/issue-report/function_arn`,
      stringValue: lambdaFunction.functionArn,
      description: 'ARN de la función Lambda de MCP Issue Report'
    });

    new StringParameter(this, 'SSMParameterLambdaName', {
      parameterName: `${basePath}/lambda/issue-report/function_name`,
      stringValue: lambdaFunction.functionName,
      description: 'Nombre de la función Lambda de MCP Issue Report'
    });

    new cdk.CfnOutput(this, 'CloudWatchLogGroupName', {
      value: lambdaFunction.logGroup.logGroupName,
      description: 'Nombre del grupo de logs de CloudWatch'
    });
  }
}
