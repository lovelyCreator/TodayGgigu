import axios from 'axios';
import { Platform } from 'react-native';
import { CloudinaryUploadResponse } from '../types';

// Cloudinary configuration
// TODO: Replace with your actual Cloudinary credentials
const CLOUDINARY_UPLOAD_PRESET = 'glowmify'; // Replace with your actual unsigned upload preset
const CLOUDINARY_CLOUD_NAME = 'dvxshqjev'; // Replace with your actual cloud name
const CLOUDINARY_API_BASE = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}`;

/**
 * Upload an image to Cloudinary
 * @param uri - The URI of the image to upload
 * @param name - The name of the image file
 * @returns Promise with Cloudinary response
 */
export const uploadToCloudinary = async (uri: string, name?: string): Promise<CloudinaryUploadResponse> => {
  // console.log('=== CLOUDINARY IMAGE UPLOAD START ===');
  // console.log('Image URI:', uri);
  // console.log('Image name:', name);
  // console.log('Platform:', Platform.OS);
  
  // For React Native, we'll use a specialized approach
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    if (uri) {
      // console.log('Processing React Native image object');
      
      // Create a proper file object for React Native
      const fileData: any = {
        uri: uri,
        type: 'image/jpeg',
        name: name || `image_${Date.now()}.jpg`,
      };
      
      // console.log('File data for upload:', fileData);
      
      // Use fetch with proper configuration for React Native
      try {
        // Create FormData
        const formData = new FormData();
        formData.append('file', fileData);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);
        
        const url = `${CLOUDINARY_API_BASE}/image/upload`;
        // console.log('Sending React Native image upload request to:', url);
        
        // Use a more compatible approach for React Native
        const response = await fetch(url, {
          method: 'POST',
          body: formData,
        });
        
        // console.log('React Native image upload response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          // console.error('React Native image upload failed. Response text:', errorText);
          throw new Error(`HTTP ${response.status}: ${errorText || 'Upload failed'}`);
        }
        
        const responseData = await response.json();
        // console.log('React Native image upload SUCCESS. Response:', responseData);
        return responseData;
      } catch (error: any) {
        // console.error('React Native Cloudinary upload error:', error);
        // console.error('Error name:', error.name);
        // console.error('Error message:', error.message);
        
        if (error.message.includes('Network request failed')) {
          throw new Error('Network error during Cloudinary upload. Please check your internet connection.');
        }
        
        throw new Error(`Failed to upload file to Cloudinary: ${error.message || 'Unknown error'}`);
      }
    } else {
      throw new Error('Invalid file object for React Native upload - missing URI');
    }
  } else {
    // For web/browser environments, use axios
    // console.log('Processing web file object');
    
    const formData = new FormData();
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    
    try {
      // console.log('Sending web image upload request to:', `${CLOUDINARY_API_BASE}/image/upload`);
      const response = await axios.post<CloudinaryUploadResponse>(
        `${CLOUDINARY_API_BASE}/image/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000, // 30 second timeout
        }
      );
      // console.log('Web image upload SUCCESS. Response:', response.data);
      return response.data;
    } catch (error: any) {
      // console.error('Web Cloudinary upload error:', error);
      
      if (error.response) {
        // console.error('Error response data:', error.response.data);
        // console.error('Error response status:', error.response.status);
        // console.error('Error response headers:', error.response.headers);
      } else if (error.request) {
        // console.error('Error request data:', error.request);
        // console.error('No response received. Possible network/CORS issues.');
      } else {
        // console.error('Error message:', error.message);
      }
      
      throw new Error(`Failed to upload file to Cloudinary: ${error.message || 'Unknown error'}`);
    }
  }
};

/**
 * Upload a video to Cloudinary (without folder and tags)
 * @param file - The video file to upload
 * @returns Promise with Cloudinary response
 */
