import type { FC } from "react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  acceptedFormats: string;
  disabled?: boolean;
  uploadedFile?: File | null;
  description?: string;
  className?: string;
}

export const FileUpload: FC<FileUploadProps> = ({
  onFileSelect,
  acceptedFormats,
  disabled = false,
  uploadedFile,
  description,
  className,
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className={className}>
      <input
        type="file"
        accept={acceptedFormats}
        disabled={disabled}
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      {description && (
        <p className="mt-2 text-sm text-gray-500">{description}</p>
      )}
      {uploadedFile && (
        <p className="mt-2 text-sm text-green-600">
          Uploaded: {uploadedFile.name}
        </p>
      )}
    </div>
  );
};