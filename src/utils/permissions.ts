import { Platform, PermissionsAndroid, Alert } from 'react-native';

/**
 * Check if Android version is 13+ (API 33+)
 */
const isAndroid13Plus = (): boolean => {
  if (Platform.OS !== 'android') return false;
  return Platform.Version >= 33;
};

/**
 * Request camera permission
 * @returns Promise<boolean> - true if granted, false otherwise
 */
export const requestCameraPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true; // iOS handles permissions automatically
  }

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Permission',
        message: 'App needs access to your camera to take photos',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.error('Error requesting camera permission:', error);
    return false;
  }
};

/**
 * Request photo library/storage permission
 * Handles Android version differences:
 * - Android 13+ (API 33+): READ_MEDIA_IMAGES
 * - Android 12 and below (API 32-): READ_EXTERNAL_STORAGE
 * @returns Promise<boolean> - true if granted, false otherwise
 */
export const requestPhotoLibraryPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true; // iOS handles permissions automatically
  }

  try {
    let granted: string;

    if (isAndroid13Plus()) {
      // Android 13+ (API 33+)
      granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        {
          title: 'Photo Library Permission',
          message: 'App needs access to your photo library to select images',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
    } else {
      // Android 12 and below (API 32-)
      granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: 'Storage Permission',
          message: 'App needs access to your storage to select images',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
    }

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.error('Error requesting photo library permission:', error);
    return false;
  }
};

/**
 * Request both camera and photo library permissions
 * @returns Promise<{camera: boolean, photoLibrary: boolean}>
 */
export const requestCameraAndPhotoLibraryPermissions = async (): Promise<{
  camera: boolean;
  photoLibrary: boolean;
}> => {
  const camera = await requestCameraPermission();
  const photoLibrary = await requestPhotoLibraryPermission();

  return { camera, photoLibrary };
};

/**
 * Check if camera permission is granted
 * @returns Promise<boolean>
 */
export const checkCameraPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const result = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.CAMERA
    );
    return result;
  } catch (error) {
    console.error('Error checking camera permission:', error);
    return false;
  }
};

/**
 * Check if photo library permission is granted
 * @returns Promise<boolean>
 */
export const checkPhotoLibraryPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    if (isAndroid13Plus()) {
      const result = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      );
      return result;
    } else {
      const result = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
      );
      return result;
    }
  } catch (error) {
    console.error('Error checking photo library permission:', error);
    return false;
  }
};


