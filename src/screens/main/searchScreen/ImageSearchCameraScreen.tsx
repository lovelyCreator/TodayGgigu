import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  Platform,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { launchImageLibrary, MediaType, ImagePickerResponse, ImageLibraryOptions } from 'react-native-image-picker';
import ImagePicker from 'react-native-image-crop-picker';
import { CameraRoll, GetPhotosParams, PhotoIdentifier } from '@react-native-camera-roll/camera-roll';
import { requestPhotoLibraryPermission } from '../../../utils/permissions';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../../constants';
import { RootStackParamList } from '../../../types';
import ArrowBackIcon from '../../../assets/icons/ArrowBackIcon';
import CameraIcon from '../../../assets/icons/CameraIcon';
import CameraConvertIcon from '../../../assets/icons/CameraConvertIcon';
import HelpIcon from '../../../assets/icons/HelpIcon';
import HistoryIconSVG from '../../../assets/icons/HistoryIconSVG';
import Icon from '../../../components/Icon';
import { useAppSelector } from '../../../store/hooks';
import { translations } from '../../../i18n/translations';
import { compressImageForSearch } from '../../../utils/imageCompression';
import ImageSearchResultsModal from './ImageSearchResultsModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

type ImageSearchCameraScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ImageSearchCamera'>;

