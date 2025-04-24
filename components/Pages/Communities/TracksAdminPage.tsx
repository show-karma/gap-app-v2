"use client";
import { useState, useEffect, Fragment } from "react";
import { useAuthStore } from "@/store/auth";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import { MESSAGES } from "@/utilities/messages";
import { isCommunityAdminOf } from "@/utilities/sdk/communities/isCommunityAdmin";
import type { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useAccount } from "wagmi";
import { errorManager } from "@/components/Utilities/errorManager";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import { PlusIcon, PencilIcon, ArchiveBoxIcon, TagIcon, XMarkIcon } from "@heroicons/react/24/outline";
import fetchData from "@/utilities/fetchData";
import toast from "react-hot-toast";
import { cn } from "@/utilities/tailwind";
import { envVars } from "@/utilities/enviromentVars";
import { Dialog, Transition } from "@headlessui/react";

interface Track {
  id: string;
  name: string;
  description?: string;
  communityUID: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  programId?: string;
  isActive?: boolean;
}

const TRACK_API = {
  TRACKS: {
    ALL: (communityUID: string, includeArchived: boolean = false) => 
      `/tracks?communityUID=${communityUID}${includeArchived ? '&includeArchived=true' : ''}`,
    BY_ID: (id: string) => `/tracks/${id}`,
    CREATE: () => `/tracks`,
    UPDATE: (id: string) => `/tracks/${id}`,
    ARCHIVE: (id: string) => `/tracks/${id}`,
  },
  PROGRAMS: {
    TRACKS: {
      ALL: (programId: string, chainID: number) => `/programs/${programId}/tracks?chainID=${chainID}`,
      ASSIGN: (programId: string, chainID: number) => `/programs/${programId}/tracks?chainID=${chainID}`,
      REMOVE: (programId: string, chainID: number, trackId: string) => 
        `/programs/${programId}/tracks/${trackId}?chainID=${chainID}`,
    }
  }
};

