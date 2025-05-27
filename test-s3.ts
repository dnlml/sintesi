import { uploadFileToS3, generateS3Key } from './src/lib/s3Client.js';
import { writeFileSync } from 'fs';

// Create a test file
const testContent = 'Test file for S3 upload - ' + new Date().toISOString();
const testFilePath = './test-upload.txt';
writeFileSync(testFilePath, testContent);

// Test S3 upload
async function testS3Upload() {
  try {
    console.log('🧪 Testing S3 connection and upload...');

    const s3Key = generateS3Key('test-channel', 'test-video', 'txt');
    console.log('📁 Generated S3 key:', s3Key);

    const result = await uploadFileToS3(testFilePath, s3Key, 'text/plain');

    if (result.success) {
      console.log('✅ S3 upload successful!');
      console.log('🔗 S3 URL:', result.s3Url);
    } else {
      console.log('❌ S3 upload failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error testing S3:', error);
  }
}

testS3Upload();
