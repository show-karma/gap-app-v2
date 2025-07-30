import { NextRequest, NextResponse } from 'next/server';
import { S3Client, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    const { tempKey, projectId } = await request.json();
    
    if (!tempKey || !projectId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    // Extract file extension from temp key
    const fileExtension = tempKey.split('.').pop();
    const timestamp = Date.now();
    
    // New permanent key with project ID
    const permanentKey = `logos/${projectId}/${timestamp}.${fileExtension}`;
    
    // Copy object to permanent location
    await s3Client.send(new CopyObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      CopySource: `${process.env.AWS_S3_BUCKET_NAME}/${tempKey}`,
      Key: permanentKey,
      TaggingDirective: 'REPLACE',
      Tagging: `status=permanent&project-id=${projectId}`,
      MetadataDirective: 'REPLACE',
      Metadata: {
        'project-id': projectId,
        'file-type': 'logo',
        'promoted-at': new Date().toISOString(),
      }
    }));
    
    // Delete temporary object
    await s3Client.send(new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: tempKey,
    }));
    
    const permanentUrl = `${process.env.AWS_S3_BUCKET_URL}/${permanentKey}`;
    
    return NextResponse.json({
      permanentUrl,
      permanentKey
    });
    
  } catch (error) {
    console.error('Error promoting image to permanent:', error);
    return NextResponse.json(
      { error: 'Failed to promote image to permanent status' }, 
      { status: 500 }
    );
  }
} 