export const uploadVideoToCloudinary = async (uri: any, fileName: any): Promise<CloudinaryUploadResponse> => {
  // console.log('=== CLOUDINARY VIDEO UPLOAD START ===');
  // console.log('File object:', file);
  // console.log('File object type:', typeof file);
  // console.log('File object keys:', Object.keys(file));
  // console.log('Platform:', Platform.OS);
  
  // For React Native, we'll use a specialized approach
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    if (uri) {
      // console.log('Processing React Native video file object');
      
      // Log the URI to make sure it's valid
      // console.log('File URI:', uri);
      // console.log('File URI type:', typeof uri);
      
      // Create a proper file object for React Native
      const fileData: any = {
        uri: uri,
        type: 'video/mp4',
        name: fileName,
      };
      
      // console.log('Video file data for upload:', fileData);
      
      // Use fetch with proper configuration for React Native
      try {
        // Create FormData
        const formData = new FormData();
        formData.append('file', fileData);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);
        
        const url = `${CLOUDINARY_API_BASE}/video/upload`;
        // console.log('Sending React Native video upload request to:', url);
        
        // Use a more compatible approach for React Native
        const response = await fetch(url, {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json',
          },
        });
        
        // console.log('React Native video upload response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          // console.error('React Native video upload failed. Response text:', errorText);
          throw new Error(`HTTP ${response.status}: ${errorText || 'Upload failed'}`);
        }
        
        const responseData = await response.json();
        // console.log('React Native video upload SUCCESS. Response:', responseData);
        return responseData;
      } catch (error: any) {
        // console.error('React Native Cloudinary video upload error:', error);
        // console.error('Error name:', error.name);
        // console.error('Error message:', error.message);
        
        if (error.cause) {
          // console.error('Error cause:', error.cause);
        }
        
        if (error.stack) {
          // console.error('Error stack:', error.stack);
        }
        
        if (error.message.includes('Network request failed')) {
          throw new Error('Network error during Cloudinary video upload. Please check your internet connection.');
        }
        
        throw new Error(`Failed to upload video to Cloudinary: ${error.message || 'Unknown error'}`);
      }
    } else {
      throw new Error('Invalid video file object for React Native upload - missing URI');
    }
  } else {
    // For web/browser environments, use axios
    // console.log('Processing web video file object');
    
    const formData = new FormData();
    // formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    
    try {
      // console.log('Sending web video upload request to:', `${CLOUDINARY_API_BASE}/video/upload`);
      const response = await axios.post<CloudinaryUploadResponse>(
        `${CLOUDINARY_API_BASE}/video/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 60000, // 60 second timeout for videos
        }
      );
      // console.log('Web video upload SUCCESS. Response:', response.data);
      return response.data;
    } catch (error: any) {
      // console.error('Web Cloudinary video upload error:', error);
      
      if (error.response) {
        // console.error('Error response data:', error.response.data);
        // console.error('Error response status:', error.response.status);
        // console.error('Error response headers:', error.response.headers);
      } else if (error.request) {
        // console.error('Error request data:', error.request);
        // console.error('No response received. Possible network/CORS issues.');
      } else {
        // console.error('Error message:', error.message);
      }
      
      throw new Error(`Failed to upload video to Cloudinary: ${error.message || 'Unknown error'}`);
    }
  }
};

/**
 * Upload image to Cloudinary and return the secure URL
 * @param uri - The URI of the image to upload
 * @returns Promise with the secure URL of the uploaded image
 */
export const uploadImageToCloudinary = async (uri: string): Promise<string> => {
  try {
    const response = await uploadToCloudinary(uri, `profile_${Date.now()}.jpg`);
    return response.secure_url;
  } catch (error) {
    // console.error('Error uploading image to Cloudinary:', error);
    throw error;
  }
};

/**
 * Delete a resource from Cloudinary
 * @param publicId - The public ID of the resource to delete
 * @returns Promise with deletion result
 */
export const deleteFromCloudinary = async (publicId: string): Promise<any> => {
  try {
    const response = await axios.post(
      `${CLOUDINARY_API_BASE}/delete_by_token`,
      { public_id: publicId },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    return response.data;
  } catch (error) {
    // console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete file from Cloudinary');
  }
};