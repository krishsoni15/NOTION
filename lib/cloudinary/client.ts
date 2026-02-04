/**
 * Cloudinary client for uploading and managing images.
 */

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export interface UploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  created_at: string;
}

/**
 * Upload an image to Cloudinary
 */
export async function uploadImage(
  fileBuffer: Buffer,
  publicId?: string,
  options: {
    folder?: string;
    transformation?: any[];
    quality?: string | number;
    format?: string;
    resourceType?: 'image' | 'video' | 'raw' | 'auto';
  } = {}
): Promise<{ url: string; publicId: string; key: string }> {
  try {
    const { folder = 'notion-uploads', transformation, quality = 'auto', format, resourceType = 'image', ...rest } = options;

    const uploadOptions: any = {
      folder,
      resource_type: resourceType,
      ...rest, // Pass through any other options like access_mode
    };

    if (resourceType === 'image') {
      uploadOptions.quality = quality;
    }

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    if (transformation) {
      uploadOptions.transformation = transformation;
    }

    if (format) {
      uploadOptions.format = format;
    }

    const result = await new Promise<UploadResult>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else if (result) {
            resolve(result);
          } else {
            reject(new Error('Upload failed - no result'));
          }
        }
      ).end(fileBuffer);
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      key: result.public_id, // Cloudinary public_id serves as the key
    };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
}

/**
 * Delete an image from Cloudinary
 */
export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw new Error('Failed to delete image from Cloudinary');
  }
}

/**
 * Generate a unique public ID for Cloudinary
 */
export function generateImageKey(itemId: string, fileName: string): string {
  const timestamp = Date.now();
  // Extract file extension and sanitize filename, but limit total length
  const fileExt = fileName.split('.').pop()?.toLowerCase() || 'jpg';
  const baseName = fileName.replace(/\.[^/.]+$/, ""); // Remove extension
  const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

  // Limit the base filename to 50 characters to avoid Cloudinary's public_id length limit
  const truncatedBaseName = sanitizedBaseName.length > 50
    ? sanitizedBaseName.substring(0, 50)
    : sanitizedBaseName;

  return `${itemId}_${timestamp}_${truncatedBaseName}.${fileExt}`;
}

/**
 * Get Cloudinary configuration (for debugging)
 */
export function getCloudinaryConfig() {
  return {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY ? '***configured***' : 'not configured',
    api_secret: process.env.CLOUDINARY_API_SECRET ? '***configured***' : 'not configured',
  };
}
