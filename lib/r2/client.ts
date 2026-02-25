/**
 * Cloudflare R2 client for uploading and managing files (images, PDFs, etc.).
 * Uses AWS S3 SDK since R2 is S3-compatible.
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Initialize S3 client for R2
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!; // e.g. https://pub-xxx.r2.dev or custom domain

/**
 * Upload a file to Cloudflare R2
 */
export async function uploadImage(
  fileBuffer: Buffer,
  publicId?: string,
  options: {
    folder?: string;
    contentType?: string;
    resourceType?: 'image' | 'video' | 'raw' | 'auto';
    transformation?: any[];
    quality?: string | number;
    format?: string;
    [key: string]: any;
  } = {}
): Promise<{ url: string; publicId: string; key: string }> {
  try {
    const { folder = 'notion-uploads', contentType = 'application/octet-stream' } = options;

    // Build the full key (path) in the bucket
    const fullKey = publicId ? `${folder}/${publicId}` : `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fullKey,
        Body: fileBuffer,
        ContentType: contentType,
      })
    );

    const baseUrl = PUBLIC_URL.endsWith('/') ? PUBLIC_URL.slice(0, -1) : PUBLIC_URL;
    const publicUrl = `${baseUrl}/${fullKey}`;

    return {
      url: publicUrl,
      publicId: fullKey,
      key: fullKey,
    };
  } catch (error) {
    console.error('Error uploading to R2:', error);
    throw new Error('Failed to upload file to R2');
  }
}

/**
 * Delete a file from Cloudflare R2
 */
export async function deleteImage(key: string): Promise<void> {
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    );
  } catch (error) {
    console.error('Error deleting from R2:', error);
    throw new Error('Failed to delete file from R2');
  }
}

/**
 * Generate a unique key for a file
 */
export function generateImageKey(itemId: string, fileName: string): string {
  const timestamp = Date.now();
  const fileExt = fileName.split('.').pop()?.toLowerCase() || 'jpg';
  const baseName = fileName.replace(/\.[^/.]+$/, '');
  const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

  const truncatedBaseName = sanitizedBaseName.length > 50
    ? sanitizedBaseName.substring(0, 50)
    : sanitizedBaseName;

  return `${itemId}_${timestamp}_${truncatedBaseName}.${fileExt}`;
}

/**
 * Get R2 configuration (for debugging)
 */
export function getR2Config() {
  return {
    account_id: process.env.R2_ACCOUNT_ID,
    bucket: process.env.R2_BUCKET_NAME,
    access_key: process.env.R2_ACCESS_KEY_ID ? '***configured***' : 'not configured',
    secret_key: process.env.R2_SECRET_ACCESS_KEY ? '***configured***' : 'not configured',
    public_url: process.env.R2_PUBLIC_URL,
  };
}
