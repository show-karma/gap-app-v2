import React, { useEffect, useState } from "react";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { cn } from "@/utilities/tailwind/index";
import { CheckIcon } from "@heroicons/react/24/solid";

interface Track {
  id: string;
  name: string;
  description?: string;
  communityUID: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  programId?: string;
  isActive?: boolean;
}

interface TrackSelectionProps {
  programId?: string;
  chainId: number;
  selectedTrackIds: string[];
  onTrackSelectionChange: (trackIds: string[]) => void;
  disabled?: boolean;
}

export const TrackSelection: React.FC<TrackSelectionProps> = ({
  programId,
  chainId,
  selectedTrackIds,
  onTrackSelectionChange,
  disabled = false,
}) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTracks = async () => {
      if (!programId) {
        setTracks([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const actualProgramId = programId.split("_")[0];
        const [result, error] = await fetchData(
          INDEXER.PROGRAMS.TRACKS(actualProgramId, chainId)
        );
        
        if (error) {
          console.error("Error fetching tracks:", error);
          setError("Failed to load tracks for this program");
          setTracks([]);
        } else {
          setTracks(result?.data || []);
        }
      } catch (err) {
        console.error("Error fetching tracks:", err);
        setError("Failed to load tracks for this program");
        setTracks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTracks();
  }, [programId, chainId]);

  const handleTrackSelection = (trackId: string) => {
    if (disabled) return;
    
    const newSelectedTrackIds = [...selectedTrackIds];
    const trackIndex = newSelectedTrackIds.indexOf(trackId);

    if (trackIndex === -1) {
      newSelectedTrackIds.push(trackId);
    } else {
      newSelectedTrackIds.splice(trackIndex, 1);
    }

    onTrackSelectionChange(newSelectedTrackIds);
  };

  if (isLoading) {
    return (
      <div className="mt-4 p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-lg">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading tracks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!programId) {
    return null;
  }

  if (tracks.length === 0) {
    return (
      <div className="mt-4 p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-lg">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No tracks available for this program
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
        Select tracks for this program
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {tracks.map((track) => (
          <div
            key={track.id}
            onClick={() => handleTrackSelection(track.id)}
            className={cn(
              "p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all",
              selectedTrackIds.includes(track.id)
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600",
              disabled && "opacity-60 cursor-not-allowed"
            )}
          >
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {track.name}
              </p>
              {track.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                  {track.description}
                </p>
              )}
            </div>
            {selectedTrackIds.includes(track.id) && (
              <CheckIcon className="h-5 w-5 text-blue-500 dark:text-blue-400" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
