"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import toast from "react-hot-toast"
import fetchData from "@/utilities/fetchData"
import { INDEXER } from "@/utilities/indexer"
import { cn } from "@/utilities/tailwind"

interface FileUploadProps {
  onFileSelect: (file: File) => void
  acceptedFormats?: string
  disabled?: boolean
  className?: string
  uploadedFile?: File | null
  description?: string
  // S3 upload props (opt-in)
  useS3Upload?: boolean
  onS3UploadComplete?: (finalUrl: string, tempKey: string) => void
  onS3UploadError?: (error: string) => void
  onUploadProgress?: (progress: number) => void
  // Validation props
  maxFileSize?: number // Maximum file size in bytes
  allowedFileTypes?: string[] // Array of allowed MIME types
}

interface ImageDimensions {
  width: number
  height: number
}

export function FileUpload({
  onFileSelect,
  acceptedFormats = ".csv",
  disabled = false,
  className,
  uploadedFile,
  description = "CSV format: address, amount",
  useS3Upload = false,
  onS3UploadComplete,
  onS3UploadError,
  onUploadProgress,
  maxFileSize,
  allowedFileTypes,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Add ref for file input
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Clear file input when uploadedFile becomes null
  useEffect(() => {
    if (!uploadedFile && fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [uploadedFile])

  // Function to get image dimensions
  const getImageDimensions = useCallback((file: File): Promise<ImageDimensions> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
        })
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error("Failed to load image"))
      }

      img.src = url
    })
  }, [])

  // S3 upload function
  const uploadToS3 = useCallback(
    async (file: File) => {
      try {
        setIsUploading(true)
        setUploadProgress(0)
        setValidationError(null)
        onUploadProgress?.(0)

        // Get image dimensions for validation
        const dimensions = await getImageDimensions(file)

        // Validate square aspect ratio
        if (dimensions.width !== dimensions.height) {
          const error = "Image must have a square aspect ratio (1:1)"
          setValidationError(error)
          toast.error(error)
          onS3UploadError?.(error)
          return
        }

        // Step 1: Get presigned URL
        setUploadProgress(10)
        onUploadProgress?.(10)

        const [data, error] = await fetchData(INDEXER.PROJECT.LOGOS.PRESIGNED_URL(), "POST", {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          width: dimensions.width,
          height: dimensions.height,
        })

        if (error) {
          throw new Error(error || "Failed to get upload URL")
        }

        const { uploadUrl, finalUrl, key } = data

        // Step 2: Upload directly to S3 with progress tracking
        setUploadProgress(20)
        onUploadProgress?.(20)

        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        })

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload file to S3")
        }

        // Complete upload
        setUploadProgress(100)
        onUploadProgress?.(100)

        toast.success("Image uploaded successfully!")
        onS3UploadComplete?.(finalUrl, key)
      } catch (error: any) {
        console.error("Upload error:", error)
        const errorMessage = error.message || "Failed to upload image"
        setValidationError(errorMessage)
        toast.error(errorMessage)
        onS3UploadError?.(errorMessage)
      } finally {
        setIsUploading(false)
        setUploadProgress(0)
        onUploadProgress?.(0)
      }
    },
    [getImageDimensions, onUploadProgress, onS3UploadComplete, onS3UploadError]
  )

  const handleFileSelection = useCallback(
    (file: File) => {
      setValidationError(null)

      // File size validation (only if maxFileSize is provided)
      if (maxFileSize && file.size > maxFileSize) {
        const error = `File size must be less than ${(maxFileSize / 1024 / 1024).toFixed(1)}MB`
        setValidationError(error)
        toast.error(error)
        return
      }

      // File type validation (only if allowedFileTypes is provided)
      if (allowedFileTypes && !allowedFileTypes.includes(file.type)) {
        const fileTypeNames = allowedFileTypes
          .map((type) => {
            if (type === "image/jpeg") return "JPEG"
            if (type === "image/png") return "PNG"
            if (type === "image/webp") return "WebP"
            return type.split("/")[1]?.toUpperCase() || type
          })
          .join(", ")
        const error = `Only ${fileTypeNames} files are allowed`
        setValidationError(error)
        toast.error(error)
        return
      }

      // Call the original onFileSelect
      onFileSelect(file)

      // If S3 upload is enabled, start the upload process
      if (useS3Upload) {
        uploadToS3(file)
      }
    },
    [onFileSelect, useS3Upload, uploadToS3, maxFileSize, allowedFileTypes]
  )

  // Retry upload function
  const retryUpload = useCallback(() => {
    if (uploadedFile && useS3Upload) {
      uploadToS3(uploadedFile)
    }
  }, [uploadedFile, useS3Upload, uploadToS3])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      const files = e.dataTransfer.files
      if (files?.[0]) {
        handleFileSelection(files[0])
      }
    },
    [handleFileSelection]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files?.[0]) {
        handleFileSelection(files[0])
      }
    },
    [handleFileSelection]
  )

  return (
    <div className={className}>
      <section
        aria-label="File drop zone"
        className={cn(
          "flex justify-center rounded-xl border-2 border-dashed px-6 pb-6 pt-5 transition-all duration-200",
          isDragOver
            ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 scale-105"
            : validationError
              ? "border-red-400 bg-red-50 dark:bg-red-950/20"
              : "border-gray-300 dark:border-zinc-700 hover:border-gray-400 dark:hover:border-zinc-600",
          (disabled || isUploading) && "opacity-50 pointer-events-none"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-2 text-center">
          <svg
            className={cn(
              "mx-auto h-16 w-16 transition-colors",
              isDragOver
                ? "text-indigo-500 dark:text-indigo-400"
                : validationError
                  ? "text-red-500 dark:text-red-400"
                  : "text-gray-400 dark:text-gray-500"
            )}
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 justify-center">
            <label
              htmlFor="file-upload"
              className={cn(
                "relative cursor-pointer rounded-md bg-white dark:bg-zinc-800 font-medium text-indigo-600 dark:text-indigo-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors px-2 py-1",
                isUploading && "cursor-not-allowed opacity-50"
              )}
            >
              <span className="font-semibold">
                {isUploading ? "Uploading..." : uploadedFile ? uploadedFile.name : "Upload a file"}
              </span>
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                className="sr-only"
                accept={acceptedFormats}
                onChange={handleFileChange}
                disabled={disabled || isUploading}
                ref={fileInputRef}
              />
            </label>
            {!uploadedFile && !isUploading && <p className="pl-1">or drag and drop</p>}
          </div>

          {/* Progress Bar */}
          {isUploading && (
            <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          {/* Description */}
          {description && !validationError && (
            <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-zinc-800 px-3 py-1 rounded-full inline-block">
              {description}
            </p>
          )}

          {/* Validation Error */}
          {validationError && (
            <div className="text-xs text-red-600 dark:text-red-400 space-y-2">
              <p className="bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-lg">{validationError}</p>
              {useS3Upload && (
                <button
                  onClick={retryUpload}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline text-xs"
                  disabled={isUploading}
                >
                  Retry upload
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
