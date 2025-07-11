"use client";
import { useState, useEffect, Fragment } from "react";
import { useAuthStore } from "@/store/auth";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import { MESSAGES } from "@/utilities/messages";
import { useIsCommunityAdmin } from "@/hooks/useIsCommunityAdmin";
import type { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useAccount } from "wagmi";
import { errorManager } from "@/components/Utilities/errorManager";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import {
  PlusIcon,
  PencilIcon,
  ArchiveBoxIcon,
  TagIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { cn } from "@/utilities/tailwind";
import { Dialog, Transition } from "@headlessui/react";
import { INDEXER } from "@/utilities/indexer";
import {
  useTracksForCommunity,
  useTracksForProgram,
  useCreateTrack,
  useUpdateTrack,
  useArchiveTrack,
  useAssignTracksToProgram,
  useRemoveTrackFromProgram,
  useRemoveTracksFromProgramBatch,
} from "@/hooks/useTracks";
import { Track } from "@/services/tracks";
import { useCommunityPrograms } from "@/hooks/usePrograms";
import { CreateTrackModal } from "@/components/Pages/Communities/Tracks/CreateTrackModal";
import { EditTrackModal } from "./Tracks/EditTrackModal";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PAGES } from "@/utilities/pages";
import { ChevronLeftIcon } from "@heroicons/react/24/solid";

