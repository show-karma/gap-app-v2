import { getNote, saveNote } from "@/src/features/application-notes/api/notes-service";
import type { ApplicationNote } from "@/src/features/application-notes/types";
import { HttpError } from "@/utilities/api/errors";

const mockApiGet = vi.fn();
const mockApiPut = vi.fn();

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    put: (...args: unknown[]) => mockApiPut(...args),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    getPaginated: vi.fn(),
  },
}));

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
      mockApiGet.mockResolvedValue({ note });

      const result = await getNote("APP-1");

      expect(result).toEqual(note);
      expect(mockApiGet).toHaveBeenCalledWith("/v2/applications/APP-1/notes");
    });

    it("should return null when no note exists yet (200 note:null)", async () => {
      mockApiGet.mockResolvedValue({ note: null });

      const result = await getNote("APP-1");

      expect(result).toBeNull();
    });

    it("should throw on error instead of swallowing to null", async () => {
      mockApiGet.mockRejectedValue(
        new HttpError(403, {
          endpoint: "/v2/applications/APP-1/notes",
          method: "GET",
          body: { message: "Forbidden" },
        })
      );

      await expect(getNote("APP-1")).rejects.toThrow(HttpError);
    });
  });

  describe("saveNote", () => {
    it("should PUT the content and return the saved note", async () => {
      const note = createMockNote({ content: "updated" });
      mockApiPut.mockResolvedValue({ note });

      const result = await saveNote("APP-1", "updated");

      expect(result).toEqual(note);
      expect(mockApiPut).toHaveBeenCalledWith("/v2/applications/APP-1/notes", {
        content: "updated",
      });
    });

    it("should throw on error", async () => {
      mockApiPut.mockRejectedValue(
        new HttpError(403, {
          endpoint: "/v2/applications/APP-1/notes",
          method: "PUT",
          body: { message: "Forbidden" },
        })
      );

      await expect(saveNote("APP-1", "x")).rejects.toThrow(HttpError);
    });
  });
});
