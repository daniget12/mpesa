/**
 * Storefront Photo Client-Side Processor
 * 
 * Complies with docs/API-CONTRACT.md v1.0.0 (POST /api/merchants/register):
 * - Accepts only JPEG, PNG, or WebP.
 * - Resizes via HTML canvas to a maximum of 1280 px (preserving aspect ratio).
 * - Compresses starting at JPEG quality 0.8, decreasing until decoded size is under 1 MB.
 * - Returns a base64 data URL.
 * - Never logs photo content or base64 data to console or persistent storage.
 */

export interface ProcessedPhotoResult {
  dataUrl: string;
  byteSize: number;
  width: number;
  height: number;
}

export async function processStorefrontPhoto(file: File): Promise<ProcessedPhotoResult> {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const mimeType = (file.type || '').toLowerCase();

  if (!validTypes.includes(mimeType)) {
    throw new Error('Photo must be a JPEG, PNG, or WebP image file');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxDimension = 1280;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas 2D context not available'));
        }

        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.8;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        let base64 = dataUrl.split(',')[1] || '';
        let decodedSize = Math.round(base64.length * 0.75);

        // Reduce quality iteratively until decoded size is under 1 MB (1,048,576 bytes)
        while (decodedSize > 1024 * 1024 && quality > 0.25) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          base64 = dataUrl.split(',')[1] || '';
          decodedSize = Math.round(base64.length * 0.75);
        }

        resolve({
          dataUrl,
          byteSize: decodedSize,
          width,
          height,
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
