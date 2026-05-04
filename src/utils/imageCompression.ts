import ImagePicker from 'react-native-image-crop-picker';
import RNFS from 'react-native-fs';

const MAX_BASE64_SIZE = 1_200_000; // ~900KB raw file

/**
 * Compress and resize an image for image search.
 * Uses react-native-image-crop-picker to resize + compress.
 * Falls back to reading the original file if cropper fails.
 */
export const compressImageForSearch = async (
  imageUri: string,
  _fileSizeMB?: number,
  quality: number = 0.3
): Promise<string | null> => {
  // Normalise URI for RNFS / cropper
  const fileUri = imageUri.startsWith('file://') || imageUri.startsWith('content://') || imageUri.startsWith('ph://')
    ? imageUri
    : `file://${imageUri}`;

  // Pick target dimensions based on quality hint
  // Lower quality → smaller target size
  let targetSize: number;
  if (quality <= 0.1)       targetSize = 400;
  else if (quality <= 0.15) targetSize = 500;
  else if (quality <= 0.2)  targetSize = 600;
  else if (quality <= 0.25) targetSize = 700;
  else if (quality <= 0.3)  targetSize = 800;
  else                      targetSize = 1000;

  try {
    const cropped = await ImagePicker.openCropper({
      path: fileUri,
      width: targetSize,
      height: targetSize,
      cropping: false,          // resize only, no crop UI
      compressImageQuality: quality,
      includeBase64: true,
      mediaType: 'photo',
    });

    if (cropped?.data) {
      return cropped.data;
    }

    // Cropper returned no base64 — read from path
    if (cropped?.path) {
      const cleanPath = cropped.path.replace(/^file:\/\//, '');
      return await RNFS.readFile(cleanPath, 'base64');
    }
  } catch {
    // Cropper unavailable or cancelled — fall through to manual read
  }

  // Last resort: read original file
  try {
    const cleanPath = fileUri.replace(/^file:\/\//, '');
    return await RNFS.readFile(cleanPath, 'base64');
  } catch {
    return null;
  }
};
