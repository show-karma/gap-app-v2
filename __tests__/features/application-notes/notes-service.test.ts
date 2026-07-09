import { NotesService } from "@/src/features/application-notes/api/notes-service";
import type { ApplicationNote } from "@/src/features/application-notes/types";
import fetchData from "@/utilities/fetchData";

vi.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: vi.fn(),
}));

const mockFetchData = fetchData as vi.MockedFunction<typeof fetchData>;

function createMockNote(overrides: Partial<ApplicationNote> = {}): ApplicationNote {
  return {
    id: "note-1",
    applicationId: "app-1",
    programId: "program-1",
    content: "internal flag",
    updatedByAddress: "0xabc",
    updatedByName: "Rev",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("NotesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getNote", () => {
    it("should return the note on success", async () => {
      const note = createMockNote();
      mockFetchData.mockResolvedValue([{ note }, null, null, 200] as any);

      const result = await NotesService.getNote("APP-1");

      expect(result).toEqual(note);
      expect(mockFetchData).toHaveBeenCalledWith("/v2/applications/APP-1/notes", "GET");
    });

    it("should return null when no note exists yet (200 note:null)", async () => {
      mockFetchData.mockResolvedValue([{ note: null }, null, null, 200] as any);

      const result = await NotesService.getNote("APP-1");

      expect(result).toBeNull();
    });

    it("should throw on error instead of swallowing to null", async () => {
      mockFetchData.mockResolvedValue([null, "Forbidden", null, 403] as any);

      await expect(NotesService.getNote("APP-1")).rejects.toThrow("Forbidden");
    });
  });

  describe("saveNote", () => {
    it("should PUT the content and return the saved note", async () => {
      const note = createMockNote({ content: "updated" });
      mockFetchData.mockResolvedValue([{ note }, null, null, 200] as any);

      const result = await NotesService.saveNote("APP-1", "updated");

      expect(result).toEqual(note);
      expect(mockFetchData).toHaveBeenCalledWith("/v2/applications/APP-1/notes", "PUT", {
        content: "updated",
      });
    });

    it("should throw on error", async () => {
      mockFetchData.mockResolvedValue([null, "Forbidden", null, 403] as any);

      await expect(NotesService.saveNote("APP-1", "x")).rejects.toThrow("Forbidden");
    });
  });
});
