"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "react-hot-toast";
import { Button } from "@/components/Utilities/Button";
import { parseDisbursementCSV } from "@/utilities/allo/csvParser";
import type { CSVRow, ValidatedCSVRow, PoolInfo } from "@/types/allo";
import { FiUpload, FiFile, FiX } from "react-icons/fi";

interface CSVUploadProps {
  onCSVParsed: (data: ValidatedCSVRow[]) => void;
  poolInfo?: PoolInfo;
}

export function CSVUpload({ onCSVParsed, poolInfo }: CSVUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<ValidatedCSVRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    if (!file.name.endsWith('.csv')) {
      toast.error("Please upload a CSV file");
      return;
    }
    
    setFile(file);
    setError(null);
    setIsProcessing(true);
    
    try {
      const text = await file.text();
      const result = await parseDisbursementCSV(text, poolInfo?.token);
      
      if (result.errors.length > 0) {
        setError(`Found ${result.errors.length} errors in the CSV`);
        console.error("CSV Validation Errors:", result.errors);
      }
      
      if (result.validRows.length > 0) {
        setParsedData(result.validRows);
        onCSVParsed(result.validRows);
        toast.success(`Successfully parsed ${result.validRows.length} rows`);
      } else {
        toast.error("No valid rows found in the CSV");
      }
    } catch (error) {
      console.error("Error parsing CSV:", error);
      toast.error("Failed to parse CSV file");
      setError("Failed to parse CSV file");
    } finally {
      setIsProcessing(false);
    }
  }, [onCSVParsed, poolInfo]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false
  });

  const clearFile = () => {
    setFile(null);
    setParsedData(null);
    setError(null);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">
        Upload Distribution CSV
      </h2>

      {!file ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
        >
          <input {...getInputProps()} />
          <FiUpload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {isDragActive ? "Drop the CSV file here" : "Drag and drop a CSV file here, or click to select"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            CSV should contain: address, amount, profileId (optional)
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center space-x-3">
              <FiFile className="h-6 w-6 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <button
              onClick={clearFile}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          {isProcessing && (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Processing CSV...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {parsedData && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-600 dark:text-green-400">
                ✓ Successfully parsed {parsedData.length} rows
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">CSV Format</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
          Your CSV file should have the following columns:
        </p>
        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <li>• <strong>address</strong> (required): Wallet address to receive funds</li>
          <li>• <strong>amount</strong> (required): Amount to distribute</li>
          <li>• <strong>profileId</strong> (optional): Profile ID of the recipient</li>
        </ul>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
          Example: 0x123..., 100.5, profile123
        </p>
      </div>
    </div>
  );
} 