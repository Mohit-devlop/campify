import { v2 as cloudinary } from 'cloudinary';

const isMock = !process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME === 'mock';

if (!isMock) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export async function uploadMedia(fileBuffer: Buffer, folder: string, resourceType: 'image' | 'video' = 'image'): Promise<string> {
  if (isMock) {
    // Return a beautiful mock placeholder based on the requested resource type
    if (resourceType === 'video') {
      return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
    }
    // Random beautiful placeholder images from picsum
    const randomId = Math.floor(Math.random() * 1000);
    return `https://picsum.photos/id/${randomId}/800/800`;
  }

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: `kilogram/${folder}`,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error('Cloudinary upload result is undefined'));
        resolve(result.secure_url);
      }
    ).end(fileBuffer);
  });
}

export async function deleteMedia(url: string): Promise<boolean> {
  if (isMock) return true;
  try {
    // Extract public ID from URL
    const parts = url.split('/');
    const fileWithExtension = parts.pop();
    const folder = parts.slice(parts.indexOf('kilogram')).join('/');
    if (fileWithExtension) {
      const publicId = `${folder}/${fileWithExtension.split('.')[0]}`;
      await cloudinary.uploader.destroy(publicId);
    }
    return true;
  } catch (error) {
    console.error('Failed to delete media from Cloudinary:', error);
    return false;
  }
}
