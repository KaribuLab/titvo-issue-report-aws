import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { ConfigService } from "@nestjs/config";

export interface S3ServiceOptions {
    awsStage: string;
    awsEndpoint: string;
    awsRegion: string;
}

export class S3Service {
    constructor(
        private readonly s3Client: S3Client,
    ) { }
    async uploadFile(bucketName: string, contentType: string, file: Buffer, key: string): Promise<void> {
        await this.s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            ContentType: contentType,
            Key: key,
            Body: file,
        }));
    }
}

export function createS3Service(options: S3ServiceOptions): S3Service {
    const s3Client = options.awsStage === 'localstack' ? new S3Client({
        region: options.awsRegion,
        endpoint: options.awsEndpoint,
    }) : new S3Client();
    return new S3Service(s3Client);
}