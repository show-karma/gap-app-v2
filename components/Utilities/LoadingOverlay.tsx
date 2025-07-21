import { FC } from "react";
import { Spinner } from "./Spinner";

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
}

export const LoadingOverlay: FC<LoadingOverlayProps> = ({ isLoading, message = "Loading..." }) => {
  if (!isLoading) return null;

  return (
    <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center z-10">
      <div className="flex flex-col items-center">
        <Spinner className="w-6 h-6 mb-2" />
        <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
      </div>
    </div>
  );
};