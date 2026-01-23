/**
 * @file Tests for useTracks hooks (V2 API)
 * @description Tests for track management hooks
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import {
  useArchiveTrack,
  useAssignTracksToProgram,
  useCreateTrack,
  useProjectsByTrack,
  useTracksForCommunity,
  useTracksForProgram,
  useTracksForProject,
  useUpdateTrack,
} from "@/hooks/useTracks";
import { trackService } from "@/services/tracks";

// Mock trackService
jest.mock("@/services/tracks", () => ({
  trackService: {
    getAllTracks: jest.fn(),
    getProgramTracks: jest.fn(),
    createTrack: jest.fn(),
    updateTrack: jest.fn(),
    archiveTrack: jest.fn(),
    assignTracksToProgram: jest.fn(),
    removeTrackFromProgram: jest.fn(),
    getProjectTracks: jest.fn(),
    assignTracksToProject: jest.fn(),
    getProjectsByTrack: jest.fn(),
  },
}));

// NOTE: react-hot-toast mock is provided globally via bun-setup.ts
// Access it via getMocks().toast in beforeEach to avoid polluting global mock state
const getMocks = () => (globalThis as any).__mocks__;

// Mock SDK tracks
jest.mock("@/utilities/sdk/tracks", () => ({
  fetchTrackById: jest.fn(),
}));

const mockTrackService = trackService as jest.Mocked<typeof trackService>;

describe("useTracks hooks (V2)", () => {
  const mockTracks = [
    {
      id: "track-1",
      name: "Track 1",
      description: "Description 1",
      communityUID: "community-123",
      isArchived: false,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
    {
      id: "track-2",
      name: "Track 2",
      description: "Description 2",
      communityUID: "community-123",
      isArchived: false,
      createdAt: new Date("2024-01-02"),
      updatedAt: new Date("2024-01-02"),
    },
  ];

  // Helper to create test query client
  const createTestQueryClient = () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
          staleTime: 0,
        },
        mutations: {
          retry: false,
        },
      },
    });

  // Helper to render with providers
  const createWrapper = (queryClient: QueryClient) => {
    return function Wrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };
  };

  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("useTracksForCommunity", () => {
    it("should fetch tracks for a community", async () => {
      mockTrackService.getAllTracks.mockResolvedValue(mockTracks);

      const { result } = renderHook(() => useTracksForCommunity("community-123"), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockTrackService.getAllTracks).toHaveBeenCalledWith("community-123", false);
      expect(result.current.data).toEqual(mockTracks);
    });

    it("should not fetch when communityUID is empty", () => {
      renderHook(() => useTracksForCommunity(""), {
        wrapper: createWrapper(queryClient),
      });

      expect(mockTrackService.getAllTracks).not.toHaveBeenCalled();
    });

    it("should include archived tracks when requested", async () => {
      mockTrackService.getAllTracks.mockResolvedValue(mockTracks);

      const { result } = renderHook(() => useTracksForCommunity("community-123", true), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockTrackService.getAllTracks).toHaveBeenCalledWith("community-123", true);
    });
  });

  describe("useTracksForProgram", () => {
    it("should fetch tracks for a program", async () => {
      mockTrackService.getProgramTracks.mockResolvedValue(mockTracks);

      const { result } = renderHook(() => useTracksForProgram("program-123"), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockTrackService.getProgramTracks).toHaveBeenCalledWith("program-123");
      expect(result.current.data).toEqual(mockTracks);
    });

    it("should not fetch when programId is empty", () => {
      renderHook(() => useTracksForProgram(""), {
        wrapper: createWrapper(queryClient),
      });

      expect(mockTrackService.getProgramTracks).not.toHaveBeenCalled();
    });
  });

  describe("useCreateTrack", () => {
    it("should create a new track", async () => {
      const newTrack = {
        id: "track-new",
        name: "New Track",
        description: "New description",
        communityUID: "community-123",
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTrackService.createTrack.mockResolvedValue(newTrack);

      const { result } = renderHook(() => useCreateTrack(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          name: "New Track",
          description: "New description",
          communityUID: "community-123",
        });
      });

      expect(mockTrackService.createTrack).toHaveBeenCalledWith(
        "New Track",
        "New description",
        "community-123"
      );
    });

    it("should invalidate community tracks query on success", async () => {
      mockTrackService.createTrack.mockResolvedValue(mockTracks[0]);

      const invalidateQueriesSpy = jest.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useCreateTrack(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          name: "New Track",
          description: "New description",
          communityUID: "community-123",
        });
      });

      expect(invalidateQueriesSpy).toHaveBeenCalled();
    });
  });

  describe("useUpdateTrack", () => {
    it("should update an existing track", async () => {
      const updatedTrack = { ...mockTracks[0], name: "Updated Track" };
      mockTrackService.updateTrack.mockResolvedValue(updatedTrack);

      const { result } = renderHook(() => useUpdateTrack("community-123"), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: "track-1",
          name: "Updated Track",
          description: "Updated description",
        });
      });

      expect(mockTrackService.updateTrack).toHaveBeenCalledWith(
        "track-1",
        "Updated Track",
        "Updated description",
        "community-123"
      );
    });
  });

  describe("useArchiveTrack", () => {
    it("should archive a track", async () => {
      const archivedTrack = { ...mockTracks[0], isArchived: true };
      mockTrackService.archiveTrack.mockResolvedValue(archivedTrack);

      const { result } = renderHook(() => useArchiveTrack("community-123"), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync("track-1");
      });

      expect(mockTrackService.archiveTrack).toHaveBeenCalledWith("track-1", "community-123");
    });
  });

  describe("useAssignTracksToProgram", () => {
    it("should assign tracks to a program", async () => {
      mockTrackService.assignTracksToProgram.mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useAssignTracksToProgram("program-123", "community-123"),
        {
          wrapper: createWrapper(queryClient),
        }
      );

      await act(async () => {
        await result.current.mutateAsync(["track-1", "track-2"]);
      });

      expect(mockTrackService.assignTracksToProgram).toHaveBeenCalledWith(
        "program-123",
        ["track-1", "track-2"],
        "community-123"
      );
    });
  });

  describe("useTracksForProject", () => {
    it("should fetch tracks for a project", async () => {
      const projectTracks = [
        {
          id: "pt-1",
          projectUID: "project-123",
          trackId: "track-1",
          programId: "program-123",
          isActive: true,
          createdAt: "2024-01-01",
        },
      ];
      mockTrackService.getProjectTracks.mockResolvedValue(projectTracks);

      const { result } = renderHook(() => useTracksForProject("project-123", "program-123"), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockTrackService.getProjectTracks).toHaveBeenCalledWith("project-123", "program-123");
      expect(result.current.data).toEqual(projectTracks);
    });

    it("should not fetch when projectId or programId is missing", () => {
      renderHook(() => useTracksForProject("", "program-123"), {
        wrapper: createWrapper(queryClient),
      });

      expect(mockTrackService.getProjectTracks).not.toHaveBeenCalled();
    });
  });

  describe("useProjectsByTrack", () => {
    it("should fetch projects by track", async () => {
      const mockProjects = [{ projectUID: "project-1" }, { projectUID: "project-2" }];
      mockTrackService.getProjectsByTrack.mockResolvedValue(mockProjects);

      const { result } = renderHook(
        () => useProjectsByTrack("community-123", "program-123", "track-123"),
        {
          wrapper: createWrapper(queryClient),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockTrackService.getProjectsByTrack).toHaveBeenCalledWith(
        "community-123",
        "program-123",
        "track-123"
      );
      expect(result.current.data).toEqual(mockProjects);
    });

    it("should work without track filter", async () => {
      const mockProjects = [{ projectUID: "project-1" }];
      mockTrackService.getProjectsByTrack.mockResolvedValue(mockProjects);

      const { result } = renderHook(() => useProjectsByTrack("community-123", "program-123"), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockTrackService.getProjectsByTrack).toHaveBeenCalledWith(
        "community-123",
        "program-123",
        undefined
      );
    });
  });
});
