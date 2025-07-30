"use client";

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

interface S3UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  finalUrl: string | null;
  tempKey: string | null;
}

interface S3UploadResult {
  finalUrl: string;
  tempKey: string;
}

interface ImageDimensions {
  width: number;
  height: number;
}

export const useS3Upload = () => {
  const [state, setState] = useState<S3UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    finalUrl: null,
    tempKey: null,
  });

  const getImageDimensions = useCallback((file: File): Promise<ImageDimensions> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
  }, []);

  const uploadFile = useCallback(async (file: File): Promise<S3UploadResult> => {
    try {
      setState(prev => ({
        ...prev,
        isUploading: true,
        progress: 0,
        error: null,
        finalUrl: null,
        tempKey: null,
      }));

      // Get image dimensions for validation
      const dimensions = await getImageDimensions(file);
      
      // Validate square aspect ratio
      if (dimensions.width !== dimensions.height) {
        throw new Error("Image must have a square aspect ratio (1:1)");
      }

      // Step 1: Get presigned URL (10% progress)
      setState(prev => ({ ...prev, progress: 10 }));
      
      const response = await fetch('/api/upload/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          width: dimensions.width,
          height: dimensions.height,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get upload URL');
      }

      const { uploadUrl, finalUrl, key } = await response.json();
      
      // Step 2: Upload directly to S3 (20-90% progress)
      setState(prev => ({ ...prev, progress: 20 }));

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to S3');
      }

      // Step 3: Complete upload (100% progress)
      setState(prev => ({ 
        ...prev, 
        progress: 100,
        finalUrl,
        tempKey: key,
      }));
      
      toast.success('Image uploaded successfully!');
      
      return { finalUrl, tempKey: key };

    } catch (error: any) {
      console.error('Upload error:', error);
      const errorMessage = error.message || 'Failed to upload image';
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      toast.error(errorMessage);
      throw error;
    } finally {
      setState(prev => ({ ...prev, isUploading: false }));
      // Reset progress after a short delay
      setTimeout(() => {
        setState(prev => ({ ...prev, progress: 0 }));
      }, 1000);
    }
  }, [getImageDimensions]);

  const retry = useCallback(async (file: File): Promise<S3UploadResult> => {
    return uploadFile(file);
  }, [uploadFile]);

  const reset = useCallback(() => {
    setState({
      isUploading: false,
      progress: 0,
      error: null,
      finalUrl: null,
      tempKey: null,
    });
  }, []);

  return {
    ...state,
    uploadFile,
    retry,
    reset,
  };
}; 