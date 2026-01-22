/**
 * @file Tests for Tracks Service (V2 API)
 * @description Tests for the tracks service covering CRUD operations,
 * program/project associations, and error handling
 */

import { beforeEach, describe, expect, it } from "bun:test";
import { type Track, trackService } from "@/services/tracks";
import { INDEXER } from "@/utilities/indexer";

// All mocks are pre-registered in tests/bun-setup.ts
// Access mocks via globalThis.__mocks__
const getMocks = () => (globalThis as any).__mocks__;

describe("trackService (V2)", () => {
  let mockFetchData: any;

  const mockTrack: Track = {
    id: "track-123",
    name: "Test Track",
    description: "Test track description",
    communityUID: "0x1234567890123456789012345678901234567890",
    isArchived: false,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };

  const mockTracks: Track[] = [
    mockTrack,
    {
      id: "track-456",
      name: "Another Track",
      description: "Another description",
      communityUID: "0x1234567890123456789012345678901234567890",
      isArchived: false,
      createdAt: "2024-01-02T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z",
    },
  ];

  beforeEach(() => {
    const mocks = getMocks();
    mockFetchData = mocks.fetchData;

    // Clear mocks
    if (mockFetchData?.mockClear) mockFetchData.mockClear();
  });

  describe("getAllTracks", () => {
    const communityUID = "0x1234567890123456789012345678901234567890";

    it("should fetch all tracks for a community", async () => {
      mockFetchData.mockResolvedValue([{ tracks: mockTracks }, null]);

      const result = await trackService.getAllTracks(communityUID);

      expect(mockFetchData).toHaveBeenCalledWith(
        INDEXER.V2.TRACKS.LIST(communityUID, false),
        "GET",
        {},
        {},
        {},
        false,
        false
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("track-123");
    });

    it("should include archived tracks when requested", async () => {
      mockFetchData.mockResolvedValue([{ tracks: mockTracks }, null]);

      await trackService.getAllTracks(communityUID, true);

      expect(mockFetchData).toHaveBeenCalledWith(
        INDEXER.V2.TRACKS.LIST(communityUID, true),
        "GET",
        {},
        {},
        {},
        false,
        false
      );
    });

    it("should throw error when fetch fails", async () => {
      mockFetchData.mockResolvedValue([null, "Network error"]);

      await expect(trackService.getAllTracks(communityUID)).rejects.toThrow("Network error");
    });

    it("should convert date strings to Date objects", async () => {
      mockFetchData.mockResolvedValue([{ tracks: mockTracks }, null]);

      const result = await trackService.getAllTracks(communityUID);

      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("getProgramTracks", () => {
    const programId = "program-123";

    it("should fetch tracks for a program", async () => {
      mockFetchData.mockResolvedValue([{ tracks: mockTracks }, null]);

      const result = await trackService.getProgramTracks(programId);

      expect(mockFetchData).toHaveBeenCalledWith(
        INDEXER.V2.TRACKS.PROGRAM_TRACKS(programId),
        "GET",
        {},
        {},
        {},
        false,
        false
      );
      expect(result).toHaveLength(2);
    });

    it("should throw error when fetch fails", async () => {
      mockFetchData.mockResolvedValue([null, "Program not found"]);

      await expect(trackService.getProgramTracks(programId)).rejects.toThrow();
    });
  });

  describe("createTrack", () => {
    it("should create a new track", async () => {
      mockFetchData.mockResolvedValue([mockTrack, null]);

      const result = await trackService.createTrack(
        "Test Track",
        "Test description",
        "0x1234567890123456789012345678901234567890"
      );

      expect(mockFetchData).toHaveBeenCalledWith(
        INDEXER.V2.TRACKS.CREATE(),
        "POST",
        {
          name: "Test Track",
          description: "Test description",
          communityUID: "0x1234567890123456789012345678901234567890",
        },
        {},
        {},
        true,
        false
      );
      expect(result.name).toBe("Test Track");
    });

    it("should throw error when creation fails", async () => {
      mockFetchData.mockResolvedValue([null, "Track already exists"]);

      await expect(
        trackService.createTrack(
          "Test Track",
          "Test description",
          "0x1234567890123456789012345678901234567890"
        )
      ).rejects.toThrow();
    });
  });

  describe("updateTrack", () => {
    it("should update an existing track", async () => {
      const updatedTrack = { ...mockTrack, name: "Updated Track" };
      mockFetchData.mockResolvedValue([updatedTrack, null]);

      const result = await trackService.updateTrack(
        "track-123",
        "Updated Track",
        "New description"
      );

      expect(mockFetchData).toHaveBeenCalledWith(
        INDEXER.V2.TRACKS.UPDATE("track-123"),
        "PUT",
        {
          name: "Updated Track",
          description: "New description",
        },
        {},
        {},
        true,
        false
      );
      expect(result.name).toBe("Updated Track");
    });

    it("should throw error when update fails", async () => {
      mockFetchData.mockResolvedValue([null, "Track not found"]);

      await expect(trackService.updateTrack("track-123", "Updated Track")).rejects.toThrow();
    });
  });

  describe("archiveTrack", () => {
    it("should archive a track", async () => {
      const archivedTrack = { ...mockTrack, isArchived: true };
      mockFetchData.mockResolvedValue([archivedTrack, null]);

      const result = await trackService.archiveTrack("track-123");

      expect(mockFetchData).toHaveBeenCalledWith(
        INDEXER.V2.TRACKS.ARCHIVE("track-123"),
        "DELETE",
        {},
        {},
        {},
        true,
        false
      );
      expect(result.isArchived).toBe(true);
    });

    it("should throw error when archive fails", async () => {
      mockFetchData.mockResolvedValue([null, "Track not found"]);

      await expect(trackService.archiveTrack("track-123")).rejects.toThrow();
    });
  });

  describe("assignTracksToProgram", () => {
    const programId = "program-123";
    const trackIds = ["track-1", "track-2"];

    it("should assign tracks to a program", async () => {
      mockFetchData.mockResolvedValue([{}, null]);

      await trackService.assignTracksToProgram(programId, trackIds);

      expect(mockFetchData).toHaveBeenCalledWith(
        INDEXER.V2.TRACKS.ASSIGN_TO_PROGRAM(programId),
        "POST",
        { trackIds },
        {},
        {},
        true,
        false
      );
    });

    it("should throw error when assignment fails", async () => {
      mockFetchData.mockResolvedValue([null, "Program not found"]);

      await expect(trackService.assignTracksToProgram(programId, trackIds)).rejects.toThrow();
    });
  });

  describe("removeTrackFromProgram", () => {
    it("should remove a track from a program", async () => {
      mockFetchData.mockResolvedValue([{}, null]);

      await trackService.removeTrackFromProgram("program-123", "track-123");

      expect(mockFetchData).toHaveBeenCalledWith(
        INDEXER.V2.TRACKS.UNASSIGN_FROM_PROGRAM("program-123", "track-123"),
        "DELETE",
        {},
        {},
        {},
        true,
        false
      );
    });
  });

  describe("getProjectTracks", () => {
    const projectId = "project-123";
    const programId = "program-123";

    it("should fetch tracks for a project within a program", async () => {
      mockFetchData.mockResolvedValue([{ tracks: mockTracks }, null]);

      const result = await trackService.getProjectTracks(projectId, programId);

      expect(mockFetchData).toHaveBeenCalledWith(
        INDEXER.V2.TRACKS.PROJECT_TRACKS(projectId, programId),
        "GET",
        {},
        {},
        {},
        false,
        false
      );
      expect(result).toBeDefined();
    });

    it("should throw error when fetch fails", async () => {
      mockFetchData.mockResolvedValue([null, "Project not found"]);

      await expect(trackService.getProjectTracks(projectId, programId)).rejects.toThrow();
    });
  });

  describe("assignTracksToProject", () => {
    it("should assign tracks to a project", async () => {
      mockFetchData.mockResolvedValue([{}, null]);

      await trackService.assignTracksToProject(
        "project-123",
        ["track-1", "track-2"],
        "program-123"
      );

      expect(mockFetchData).toHaveBeenCalledWith(
        INDEXER.V2.TRACKS.ASSIGN_TO_PROJECT("project-123"),
        "POST",
        { trackIds: ["track-1", "track-2"], programId: "program-123" },
        {},
        {},
        true,
        false
      );
    });
  });

  describe("getProjectsByTrack", () => {
    it("should fetch projects by track", async () => {
      mockFetchData.mockResolvedValue([{ projects: [] }, null]);

      await trackService.getProjectsByTrack("community-123", "program-123", "track-123");

      expect(mockFetchData).toHaveBeenCalledWith(
        INDEXER.V2.TRACKS.PROJECTS_BY_TRACK("community-123", "program-123", "track-123"),
        "GET",
        {},
        {},
        {},
        false,
        false
      );
    });

    it("should work without track filter", async () => {
      mockFetchData.mockResolvedValue([{ projects: [] }, null]);

      await trackService.getProjectsByTrack("community-123", "program-123");

      expect(mockFetchData).toHaveBeenCalledWith(
        INDEXER.V2.TRACKS.PROJECTS_BY_TRACK("community-123", "program-123", undefined),
        "GET",
        {},
        {},
        {},
        false,
        false
      );
    });
  });
});
