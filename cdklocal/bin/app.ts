#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { SSMClient, GetParametersByPathCommand } from '@aws-sdk/client-ssm';
import { AppStack, basePath } from '../lib/app-stack';

(async () => {
  const ssmClient = new SSMClient({
    region: 'us-east-1',
    endpoint: process.env.AWS_ENDPOINT_URL ?? 'http://localstack:4566',
  });
  const command = new GetParametersByPathCommand({
    Path: `${basePath}/s3/report`,
  });
  const response = await ssmClient.send(command);
  if (!response.Parameters) {
    throw new Error('No parameters found');
  }
  const params = response.Parameters.reduce((acc, param) => {
    if (param.Name !== undefined && param.Value !== undefined) {
      acc[param.Name as keyof Record<string, string>] = param.Value;
    }
    return acc;
  }, {} as Record<string, string>);
  const app = new cdk.App();
  new AppStack(app, 'McpIssueReportStack', {
    /* If you don't specify 'env', this stack will be environment-agnostic.
     * Account/Region-dependent features and context lookups will not work,
     * but a single synthesized template can be deployed anywhere. */

    /* Uncomment the next line to specialize this stack for the AWS Account
     * and Region that are implied by the current CLI configuration. */
    // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

    /* Uncomment the next line if you know exactly what Account and Region you
     * want to deploy the stack to. */
    env: { account: '000000000000', region: 'us-east-1' },

    // Usar el sintetizador heredado para LocalStack (no requiere bootstrap)
    synthesizer: new cdk.LegacyStackSynthesizer(),
    s3ReportBucketArn: params[`${basePath}/s3/report/bucket_arn`],
    s3ReportBucketName: params[`${basePath}/s3/report/bucket_name`],
    s3ReportWebsiteUrl: params[`${basePath}/s3/report/website_url`],

    /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
  });
})();