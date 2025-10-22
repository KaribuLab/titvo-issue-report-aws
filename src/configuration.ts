export default () => ({
  awsStage: process.env.AWS_STAGE ?? 'prod',
  awsEndpoint: process.env.AWS_ENDPOINT,
  awsRegion: process.env.AWS_REGION,
  titvoReportBucketName: process.env.TITVO_REPORT_BUCKET_NAME,
  titvoReportBucketWebsiteUrl: process.env.TITVO_REPORT_BUCKET_WEBSITE_URL,
  titvoEventBusName: process.env.TITVO_EVENT_BUS_NAME,
});
