"use client";

import { useCallback, useState } from "react";
import { cn } from "@/utilities/tailwind";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  acceptedFormats?: string;
  disabled?: boolean;
  className?: string;
  uploadedFile?: File | null;
  description?: string;
}

export function FileUpload({
  onFileSelect,
  acceptedFormats = ".csv",
  disabled = false,
  className,
  uploadedFile,
  description = "CSV format: address, amount",
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files && files[0]) {
        onFileSelect(files[0]);
      }
    },
    [onFileSelect]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files[0]) {
        onFileSelect(files[0]);
      }
    },
    [onFileSelect]
  );

  return (
    <div className={className}>
      <div
        className={cn(
          "flex justify-center rounded-xl border-2 border-dashed px-6 pb-6 pt-5 transition-all duration-200",
          isDragOver
            ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 scale-105"
            : "border-gray-300 dark:border-zinc-700 hover:border-gray-400 dark:hover:border-zinc-600",
          disabled && "opacity-50 pointer-events-none"
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
              className="relative cursor-pointer rounded-md bg-white dark:bg-zinc-800 font-medium text-indigo-600 dark:text-indigo-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors px-2 py-1"
            >
              <span className="font-semibold">
                {uploadedFile ? uploadedFile.name : "Upload a file"}
              </span>
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                className="sr-only"
                accept={acceptedFormats}
                onChange={handleFileChange}
                disabled={disabled}
              />
            </label>
            {!uploadedFile && <p className="pl-1">or drag and drop</p>}
          </div>
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-zinc-800 px-3 py-1 rounded-full inline-block">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
