terraform {
  source = "git::https://github.com/KaribuLab/terraform-aws-function.git?ref=v0.10.0"
}

locals {
  serverless    = read_terragrunt_config(find_in_parent_folders("serverless.hcl"))
  function_name = "${local.serverless.locals.service_name}-lambda-${local.serverless.locals.stage}"
  common_tags   = local.serverless.locals.common_tags
  base_path     = "${local.serverless.locals.parameter_path}/${local.serverless.locals.stage}"
}

include {
  path = find_in_parent_folders()
}

dependency log {
  config_path = "${get_parent_terragrunt_dir()}/aws/cloudwatch"
  mock_outputs = {
    log_arn = "log_arn"
  }
}

dependency parameters {
  config_path = "${get_parent_terragrunt_dir()}/aws/parameter"
  mock_outputs = {
    parameters = {
      "/tvo/security-scan/prod/infra/sqs/mcp/issue-report/input/queue_arn" = "arn:aws:sqs:us-east-1:000000000000:test-queue"
      "/tvo/security-scan/prod/infra/s3/report_bucket_arn" = "arn:aws:s3:us-east-1:000000000000:test-bucket"
      "/tvo/security-scan/prod/infra/s3/report_bucket_name" = "test-bucket"
      "/tvo/security-scan/prod/infra/s3/report_bucket_website_url" = "https://test-bucket.s3.us-east-1.amazonaws.com"
      "/tvo/security-scan/prod/infra/eventbridge/eventbus_arn" = "arn:aws:events:us-east-1:000000000000:event-bus/test-bus"
      "/tvo/security-scan/prod/infra/eventbridge/eventbus_name" = "test-bus"
    }
  }
}

inputs = {
  function_name = local.function_name
  iam_policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Effect" : "Allow",
        "Action" : [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        "Resource" : "${dependency.log.outputs.log_arn}:*"
      },
      {
        "Effect" : "Allow",
        "Action" : [
          "sqs:ChangeMessageVisibility",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:ReceiveMessage",
        ],
        "Resource" : dependency.parameters.outputs.parameters["${local.base_path}/infra/sqs/issue-report/queue_arn"]
      },
      {
        "Effect" : "Allow",
        "Action" : [
          "s3:PutObject",
          "s3:GetObject",
        ],
        "Resource" : [
          dependency.parameters.outputs.parameters["${local.base_path}/infra/s3/report_bucket_arn"],
          "${dependency.parameters.outputs.parameters["${local.base_path}/infra/s3/report_bucket_arn"]}/*"
        ]
      }
      {
        "Effect" : "Allow",
        "Action" : [
          "events:PutEvents",
        ],
        "Resource" : dependency.parameters.outputs.parameters["${local.base_path}/infra/eventbridge/eventbus_arn"]
      },
    ]
  })
  environment_variables = {
    AWS_STAGE                       = local.serverless.locals.stage
    LOG_LEVEL                       = local.serverless.locals.stage != "prod" ? "debug" : "info"
    TITVO_EVENT_BUS_NAME            = dependency.parameters.outputs.parameters["${local.base_path}/infra/eventbridge/eventbus_name"]
    TITVO_REPORT_BUCKET_NAME        = dependency.parameters.outputs.parameters["${local.base_path}/infra/s3/report_bucket_name"]
    TITVO_REPORT_BUCKET_WEBSITE_URL = dependency.parameters.outputs.parameters["${local.base_path}/infra/s3/report_bucket_website_url"]
    NODE_OPTIONS                    = "--enable-source-maps"
  }
  event_sources_arn = [
    dependency.parameters.outputs.parameters["${local.base_path}/infra/sqs/mcp/issue-report/input/queue_arn"]
  ]
  runtime       = "nodejs22.x"
  handler       = "src/entrypoint.handler"
  bucket        = local.serverless.locals.service_bucket
  file_location = "${get_parent_terragrunt_dir()}/build"
  zip_location  = "${get_parent_terragrunt_dir()}/dist"
  zip_name      = "${local.function_name}.zip"
  common_tags = merge(local.common_tags, {
    Name = local.function_name
  })
}
