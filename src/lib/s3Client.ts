import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  type PutObjectCommandInput
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import { env } from '$env/dynamic/private';

// Lazy S3 client initialization - only fails when actually used, not during build
let _s3Client: S3Client | null = null;
let _awsConfig: {
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
  AWS_S3_BUCKET: string;
} | null = null;

function getS3Client(): S3Client {
  if (!_s3Client) {
    // Get environment variables
    const AWS_ACCESS_KEY_ID = env.AWS_ACCESS_KEY_ID;
    const AWS_SECRET_ACCESS_KEY = env.AWS_SECRET_ACCESS_KEY;
    const AWS_REGION = env.AWS_REGION || 'eu-west-3';
    const AWS_S3_BUCKET = env.AWS_S3_BUCKET;

    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_S3_BUCKET) {
      throw new Error('Missing required AWS environment variables. Please check your .env file.');
    }

    // Cache config for other functions
    _awsConfig = {
      AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY,
      AWS_REGION,
      AWS_S3_BUCKET
    };

    // Initialize S3 client
    _s3Client = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY
      }
    });
  }
  return _s3Client;
}

function getAwsConfig() {
  if (!_awsConfig) {
    // Initialize S3Client first to populate config
    getS3Client();
  }
  return _awsConfig!;
}

export interface UploadResult {
  success: boolean;
  s3Url?: string;
  signedUrl?: string;
  s3Key?: string;
  error?: string;
}

/**
 * Upload a file to S3 bucket
 * @param filePath - Local path to the file to upload
 * @param s3Key - The key (path) where the file will be stored in S3
 * @param contentType - MIME type of the file (optional, will be inferred if not provided)
 * @returns Promise<UploadResult>
 */
export async function uploadFileToS3(
  filePath: string,
  s3Key: string,
  contentType?: string
): Promise<UploadResult> {
  try {
    const s3Client = getS3Client();
    const { AWS_S3_BUCKET, AWS_REGION } = getAwsConfig();

    console.log(`Uploading file ${filePath} to S3 bucket ${AWS_S3_BUCKET} with key ${s3Key}`);

    // Read the file
    const fileBuffer = await fsPromises.readFile(filePath);

    // Infer content type if not provided
    if (!contentType) {
      const ext = path.extname(filePath).toLowerCase();
      switch (ext) {
        case '.mp3':
          contentType = 'audio/mpeg';
          break;
        case '.wav':
          contentType = 'audio/wav';
          break;
        case '.m4a':
          contentType = 'audio/mp4';
          break;
        default:
          contentType = 'application/octet-stream';
      }
    }

    // Prepare upload parameters
    const uploadParams: PutObjectCommandInput = {
      Bucket: AWS_S3_BUCKET,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: contentType,
      // Set metadata for automatic deletion after 7 days
      Metadata: {
        'upload-date': new Date().toISOString(),
        'auto-delete': 'true'
      }
    };

    // Upload to S3
    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    const s3Url = `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${s3Key}`;

    // Generate a signed URL valid for 24 hours
    const signedUrl = await generateSignedUrl(s3Key, 24 * 60 * 60); // 24 hours in seconds

    console.log(`File uploaded successfully to: ${s3Url}`);
    console.log(`Signed URL generated (valid for 24h): ${signedUrl}`);

    return {
      success: true,
      s3Url,
      signedUrl,
      s3Key
    };
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Generate a unique S3 key for audio files
 * @param channel - YouTube channel name
 * @param title - Video title
 * @param extension - File extension (default: 'mp3')
 * @returns string - S3 key in format: audio/YYYY/MM/DD/channel-title-timestamp.ext
 */
export function generateS3Key(channel: string, title: string, extension: string = 'mp3'): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const timestamp = now.getTime();

  return `audio/${year}/${month}/${day}/${channel}-${title}-${timestamp}.${extension}`;
}

/**
 * Generate a signed URL for accessing a file in S3
 * @param s3Key - The S3 key of the file
 * @param expiresIn - Expiration time in seconds (default: 24 hours)
 * @returns Promise<string> - The signed URL
 */
export async function generateSignedUrl(
  s3Key: string,
  expiresIn: number = 24 * 60 * 60
): Promise<string> {
  const s3Client = getS3Client();
  const { AWS_S3_BUCKET } = getAwsConfig();

  const command = new GetObjectCommand({
    Bucket: AWS_S3_BUCKET,
    Key: s3Key
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

// Export the lazy-loaded client getter
export { getS3Client as s3Client };