const ImageSearchCameraScreen: React.FC = () => {
  const navigation = useNavigation<ImageSearchCameraScreenNavigationProp>();
  const locale = useAppSelector((s) => s.i18n.locale) as 'en' | 'ko' | 'zh';
  
  const camera = useRef<Camera>(null);
  const { hasPermission, requestPermission } = useCameraPermission();
  
  const [cameraPosition, setCameraPosition] = useState<'back' | 'front'>('back');
  const [albumModalVisible, setAlbumModalVisible] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [resultsModalVisible, setResultsModalVisible] = useState(false);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [cameraInitialized, setCameraInitialized] = useState(false);
  
  // Get the current camera device based on position
  const device = useCameraDevice(cameraPosition);
  const backDevice = useCameraDevice('back');
  const frontDevice = useCameraDevice('front');
  const [albumPhotos, setAlbumPhotos] = useState<Array<{ uri: string; path: string }>>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [searchHistory, setSearchHistory] = useState<Array<{ id: string; imageUri: string; timestamp: number }>>([]);
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  
  // Translation function
  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = translations[locale as keyof typeof translations];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };

  // Request camera permission on mount
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  // Scanning line animation - bottom to top and back
  const startScanAnimation = useCallback(() => {
    scanLineAnim.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scanLineAnim]);

  // Initialize camera when device and permission are ready
  useEffect(() => {
    if (device && hasPermission) {
      // Small delay to ensure camera is ready
      const timer = setTimeout(() => {
        setCameraInitialized(true);
        setIsActive(true);
        startScanAnimation();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setCameraInitialized(false);
    }
  }, [device, hasPermission, cameraPosition, startScanAnimation]);

  // Handle screen focus - activate/deactivate camera
  useFocusEffect(
    React.useCallback(() => {
      if (device && hasPermission) {
        setIsActive(true);
        // Start scanning line animation
        startScanAnimation();
      }
      return () => {
        setIsActive(false);
        scanLineAnim.setValue(0);
      };
    }, [device, hasPermission, startScanAnimation, scanLineAnim])
  );

  // Load album photos when album section is opened
  useEffect(() => {
    const loadAlbumPhotos = async () => {
      if (!albumModalVisible) {
        return;
      }

      // Request photo library permission
      const granted = await requestPhotoLibraryPermission();
      if (!granted) {
        return;
      }

      setLoadingPhotos(true);
      try {
        // Get recent photos from camera roll
        const params: GetPhotosParams = {
          first: 20, // Get first 20 photos
          assetType: 'Photos',
          groupTypes: 'All',
        };

        const result = await CameraRoll.getPhotos(params);
        
        console.log('CameraRoll result:', result);
        
        if (result && result.edges && result.edges.length > 0) {
          const photos = result.edges
            .map((edge: any) => {
              // Try different possible paths for the image URI
              const node = edge.node || edge;
              let imageUri = 
                node?.image?.uri || 
                node?.image?.filepath ||
                node?.imageUri || 
                (node as any)?.uri ||
                '';
              
              // Keep the original URI format - don't modify content:// or ph:// URIs
              // These URIs need to be used as-is with ImagePicker
              if (imageUri) {
                // Only add file:// prefix if it's a regular file path (not content:// or ph://)
                if (!imageUri.startsWith('content://') && 
                    !imageUri.startsWith('ph://') && 
                    !imageUri.startsWith('file://') &&
                    !imageUri.startsWith('/')) {
                  // It's likely a relative path, add file://
                  imageUri = `file://${imageUri}`;
                } else if (!imageUri.startsWith('content://') && 
                          !imageUri.startsWith('ph://') && 
                          !imageUri.startsWith('file://') &&
                          imageUri.startsWith('/')) {
                  // It's an absolute path, add file://
                  imageUri = `file://${imageUri}`;
                }
                // For content:// and ph:// URIs, keep them as-is
              }
              
              console.log('Album photo URI:', imageUri);
              
              return {
                uri: imageUri,
                path: imageUri,
              };
            })
            .filter((photo: { uri: string; path: string }) => photo.uri && photo.uri.length > 0);

          console.log('Processed photos:', photos.length, 'First photo URI:', photos[0]?.uri);
          setAlbumPhotos(photos);
        } else {
          console.log('No photos found in result');
          setAlbumPhotos([]);
        }
      } catch (error: any) {
        console.error('Error loading album photos:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        // If CameraRoll fails, fall back to empty array
        // User can still click to open the picker
        setAlbumPhotos([]);
      } finally {
        setLoadingPhotos(false);
      }
    };

    loadAlbumPhotos();
  }, [albumModalVisible]);

  // Load search history on mount and when modal opens
  useEffect(() => {
    if (historyModalVisible) {
      loadSearchHistory();
    }
  }, [historyModalVisible]);

  const loadSearchHistory = async () => {
    try {
      const historyJson = await AsyncStorage.getItem('imageSearchHistory');
      if (historyJson) {
        const history = JSON.parse(historyJson);
        // Sort by timestamp, most recent first, limit to 20
        const sortedHistory = history
          .sort((a: any, b: any) => b.timestamp - a.timestamp)
          .slice(0, 20);
        setSearchHistory(sortedHistory);
      }
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  };

  const saveToHistory = async (imageUri: string) => {
    try {
      const historyItem = {
        id: Date.now().toString(),
        imageUri: imageUri,
        timestamp: Date.now(),
      };

      const historyJson = await AsyncStorage.getItem('imageSearchHistory');
      let history = historyJson ? JSON.parse(historyJson) : [];
      
      // Add new item and remove duplicates (same imageUri)
      history = history.filter((item: any) => item.imageUri !== imageUri);
      history.unshift(historyItem);
      
      // Keep only last 20 items
      history = history.slice(0, 20);
      
      await AsyncStorage.setItem('imageSearchHistory', JSON.stringify(history));
      setSearchHistory(history);
    } catch (error) {
      console.error('Error saving to history:', error);
    }
  };

  const convertUriToBase64 = async (uri: string): Promise<string | null> => {
    try {
      const RNFS = require('react-native-fs');
      let cleanUri = uri;
      
      // Remove file:// prefix if present
      if (cleanUri.startsWith('file://')) {
        cleanUri = cleanUri.replace('file://', '');
      }
      
      // Check if file exists
      const fileExists = await RNFS.exists(cleanUri);
      if (!fileExists) {
        console.error('File does not exist at path:', cleanUri);
        console.error('Original URI was:', uri);
        return null;
      }
      
      // Get file info to verify it's readable
      const fileInfo = await RNFS.stat(cleanUri);
      if (!fileInfo || fileInfo.size === 0) {
        console.error('File is empty or unreadable:', cleanUri);
        return null;
      }
      
      console.log('Reading file, size:', fileInfo.size, 'bytes');
      
      // Read file as base64
      const base64 = await RNFS.readFile(cleanUri, 'base64');
      if (!base64 || base64.length === 0) {
        console.error('Base64 data is empty for path:', cleanUri);
        return null;
      }
      
      console.log('Successfully read base64, length:', base64.length);
      return base64;
    } catch (error: any) {
      console.error('Error converting URI to base64:', error);
      console.error('URI was:', uri);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      return null;
    }
  };

  const processImage = async (imagePath: string) => {
    try {
      console.log('Processing image from path:', imagePath);
      
      const RNFS = require('react-native-fs');
      
      // Handle different URI types
      let finalPath = imagePath;
      let normalizedPath: string | null = null;
      
      // For content:// URIs (Android), ImagePicker can handle them directly
      if (imagePath.startsWith('content://')) {
        console.log('Detected content:// URI, using directly with cropper');
        finalPath = imagePath;
      }
      // For ph:// URIs (iOS), ImagePicker can handle them directly
      else if (imagePath.startsWith('ph://')) {
        console.log('Detected ph:// URI, using directly with cropper');
        finalPath = imagePath;
      }
      // For file:// URIs or regular paths
      else {
        // Normalize the path - remove file:// prefix for RNFS operations
        normalizedPath = imagePath.replace(/^file:\/\//, '');
        
        // Verify file exists (only for file paths, not content:// or ph://)
        let fileExists = await RNFS.exists(normalizedPath);
        if (!fileExists) {
          // Try with file:// prefix
          const pathWithoutPrefix = normalizedPath;
          const pathWithPrefix = `file://${normalizedPath}`;
          const existsWithPrefix = await RNFS.exists(pathWithoutPrefix);
          
          if (!existsWithPrefix) {
            console.error('File does not exist at path:', normalizedPath);
            Alert.alert(t('common.error'), t('imageSearch.photoFileNotFound'));
            setIsActive(true);
            return;
          }
        }
        
        // Get file info to verify it's readable (only for file paths)
        try {
          const fileInfo = await RNFS.stat(normalizedPath);
          if (!fileInfo || fileInfo.size === 0) {
            console.error('File is empty or unreadable:', normalizedPath);
            Alert.alert(t('common.error'), t('imageSearch.photoFileNotFound'));
            setIsActive(true);
            return;
          }
          console.log('File verified, size:', fileInfo.size, 'bytes');
        } catch (statError) {
          console.error('Error getting file stats:', statError);
          // Continue anyway, might be a valid URI that RNFS can't stat
        }
        
        // For file paths, use file:// prefix for cropper
        finalPath = `file://${normalizedPath}`;
      }
      
      console.log('Opening cropper with path:', finalPath);
      console.log('Platform:', Platform.OS);
      
      // Open cropper
      let croppedImage;
      try {
        croppedImage = await ImagePicker.openCropper({
          path: finalPath,
          mediaType: 'photo',
          width: 1000,
          height: 1000,
          cropping: true,
          cropperToolbarTitle: t('imageSearch.cropImage'),
          cropperChooseText: t('common.confirm'),
          cropperCancelText: t('common.cancel'),
          compressImageQuality: 0.8,
          includeBase64: true,
        });
      } catch (cropperError: any) {
        console.error('Cropper error:', cropperError);
        console.error('Error message:', cropperError.message);
        
        // If cropper fails with file:// prefix, try without it (only for file paths)
        if (cropperError.message && cropperError.message.includes('path') && normalizedPath) {
          console.log('Cropper failed with file:// prefix, trying without...');
          try {
            croppedImage = await ImagePicker.openCropper({
              path: normalizedPath,
              mediaType: 'photo',
              width: 1000,
              height: 1000,
              cropping: true,
              cropperToolbarTitle: t('imageSearch.cropImage'),
              cropperChooseText: t('common.confirm'),
              cropperCancelText: t('common.cancel'),
              compressImageQuality: 0.8,
              includeBase64: true,
            });
          } catch (secondError) {
            console.error('Cropper failed with both path formats:', secondError);
            // For content:// or ph:// URIs, try using openPicker to get a file path
            if (imagePath.startsWith('content://') || imagePath.startsWith('ph://')) {
              console.log('Trying openPicker for content:// or ph:// URI...');
              try {
                const pickerResult = await ImagePicker.openPicker({
                  path: imagePath,
                  mediaType: 'photo',
                  includeBase64: false,
                });
                if (pickerResult && pickerResult.path) {
                  // Now try cropper with the file path from picker
                  croppedImage = await ImagePicker.openCropper({
                    path: pickerResult.path,
                    mediaType: 'photo',
                    width: 1000,
                    height: 1000,
                    cropping: true,
                    cropperToolbarTitle: t('imageSearch.cropImage'),
                    cropperChooseText: t('common.confirm'),
                    cropperCancelText: t('common.cancel'),
                    compressImageQuality: 0.8,
                    includeBase64: true,
                  });
                } else {
                  throw cropperError;
                }
              } catch (pickerError) {
                console.error('Picker also failed:', pickerError);
                throw cropperError;
              }
            } else {
              throw cropperError;
            }
          }
        } else {
          // For content:// or ph:// URIs that fail, try openPicker
          if (imagePath.startsWith('content://') || imagePath.startsWith('ph://')) {
            console.log('Trying openPicker for content:// or ph:// URI...');
            try {
              const pickerResult = await ImagePicker.openPicker({
                path: imagePath,
                mediaType: 'photo',
                includeBase64: false,
              });
              if (pickerResult && pickerResult.path) {
                // Now try cropper with the file path from picker
                croppedImage = await ImagePicker.openCropper({
                  path: pickerResult.path,
                  mediaType: 'photo',
                  width: 1000,
                  height: 1000,
                  cropping: true,
                  cropperToolbarTitle: t('imageSearch.cropImage'),
                  cropperChooseText: t('common.confirm'),
                  cropperCancelText: t('common.cancel'),
                  compressImageQuality: 0.8,
                  includeBase64: true,
                });
              } else {
                throw cropperError;
              }
            } catch (pickerError) {
              console.error('Picker failed:', pickerError);
              throw cropperError;
            }
          } else {
            throw cropperError;
          }
        }
      }

      console.log('Cropped image result:', {
        hasPath: !!croppedImage?.path,
        hasData: !!croppedImage?.data,
        path: croppedImage?.path?.substring(0, 50),
      });

      if (croppedImage && croppedImage.path) {
        // Don't show captured image overlay - keep camera active
        // setCapturedImageUri(croppedImage.path);
        
        // Compress the image using existing logic
        let base64Data: string | null = null;
        
        console.log('Cropped image details:', {
          hasPath: !!croppedImage.path,
          hasData: !!croppedImage.data,
          path: croppedImage.path,
          dataLength: croppedImage.data?.length || 0,
        });
        
        if (croppedImage.data) {
          base64Data = croppedImage.data;
          console.log('Using base64 from cropper, size:', base64Data.length);
        } else {
          // Fallback: read from file
          console.log('Reading base64 from file, path:', croppedImage.path);
          
          // Try different path formats
          let readPath = croppedImage.path;
          
          // Check if file exists first
          const RNFS = require('react-native-fs');
          const fileExists = await RNFS.exists(readPath);
          console.log('File exists (original path):', fileExists);
          
          if (!fileExists && !readPath.startsWith('file://')) {
            // Try with file:// prefix
            const pathWithPrefix = `file://${readPath}`;
            const existsWithPrefix = await RNFS.exists(pathWithPrefix);
            console.log('File exists (with prefix):', existsWithPrefix);
            if (existsWithPrefix) {
              readPath = pathWithPrefix;
            }
          } else if (!fileExists && readPath.startsWith('file://')) {
            // Try without file:// prefix
            const pathWithoutPrefix = readPath.replace('file://', '');
            const existsWithoutPrefix = await RNFS.exists(pathWithoutPrefix);
            console.log('File exists (without prefix):', existsWithoutPrefix);
            if (existsWithoutPrefix) {
              readPath = pathWithoutPrefix;
            }
          }
          
          base64Data = await convertUriToBase64(readPath);
          if (base64Data) {
            console.log('Read base64 from file, size:', base64Data.length);
          } else {
            console.error('Failed to read base64 from file at path:', readPath);
            // Try one more time with the original path as-is
            if (readPath !== croppedImage.path) {
              base64Data = await convertUriToBase64(croppedImage.path);
              if (base64Data) {
                console.log('Successfully read with original path');
              }
            }
          }
        }

        if (base64Data && base64Data.length > 0) {
          const base64Size = base64Data.length;
          const sizeMB = base64Size / 1024 / 1024;
          console.log('Base64 size:', sizeMB.toFixed(2), 'MB');
          
          // If image is over 1.2MB, compress it
          if (base64Size > 1200000) {
            setIsSearching(true);
            const compressedBase64 = await compressImageForSearch(
              croppedImage.path,
              sizeMB,
              0.3
            );
            
            if (compressedBase64 && compressedBase64.length <= 1200000) {
              base64Data = compressedBase64;
              console.log('Compressed to acceptable size');
            } else if (compressedBase64) {
              // Try with lower quality
              const compressedBase642 = await compressImageForSearch(
                croppedImage.path,
                sizeMB,
                0.2
              );
              if (compressedBase642 && compressedBase642.length <= 1200000) {
                base64Data = compressedBase642;
                console.log('Compressed with lower quality to acceptable size');
              }
            }
          }
          
          setImageUri(croppedImage.path);
          setImageBase64(base64Data);
          
          // Save to history
          await saveToHistory(croppedImage.path);
          
          // Show search results modal
          setIsSearching(true);
          setResultsModalVisible(true);
        } else {
          console.error('No base64 data available after all attempts');
          console.error('Cropped image path:', croppedImage.path);
          Alert.alert(
            t('common.error'), 
            t('imageSearch.noImageData') || 'Cannot find image data'
          );
          // Reactivate camera on error
          setIsActive(true);
        }
      } else {
        console.error('Cropped image path is missing');
        Alert.alert(t('common.error'), t('imageSearch.failedToProcessImage'));
        setIsActive(true);
      }
    } catch (error: any) {
      if (error.message !== 'User cancelled image selection') {
        console.error('Error cropping image:', error);
        Alert.alert(t('common.error'), error.message || 'Failed to crop image');
      }
      // Reactivate camera on error
      setIsActive(true);
    }
  };

  const handleTakePhoto = async () => {
    console.log('Camera button pressed', {
      hasPermission,
      device: !!device,
      cameraRef: !!camera.current,
      isActive,
      cameraInitialized,
    });

    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert(t('search.messages.permissionRequired'), t('search.messages.grantCameraPermission'));
        return;
      }
      // Wait for permission to be granted and camera to initialize
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    if (!device) {
        Alert.alert(t('common.error'), t('imageSearch.cameraNotAvailable'));
      return;
    }

    if (!cameraInitialized) {
      Alert.alert(t('common.error'), t('imageSearch.initializingCamera'));
      return;
    }

    if (!camera.current) {
      Alert.alert(t('common.error'), t('imageSearch.cameraNotReady'));
      return;
    }

    // Check if camera is active
    if (!isActive) {
      console.log('Camera not active, activating...');
      setIsActive(true);
      // Wait for camera to activate
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    try {
      console.log('Attempting to take photo...');
      console.log('Camera state:', {
        isActive,
        cameraInitialized,
        hasDevice: !!device,
        hasCameraRef: !!camera.current,
      });
      
      // Ensure camera is ready with a small delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Double-check camera is still active before taking photo
      if (!isActive) {
        console.warn('Camera became inactive, reactivating...');
        setIsActive(true);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      if (!camera.current) {
        console.error('Camera ref is null');
        Alert.alert(t('common.error'), t('imageSearch.cameraNotReady'));
        setIsActive(true);
        return;
      }
      
      // Take photo while camera is still active
      console.log('Calling takePhoto...');
      const photo = await camera.current.takePhoto({
        flash: 'off',
      });

      console.log('Photo taken successfully:', {
        hasPath: !!photo?.path,
        path: photo?.path,
        hasWidth: !!photo?.width,
        hasHeight: !!photo?.height,
      });

      // Now deactivate camera after photo is taken
      setIsActive(false);

      if (photo && photo.path) {
        // Process the captured photo
        // react-native-vision-camera returns path without file:// prefix
        const photoPath = photo.path;
        console.log('Photo captured, path:', photoPath);
        
        // Verify file exists before processing
        const RNFS = require('react-native-fs');
        
        // Check file existence with different path formats
        let validPath = photoPath;
        let fileExists = await RNFS.exists(photoPath);
        
        if (!fileExists) {
          // Try with file:// prefix
          const pathWithPrefix = `file://${photoPath}`;
          const existsWithPrefix = await RNFS.exists(pathWithPrefix);
          if (existsWithPrefix) {
            validPath = pathWithPrefix;
            fileExists = true;
          } else {
            // Try without file:// if it was there
            const pathWithoutPrefix = photoPath.replace(/^file:\/\//, '');
            const existsWithoutPrefix = await RNFS.exists(pathWithoutPrefix);
            if (existsWithoutPrefix) {
              validPath = pathWithoutPrefix;
              fileExists = true;
            }
          }
        }
        
        console.log('Photo file exists:', fileExists, 'at path:', validPath);
        
        if (fileExists) {
          // Small delay to ensure file is fully written
          await new Promise(resolve => setTimeout(resolve, 100));
          await processImage(validPath);
        } else {
          console.error('Photo file not found at any path format');
          Alert.alert(t('common.error'), t('imageSearch.photoFileNotFound'));
          setIsActive(true);
        }
      } else {
        console.error('Photo path is missing:', photo);
        Alert.alert(t('common.error'), t('imageSearch.photoTakenButPathMissing'));
        setIsActive(true);
      }
    } catch (error: any) {
      console.error('Error taking photo:', error);
      const errorMessage = error.message || error.toString() || t('imageSearch.failedToTakePhoto');
      Alert.alert(t('common.error'), `Error: ${errorMessage}`);
      // Keep camera active on error so user can try again
      setIsActive(true);
    }
  };

  const handleChooseFromGallery = async (photoUri?: string) => {
    setAlbumModalVisible(false);
    
    // Request photo library permission
    const granted = await requestPhotoLibraryPermission();
    if (!granted) {
      Alert.alert(t('search.messages.permissionRequired'), t('search.messages.grantPhotoLibraryPermission'));
      return;
    }

    // If a specific photo was selected from thumbnails, use it directly
    if (photoUri) {
      console.log('Selected photo from album, URI:', photoUri);
      
      // For CameraRoll URIs (content:// or ph://), ImagePicker.openCropper can handle them
      // But we need to pass them directly without file:// prefix
      // Try processing directly - processImage will handle the URI format
      try {
        await processImage(photoUri);
      } catch (error: any) {
        console.error('Error processing album photo:', error);
        Alert.alert(
          t('common.error'), 
          error.message || t('imageSearch.photoFileNotFound')
        );
      }
      return;
    }

    // Otherwise, open the image picker
    const options: ImageLibraryOptions = {
      mediaType: 'photo' as MediaType,
      quality: 0.8,
      includeBase64: false,
    };

    launchImageLibrary(options, async (response: ImagePickerResponse) => {
      if (response.didCancel) {
        return;
      }
      if (response.errorCode) {
        Alert.alert(t('common.error'), response.errorMessage || 'Failed to pick image');
        return;
      }
      if (response.assets && response.assets[0] && response.assets[0].uri) {
        // Open cropper
        try {
          const croppedImage = await ImagePicker.openCropper({
            path: response.assets[0].uri,
            mediaType: 'photo',
            width: 1000,
            height: 1000,
            cropping: true,
            cropperToolbarTitle: t('imageSearch.cropImage'),
            cropperChooseText: t('common.confirm'),
            cropperCancelText: t('common.cancel'),
            compressImageQuality: 0.8,
            includeBase64: true,
          });

          if (croppedImage && croppedImage.path) {
            // Image will be processed and shown in results modal
            
            // Compress the image using existing logic
            let base64Data: string | null = null;
            
            if (croppedImage.data) {
              base64Data = croppedImage.data;
            } else {
              base64Data = await convertUriToBase64(croppedImage.path);
            }

            if (base64Data) {
              const base64Size = base64Data.length;
              const sizeMB = base64Size / 1024 / 1024;
              
              // If image is over 1.2MB, compress it
              if (base64Size > 1200000) {
                setIsSearching(true);
                const compressedBase64 = await compressImageForSearch(
                  croppedImage.path,
                  sizeMB,
                  0.3
                );
                
                if (compressedBase64 && compressedBase64.length <= 1200000) {
                  base64Data = compressedBase64;
                } else if (compressedBase64) {
                  const compressedBase642 = await compressImageForSearch(
                    croppedImage.path,
                    sizeMB,
                    0.2
                  );
                  if (compressedBase642 && compressedBase642.length <= 1200000) {
                    base64Data = compressedBase642;
                  }
                }
              }
              
              setImageUri(croppedImage.path);
              setImageBase64(base64Data);
              
              // Save to history
              await saveToHistory(croppedImage.path);
              
              // Show search results modal
              setIsSearching(true);
              setResultsModalVisible(true);
            } else {
              Alert.alert(t('common.error'), t('imageSearch.noImageData') || 'Image data not available');
            }
          }
        } catch (error: any) {
          if (error.message !== 'User cancelled image selection') {
            console.error('Error cropping image:', error);
            Alert.alert(t('common.error'), error.message || t('imageSearch.failedToCropImage'));
          }
        }
      }
    });
  };

  const handleHistory = () => {
    setAlbumModalVisible(false); // Hide album modal when showing history
    setHistoryModalVisible(true);
  };

  const handleSelectHistoryItem = async (imageUri: string) => {
    setHistoryModalVisible(false);
    await processImage(imageUri);
  };

  const handleDeleteHistoryItem = async (id: string) => {
    try {
      const updatedHistory = searchHistory.filter(item => item.id !== id);
      setSearchHistory(updatedHistory);
      await AsyncStorage.setItem('imageSearchHistory', JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Error deleting history item:', error);
    }
  };

  const handleClearHistory = async () => {
    Alert.alert(
      t('imageSearch.clearHistory'),
      t('imageSearch.clearHistoryConfirm'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              setSearchHistory([]);
              await AsyncStorage.removeItem('imageSearchHistory');
            } catch (error) {
              console.error('Error clearing history:', error);
            }
          },
        },
      ]
    );
  };

  const handleHelp = () => {
    // TODO: Implement help functionality
    Alert.alert(t('imageSearch.help'), t('imageSearch.helpFeatureComingSoon'));
  };

  const handleSwitchCamera = () => {
    if (!backDevice || !frontDevice) {
      // If only one camera is available, don't switch
      return;
    }
    
    // Toggle camera position
    const newPosition = cameraPosition === 'back' ? 'front' : 'back';
    setCameraPosition(newPosition);
    setCameraInitialized(false);
    setIsActive(false);
    
    // Reinitialize camera with new position
    setTimeout(() => {
      setCameraInitialized(true);
      setIsActive(true);
    }, 300);
  };

  const handleCloseResults = () => {
    setResultsModalVisible(false);
    setIsSearching(false);
    setImageBase64(null);
    setImageUri(null);
    // Reactivate camera and restart scan animation
    setIsActive(true);
    startScanAnimation();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Live Camera View - Full Screen Real Camera */}
      {device && hasPermission && cameraInitialized ? (
        <View style={styles.cameraWrapper}>
                <Camera
                  ref={camera}
                  style={StyleSheet.absoluteFill}
                  device={device}
                  isActive={isActive && !resultsModalVisible}
                  photo={true}
                  enableZoomGesture={false}
                />
        </View>
      ) : device && hasPermission && !cameraInitialized ? (
        <View style={styles.cameraPlaceholder}>
          <ActivityIndicator size="large" color={COLORS.white} />
          <Text style={styles.cameraPlaceholderText}>{t('imageSearch.initializingCamera')}</Text>
        </View>
      ) : (
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.cameraPlaceholderText}>
            {!hasPermission ? t('imageSearch.cameraPermissionRequired') : t('imageSearch.cameraNotAvailable')}
          </Text>
          {!hasPermission && (
            <TouchableOpacity 
              style={styles.permissionButton}
              onPress={requestPermission}
            >
              <Text style={styles.permissionButtonText}>{t('imageSearch.grantPermission')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {/* Don't show captured image overlay - keep showing live camera */}

      {/* Top Bar */}
      <SafeAreaView style={styles.topBar} edges={['top']}>
        <View style={styles.topBarContent}>
          <TouchableOpacity style={styles.topBarButton} onPress={() => navigation.goBack()}>
            <ArrowBackIcon width={20} height={20} color={COLORS.white} />
          </TouchableOpacity>

          <View style={styles.topBarRight}>
            {/* Camera Switch Button */}
            {backDevice && frontDevice && (
              <TouchableOpacity 
                style={styles.topBarButton} 
                onPress={handleSwitchCamera}
                disabled={!cameraInitialized}
              >
                <CameraConvertIcon width={24} height={24} color={COLORS.white} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.topBarButton} onPress={handleHelp}>
              <HelpIcon width={24} height={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Center Overlay */}
      <View style={styles.centerOverlay}>
        <View style={styles.instructionBox}>
          <Text style={styles.instructionText}>
            {t('imageSearch.takePhotoToSearch')}
          </Text>
          {/* Triangle pointing down */}
          <View style={styles.instructionTriangle} />
        </View>
        
        {/* Camera Button */}
        <TouchableOpacity 
          style={styles.cameraButton} 
          onPress={handleTakePhoto} 
          activeOpacity={0.8}
          disabled={!cameraInitialized || !isActive || !device || !hasPermission}
        >
          <View style={styles.cameraButtonInner}>
            <CameraIcon width={25} height={25} color={COLORS.black} />
          </View>
        </TouchableOpacity>

        {/* History Button */}
        <TouchableOpacity style={styles.historyButton} onPress={handleHistory}>
          <View style={styles.historyIconContainer}>
            <HistoryIconSVG width={30} height={30} color={COLORS.white} />
          </View>
          <Text style={styles.historyText}>{t('imageSearch.history')}</Text>
        </TouchableOpacity>
      </View>

      {/* Scanning Line */}
      {device && hasPermission && cameraInitialized && isActive && !resultsModalVisible && (
        <Animated.View
          style={[
            styles.scanLineContainer,
            {
              transform: [
                {
                  translateY: scanLineAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [height, 0],
                  }),
                },
              ],
            },
          ]}
        >
        <View style={styles.scanLineGradient}>
          {/* Gradient for moving up (bottom to top) - shows gradient centered on line */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                opacity: scanLineAnim.interpolate({
                  inputRange: [0, 0.05, 0.45, 0.5, 0.55, 0.95, 1],
                  outputRange: [1, 1, 1, 0.5, 0, 0, 0],
                }),
              },
            ]}
          >
            <LinearGradient
              colors={['transparent', 'rgba(255, 85, 0, 0.15)', 'rgba(255, 85, 0, 0.35)', 'rgba(255, 85, 0, 0.5)', 'rgba(255, 85, 0, 0.35)', 'rgba(255, 85, 0, 0.15)', 'transparent']}
              locations={[0, 0.25, 0.4, 0.5, 0.6, 0.75, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          {/* Gradient for moving down (top to bottom) - shows gradient centered on line */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                opacity: scanLineAnim.interpolate({
                  inputRange: [0, 0.05, 0.45, 0.5, 0.55, 0.95, 1],
                  outputRange: [0, 0, 0, 0.5, 1, 1, 1],
                }),
              },
            ]}
          >
            <LinearGradient
              colors={['transparent', 'rgba(255, 85, 0, 0.1)', 'rgba(255, 85, 0, 0.25)', 'rgba(255, 85, 0, 0.4)', 'rgba(255, 85, 0, 0.25)', 'rgba(255, 85, 0, 0.1)', 'transparent']}
              locations={[0, 0.3, 0.45, 0.5, 0.55, 0.7, 1]}
              start={{ x: 0, y: 1 }}
              end={{ x: 0, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          {/* Solid orange line in the center with directional shadow */}
          <View style={styles.scanLineContainerInner}>
            <Animated.View
              style={[
                styles.scanLineShadow,
                {
                  transform: [
                    {
                      translateY: scanLineAnim.interpolate({
                        inputRange: [0, 0,0],
                        outputRange: [0, 0, 0], // Shadow below when moving up, above when moving down
                      }),
                    },
                  ],
                  opacity: scanLineAnim.interpolate({
                    inputRange: [0, 0, 0],
                    outputRange: [0, 0, 0],
                  }),
                },
              ]}
            />
            <View style={styles.scanLine} />
          </View>
        </View>
        </Animated.View>
      )}

      {/* Bottom Album Picker */}
      {!historyModalVisible && (
        <SafeAreaView style={styles.albumSectionContainer} edges={['bottom']}>
          <View style={styles.albumSection}>
        <TouchableOpacity 
          style={styles.albumHeader}
          onPress={() => {
            if (!albumModalVisible) {
              setHistoryModalVisible(false); // Hide history modal when showing album
            }
            setAlbumModalVisible(!albumModalVisible);
          }}
        >
          <Text style={styles.albumHeaderText}>
            {t('imageSearch.pickFromAlbum')}
          </Text>
          <View style={styles.albumHeaderIcon}>
            <Icon 
              name={albumModalVisible ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={COLORS.white} 
            />
          </View>
        </TouchableOpacity>
        
        {albumModalVisible && (
          <View style={styles.albumGrid}>
            {loadingPhotos ? (
              <View style={styles.albumLoadingContainer}>
                <ActivityIndicator size="small" color={COLORS.white} />
              </View>
            ) : albumPhotos.length > 0 ? (
              <ScrollView 
                style={styles.albumScrollView}
                contentContainerStyle={styles.albumScrollContent}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                bounces={false}
              >
                <View style={styles.albumGridContainer}>
                  {albumPhotos.map((photo, index) => (
                    <TouchableOpacity
                      key={`photo-${index}-${photo.uri}`}
                      style={styles.albumThumbnail}
                      onPress={() => handleChooseFromGallery(photo.path || photo.uri)}
                    >
                      <Image 
                        source={{ uri: photo.uri || photo.path }} 
                        style={styles.albumThumbnailImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <View style={styles.albumEmptyContainer}>
                <TouchableOpacity
                  style={styles.albumEmptyButton}
                  onPress={() => handleChooseFromGallery()}
                >
                  <Icon name="image-outline" size={32} color={COLORS.white} />
                  <Text style={styles.albumEmptyText}>
                    {t('imageSearch.tapToSelectPhoto')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        </View>
      </SafeAreaView>
      )}

      {/* Loading Overlay */}
      {isSearching && !resultsModalVisible && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.white} />
          <Text style={styles.loadingText}>
            {t('imageSearch.searchingFromMillions')}
          </Text>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setIsSearching(false)}>
            <View style={styles.cancelButtonInner}>
              <Text style={styles.cancelButtonText}>✕</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Results Modal */}
      {resultsModalVisible && imageBase64 && imageUri && (
        <ImageSearchResultsModal
          visible={resultsModalVisible}
          onClose={handleCloseResults}
          imageUri={imageUri}
          imageBase64={imageBase64}
        />
      )}

      {/* History Modal */}
      {historyModalVisible && (
        <SafeAreaView style={styles.historySectionContainer} edges={['bottom']}>
          <View style={styles.historySection}>
            <TouchableOpacity 
              style={styles.historyHeader}
              onPress={() => setHistoryModalVisible(false)}
            >
              <Text style={styles.historyHeaderText}>
                {t('imageSearch.history')}
              </Text>
              <View style={styles.historyHeaderRight}>
                {searchHistory.length > 0 && (
                  <TouchableOpacity
                    style={styles.historyClearButton}
                    onPress={handleClearHistory}
                  >
                    <Text style={styles.historyClearButtonText}>{t('imageSearch.clearHistory')}</Text>
                  </TouchableOpacity>
                )}
                <View style={styles.historyHeaderIcon}>
                  <Icon 
                    name="chevron-down" 
                    size={20} 
                    color={COLORS.white} 
                  />
                </View>
              </View>
            </TouchableOpacity>
            
            {searchHistory.length > 0 ? (
              <View style={styles.historyGrid}>
                <ScrollView 
                  style={styles.historyScrollView}
                  contentContainerStyle={styles.historyScrollContent}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled={true}
                  bounces={false}
                >
                  <View style={styles.historyGridContainer}>
                    {searchHistory.map((item) => {
                      // Ensure URI is properly formatted for Image component
                      let imageUri = item.imageUri;
                      // For file:// URIs, ensure they're properly formatted
                      if (imageUri && !imageUri.startsWith('file://') && !imageUri.startsWith('content://') && !imageUri.startsWith('ph://') && !imageUri.startsWith('http')) {
                        imageUri = `file://${imageUri}`;
                      }
                      
                      return (
                        <View key={item.id} style={styles.historyItem}>
                          <TouchableOpacity
                            style={styles.historyThumbnail}
                            onPress={() => handleSelectHistoryItem(item.imageUri)}
                          >
                            <Image
                              source={{ uri: imageUri }}
                              style={styles.historyThumbnailImage}
                              resizeMode="cover"
                              onError={(error) => {
                                console.error('Error loading history image:', error.nativeEvent.error);
                                console.error('Image URI:', imageUri);
                              }}
                              onLoad={() => {
                                console.log('History image loaded successfully:', imageUri);
                              }}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.historyDeleteButton}
                            onPress={() => handleDeleteHistoryItem(item.id)}
                          >
                            <Icon name="close-circle" size={20} color={COLORS.white} />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            ) : (
              <View style={styles.historyEmptyContainer}>
                <Icon name="image-outline" size={32} color={COLORS.white} />
                <Text style={styles.historyEmptyText}>
                  {t('imageSearch.noHistory')}
                </Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  cameraWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: width,
    height: height,
    zIndex: 0,
  },
  cameraBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: width,
    height: height,
    zIndex: 0,
  },
  cameraPlaceholder: {
    flex: 1,
    backgroundColor: COLORS.gray[900],
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraPlaceholderText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    marginBottom: SPACING.md,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
  },
  permissionButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  topBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  topBarButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarRight: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  helpIcon: {
    fontSize: 24,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  scanLineContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    width: width,
    height: 120,
    zIndex: 40,
  },
  scanLineGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  scanLineContainerInner: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    width: width,
    height: 2,
    marginTop: -1,
  },
  scanLineShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    width: width,
    height: 2,
    backgroundColor: '#FF5500',
    opacity: 0.3,
    borderRadius: 1,
  },
  scanLine: {
    width: width,
    height: 2,
    backgroundColor: '#FF5500',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  centerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: SPACING.xl * 6,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
    pointerEvents: 'box-none', // Allow touches to pass through to buttons
  },
  instructionBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xl * 2,
    alignItems: 'center',
    position: 'relative',
  },
  instructionText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
  },
  instructionTriangle: {
    position: 'absolute',
    bottom: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(0, 0, 0, 0.6)',
  },
  cameraButton: {
    width: 70,
    height: 70,
    borderRadius: 40,
    backgroundColor: COLORS.transparent,
    position: 'absolute',
    bottom: -SPACING.xl *3,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.white,
    marginBottom: SPACING.xl * 2,
    zIndex: 60,
    elevation: 10,
    shadowColor: COLORS.white,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cameraButtonInner: {
    width: 54,
    height: 54,
    borderRadius: 35,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyButton: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: -SPACING.xl *1,
    alignItems: 'center',
  },
  historyIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    // borderWidth: 2,
    // borderColor: COLORS.white,
    marginBottom: SPACING.xs,
  },
  historyText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
  },
  albumSectionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  albumSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
  },
  albumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  albumHeaderIcon: {
    borderWidth: 2,
    borderColor: COLORS.white,
    borderRadius: BORDER_RADIUS.full,
    padding: SPACING.xs,
    justifyContent: 'center',
    alignItems: 'center',
    width: 20,
    height: 20,
  },
  albumHeaderText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  albumGrid: {
    maxHeight: height * 0.4, // Limit height to allow scrolling
    width: '100%',
  },
  albumScrollView: {
    width: '100%',
  },
  albumScrollContent: {
    paddingBottom: SPACING.md,
    flexGrow: 1,
  },
  albumGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    gap: SPACING.sm,
    justifyContent: 'flex-start',
    width: '100%',
  },
  albumThumbnail: {
    width: (width - SPACING.md * 2 - SPACING.sm * 3) / 4,
    aspectRatio: 1,
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
  },
  albumThumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.gray[700],
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  albumLoadingContainer: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumEmptyContainer: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumEmptyButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
  },
  albumEmptyText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  loadingText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    marginTop: SPACING.lg,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
  cancelButton: {
    marginTop: SPACING.xl * 2,
  },
  cancelButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 24,
    color: COLORS.black,
    fontWeight: 'bold',
  },
  historySectionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  historySection: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  historyHeaderText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  historyHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  historyClearButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  historyClearButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
  },
  historyHeaderIcon: {
    borderWidth: 2,
    borderColor: COLORS.white,
    borderRadius: BORDER_RADIUS.full,
    padding: SPACING.xs,
    justifyContent: 'center',
    alignItems: 'center',
    width: 20,
    height: 20,
  },
  historyGrid: {
    maxHeight: height * 0.4, // Limit height to allow scrolling
    width: '100%',
    height: height * 0.4, // Set explicit height for ScrollView to work
  },
  historyScrollView: {
    width: '100%',
    height: '100%', // Take full height of parent
  },
  historyScrollContent: {
    paddingBottom: SPACING.md,
    flexGrow: 1,
  },
  historyGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    gap: SPACING.sm,
    justifyContent: 'flex-start',
    width: '100%',
  },
  historyItem: {
    width: (width - SPACING.md * 2 - SPACING.sm * 3) / 4,
    aspectRatio: 1,
    position: 'relative',
  },
  historyThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
  },
  historyThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  historyDeleteButton: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    zIndex: 10,
  },
  historyEmptyContainer: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  historyEmptyText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
});

export default ImageSearchCameraScreen;