export const TracksAdminPage = ({
  communityId,
  community,
}: {
  communityId: string;
  community: ICommunityResponse;
}) => {
  const { address, isConnected } = useAccount();
  const { isAuth } = useAuthStore();

  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [programTracks, setProgramTracks] = useState<Track[]>([]);
  const [isCreatingTrack, setIsCreatingTrack] = useState<boolean>(false);
  const [isUpdatingTrack, setIsUpdatingTrack] = useState<boolean>(false);
  const [isAssigningTracks, setIsAssigningTracks] = useState<boolean>(false);
  const [newTrack, setNewTrack] = useState({ name: "", description: "" });
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);

  const signer = useSigner();

  useEffect(() => {
    if (!community) return;

    const checkIfAdmin = async () => {
      if (!community?.uid || !isAuth) return;
      try {
        const checkAdmin = await isCommunityAdminOf(
          community,
          address as string,
          signer
        );
        setIsAdmin(checkAdmin);
        if (checkAdmin) {
          fetchTracks();
          fetchPrograms();
        }
      } catch (error: any) {
        errorManager(
          `Error checking if ${address} is admin of ${communityId}`,
          error
        );
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkIfAdmin();
  }, [address, isConnected, isAuth, community?.uid, signer]);

  const fetchTracks = async () => {
    try {
      const [data, error] = await fetchData(
        TRACK_API.TRACKS.ALL(community.uid, true),
        "GET",
        {},
        {},
        {},
        true,
        false,
        envVars.NEXT_PUBLIC_GAP_INDEXER_URL
      );
      
      if (error) {
        throw new Error(error);
      }
      
      setTracks(data.map((track: any) => ({
        ...track,
        createdAt: new Date(track.createdAt),
        updatedAt: new Date(track.updatedAt)
      })));
    } catch (error: any) {
      errorManager("Error fetching tracks", error);
      toast.error("Failed to fetch tracks. Please try again.");
    }
  };

  const fetchPrograms = async () => {
    try {
      const response = await fetch(`/api/communities/${communityId}/programs`);
      const data = await response.json();
      setPrograms(data);
    } catch (error: any) {
      errorManager("Error fetching programs", error);
      toast.error("Failed to fetch programs. Please try again.");
    }
  };

  const fetchProgramTracks = async (programId: string) => {
    if (!programId) return;
    try {
      const [data, error] = await fetchData(
        TRACK_API.PROGRAMS.TRACKS.ALL(programId, 1),
        "GET",
        {},
        {},
        {},
        true,
        false,
        envVars.NEXT_PUBLIC_GAP_INDEXER_URL
      );
      
      if (error) {
        throw new Error(error);
      }
      
      setProgramTracks(data.map((track: any) => ({
        ...track,
        createdAt: new Date(track.createdAt),
        updatedAt: new Date(track.updatedAt)
      })));
    } catch (error: any) {
      errorManager(`Error fetching tracks for program ${programId}`, error);
      toast.error("Failed to fetch program tracks. Please try again.");
    }
  };

  const handleCreateTrack = async () => {
    if (!newTrack.name) {
      toast.error("Track name is required");
      return;
    }

    setIsCreatingTrack(true);
    try {
      const [data, error] = await fetchData(
        TRACK_API.TRACKS.CREATE(),
        "POST",
        {
          name: newTrack.name,
          description: newTrack.description,
          communityUID: community.uid,
        },
        {},
        {},
        true,
        false,
        envVars.NEXT_PUBLIC_GAP_INDEXER_URL
      );
      
      if (error) {
        throw new Error(error);
      }
      
      toast.success("Track created successfully");
      setNewTrack({ name: "", description: "" });
      setShowCreateModal(false);
      fetchTracks();
    } catch (error: any) {
      errorManager("Error creating track", error);
      toast.error("Failed to create track. Please try again.");
    } finally {
      setIsCreatingTrack(false);
    }
  };

  const handleUpdateTrack = async () => {
    if (!selectedTrack || !selectedTrack.name) {
      toast.error("Track name is required");
      return;
    }

    setIsUpdatingTrack(true);
    try {
      const [data, error] = await fetchData(
        TRACK_API.TRACKS.UPDATE(selectedTrack.id),
        "PUT",
        {
          name: selectedTrack.name,
          description: selectedTrack.description,
        },
        {},
        {},
        true,
        false,
        envVars.NEXT_PUBLIC_GAP_INDEXER_URL
      );
      
      if (error) {
        throw new Error(error);
      }
      
      toast.success("Track updated successfully");
      setSelectedTrack(null);
      setShowEditModal(false);
      fetchTracks();
    } catch (error: any) {
      errorManager("Error updating track", error);
      toast.error("Failed to update track. Please try again.");
    } finally {
      setIsUpdatingTrack(false);
    }
  };

  const handleArchiveTrack = async (trackId: string) => {
    try {
      const [data, error] = await fetchData(
        TRACK_API.TRACKS.ARCHIVE(trackId),
        "DELETE",
        {},
        {},
        {},
        true,
        false,
        envVars.NEXT_PUBLIC_GAP_INDEXER_URL
      );
      
      if (error) {
        throw new Error(error);
      }
      
      toast.success("Track archived successfully");
      fetchTracks();
    } catch (error: any) {
      errorManager("Error archiving track", error);
      toast.error("Failed to archive track. Please try again.");
    }
  };

  const handleAssignTracks = async () => {
    if (!selectedProgram || selectedTrackIds.length === 0) {
      toast.error("Please select a program and at least one track");
      return;
    }

    setIsAssigningTracks(true);
    try {
      const [data, error] = await fetchData(
        TRACK_API.PROGRAMS.TRACKS.ASSIGN(selectedProgram, 1),
        "POST",
        { trackIds: selectedTrackIds },
        {},
        {},
        true,
        false,
        envVars.NEXT_PUBLIC_GAP_INDEXER_URL
      );
      
      if (error) {
        throw new Error(error);
      }
      
      toast.success("Tracks assigned to program successfully");
      fetchProgramTracks(selectedProgram);
      setSelectedTrackIds([]);
    } catch (error: any) {
      errorManager("Error assigning tracks to program", error);
      toast.error("Failed to assign tracks to program. Please try again.");
    } finally {
      setIsAssigningTracks(false);
    }
  };

  const handleUnassignTrack = async (trackId: string) => {
    if (!selectedProgram) {
      toast.error("Please select a program");
      return;
    }

    try {
      const [data, error] = await fetchData(
        TRACK_API.PROGRAMS.TRACKS.REMOVE(selectedProgram, 1, trackId),
        "DELETE",
        {},
        {},
        {},
        true,
        false,
        envVars.NEXT_PUBLIC_GAP_INDEXER_URL
      );
      
      if (error) {
        throw new Error(error);
      }
      
      toast.success("Track unassigned from program successfully");
      fetchProgramTracks(selectedProgram);
    } catch (error: any) {
      errorManager("Error unassigning track from program", error);
      toast.error("Failed to unassign track from program. Please try again.");
    }
  };

  const handleProgramChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedProgram(value);
    fetchProgramTracks(value);
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
        <Button
          className="mt-4"
          onClick={() => window.history.back()}
        >
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 mt-2">
      <div className="max-w-7xl mx-auto">
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
        <Transition appear show={showCreateModal} as={Fragment}>
          <Dialog as="div" className="relative z-10" onClose={() => setShowCreateModal(false)}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/25" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle transition-all">
                    <div className="flex justify-between items-center mb-4">
                      <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                        Create New Track
                      </Dialog.Title>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-500"
                        onClick={() => setShowCreateModal(false)}
                      >
                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="space-y-4 mt-4">
                      <div>
                        <label htmlFor="trackName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Track Name
                        </label>
                        <input
                          id="trackName"
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-zinc-700 dark:text-white"
                          value={newTrack.name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTrack({ ...newTrack, name: e.target.value })}
                          placeholder="Enter track name"
                        />
                      </div>
                      <div>
                        <label htmlFor="trackDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Description
                        </label>
                        <textarea
                          id="trackDescription"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-zinc-700 dark:text-white"
                          value={newTrack.description}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewTrack({ ...newTrack, description: e.target.value })}
                          placeholder="Enter track description"
                          rows={3}
                        />
                      </div>
                      <Button 
                        onClick={handleCreateTrack} 
                        disabled={isCreatingTrack}
                        className="w-full"
                      >
                        {isCreatingTrack ? <Spinner className="w-4 h-4 mr-2" /> : null}
                        Create Track
                      </Button>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
        
        {/* Edit Track Modal */}
        <Transition appear show={showEditModal} as={Fragment}>
          <Dialog as="div" className="relative z-10" onClose={() => setShowEditModal(false)}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/25" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle transition-all">
                    <div className="flex justify-between items-center mb-4">
                      <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                        Edit Track
                      </Dialog.Title>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-500"
                        onClick={() => setShowEditModal(false)}
                      >
                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                      </button>
                    </div>
                    {selectedTrack && (
                      <div className="space-y-4 mt-4">
                        <div>
                          <label htmlFor="editTrackName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Track Name
                          </label>
                          <input
                            id="editTrackName"
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-zinc-700 dark:text-white"
                            value={selectedTrack.name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedTrack({ ...selectedTrack, name: e.target.value })}
                            placeholder="Enter track name"
                          />
                        </div>
                        <div>
                          <label htmlFor="editTrackDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description
                          </label>
                          <textarea
                            id="editTrackDescription"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-zinc-700 dark:text-white"
                            value={selectedTrack.description || ""}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSelectedTrack({ ...selectedTrack, description: e.target.value })}
                            placeholder="Enter track description"
                            rows={3}
                          />
                        </div>
                        <Button 
                          onClick={handleUpdateTrack} 
                          disabled={isUpdatingTrack}
                          className="w-full"
                        >
                          {isUpdatingTrack ? <Spinner className="w-4 h-4 mr-2" /> : null}
                          Update Track
                        </Button>
                      </div>
                    )}
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Tracks List */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-800">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">All Tracks</h2>
            
            {tracks.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No tracks found. Create a track to get started.</p>
            ) : (
              <div className="space-y-4">
                {tracks.map((track) => (
                  <div 
                    key={track.id} 
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{track.name}</h3>
                      {track.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{track.description}</p>
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
                      
                      <Button 
                        onClick={() => handleArchiveTrack(track.id)}
                      >
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
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Program Tracks</h2>
            
            <div className="mb-6">
              <label htmlFor="programSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select Program
              </label>
              <select
                id="programSelect"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-zinc-700 dark:text-white"
                onChange={handleProgramChange}
                value={selectedProgram}
              >
                <option value="">Select a program</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedProgram ? (
              <>
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">Assign Tracks to Program</h3>
                  
                  {tracks.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">No tracks available to assign.</p>
                  ) : (
                    <>
                      <div className="space-y-2 max-h-60 overflow-y-auto p-2 border border-gray-200 dark:border-zinc-800 rounded-lg mb-4">
                        {tracks.map((track) => (
                          <div 
                            key={track.id} 
                            className={cn(
                              "flex items-center p-2 rounded-md cursor-pointer",
                              selectedTrackIds.includes(track.id) 
                                ? "bg-primary-100 dark:bg-primary-900/20 border border-primary-500" 
                                : "hover:bg-gray-100 dark:hover:bg-zinc-800 border border-transparent"
                            )}
                            onClick={() => handleTrackSelection(track.id)}
                          >
                            <div className={cn(
                              "w-4 h-4 rounded-sm mr-3 flex items-center justify-center border",
                              selectedTrackIds.includes(track.id)
                                ? "bg-primary-500 border-primary-500"
                                : "border-gray-300 dark:border-zinc-600"
                            )}>
                              {selectedTrackIds.includes(track.id) && (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-3 h-3">
                                  <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <span className="text-gray-900 dark:text-white">{track.name}</span>
                          </div>
                        ))}
                      </div>
                      
                      <Button 
                        onClick={handleAssignTracks} 
                        disabled={isAssigningTracks || selectedTrackIds.length === 0}
                        className="w-full"
                      >
                        {isAssigningTracks ? <Spinner className="w-4 h-4 mr-2" /> : null}
                        Assign Selected Tracks
                      </Button>
                    </>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">Current Program Tracks</h3>
                  
                  {programTracks.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">No tracks assigned to this program.</p>
                  ) : (
                    <div className="space-y-3">
                      {programTracks.map((track) => (
                        <div 
                          key={track.id} 
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg"
                        >
                          <div className="flex items-center">
                            <TagIcon className="w-5 h-5 text-primary-500 mr-2" />
                            <span className="text-gray-900 dark:text-white">{track.name}</span>
                          </div>
                          <Button 
                            onClick={() => handleUnassignTrack(track.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">Select a program to manage its tracks.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
