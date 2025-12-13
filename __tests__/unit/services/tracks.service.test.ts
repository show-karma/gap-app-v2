/**
 * @file Tests for Tracks Service (V2 API)
 * @description Tests for the tracks service covering CRUD operations,
 * program/project associations, and error handling
 */

import { type Track, trackService } from "@/services/tracks";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

// Mock fetchData utility
jest.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("trackService (V2)", () => {
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
    jest.clearAllMocks();
  });

  describe("getAllTracks", () => {
    const communityUID = "0x1234567890123456789012345678901234567890";

    it("should fetch all tracks for a community", async () => {
      (fetchData as jest.Mock).mockResolvedValue([{ tracks: mockTracks }, null]);

      const result = await trackService.getAllTracks(communityUID);

      expect(fetchData).toHaveBeenCalledWith(
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
      (fetchData as jest.Mock).mockResolvedValue([{ tracks: mockTracks }, null]);

      await trackService.getAllTracks(communityUID, true);

      expect(fetchData).toHaveBeenCalledWith(
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
      (fetchData as jest.Mock).mockResolvedValue([null, "Network error"]);

      await expect(trackService.getAllTracks(communityUID)).rejects.toThrow("Network error");
    });

    it("should convert date strings to Date objects", async () => {
      (fetchData as jest.Mock).mockResolvedValue([{ tracks: mockTracks }, null]);

      const result = await trackService.getAllTracks(communityUID);

      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("getProgramTracks", () => {
    const programId = "program-123";

    it("should fetch tracks for a program", async () => {
      (fetchData as jest.Mock).mockResolvedValue([{ tracks: mockTracks }, null]);

      const result = await trackService.getProgramTracks(programId);

      expect(fetchData).toHaveBeenCalledWith(
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
      (fetchData as jest.Mock).mockResolvedValue([null, "Program not found"]);

      await expect(trackService.getProgramTracks(programId)).rejects.toThrow();
    });
  });

  describe("createTrack", () => {
    it("should create a new track", async () => {
      (fetchData as jest.Mock).mockResolvedValue([mockTrack, null]);

      const result = await trackService.createTrack(
        "Test Track",
        "Test description",
        "0x1234567890123456789012345678901234567890"
      );

      expect(fetchData).toHaveBeenCalledWith(
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
      (fetchData as jest.Mock).mockResolvedValue([null, "Track already exists"]);

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
      (fetchData as jest.Mock).mockResolvedValue([updatedTrack, null]);

      const result = await trackService.updateTrack(
        "track-123",
        "Updated Track",
        "New description"
      );

      expect(fetchData).toHaveBeenCalledWith(
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
      (fetchData as jest.Mock).mockResolvedValue([null, "Track not found"]);

      await expect(trackService.updateTrack("track-123", "Updated Track")).rejects.toThrow();
    });
  });

  describe("archiveTrack", () => {
    it("should archive a track", async () => {
      const archivedTrack = { ...mockTrack, isArchived: true };
      (fetchData as jest.Mock).mockResolvedValue([archivedTrack, null]);

      const result = await trackService.archiveTrack("track-123");

      expect(fetchData).toHaveBeenCalledWith(
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
      (fetchData as jest.Mock).mockResolvedValue([null, "Track not found"]);

      await expect(trackService.archiveTrack("track-123")).rejects.toThrow();
    });
  });

  describe("assignTracksToProgram", () => {
    const programId = "program-123";
    const trackIds = ["track-1", "track-2"];

    it("should assign tracks to a program", async () => {
      (fetchData as jest.Mock).mockResolvedValue([{}, null]);

      await trackService.assignTracksToProgram(programId, trackIds);

      expect(fetchData).toHaveBeenCalledWith(
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
      (fetchData as jest.Mock).mockResolvedValue([null, "Program not found"]);

      await expect(trackService.assignTracksToProgram(programId, trackIds)).rejects.toThrow();
    });
  });

  describe("removeTrackFromProgram", () => {
    it("should remove a track from a program", async () => {
      (fetchData as jest.Mock).mockResolvedValue([{}, null]);

      await trackService.removeTrackFromProgram("program-123", "track-123");

      expect(fetchData).toHaveBeenCalledWith(
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
      (fetchData as jest.Mock).mockResolvedValue([{ tracks: mockTracks }, null]);

      const result = await trackService.getProjectTracks(projectId, programId);

      expect(fetchData).toHaveBeenCalledWith(
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
      (fetchData as jest.Mock).mockResolvedValue([null, "Project not found"]);

      await expect(trackService.getProjectTracks(projectId, programId)).rejects.toThrow();
    });
  });

  describe("assignTracksToProject", () => {
    it("should assign tracks to a project", async () => {
      (fetchData as jest.Mock).mockResolvedValue([{}, null]);

      await trackService.assignTracksToProject(
        "project-123",
        ["track-1", "track-2"],
        "program-123"
      );

      expect(fetchData).toHaveBeenCalledWith(
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
      (fetchData as jest.Mock).mockResolvedValue([{ projects: [] }, null]);

      await trackService.getProjectsByTrack("community-123", "program-123", "track-123");

      expect(fetchData).toHaveBeenCalledWith(
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
      (fetchData as jest.Mock).mockResolvedValue([{ projects: [] }, null]);

      await trackService.getProjectsByTrack("community-123", "program-123");

      expect(fetchData).toHaveBeenCalledWith(
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
