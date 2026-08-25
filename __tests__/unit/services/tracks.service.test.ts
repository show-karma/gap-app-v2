/**
 * @file Tests for Tracks Service (V2 API)
 * @description Tests for the tracks service covering CRUD operations,
 * program/project associations, and error handling
 */

import { type Track, trackService } from "@/services/tracks";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import { INDEXER } from "@/utilities/indexer";

// Mock the typed api client
vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    getPaginated: vi.fn(),
    request: vi.fn(),
  },
}));

function httpError(message: string, status = 500) {
  return new HttpError(status, { endpoint: "/test", method: "GET", body: { message } });
}

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
    vi.clearAllMocks();
  });

  describe("getAllTracks", () => {
    const communityUID = "0x1234567890123456789012345678901234567890";

    it("should fetch all tracks for a community", async () => {
      (api.get as vi.Mock).mockResolvedValue({ tracks: mockTracks });

      const result = await trackService.getAllTracks(communityUID);

      expect(api.get).toHaveBeenCalledWith(
        INDEXER.V2.TRACKS.LIST(communityUID, false),
        expect.objectContaining({ isAuthorized: false })
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("track-123");
    });

    it("should include archived tracks when requested", async () => {
      (api.get as vi.Mock).mockResolvedValue({ tracks: mockTracks });

      await trackService.getAllTracks(communityUID, true);

      expect(api.get).toHaveBeenCalledWith(
        INDEXER.V2.TRACKS.LIST(communityUID, true),
        expect.objectContaining({ isAuthorized: false })
      );
    });

    it("should throw error when fetch fails", async () => {
      (api.get as vi.Mock).mockRejectedValue(httpError("Network error"));

      await expect(trackService.getAllTracks(communityUID)).rejects.toThrow();
    });

    it("should convert date strings to Date objects", async () => {
      (api.get as vi.Mock).mockResolvedValue({ tracks: mockTracks });

      const result = await trackService.getAllTracks(communityUID);

      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("getProgramTracks", () => {
    const programId = "program-123";

    it("should fetch tracks for a program", async () => {
      (api.get as vi.Mock).mockResolvedValue({ tracks: mockTracks });

      const result = await trackService.getProgramTracks(programId);

      expect(api.get).toHaveBeenCalledWith(
        INDEXER.V2.TRACKS.PROGRAM_TRACKS(programId),
        expect.objectContaining({ isAuthorized: false })
      );
      expect(result).toHaveLength(2);
    });

    it("should throw error when fetch fails", async () => {
      (api.get as vi.Mock).mockRejectedValue(httpError("Program not found", 404));

      await expect(trackService.getProgramTracks(programId)).rejects.toThrow();
    });
  });

  describe("createTrack", () => {
    it("should create a new track", async () => {
      (api.post as vi.Mock).mockResolvedValue(mockTrack);

      const result = await trackService.createTrack(
        "Test Track",
        "Test description",
        "0x1234567890123456789012345678901234567890"
      );

      expect(api.post).toHaveBeenCalledWith(
        INDEXER.V2.TRACKS.CREATE(),
        {
          name: "Test Track",
          description: "Test description",
          communityUID: "0x1234567890123456789012345678901234567890",
        },
        expect.any(Object)
      );
      expect(result.name).toBe("Test Track");
    });

    it("should throw error when creation fails", async () => {
      (api.post as vi.Mock).mockRejectedValue(httpError("Track already exists", 409));

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
      (api.put as vi.Mock).mockResolvedValue(updatedTrack);

      const result = await trackService.updateTrack(
        "track-123",
        "Updated Track",
        "New description"
      );

      expect(api.put).toHaveBeenCalledWith(
        INDEXER.V2.TRACKS.UPDATE("track-123"),
        {
          name: "Updated Track",
          description: "New description",
        },
        expect.any(Object)
      );
      expect(result.name).toBe("Updated Track");
    });

    it("should throw error when update fails", async () => {
      (api.put as vi.Mock).mockRejectedValue(httpError("Track not found", 404));

      await expect(trackService.updateTrack("track-123", "Updated Track")).rejects.toThrow();
    });
  });

  describe("archiveTrack", () => {
    it("should archive a track", async () => {
      const archivedTrack = { ...mockTrack, isArchived: true };
      (api.delete as vi.Mock).mockResolvedValue(archivedTrack);

      const result = await trackService.archiveTrack("track-123");

      expect(api.delete).toHaveBeenCalledWith(
        INDEXER.V2.TRACKS.ARCHIVE("track-123"),
        expect.any(Object)
      );
      expect(result.isArchived).toBe(true);
    });

    it("should throw error when archive fails", async () => {
      (api.delete as vi.Mock).mockRejectedValue(httpError("Track not found", 404));

      await expect(trackService.archiveTrack("track-123")).rejects.toThrow();
    });
  });

  describe("assignTracksToProgram", () => {
    const programId = "program-123";
    const trackIds = ["track-1", "track-2"];

    it("should assign tracks to a program", async () => {
      (api.post as vi.Mock).mockResolvedValue({});

      await trackService.assignTracksToProgram(programId, trackIds);

      expect(api.post).toHaveBeenCalledWith(INDEXER.V2.TRACKS.ASSIGN_TO_PROGRAM(programId), {
        trackIds,
      });
    });

    it("should throw error when assignment fails", async () => {
      (api.post as vi.Mock).mockRejectedValue(httpError("Program not found", 404));

      await expect(trackService.assignTracksToProgram(programId, trackIds)).rejects.toThrow();
    });
  });

  describe("removeTrackFromProgram", () => {
    it("should remove a track from a program", async () => {
      (api.delete as vi.Mock).mockResolvedValue({});

      await trackService.removeTrackFromProgram("program-123", "track-123");

      expect(api.delete).toHaveBeenCalledWith(
        INDEXER.V2.TRACKS.UNASSIGN_FROM_PROGRAM("program-123", "track-123")
      );
    });
  });

  describe("getProjectTracks", () => {
    const projectId = "project-123";
    const programId = "program-123";

    it("should fetch tracks for a project within a program", async () => {
      (api.get as vi.Mock).mockResolvedValue({ tracks: mockTracks });

      const result = await trackService.getProjectTracks(projectId, programId);

      expect(api.get).toHaveBeenCalledWith(
        INDEXER.V2.TRACKS.PROJECT_TRACKS(projectId, programId),
        expect.objectContaining({ isAuthorized: false })
      );
      expect(result).toBeDefined();
    });

    it("should throw error when fetch fails", async () => {
      (api.get as vi.Mock).mockRejectedValue(httpError("Project not found", 404));

      await expect(trackService.getProjectTracks(projectId, programId)).rejects.toThrow();
    });
  });

  describe("assignTracksToProject", () => {
    it("should assign tracks to a project", async () => {
      (api.post as vi.Mock).mockResolvedValue({});

      await trackService.assignTracksToProject(
        "project-123",
        ["track-1", "track-2"],
        "program-123"
      );

      expect(api.post).toHaveBeenCalledWith(INDEXER.V2.TRACKS.ASSIGN_TO_PROJECT("project-123"), {
        trackIds: ["track-1", "track-2"],
        programId: "program-123",
      });
    });
  });

  describe("unassignTracksFromProject", () => {
    it("should unassign tracks from a project via the low-level request escape hatch", async () => {
      (api.request as vi.Mock).mockResolvedValue({ data: {}, status: 200, pageInfo: null });

      await trackService.unassignTracksFromProject("program-123", "project-123", ["track-1"]);

      expect(api.request).toHaveBeenCalledWith(
        "DELETE",
        INDEXER.V2.TRACKS.UNASSIGN_FROM_PROJECT("program-123", "project-123"),
        { trackIds: ["track-1"] }
      );
    });

    it("should throw error when unassignment fails", async () => {
      (api.request as vi.Mock).mockRejectedValue(httpError("Project not found", 404));

      await expect(
        trackService.unassignTracksFromProject("program-123", "project-123", ["track-1"])
      ).rejects.toThrow();
    });
  });

  describe("getProjectsByTrack", () => {
    it("should fetch projects by track", async () => {
      (api.get as vi.Mock).mockResolvedValue({ projects: [] });

      await trackService.getProjectsByTrack("community-123", "program-123", "track-123");

      expect(api.get).toHaveBeenCalledWith(
        INDEXER.V2.TRACKS.PROJECTS_BY_TRACK("community-123", "program-123", "track-123"),
        expect.objectContaining({ isAuthorized: false })
      );
    });

    it("should work without track filter", async () => {
      (api.get as vi.Mock).mockResolvedValue({ projects: [] });

      await trackService.getProjectsByTrack("community-123", "program-123");

      expect(api.get).toHaveBeenCalledWith(
        INDEXER.V2.TRACKS.PROJECTS_BY_TRACK("community-123", "program-123", undefined),
        expect.objectContaining({ isAuthorized: false })
      );
    });
  });
});