export const TracksAdminPage = ({
  communityId,
  community,
}: {
  communityId: string;
  community: ICommunityResponse;
}) => {
  const { address, isConnected } = useAccount();
  const { isAuth } = useAuthStore();
  const router = useRouter();

  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [newTrack, setNewTrack] = useState({ name: "", description: "" });
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);

  const signer = useSigner();

  // Check if user is admin of this community
  const { isCommunityAdmin: isAdmin, isLoading: loading } = useIsCommunityAdmin(
    community?.uid,
    address
  );

  // React Query hooks
  const {
    data: tracks = [],
    isLoading: isLoadingTracks,
    refetch: refetchTracks,
  } = useTracksForCommunity(community?.uid || "", true);

  const {
    data: programTracks = [],
    isLoading: isLoadingProgramTracks,
    refetch: refetchProgramTracks,
  } = useTracksForProgram(selectedProgram);

  // React Query hook for community programs
  const { data: programs = [], isLoading: isLoadingPrograms } =
    useCommunityPrograms(communityId);

  const { mutate: createTrack, isPending: isCreatingTrack } = useCreateTrack();
  const { mutate: updateTrack, isPending: isUpdatingTrack } = useUpdateTrack(
    community?.uid || ""
  );
  const { mutate: archiveTrack } = useArchiveTrack(community?.uid || "");
  const { mutate: assignTracksToProgram, isPending: isAssigningTracks } =
    useAssignTracksToProgram(selectedProgram, community?.uid || "");
  const { mutate: removeTracksFromProgram } = useRemoveTracksFromProgramBatch(
    selectedProgram,
    community?.uid || ""
  );

  // Set selected track IDs based on program tracks when program changes
  useEffect(() => {
    // Only update selectedTrackIds when programTracks changes and has a value
    if (selectedProgram && programTracks) {
      setSelectedTrackIds(programTracks.map((track: Track) => track.id));
    }
  }, [selectedProgram, programTracks]);

  const handleCreateTrack = async () => {
    if (!newTrack.name) {
      toast.error("Track name is required");
      return;
    }

    createTrack(
      {
        name: newTrack.name,
        description: newTrack.description || "",
        communityUID: community.uid,
      },
      {
        onSuccess: () => {
          setNewTrack({ name: "", description: "" });
          setShowCreateModal(false);
        },
      }
    );
  };

  const handleUpdateTrack = async () => {
    if (!selectedTrack || !selectedTrack.name) {
      toast.error("Track name is required");
      return;
    }

    updateTrack(
      {
        id: selectedTrack.id,
        name: selectedTrack.name,
        description: selectedTrack.description,
      },
      {
        onSuccess: () => {
          setSelectedTrack(null);
          setShowEditModal(false);
        },
      }
    );
  };

  const handleArchiveTrack = async (trackId: string) => {
    archiveTrack(trackId);
  };

  const handleAssignTracks = async () => {
    if (!selectedProgram || selectedTrackIds.length === 0) {
      toast.error("Please select a program and at least one track");
      return;
    }

    // Get tracks to add (selected but not in program)
    const tracksToAdd = selectedTrackIds.filter(
      (id) => !programTracks.some((pt: Track) => pt.id === id)
    );

    // Get tracks to remove (in program but not selected)
    const tracksToRemove = programTracks
      .filter((pt: Track) => !selectedTrackIds.includes(pt.id))
      .map((pt: Track) => pt.id);

    // Add new tracks
    if (tracksToAdd.length > 0) {
      assignTracksToProgram(tracksToAdd);
    }

    // Remove unselected tracks
    if (tracksToRemove.length > 0) {
      removeTracksFromProgram(tracksToRemove);
    }
  };

  const handleProgramChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedProgram(value);
  };

  const handleTrackSelection = (trackId: string) => {
    setSelectedTrackIds((prev) => {
      if (prev.includes(trackId)) {
        return prev.filter((id) => id !== trackId);
      } else {
        return [...prev, trackId];
      }
    });
  };

  if (loading) {
    return (
      <div className="flex w-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-zinc-800/50 rounded-lg">
        <p className="text-gray-600 dark:text-gray-300 text-center">
          {MESSAGES.ADMIN.NOT_AUTHORIZED(community?.uid || "")}
        </p>
        <Button className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 mt-2">
      <div className="max-w-7xl mx-auto">
        <div className="w-full flex flex-row items-center justify-between max-w-4xl mb-4">
          <Link
            href={PAGES.ADMIN.ROOT(
              community?.details?.data?.slug || (community?.uid as string)
            )}
          >
            <Button className="flex flex-row items-center gap-2 px-4 py-2 bg-transparent text-black dark:text-white dark:bg-transparent hover:bg-transparent rounded-md transition-all ease-in-out duration-200">
              <ChevronLeftIcon className="h-5 w-5" />
              Return to admin page
            </Button>
          </Link>
        </div>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Tracks Management
          </h1>
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="w-5 h-5 mr-2" />
            Create Track
          </Button>
        </div>

        {/* Create Track Modal */}
        <CreateTrackModal
          show={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          track={newTrack}
          setTrack={setNewTrack}
          onSubmit={handleCreateTrack}
          isSubmitting={isCreatingTrack}
        />

        {/* Edit Track Modal */}
        <EditTrackModal
          show={showEditModal}
          onClose={() => setShowEditModal(false)}
          selectedTrack={selectedTrack}
          setSelectedTrack={setSelectedTrack}
          onSubmit={handleUpdateTrack}
          isSubmitting={isUpdatingTrack}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Tracks List */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-800">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              All Tracks
            </h2>

            {isLoadingTracks ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : tracks.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">
                No tracks found. Create a track to get started.
              </p>
            ) : (
              <div className="space-y-4">
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {track.name}
                      </h3>
                      {track.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {track.description}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => {
                          setSelectedTrack(track);
                          setShowEditModal(true);
                        }}
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Button>

                      <Button onClick={() => handleArchiveTrack(track.id)}>
                        <ArchiveBoxIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Program Tracks */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-800">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Program Tracks
            </h2>

            <div className="mb-6">
              <label
                htmlFor="programSelect"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Select Program
              </label>
              <select
                id="programSelect"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-zinc-700 dark:text-white"
                onChange={handleProgramChange}
                value={selectedProgram}
              >
                <option value="">Select a program</option>
                {isLoadingPrograms ? (
                  <option disabled>Loading programs...</option>
                ) : (
                  programs.map((program) => (
                    <option
                      key={`${program.programId}_${program.chainID}`}
                      value={`${program.programId}_${program.chainID}`}
                    >
                      {program.metadata?.title}
                    </option>
                  ))
                )}
              </select>
            </div>

            {selectedProgram ? (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">
                  Tracks assigned to this program
                </h3>

                {isLoadingTracks || isLoadingProgramTracks ? (
                  <div className="flex justify-center py-8">
                    <Spinner />
                  </div>
                ) : tracks.length === 0 && programTracks.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">
                    No tracks available to assign.
                  </p>
                ) : (
                  <>
                    <div className="space-y-2 max-h-80 overflow-y-auto p-2 border border-gray-200 dark:border-zinc-800 rounded-lg mb-4">
                      {/* All regular tracks from the community */}
                      {tracks.map((track) => (
                        <div
                          key={track.id}
                          className={cn(
                            "flex items-center p-2 rounded-md",
                            selectedTrackIds.includes(track.id)
                              ? "bg-primary-100 dark:bg-primary-900/20 border border-primary-500"
                              : "hover:bg-gray-100 dark:hover:bg-zinc-800 border border-transparent",
                            "cursor-pointer"
                          )}
                          onClick={() => handleTrackSelection(track.id)}
                        >
                          <div
                            className={cn(
                              "w-4 h-4 rounded-sm mr-3 flex items-center justify-center border",
                              selectedTrackIds.includes(track.id)
                                ? "bg-primary-500 border-primary-500"
                                : "border-gray-300 dark:border-zinc-600"
                            )}
                          >
                            {selectedTrackIds.includes(track.id) && (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="white"
                                className="w-3 h-3"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                          <span className="text-gray-900 dark:text-white">
                            {track.name}
                          </span>
                        </div>
                      ))}

                      {/* Show tracks that are in programTracks but not in tracks */}
                      {programTracks
                        .filter(
                          (pt: Track) =>
                            !tracks.some((t: Track) => t.id === pt.id)
                        )
                        .map((track: Track) => (
                          <div
                            key={track.id}
                            className={cn(
                              "flex items-center p-2 rounded-md bg-gray-200 dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 opacity-75 cursor-not-allowed"
                            )}
                          >
                            <div
                              className={cn(
                                "w-4 h-4 rounded-sm mr-3 flex items-center justify-center border bg-primary-500 border-primary-500"
                              )}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="white"
                                className="w-3 h-3"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                            <span className="text-gray-900 dark:text-white flex items-center">
                              {track.name}
                              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 italic">
                                (Archived)
                              </span>
                            </span>
                          </div>
                        ))}
                    </div>

                    <Button
                      onClick={handleAssignTracks}
                      disabled={isAssigningTracks}
                      className="w-full"
                    >
                      {isAssigningTracks ? (
                        <Spinner className="w-4 h-4 mr-2" />
                      ) : null}
                      Save Track Assignments
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                Select a program to manage its tracks.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
