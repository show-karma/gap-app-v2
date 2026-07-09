import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { NotesService } from "@/src/features/application-notes/api/notes-service";
import { useApplicationNote } from "@/src/features/application-notes/hooks/use-application-note";
import type { ApplicationNote } from "@/src/features/application-notes/types";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ authenticated: true }),
}));

vi.mock("@/src/features/application-notes/api/notes-service", () => ({
  NotesService: {
    getNote: vi.fn(),
    saveNote: vi.fn(),
  },
}));

const mockService = vi.mocked(NotesService);

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

let queryClient: QueryClient;

const createWrapper = () => {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe("useApplicationNote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it("should fetch the note when reviewer + authenticated", async () => {
    const note = createMockNote();
    mockService.getNote.mockResolvedValue(note);

    const { result } = renderHook(
      () => useApplicationNote({ referenceNumber: "APP-1", canViewNotes: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.note).toEqual(note);
  });

  it("should NOT fetch when canViewNotes is false (no request for a non-reviewer)", async () => {
    mockService.getNote.mockResolvedValue(createMockNote());

    renderHook(() => useApplicationNote({ referenceNumber: "APP-1", canViewNotes: false }), {
      wrapper: createWrapper(),
    });

    await new Promise((r) => setTimeout(r, 0));
    expect(mockService.getNote).not.toHaveBeenCalled();
  });

  it("should treat a null note as empty, not an error", async () => {
    mockService.getNote.mockResolvedValue(null);

    const { result } = renderHook(
      () => useApplicationNote({ referenceNumber: "APP-1", canViewNotes: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.note).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("should expose an error state when getNote rejects", async () => {
    mockService.getNote.mockRejectedValue(new Error("Forbidden"));

    const { result } = renderHook(
      () => useApplicationNote({ referenceNumber: "APP-1", canViewNotes: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toBe("Forbidden");
  });

  it("should set the note after save (optimistic + post-invalidation refetch)", async () => {
    mockService.getNote.mockResolvedValue(null);
    const saved = createMockNote({ content: "saved" });
    mockService.saveNote.mockResolvedValue(saved);

    const { result } = renderHook(
      () => useApplicationNote({ referenceNumber: "APP-1", canViewNotes: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.note).toBeNull();

    // After a successful PUT the server holds the saved note, so the
    // onSettled invalidation refetch returns it too.
    mockService.getNote.mockResolvedValue(saved);

    await act(async () => {
      await result.current.saveNote("saved");
    });

    await waitFor(() => expect(result.current.note).toEqual(saved));
    expect(mockService.saveNote).toHaveBeenCalledWith("APP-1", "saved");
  });
});
