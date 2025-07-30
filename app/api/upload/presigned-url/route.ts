import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    const { fileName, fileType, fileSize, width, height } = await request.json();
    
    // Validate file size (5MB limit)
    if (fileSize > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }
    
    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(fileType)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, and WebP images are allowed' }, { status: 400 });
    }
    
    // Validate square aspect ratio
    if (width !== height) {
      return NextResponse.json({ error: 'Image must have a square aspect ratio (1:1)' }, { status: 400 });
    }
    
    // Generate unique file name with timestamp and random ID
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `temp-logos/${timestamp}-${randomId}.${fileExtension}`;
    
    // Set expiration to 12 hours from now  
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 12);
    
    // Create presigned URL for upload
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: uniqueFileName,
      ContentType: fileType,
      ContentLength: fileSize,
      // Tag as temporary with expiration timestamp
      Tagging: `status=temporary&expires=${expirationDate.getTime()}`,
      Metadata: {
        'uploaded-by': 'project-dialog',
        'file-type': 'logo',
        'expires-at': expirationDate.toISOString(),
        'original-name': fileName,
        'width': width.toString(),
        'height': height.toString(),
      }
    });
    
    const uploadUrl = await getSignedUrl(s3Client, command, { 
      expiresIn: 3600 // 1 hour to complete upload
    });
    
    // The final URL where the file will be accessible
    const finalUrl = `${process.env.AWS_S3_BUCKET_URL}/${uniqueFileName}`;
    
    return NextResponse.json({
      uploadUrl,
      finalUrl,
      key: uniqueFileName,
      expiresAt: expirationDate.toISOString()
    });
    
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' }, 
      { status: 500 }
    );
  }
} 